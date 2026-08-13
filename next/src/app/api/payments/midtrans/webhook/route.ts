import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { grantPremiumDays } from '@/lib/premium'
import { midtransConfig, verifyMidtransSignature, mapMidtransStatus } from '@/lib/midtrans'

class WebhookError extends Error {
  constructor(public code: string, public status: number) {
    super(code)
  }
}

interface PaymentRow {
  UserId: string
  AmountIdr: string
  GrantsDays: number
  Status: string
}

export async function POST(req: Request) {
  const cfg = midtransConfig()
  if (!cfg) return NextResponse.json({ error: 'payments_not_configured' }, { status: 503 })

  let p: Record<string, unknown>
  try {
    p = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const orderId = str(p.order_id)
  const statusCode = str(p.status_code)
  const grossAmount = str(p.gross_amount)
  const signatureKey = str(p.signature_key)
  const txStatus = str(p.transaction_status)
  const fraudStatus = str(p.fraud_status)
  const txId = typeof p.transaction_id === 'string' ? p.transaction_id : null

  // The signature is the only thing proving this really came from Midtrans and was not tampered
  // with — reject anything that doesn't match before touching the database.
  if (!orderId || !verifyMidtransSignature(cfg, orderId, statusCode, grossAmount, signatureKey))
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })

  const newStatus = mapMidtransStatus(txStatus, fraudStatus)

  try {
    await sql.begin(async (tx) => {
      const [pay] = await tx<PaymentRow[]>`
        SELECT "UserId","AmountIdr","GrantsDays","Status" FROM payments
        WHERE "ProviderOrderId" = ${orderId} FOR UPDATE`
      if (!pay) throw new WebhookError('order_not_found', 404)

      // The signed gross_amount must match what we charged — never settle a tampered amount.
      if (Math.round(Number(grossAmount)) !== Number(pay.AmountIdr)) throw new WebhookError('amount_mismatch', 400)

      // Idempotent: a settled order never gets premium granted twice, no matter how many times
      // Midtrans re-delivers the notification.
      if (pay.Status === 'settled') return

      const payload = tx.json(p as Parameters<typeof tx.json>[0])
      if (newStatus === 'settled') {
        await tx`
          UPDATE payments SET "Status" = 'settled', "ProviderTxnId" = ${txId},
            "RawPayload" = ${payload}, "SettledAtUtc" = now()
          WHERE "ProviderOrderId" = ${orderId}`
        await grantPremiumDays(tx, pay.UserId, pay.GrantsDays, 'midtrans', orderId)
      } else {
        await tx`
          UPDATE payments SET "Status" = ${newStatus}, "ProviderTxnId" = ${txId}, "RawPayload" = ${payload}
          WHERE "ProviderOrderId" = ${orderId}`
      }
    })
  } catch (e) {
    if (e instanceof WebhookError) return NextResponse.json({ error: e.code }, { status: e.status })
    throw e
  }

  return new NextResponse(null, { status: 200 })
}

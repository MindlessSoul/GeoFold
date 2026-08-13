import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { ensureProfile } from '@/lib/profile'
import { midtransConfig, createQrisCharge, PREMIUM_PRICE_IDR, PREMIUM_DAYS } from '@/lib/midtrans'

export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  const cfg = midtransConfig()
  if (!cfg) return NextResponse.json({ error: 'payments_not_configured' }, { status: 503 })

  await ensureProfile(userId)

  const orderId = `GF-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase()
  const amount = PREMIUM_PRICE_IDR
  const days = PREMIUM_DAYS

  // Reserve the payment row before calling Midtrans so the webhook always has a row to settle,
  // even if this process dies mid-charge. ProviderOrderId is unique → the settlement is idempotent.
  await sql`
    INSERT INTO payments ("Id","UserId","Provider","ProviderOrderId","Method","AmountIdr","GrantsDays","Status")
    VALUES (gen_random_uuid(), ${userId}, 'midtrans', ${orderId}, 'qris', ${amount}, ${days}, 'pending')`

  let charge
  try {
    charge = await createQrisCharge(cfg, orderId, amount)
  } catch (e) {
    await sql`
      UPDATE payments SET "Status" = 'denied', "RawPayload" = ${sql.json({ error: String(e) })}
      WHERE "ProviderOrderId" = ${orderId}`
    return NextResponse.json({ error: 'charge_failed', message: 'Could not start the payment. Please try again.' }, { status: 502 })
  }

  await sql`
    UPDATE payments SET "ProviderTxnId" = ${charge.transactionId}, "QrUrl" = ${charge.qrUrl},
      "RawPayload" = ${sql.json(charge.raw as Parameters<typeof sql.json>[0])}
    WHERE "ProviderOrderId" = ${orderId}`

  return NextResponse.json({ orderId, qrUrl: charge.qrUrl, amountIdr: amount, grantsDays: days })
}

import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { ensureProfile } from '@/lib/profile'
import { midtransConfig, createSnapTransaction, PREMIUM_PRICE_IDR, PREMIUM_DAYS } from '@/lib/midtrans'

// Start a Midtrans Snap checkout (all enabled payment methods). Returns a redirect URL; the
// client sends the user there. Premium is granted only by the webhook after real settlement.
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  const cfg = midtransConfig()
  if (!cfg) return NextResponse.json({ error: 'payments_not_configured' }, { status: 503 })

  await ensureProfile(userId)

  const orderId = `GF-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase()
  const amount = PREMIUM_PRICE_IDR
  const days = PREMIUM_DAYS

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const finishUrl = `${proto}://${host}/subscription`

  // Reserve the payment row before calling Midtrans so the webhook always has a row to settle.
  await sql`
    INSERT INTO payments ("Id","UserId","Provider","ProviderOrderId","Method","AmountIdr","GrantsDays","Status")
    VALUES (gen_random_uuid(), ${userId}, 'midtrans', ${orderId}, 'snap', ${amount}, ${days}, 'pending')`

  let snap
  try {
    snap = await createSnapTransaction(cfg, orderId, amount, finishUrl)
  } catch (e) {
    await sql`
      UPDATE payments SET "Status" = 'denied', "RawPayload" = ${sql.json({ error: String(e) })}
      WHERE "ProviderOrderId" = ${orderId}`
    return NextResponse.json({ error: 'charge_failed', message: 'Gagal memulai pembayaran. Coba lagi.' }, { status: 502 })
  }

  await sql`
    UPDATE payments SET "QrUrl" = ${snap.redirectUrl},
      "RawPayload" = ${sql.json(snap.raw as Parameters<typeof sql.json>[0])}
    WHERE "ProviderOrderId" = ${orderId}`

  return NextResponse.json({ orderId, redirectUrl: snap.redirectUrl, amountIdr: amount, grantsDays: days })
}

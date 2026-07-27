import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// Placeholder shared-secret check. Swap for real provider signature verification (Stripe-Signature
// HMAC, RevenueCat header, App Store JWS) per provider. Fails closed when no secret is configured.
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  await params

  const configured = process.env.WEBHOOKS_SHARED_SECRET
  if (!configured || !configured.trim())
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })

  const provided = req.headers.get('x-webhook-secret') ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(configured)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const p = await req.json()
  await sql`
    INSERT INTO subscriptions ("Id","UserId","Plan","Status","Provider","ProviderRef","CurrentPeriodEndUtc","UpdatedAtUtc")
    VALUES (gen_random_uuid(), ${p.userId}, ${p.plan}, ${p.status}, ${p.provider}, ${p.providerRef ?? null}, ${p.currentPeriodEndUtc ?? null}, now())
    ON CONFLICT ("UserId") DO UPDATE SET
      "Plan" = EXCLUDED."Plan", "Status" = EXCLUDED."Status", "Provider" = EXCLUDED."Provider",
      "ProviderRef" = EXCLUDED."ProviderRef", "CurrentPeriodEndUtc" = EXCLUDED."CurrentPeriodEndUtc",
      "UpdatedAtUtc" = now()`

  return new NextResponse(null, { status: 204 })
}

import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// Only these reach the database. `quota.ts` treats Plan === 'premium' with an active/trialing
// Status as paid, so anything outside this set must be rejected rather than stored.
const PLANS = new Set(['free', 'premium'])
const STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface SubscriptionEvent {
  userId: string
  plan: string
  status: string
  provider: string
  providerRef: string | null
  currentPeriodEndUtc: string | null
}

function parseSubscriptionEvent(raw: unknown): SubscriptionEvent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>

  const str = (v: unknown, max: number) =>
    typeof v === 'string' && v.length > 0 && v.length <= max ? v : null

  const userId = str(o.userId, 36)
  if (!userId || !UUID.test(userId)) return null

  const plan = str(o.plan, 32)
  if (!plan || !PLANS.has(plan)) return null

  const status = str(o.status, 32)
  if (!status || !STATUSES.has(status)) return null

  const provider = str(o.provider, 64)
  if (!provider) return null

  // Absent is fine; present-but-invalid is rejected rather than silently nulled — dropping a
  // provider reference would quietly break reconciliation against the billing provider.
  let providerRef: string | null = null
  if (o.providerRef !== undefined && o.providerRef !== null) {
    const v = str(o.providerRef, 255)
    if (!v) return null
    providerRef = v
  }

  // Reject a garbage date rather than letting Postgres coerce or throw at insert time.
  let currentPeriodEndUtc: string | null = null
  if (o.currentPeriodEndUtc !== undefined && o.currentPeriodEndUtc !== null) {
    const v = str(o.currentPeriodEndUtc, 64)
    if (!v || Number.isNaN(Date.parse(v))) return null
    currentPeriodEndUtc = new Date(v).toISOString()
  }

  return { userId, plan, status, provider, providerRef, currentPeriodEndUtc }
}

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

  // The body is attacker-shaped the moment the shared secret leaks, and it decides who gets
  // a paid plan — so validate it against a closed set rather than trusting the provider.
  let p: unknown
  try {
    p = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const body = parseSubscriptionEvent(p)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  await sql`
    INSERT INTO subscriptions ("Id","UserId","Plan","Status","Provider","ProviderRef","CurrentPeriodEndUtc","UpdatedAtUtc")
    VALUES (gen_random_uuid(), ${body.userId}, ${body.plan}, ${body.status}, ${body.provider}, ${body.providerRef}, ${body.currentPeriodEndUtc}, now())
    ON CONFLICT ("UserId") DO UPDATE SET
      "Plan" = EXCLUDED."Plan", "Status" = EXCLUDED."Status", "Provider" = EXCLUDED."Provider",
      "ProviderRef" = EXCLUDED."ProviderRef", "CurrentPeriodEndUtc" = EXCLUDED."CurrentPeriodEndUtc",
      "UpdatedAtUtc" = now()`

  return new NextResponse(null, { status: 204 })
}

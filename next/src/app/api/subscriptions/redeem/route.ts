import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { ensureProfile } from '@/lib/profile'
import { grantPremiumDays } from '@/lib/premium'

// Thrown inside the transaction to roll it back and carry an HTTP status out to the handler.
class RedeemError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message)
  }
}

interface KeyRow {
  Id: string
  GrantsDays: number
  MaxRedemptions: number
  Redemptions: number
  ExpiresAtUtc: Date | null
  RevokedAtUtc: Date | null
}

export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const raw = (body as { key?: unknown } | null)?.key
  const key = typeof raw === 'string' ? raw.trim() : ''
  if (!key || key.length > 200)
    return NextResponse.json({ error: 'invalid_key', message: 'Enter your activation key.' }, { status: 400 })

  // Keys live in the database only as a SHA-256 hash; match on the hash so the plaintext never
  // needs to be stored or logged.
  const keyHash = crypto.createHash('sha256').update(key).digest('hex')

  // Both the redemption and subscription rows FK to profiles; make sure it exists first.
  await ensureProfile(userId)

  try {
    const result = await sql.begin(async (tx) => {
      // FOR UPDATE serializes concurrent redemptions of the same key, so the MaxRedemptions and
      // duplicate checks below can't be raced past.
      const [k] = await tx<KeyRow[]>`
        SELECT "Id","GrantsDays","MaxRedemptions","Redemptions","ExpiresAtUtc","RevokedAtUtc"
        FROM activation_keys WHERE "KeyHash" = ${keyHash} FOR UPDATE`
      if (!k) throw new RedeemError('key_not_found', 404, 'That activation key was not recognized.')
      if (k.RevokedAtUtc) throw new RedeemError('key_revoked', 410, 'That activation key has been revoked.')
      if (k.ExpiresAtUtc && k.ExpiresAtUtc.getTime() <= Date.now())
        throw new RedeemError('key_expired', 410, 'That activation key has expired.')
      if (k.Redemptions >= k.MaxRedemptions)
        throw new RedeemError('key_exhausted', 409, 'That activation key has already been fully used.')

      const dup = await tx`
        SELECT 1 FROM activation_key_redemptions WHERE "KeyId" = ${k.Id} AND "UserId" = ${userId}`
      if (dup.length) throw new RedeemError('already_redeemed', 409, 'You have already redeemed this key.')

      await tx`
        INSERT INTO activation_key_redemptions ("KeyId","UserId","GrantedDays")
        VALUES (${k.Id}, ${userId}, ${k.GrantsDays})`
      await tx`UPDATE activation_keys SET "Redemptions" = "Redemptions" + 1 WHERE "Id" = ${k.Id}`

      const premiumUntilUtc = await grantPremiumDays(tx, userId, k.GrantsDays, 'activation-key', k.Id)
      return { grantedDays: k.GrantsDays, premiumUntilUtc }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    if (e instanceof RedeemError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status })
    throw e
  }
}

import sql from './db'

// The exact TransactionSql type `sql.begin` hands its callback — callers always pass their open
// transaction so the grant commits together with their ledger write. Derived rather than imported
// so it tracks the postgres types without naming an internal type.
type Db = Parameters<Parameters<typeof sql.begin>[1]>[0]

/**
 * Extend a workspace's premium window by `days`, stacking onto any time still remaining, and mark
 * it premium + un-frozen. This does NOT dedupe — the caller owns idempotency (the redemption ledger
 * for keys, the payment status for Midtrans) and must run this inside that same transaction.
 * Returns the new PremiumUntilUtc as an ISO string.
 */
export async function grantPremiumDays(
  db: Db,
  userId: string,
  days: number,
  provider: string,
  providerRef: string | null,
): Promise<string> {
  const [row] = await db<{ PremiumUntilUtc: Date }[]>`
    INSERT INTO subscriptions
      ("Id","UserId","Plan","Status","Provider","ProviderRef","WorkspaceType",
       "PremiumUntilUtc","CurrentPeriodEndUtc","FrozenAtUtc","UpdatedAtUtc")
    VALUES
      (gen_random_uuid(), ${userId}, 'premium', 'active', ${provider}, ${providerRef}, 'premium',
       now() + (${days} * interval '1 day'), now() + (${days} * interval '1 day'), NULL, now())
    ON CONFLICT ("UserId") DO UPDATE SET
      "Plan" = 'premium', "Status" = 'active', "Provider" = ${provider}, "ProviderRef" = ${providerRef},
      "WorkspaceType" = 'premium',
      -- Stack onto whatever premium time is left; if lapsed, start from now.
      "PremiumUntilUtc" = GREATEST(now(), COALESCE(subscriptions."PremiumUntilUtc", now())) + (${days} * interval '1 day'),
      "CurrentPeriodEndUtc" = GREATEST(now(), COALESCE(subscriptions."PremiumUntilUtc", now())) + (${days} * interval '1 day'),
      "FrozenAtUtc" = NULL, "UpdatedAtUtc" = now()
    RETURNING "PremiumUntilUtc"`
  return row.PremiumUntilUtc.toISOString()
}

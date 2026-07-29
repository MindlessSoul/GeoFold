import sql from './db'

// projects / surveys / subscriptions all FK to profiles.Id, but a fresh Supabase-auth user
// has no profiles row. Create it on first write (idempotent) so the FK is always satisfied.
export async function ensureProfile(userId: string): Promise<void> {
  await sql`
    INSERT INTO profiles ("Id", "Role") VALUES (${userId}, 'surveyor')
    ON CONFLICT ("Id") DO NOTHING`
}

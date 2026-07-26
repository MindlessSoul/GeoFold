import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'

// jsonb columns are cast ::text so the wire shape matches the .NET DTO (formSchema is a JSON string),
// keeping the ported frontend unchanged.
export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  const rows = await sql`
    SELECT p."Id" AS id, p."Name" AS name, p."Description" AS description,
           p."FormSchema"::text AS "formSchema",
           p."CreatedAtUtc" AS "createdAtUtc", p."ArchivedAtUtc" AS "archivedAtUtc",
           (SELECT COUNT(*)::int FROM surveys s WHERE s."ProjectId" = p."Id") AS "surveyCount"
    FROM projects p
    WHERE p."UserId" = ${userId} AND p."ArchivedAtUtc" IS NULL
    ORDER BY p."CreatedAtUtc" DESC`

  return NextResponse.json(rows)
}

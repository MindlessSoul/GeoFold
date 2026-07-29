import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { parseSchema } from '@/lib/validation'
import { checkProjectCreation } from '@/lib/quota'
import { ensureProfile } from '@/lib/profile'
import { quotaExceeded } from '@/lib/http'

// jsonb columns are cast ::text so the wire shape matches the .NET DTO (formSchema is a JSON string).
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

export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  if (!name || name.length > 200) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })

  const formSchema = body?.formSchema && String(body.formSchema).trim() ? String(body.formSchema) : '[]'
  const { errors } = parseSchema(formSchema)
  if (errors.length) return NextResponse.json({ error: 'invalid_form_schema', errors }, { status: 400 })

  const quota = await checkProjectCreation(userId)
  if (!quota.allowed) return quotaExceeded(quota.message)

  await ensureProfile(userId)

  const [row] = await sql`
    INSERT INTO projects ("Id","UserId","Name","Description","FormSchema","CreatedAtUtc")
    VALUES (gen_random_uuid(), ${userId}, ${name}, ${body?.description ?? null}, ${formSchema}::jsonb, now())
    RETURNING "Id" AS id, "Name" AS name, "Description" AS description, "FormSchema"::text AS "formSchema",
              "CreatedAtUtc" AS "createdAtUtc", "ArchivedAtUtc" AS "archivedAtUtc", 0 AS "surveyCount"`

  return NextResponse.json(row, { status: 201 })
}

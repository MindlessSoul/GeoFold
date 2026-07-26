import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { parseSchema } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id } = await params

  const [row] = await sql`
    SELECT p."Id" AS id, p."Name" AS name, p."Description" AS description, p."FormSchema"::text AS "formSchema",
           p."CreatedAtUtc" AS "createdAtUtc", p."ArchivedAtUtc" AS "archivedAtUtc",
           (SELECT COUNT(*)::int FROM surveys s WHERE s."ProjectId" = p."Id") AS "surveyCount"
    FROM projects p WHERE p."Id" = ${id} AND p."UserId" = ${userId}`

  return row ? NextResponse.json(row) : NextResponse.json({ error: 'not_found' }, { status: 404 })
}

export async function PUT(req: Request, { params }: Params) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id } = await params

  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  if (!name || name.length > 200) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })

  const formSchema = body?.formSchema && String(body.formSchema).trim() ? String(body.formSchema) : '[]'
  const { errors } = parseSchema(formSchema)
  if (errors.length) return NextResponse.json({ error: 'invalid_form_schema', errors }, { status: 400 })

  const [row] = await sql`
    UPDATE projects SET "Name" = ${name}, "Description" = ${body?.description ?? null}, "FormSchema" = ${formSchema}::jsonb
    WHERE "Id" = ${id} AND "UserId" = ${userId}
    RETURNING "Id" AS id, "Name" AS name, "Description" AS description, "FormSchema"::text AS "formSchema",
              "CreatedAtUtc" AS "createdAtUtc", "ArchivedAtUtc" AS "archivedAtUtc",
              (SELECT COUNT(*)::int FROM surveys s WHERE s."ProjectId" = ${id}) AS "surveyCount"`

  return row ? NextResponse.json(row) : NextResponse.json({ error: 'not_found' }, { status: 404 })
}

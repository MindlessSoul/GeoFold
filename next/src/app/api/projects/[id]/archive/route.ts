import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'

// Archive rather than delete: FKs are Restrict, so a project with surveys can't be hard-deleted.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id } = await params

  const rows = await sql`
    UPDATE projects SET "ArchivedAtUtc" = COALESCE("ArchivedAtUtc", now())
    WHERE "Id" = ${id} AND "UserId" = ${userId}
    RETURNING "Id"`

  return rows.length ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'not_found' }, { status: 404 })
}

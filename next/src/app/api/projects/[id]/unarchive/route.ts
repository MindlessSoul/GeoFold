import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { checkProjectCreation } from '@/lib/quota'
import { quotaExceeded } from '@/lib/http'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id } = await params

  const [project] = await sql<{ ArchivedAtUtc: Date | null }[]>`
    SELECT "ArchivedAtUtc" FROM projects WHERE "Id" = ${id} AND "UserId" = ${userId}`
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Unarchiving consumes project quota again, so it passes the same check as creating one.
  if (project.ArchivedAtUtc !== null) {
    const quota = await checkProjectCreation(userId)
    if (!quota.allowed) return quotaExceeded(quota.message)
  }

  await sql`UPDATE projects SET "ArchivedAtUtc" = NULL WHERE "Id" = ${id} AND "UserId" = ${userId}`
  return new NextResponse(null, { status: 204 })
}

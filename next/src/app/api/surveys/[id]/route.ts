import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { surveyResponse } from '@/lib/surveys'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id } = await params

  const [owned] = await sql<{ x: number }[]>`SELECT 1 AS x FROM surveys WHERE "Id" = ${id} AND "UserId" = ${userId}`
  if (!owned) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(await surveyResponse(id))
}

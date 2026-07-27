import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'

export async function GET(req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id: surveyId, photoId } = await params

  const [photo] = await sql<{ storagePath: string }[]>`
    SELECT p."StoragePath" AS "storagePath"
    FROM survey_photos p JOIN surveys s ON s."Id" = p."SurveyId"
    WHERE p."Id" = ${photoId} AND p."SurveyId" = ${surveyId} AND s."UserId" = ${userId}`
  if (!photo) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const url = await createDownloadUrl(photo.storagePath, 900)
  return NextResponse.json({ url })
}

import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { recordPhotoUploaded } from '@/lib/quota'
import { objectExists, objectSize } from '@/lib/storage'

export async function POST(req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id: surveyId, photoId } = await params

  const [photo] = await sql<{ storagePath: string }[]>`
    SELECT p."StoragePath" AS "storagePath"
    FROM survey_photos p JOIN surveys s ON s."Id" = p."SurveyId"
    WHERE p."Id" = ${photoId} AND p."SurveyId" = ${surveyId} AND s."UserId" = ${userId}`
  if (!photo) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (!(await objectExists(photo.storagePath)))
    return NextResponse.json({ error: 'upload_not_found', message: 'Upload not found in storage yet.' }, { status: 400 })

  // Record the actual stored size for reporting; the new quota model no longer gates on storage.
  const actual = await objectSize(photo.storagePath)
  if (actual != null) {
    await sql`UPDATE survey_photos SET "SizeBytes" = ${actual} WHERE "Id" = ${photoId}`
  }

  // Only the first transition to 'uploaded' is charged against the daily photo cap — completes are
  // idempotent and may be retried.
  const [changed] = await sql<{ x: number }[]>`
    UPDATE survey_photos SET "UploadStatus" = 'uploaded'
    WHERE "Id" = ${photoId} AND "UploadStatus" <> 'uploaded'
    RETURNING 1 AS x`
  if (changed) await recordPhotoUploaded(userId)

  return new NextResponse(null, { status: 204 })
}

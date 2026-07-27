import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { checkPhotoUpload } from '@/lib/quota'
import { objectExists, objectSize } from '@/lib/storage'
import { quotaExceeded } from '@/lib/http'

export async function POST(req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id: surveyId, photoId } = await params

  const [photo] = await sql<{ storagePath: string; sizeBytes: string | null }[]>`
    SELECT p."StoragePath" AS "storagePath", p."SizeBytes" AS "sizeBytes"
    FROM survey_photos p JOIN surveys s ON s."Id" = p."SurveyId"
    WHERE p."Id" = ${photoId} AND p."SurveyId" = ${surveyId} AND s."UserId" = ${userId}`
  if (!photo) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (!(await objectExists(photo.storagePath)))
    return NextResponse.json({ error: 'upload_not_found', message: 'Upload not found in storage yet.' }, { status: 400 })

  // The declared size was client-controlled, so settle quota against what was actually stored.
  const actual = await objectSize(photo.storagePath)
  const declared = Number(photo.sizeBytes ?? 0)
  if (actual != null && actual !== declared) {
    if (actual > declared) {
      const quota = await checkPhotoUpload(userId, actual - declared)
      if (!quota.allowed) {
        await sql`UPDATE survey_photos SET "UploadStatus" = 'failed', "SizeBytes" = ${actual} WHERE "Id" = ${photoId}`
        return quotaExceeded(quota.message)
      }
    }
    await sql`UPDATE survey_photos SET "SizeBytes" = ${actual} WHERE "Id" = ${photoId}`
  }

  await sql`UPDATE survey_photos SET "UploadStatus" = 'uploaded' WHERE "Id" = ${photoId}`
  return new NextResponse(null, { status: 204 })
}

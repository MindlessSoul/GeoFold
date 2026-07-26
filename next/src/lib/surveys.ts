import sql from './db'
import { parseSchema, validateFormData } from './validation'
import { checkSurveyCreation } from './quota'

export interface UpsertSurveyInput {
  id: string
  projectId: string
  latitude: number
  longitude: number
  accuracyMeters: number | null
  capturedAtUtc: string
  detailsJson: string | null
}

export type UpsertResult =
  | { status: 'created' | 'updated'; survey: SurveyResponse }
  | { status: 'rejected'; errors: string[] }
  | { status: 'quota_exceeded'; message: string }
  | { status: 'forbidden' }

export interface SurveyResponse {
  id: string
  projectId: string
  latitude: number
  longitude: number
  accuracyMeters: number | null
  capturedAtUtc: string
  syncedAtUtc: string
  detailsJson: string | null
  status: string
  photos: unknown[]
}

// geography(point) is written with ST_MakePoint(lng, lat) and read back with ST_X/ST_Y.
export async function surveyResponse(id: string): Promise<SurveyResponse | undefined> {
  const [row] = await sql<SurveyResponse[]>`
    SELECT s."Id" AS id, s."ProjectId" AS "projectId",
           ST_Y(s."Location"::geometry) AS latitude, ST_X(s."Location"::geometry) AS longitude,
           s."AccuracyMeters" AS "accuracyMeters", s."CapturedAtUtc" AS "capturedAtUtc",
           s."SyncedAtUtc" AS "syncedAtUtc", s."Details"::text AS "detailsJson", s."Status" AS status,
           COALESCE((
             SELECT json_agg(json_build_object(
               'id', p."Id", 'uploadStatus', p."UploadStatus",
               'latitude', ST_Y(p."Location"::geometry), 'longitude', ST_X(p."Location"::geometry),
               'capturedAtUtc', p."CapturedAtUtc"))
             FROM survey_photos p WHERE p."SurveyId" = s."Id"), '[]') AS photos
    FROM surveys s WHERE s."Id" = ${id}`
  return row
}

export async function upsertSurvey(userId: string, input: UpsertSurveyInput): Promise<UpsertResult> {
  const [project] = await sql<{ FormSchema: string }[]>`
    SELECT "FormSchema"::text AS "FormSchema" FROM projects
    WHERE "Id" = ${input.projectId} AND "UserId" = ${userId}`
  if (!project) return { status: 'rejected', errors: ['Project not found or not owned by the current user.'] }

  const { fields } = parseSchema(project.FormSchema)
  const formErrors = validateFormData(input.detailsJson, fields)
  if (formErrors.length) return { status: 'rejected', errors: formErrors }

  const [existing] = await sql<{ UserId: string }[]>`SELECT "UserId" FROM surveys WHERE "Id" = ${input.id}`

  if (existing) {
    if (existing.UserId !== userId) return { status: 'forbidden' }
    // Last write wins; Status belongs to the review workflow and quota isn't charged again.
    await sql`
      UPDATE surveys SET
        "ProjectId" = ${input.projectId},
        "Location" = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
        "AccuracyMeters" = ${input.accuracyMeters},
        "CapturedAtUtc" = ${input.capturedAtUtc},
        "Details" = ${input.detailsJson}::jsonb,
        "SyncedAtUtc" = now()
      WHERE "Id" = ${input.id}`
    return { status: 'updated', survey: (await surveyResponse(input.id))! }
  }

  const quota = await checkSurveyCreation(userId)
  if (!quota.allowed) return { status: 'quota_exceeded', message: quota.message! }

  await sql`
    INSERT INTO surveys ("Id","ProjectId","UserId","Location","AccuracyMeters","CapturedAtUtc","SyncedAtUtc","Details","Status")
    VALUES (${input.id}, ${input.projectId}, ${userId},
      ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
      ${input.accuracyMeters}, ${input.capturedAtUtc}, now(), ${input.detailsJson}::jsonb, 'submitted')`
  return { status: 'created', survey: (await surveyResponse(input.id))! }
}

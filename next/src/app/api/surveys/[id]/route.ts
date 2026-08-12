import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { surveyResponse } from '@/lib/surveys'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id } = await params

  const [owned] = await sql<{ x: number }[]>`SELECT 1 AS x FROM surveys WHERE "Id" = ${id} AND "UserId" = ${userId}`
  if (!owned) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(await surveyResponse(id))
}

// Reposition an existing survey point — used by the map's drag-to-move and the
// "edit coordinates" form. A moved point has no measured GPS precision any more, so
// AccuracyMeters is cleared to null (the same honest-null convention the capture screen
// uses for manually typed coordinates) rather than left claiming the old fix's accuracy.
export async function PATCH(req: Request, { params }: Params) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { latitude, longitude } = (body ?? {}) as { latitude?: unknown; longitude?: unknown }
  const lat = Number(latitude)
  const lng = Number(longitude)
  const valid =
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  if (!valid) {
    return NextResponse.json(
      { error: 'invalid_coordinates', message: 'latitude must be between -90 and 90, longitude between -180 and 180.' },
      { status: 400 },
    )
  }

  const [row] = await sql<{ x: number }[]>`
    UPDATE surveys SET
      "Location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      "AccuracyMeters" = NULL,
      "SyncedAtUtc" = now()
    WHERE "Id" = ${id} AND "UserId" = ${userId}
    RETURNING 1 AS x`
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(await surveyResponse(id))
}

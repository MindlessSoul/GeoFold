import type {
  ProjectResponse,
  SubscriptionMe,
  SurveyDetail,
  SurveyFeatureCollection,
} from './types'

// Demo mode kicks in when Supabase isn't really configured (env still placeholder). It lets the
// whole UI be explored locally with sample data and no backend/login. The moment a real anon key
// is set, this turns off and every call goes to the real API instead.
const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const DEMO_MODE = !url || url.includes('placeholder') || !anon || anon.includes('placeholder')

if (DEMO_MODE) {
  console.info('[GeoFold] Demo mode — sample data, no backend. Set a real Supabase anon key in web/.env.local to go live.')
}

const projects: ProjectResponse[] = [
  {
    id: 'demo-sekadau',
    name: 'Sekadau',
    description: 'Survey jembatan & fasilitas desa',
    formSchema: JSON.stringify([
      { key: 'kondisi', label: 'Kondisi lokasi', type: 'text', required: true },
      { key: 'catatan', label: 'Catatan', type: 'text', required: false },
    ]),
    createdAtUtc: '2026-07-10T02:14:00Z',
    archivedAtUtc: null,
    surveyCount: 3,
  },
  {
    id: 'demo-sintang',
    name: 'Sintang',
    description: null,
    formSchema: '[]',
    createdAtUtc: '2026-07-12T06:40:00Z',
    archivedAtUtc: null,
    surveyCount: 1,
  },
]

const me: SubscriptionMe = {
  plan: 'premium',
  status: 'active',
  isActive: true,
  currentPeriodEndUtc: '2026-08-16T00:00:00Z',
  limits: { maxProjects: null, maxSurveysPerMonth: null, storageQuotaMb: 51200 },
  usage: { projects: 2, surveysThisMonth: 4, storageMb: 18.4 },
}

const demoPhoto =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='190'>" +
  "<rect width='320' height='190' fill='%233a7d6b'/><rect y='150' width='320' height='40' fill='rgba(0,0,0,0.5)'/>" +
  "<text x='12' y='176' fill='white' font-size='12' font-family='sans-serif'>-0.037622, 111.283981 · demo</text></svg>"

const geojson: SurveyFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [111.2840, -0.0376] },
      properties: { id: 's1', projectId: 'demo-sekadau', status: 'submitted', capturedAtUtc: '2026-07-15T02:41:00Z', syncedAtUtc: '2026-07-15T02:42:00Z', accuracyMeters: 6, photoCount: 1, detailsJson: '{"kondisi":"Jembatan kayu, perlu perbaikan"}' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [111.2905, -0.0331] },
      properties: { id: 's2', projectId: 'demo-sekadau', status: 'submitted', capturedAtUtc: '2026-07-15T03:10:00Z', syncedAtUtc: '2026-07-15T03:11:00Z', accuracyMeters: 4, photoCount: 1, detailsJson: '{"kondisi":"Sumur umum, kondisi baik"}' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [111.2788, -0.0419] },
      properties: { id: 's3', projectId: 'demo-sekadau', status: 'reviewed', capturedAtUtc: '2026-07-15T04:02:00Z', syncedAtUtc: '2026-07-15T04:03:00Z', accuracyMeters: 8, photoCount: 1, detailsJson: '{"kondisi":"Jalan berlubang"}' } },
  ],
}

function surveyDetail(id: string): SurveyDetail {
  const f = geojson.features.find((x) => x.properties.id === id) ?? geojson.features[0]
  return {
    id: f.properties.id, projectId: f.properties.projectId,
    latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0],
    accuracyMeters: f.properties.accuracyMeters, capturedAtUtc: f.properties.capturedAtUtc,
    syncedAtUtc: f.properties.syncedAtUtc, detailsJson: f.properties.detailsJson,
    status: f.properties.status,
    photos: [{ id: `${id}-p`, uploadStatus: 'uploaded', latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0], capturedAtUtc: f.properties.capturedAtUtc }],
  }
}

/** Canned responses so every screen renders without a backend. */
export function demoResponse<T>(path: string, options: RequestInit): T {
  const method = (options.method ?? 'GET').toUpperCase()
  const clean = path.split('?')[0]

  if (clean === '/api/v1/projects' && method === 'GET') return projects as T
  if (clean === '/api/v1/projects' && method === 'POST') {
    const body = JSON.parse(String(options.body ?? '{}'))
    return { id: 'demo-new', name: body.name, description: body.description ?? null, formSchema: body.formSchema ?? '[]', createdAtUtc: new Date().toISOString(), archivedAtUtc: null, surveyCount: 0 } as T
  }
  const projMatch = clean.match(/^\/api\/v1\/projects\/([^/]+)$/)
  if (projMatch && method === 'GET') return (projects.find((p) => p.id === projMatch[1]) ?? projects[0]) as T
  if (projMatch && method === 'PUT') return undefined as T

  if (clean === '/api/v1/subscriptions/me') return me as T
  if (clean === '/api/v1/surveys/geojson') return geojson as T

  const surveyMatch = clean.match(/^\/api\/v1\/surveys\/([^/]+)$/)
  if (surveyMatch && method === 'GET') return surveyDetail(surveyMatch[1]) as T
  if (clean === '/api/v1/surveys' && method === 'POST') return surveyDetail('s1') as T

  if (clean.endsWith('/initiate')) return { photoId: 'demo-p', uploadUrl: 'demo', storagePath: 'demo' } as T
  if (clean.endsWith('/url')) return { url: demoPhoto } as T

  return undefined as T
}

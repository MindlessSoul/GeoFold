// Supabase Storage via the service-role key (server-only). Mirrors the .NET SupabaseStorageService.
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'survey-photos'

const authHeaders = { apikey: SRK, Authorization: `Bearer ${SRK}` }

export async function createUploadUrl(objectPath: string): Promise<string> {
  const r = await fetch(`${SUPA}/storage/v1/object/upload/sign/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: authHeaders,
  })
  if (!r.ok) throw new Error(`sign upload url failed (${r.status})`)
  const body = (await r.json()) as { url: string }
  return `${SUPA}/storage/v1${body.url}`
}

export async function createDownloadUrl(objectPath: string, expiresIn = 900): Promise<string> {
  const r = await fetch(`${SUPA}/storage/v1/object/sign/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  })
  if (!r.ok) throw new Error(`sign download url failed (${r.status})`)
  const body = (await r.json()) as { signedURL: string }
  return `${SUPA}/storage/v1${body.signedURL}`
}

export async function objectExists(objectPath: string): Promise<boolean> {
  const r = await fetch(`${SUPA}/storage/v1/object/info/${BUCKET}/${objectPath}`, { headers: authHeaders })
  return r.ok
}

/** Actual stored size in bytes, or null. Used to verify the client-declared size for quota. */
export async function objectSize(objectPath: string): Promise<number | null> {
  const r = await fetch(`${SUPA}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'HEAD',
    headers: authHeaders,
  })
  if (!r.ok) return null
  const len = r.headers.get('content-length')
  return len ? Number(len) : null
}

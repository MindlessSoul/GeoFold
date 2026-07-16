import { supabase } from './supabaseClient'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5234'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  get isQuota() {
    return this.status === 403 && this.code === 'quota_exceeded'
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
      ...(options.headers ?? {}),
    },
  })

  // Token invalid/expired and refresh failed: drop the session so the guard bounces to /login.
  if (res.status === 401) {
    await supabase.auth.signOut()
    throw new ApiError(401, 'Your session expired. Please sign in again.')
  }

  if (!res.ok) {
    let code: string | undefined
    let message = `Request failed (${res.status}).`
    try {
      const body = await res.json()
      code = body.error
      message = body.message ?? (Array.isArray(body.errors) ? body.errors.join(', ') : message)
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(res.status, message, code)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

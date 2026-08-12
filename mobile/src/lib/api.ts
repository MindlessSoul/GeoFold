import { API_BASE_URL, DEMO_MODE } from './config';
import { demoResponse } from './demo';
import { supabase } from './supabase';

/**
 * API client for the GeoFold server.
 *
 * The web client is same-origin and rides on the Supabase cookie session. A native app has no
 * cookie jar, so it authenticates with `Authorization: Bearer <access_token>` — the server's
 * `getUserId()` accepts either.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** 403 raised by a plan limit rather than by a permission problem. */
  get isQuota() {
    return this.status === 403 && this.code === 'quota_exceeded';
  }
}

export async function accessToken(): Promise<string | null> {
  if (DEMO_MODE) return 'demo';
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const method = options.method ?? 'GET';

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 180));
    // The body has to reach the demo store, or writes look accepted and then vanish.
    return demoResponse<T>(path, method, options.body);
  }

  const token = await accessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 401) {
    // The refresh token is gone or revoked. Clearing the session sends the router back to /login.
    await supabase.auth.signOut();
    throw new ApiError(401, 'Your session expired. Please sign in again.');
  }

  if (!res.ok) {
    let code: string | undefined;
    let message = `Request failed (${res.status}).`;
    try {
      const body = await res.json();
      code = body.error;
      message = body.message ?? (Array.isArray(body.errors) ? body.errors.join(', ') : message);
    } catch {
      // non-JSON body — keep the generic message
    }
    throw new ApiError(res.status, message, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Fire-and-forget wake-up so a cold-started server boots while the surveyor is still typing. */
export function warmBackend(): void {
  if (DEMO_MODE) return;
  fetch(`${API_BASE_URL}/api/health`).catch(() => {});
}

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

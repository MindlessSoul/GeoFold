import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from './supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET

/**
 * Resolves the caller's user id, or null. Accepts either an Authorization: Bearer token
 * (verified HS256 against the Supabase secret — used by tests and API clients) or the browser's
 * Supabase cookie session.
 */
export async function getUserId(req: Request): Promise<string | null> {
  const authz = req.headers.get('authorization')
  if (authz?.startsWith('Bearer ') && JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(authz.slice(7), new TextEncoder().encode(JWT_SECRET), {
        issuer: `${SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      })
      return typeof payload.sub === 'string' ? payload.sub : null
    } catch {
      return null
    }
  }

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export const unauthorized = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 })

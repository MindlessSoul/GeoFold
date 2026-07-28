'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from './supabase/client'
import { DEMO_MODE } from './demo'

const DEMO_SESSION = { user: { email: 'demo@geofold.app' } } as unknown as Session
const DEMO_KEY = 'geofold-demo'

interface AuthValue {
  session: Session | null
  loading: boolean
  /** Demo mode only: enter/leave the sample-data session (shown behind the real login screen). */
  enterDemo: () => void
  exitDemo: () => void
}

const AuthContext = createContext<AuthValue>({ session: null, loading: true, enterDemo: () => {}, exitDemo: () => {} })
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const enterDemo = useCallback(() => {
    sessionStorage.setItem(DEMO_KEY, '1')
    setSession(DEMO_SESSION)
  }, [])
  const exitDemo = useCallback(() => {
    sessionStorage.removeItem(DEMO_KEY)
    setSession(null)
  }, [])

  useEffect(() => {
    if (DEMO_MODE) {
      // Start unauthenticated so the login screen is actually visible; "Continue" enters the demo.
      setSession(sessionStorage.getItem(DEMO_KEY) === '1' ? DEMO_SESSION : null)
      setLoading(false)
      return
    }
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading, enterDemo, exitDemo }}>{children}</AuthContext.Provider>
}

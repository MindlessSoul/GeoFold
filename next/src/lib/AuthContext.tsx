'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from './supabase/client'
import { DEMO_MODE } from './demo'

const DEMO_SESSION = { user: { email: 'demo@geofold.app' } } as unknown as Session

interface AuthValue {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthValue>({ session: null, loading: true })
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      setSession(DEMO_SESSION)
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

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { DEMO_MODE } from '../lib/demo'

// A stand-in session so the route guard lets you into the app in demo mode without a real login.
const DEMO_SESSION = { user: { email: 'demo@geofold.app' } } as unknown as Session

interface AuthValue {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthValue>({ session: null, loading: true })

// eslint-disable-next-line react-refresh/only-export-components
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

    // Supabase persists the session and refreshes tokens on its own; we just mirror it into React.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

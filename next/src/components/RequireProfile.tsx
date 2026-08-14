'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'

// Sits inside the app shell: everyone must have a completed profile (name + WhatsApp + domicile +
// gender) before using the app. Incomplete → redirected to /onboarding. /onboarding lives outside
// the (app) group, so it is never gated by this and there is no redirect loop.
export function RequireProfile({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ok, setOk] = useState(DEMO_MODE)

  useEffect(() => {
    if (DEMO_MODE) return
    let alive = true
    api<{ completed: boolean }>('/api/profile')
      .then((p) => {
        if (!alive) return
        if (!p.completed) router.replace('/onboarding')
        else setOk(true)
      })
      // A failed check shouldn't hard-lock the app; let them through and let API calls surface errors.
      .catch(() => alive && setOk(true))
    return () => { alive = false }
  }, [router])

  if (!ok) return <div className="center">Loading…</div>
  return <>{children}</>
}

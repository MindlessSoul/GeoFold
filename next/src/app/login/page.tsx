'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/AuthContext'
import { DEMO_MODE } from '@/lib/demo'

type Mode = 'login' | 'signup' | 'forgot'

const titles: Record<Mode, string> = {
  login: 'Sign in',
  signup: 'Create your account',
  forgot: 'Reset your password',
}

export default function LoginPage() {
  const { session, loading, enterDemo } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && session) router.replace('/home')
  }, [loading, session, router])

  if (loading || session) return <div className="center">Loading…</div>

  const switchMode = (m: Mode) => { setMode(m); setError(null); setNotice(null) }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (DEMO_MODE) {
      enterDemo() // no real backend configured yet — any credentials continue into the sample data
      return
    }
    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/reset`,
        })
        if (error) throw error
        setNotice('If that email has an account, a password reset link is on its way.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap graticule">
      <div className="auth">
        <Link href="/" className="brand" style={{ justifyContent: 'center' }}><span className="mark"><MapPin size={18} /></span>GeoFold</Link>
        <div className="card">
          <div className="card-title">{titles[mode]}</div>
          {DEMO_MODE && (
            <p className="hint" style={{ marginTop: 0, marginBottom: 4 }}>
              Demo mode — enter anything to explore with sample data.
            </p>
          )}
          {mode === 'forgot' && !DEMO_MODE && (
            <p className="hint" style={{ marginTop: 0 }}>Enter your email and we&apos;ll send a reset link.</p>
          )}
          <form onSubmit={submit}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            {mode !== 'forgot' && (
              <>
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </>
            )}
            {mode === 'login' && !DEMO_MODE && (
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); switchMode('forgot') }} style={{ fontSize: 13 }}>Forgot password?</a>
              </div>
            )}
            {error && <p className="error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</p>}
            {notice && <p style={{ color: 'var(--spruce-ink)', fontSize: 14, marginTop: 12, marginBottom: 0 }}>{notice}</p>}
            <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }}>
              {busy ? 'Working…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
            </button>
          </form>
        </div>
        <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>
          {mode === 'forgot' ? (
            <a href="#" onClick={(e) => { e.preventDefault(); switchMode('login') }}>Back to sign in</a>
          ) : (
            <>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <a href="#" onClick={(e) => { e.preventDefault(); switchMode(mode === 'login' ? 'signup' : 'login') }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

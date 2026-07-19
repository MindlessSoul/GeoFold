import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { session, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="center">Loading…</div>
  if (session) return <Navigate to="/projects" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth">
        <div className="brand">
          <span className="mark">
            <MapPin size={18} />
          </span>
          GeoFold
        </div>

        <div className="card">
          <div className="card-title">{mode === 'login' ? 'Sign in' : 'Create your account'}</div>
          <form onSubmit={submit}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {error && <p className="error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</p>}
            {notice && <p style={{ color: 'var(--ok)', fontSize: 14, marginBottom: 0 }}>{notice}</p>}
            <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }}>
              {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          </form>
        </div>

        <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
              setNotice(null)
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </a>
        </p>
      </div>
    </div>
  )
}

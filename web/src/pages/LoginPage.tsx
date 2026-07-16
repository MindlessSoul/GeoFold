import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
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

  if (loading) return <div className="center muted">Loading…</div>
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
        // On success the auth listener updates the session and this component redirects.
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
    <div className="auth">
      <h1 style={{ marginBottom: 4 }}>GeoFold</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
      </p>

      <form onSubmit={submit} className="card">
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
        {error && <p className="error" style={{ marginBottom: 0 }}>{error}</p>}
        {notice && <p style={{ color: 'var(--ok)', marginBottom: 0 }}>{notice}</p>}
        <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 14 }}>
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <p className="muted" style={{ textAlign: 'center' }}>
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
  )
}

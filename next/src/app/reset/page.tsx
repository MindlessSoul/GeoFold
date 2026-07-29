'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { DEMO_MODE } from '@/lib/demo'

export default function ResetPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) { setReady(true); return }
    const supabase = createSupabaseBrowserClient()
    // The recovery link puts tokens in the URL; the client turns them into a session on load.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (DEMO_MODE) { setError('Password reset is not available in demo mode.'); return }
    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.replace('/home'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap graticule">
      <div className="auth">
        <Link href="/" className="brand" style={{ justifyContent: 'center' }}><span className="mark"><MapPin size={18} /></span>GeoFold</Link>
        <div className="card">
          <div className="card-title">Choose a new password</div>
          {done ? (
            <p style={{ color: 'var(--spruce-ink)', fontSize: 14, margin: 0 }}>Password updated — signing you in…</p>
          ) : ready && !DEMO_MODE && !hasSession ? (
            <>
              <p className="hint" style={{ marginTop: 0 }}>This reset link is invalid or has expired. Request a new one from the sign-in screen.</p>
              <Link href="/login" className="lp-btn ghost" style={{ marginTop: 6 }}>Back to sign in</Link>
            </>
          ) : (
            <form onSubmit={submit}>
              <label>New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
              <label>Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" />
              {error && <p className="error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</p>}
              <button type="submit" disabled={busy || !ready} style={{ width: '100%', marginTop: 16 }}>
                {busy ? 'Working…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
        <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

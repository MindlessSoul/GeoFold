'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/AuthContext'

interface ProfileData {
  fullName: string
  whatsappNumber: string
  domicile: string
  gender: string
  occupation: string
  completed: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const { session, loading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [domicile, setDomicile] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Must be signed in to complete a profile.
  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [loading, session, router])

  // Prefill any partial data; if already complete, skip straight to the app.
  useEffect(() => {
    if (!session) return
    api<ProfileData>('/api/profile')
      .then((p) => {
        if (p.completed) { router.replace('/home'); return }
        setFullName(p.fullName)
        setWhatsapp(p.whatsappNumber)
        setDomicile(p.domicile)
        setGender(p.gender)
        setOccupation(p.occupation)
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [session, router])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, whatsappNumber: whatsapp, domicile, gender, occupation, agreedTerms: agree }),
      })
      router.replace('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !session || !ready) {
    return <div className="mk-login-shell"><div className="mk-login-body">Loading…</div></div>
  }

  return (
    <div className="mk-login-shell">
      <div className="mk-login-top">
        <Link href="/" className="mk-wordmark">Geofold</Link>
      </div>

      <div className="mk-login-body">
        <div className="mk-card" style={{ maxWidth: 460 }}>
          <div className="mk-card-t">Lengkapi profil kamu</div>
          <div className="mk-card-sub">Sekali isi, biar akunmu aman dan bisa dihubungi. Wajib sebelum mulai.</div>

          {error && <div className="mk-error">{error}</div>}

          <form onSubmit={submit}>
            <div className="mk-card-fields">
              <div>
                <label className="mk-label" htmlFor="fullName">Nama lengkap *</label>
                <input id="fullName" className="mk-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
              </div>
              <div>
                <label className="mk-label" htmlFor="wa">Nomor WhatsApp *</label>
                <input id="wa" className="mk-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required inputMode="tel" placeholder="0812xxxxxxxx" />
              </div>
              <div>
                <label className="mk-label" htmlFor="domicile">Domisili (tempat tinggal) *</label>
                <input id="domicile" className="mk-input" value={domicile} onChange={(e) => setDomicile(e.target.value)} required maxLength={120} placeholder="Kota / Kabupaten" />
              </div>
              <div>
                <label className="mk-label" htmlFor="gender">Jenis kelamin *</label>
                <select id="gender" className="mk-input" value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="">Pilih…</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="mk-label" htmlFor="occupation">Bidang pekerjaan (opsional)</label>
                <input id="occupation" className="mk-input" value={occupation} onChange={(e) => setOccupation(e.target.value)} maxLength={120} placeholder="mis. Surveyor, Mahasiswa" />
              </div>
            </div>

            <label className="mk-consent">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
              <span>
                Saya sudah membaca dan menyetujui{' '}
                <Link href="/privacy" target="_blank">Privacy Policy</Link> dan{' '}
                <Link href="/terms" target="_blank">Terms of Service</Link>, serta memahami bahwa saya menggunakan layanan ini atas tanggung jawab sendiri.
              </span>
            </label>

            <button type="submit" className="mk-submit" disabled={busy || !agree}>
              {busy ? 'Menyimpan…' : 'Simpan & lanjut'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

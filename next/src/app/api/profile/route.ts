import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserId, unauthorized } from '@/lib/auth'
import { ensureProfile } from '@/lib/profile'

interface ProfileRow {
  FullName: string | null
  WhatsappNumber: string | null
  Domicile: string | null
  Gender: string | null
  Occupation: string | null
}

const GENDERS = ['Laki-laki', 'Perempuan']

// Normalise an Indonesian mobile number to +62 form. Returns '' if it can't be a valid number.
function normalizeWhatsapp(raw: string): string {
  let d = raw.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('0')) d = '62' + d.slice(1)
  else if (d.startsWith('8')) d = '62' + d
  if (!d.startsWith('62')) return ''
  if (d.length < 10 || d.length > 15) return ''
  return '+' + d
}

export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()
  await ensureProfile(userId)

  const [r] = await sql<ProfileRow[]>`
    SELECT "FullName", "WhatsappNumber", "Domicile", "Gender", "Occupation"
    FROM profiles WHERE "Id" = ${userId}`

  const completed = !!(r?.FullName && r?.WhatsappNumber && r?.Domicile && r?.Gender)
  return NextResponse.json({
    fullName: r?.FullName ?? '',
    whatsappNumber: r?.WhatsappNumber ?? '',
    domicile: r?.Domicile ?? '',
    gender: r?.Gender ?? '',
    occupation: r?.Occupation ?? '',
    completed,
  })
}

export async function PUT(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  let b: unknown
  try {
    b = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const body = (b ?? {}) as Record<string, unknown>

  const fullName = String(body.fullName ?? '').trim()
  const whatsappNumber = normalizeWhatsapp(String(body.whatsappNumber ?? ''))
  const domicile = String(body.domicile ?? '').trim()
  const gender = String(body.gender ?? '').trim()
  const occupation = String(body.occupation ?? '').trim() || null

  const agreedTerms = body.agreedTerms === true

  const errors: string[] = []
  if (!fullName || fullName.length > 120) errors.push('Nama wajib diisi (maks 120 karakter).')
  if (!whatsappNumber) errors.push('Nomor WhatsApp tidak valid (contoh: 0812xxxx).')
  if (!domicile || domicile.length > 120) errors.push('Domisili wajib diisi.')
  if (!GENDERS.includes(gender)) errors.push('Jenis kelamin wajib dipilih.')
  if (occupation && occupation.length > 120) errors.push('Bidang pekerjaan terlalu panjang.')
  if (!agreedTerms) errors.push('Kamu harus menyetujui Privacy Policy & Terms untuk lanjut.')
  if (errors.length) return NextResponse.json({ error: 'invalid_profile', errors }, { status: 400 })

  await ensureProfile(userId)
  await sql`
    UPDATE profiles SET
      "FullName" = ${fullName},
      "WhatsappNumber" = ${whatsappNumber},
      "Domicile" = ${domicile},
      "Gender" = ${gender},
      "Occupation" = ${occupation},
      "DisplayName" = ${fullName},
      "ProfileCompletedAtUtc" = now(),
      "AgreedTermsAtUtc" = COALESCE("AgreedTermsAtUtc", now())
    WHERE "Id" = ${userId}`

  return NextResponse.json({ ok: true })
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, MapPin, Camera, Search } from 'lucide-react'
import { api } from '@/lib/api-client'
import { csvBlob, xlsxBlob, download, type ExportRow, type XlsxImage } from '@/lib/export'
import { buildReferences } from '@/lib/reference'
import type { ProjectResponse, SurveyDetail } from '@/lib/types'

const BASE_COLUMNS = ['Reference', 'Project', 'Latitude', 'Longitude', 'Accuracy (m)', 'Captured At (UTC)', 'Status', 'Foto']

function parseDetails(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function detailText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const dayString = (iso: string) => iso.slice(0, 10)

// Fetch a photo's bytes (via its short-lived signed URL) for embedding into the Excel file.
// Returns null for anything that isn't a PNG/JPEG (e.g. the demo SVG placeholder).
async function fetchPhotoImage(surveyId: string, photoId: string): Promise<XlsxImage | null> {
  try {
    const { url } = await api<{ url: string }>(`/api/surveys/${surveyId}/photos/${photoId}/url`)
    const blob = await (await fetch(url)).blob()
    const buf = new Uint8Array(await blob.arrayBuffer())
    if (buf[0] === 0x89 && buf[1] === 0x50) return { data: buf, ext: 'png' }
    if (buf[0] === 0xff && buf[1] === 0xd8) return { data: buf, ext: 'jpeg' }
    return null
  } catch {
    return null
  }
}

function PhotoThumb({ surveyId, photoId, onOpen }: { surveyId: string; photoId: string; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api<{ url: string }>(`/api/surveys/${surveyId}/photos/${photoId}/url`)
      .then((r) => alive && setUrl(r.url))
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [surveyId, photoId])

  if (failed) return null
  if (!url) return <div className="rec-thumb-ph" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Survey photo" className="rec-thumb" onClick={() => onOpen(url)} />
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<SurveyDetail[] | null>(null)
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)

  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    api<ProjectResponse[]>('/api/projects').then(setProjects).catch(() => {})
    api<SurveyDetail[]>('/api/surveys?pageSize=500')
      .then(setSurveys)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load records.'))
  }, [])

  const projectName = useMemo(() => {
    const m = new Map(projects.map((p) => [p.id, p.name]))
    return (id: string) => m.get(id) ?? '—'
  }, [projects])

  const refOf = useMemo(
    () => buildReferences(surveys ?? [], projectName),
    [surveys, projectName],
  )

  const statuses = useMemo(() => {
    const set = new Set<string>()
    for (const s of surveys ?? []) set.add(s.status)
    return [...set].sort()
  }, [surveys])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (surveys ?? []).filter((s) => {
      if (projectId && s.projectId !== projectId) return false
      if (status && s.status !== status) return false
      const day = dayString(s.capturedAtUtc)
      if (from && day < from) return false
      if (to && day > to) return false
      if (q) {
        const hay = `${refOf.get(s.id) ?? ''} ${projectName(s.projectId)} ${s.latitude} ${s.longitude} ${s.detailsJson ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [surveys, projectId, status, from, to, query, projectName, refOf])

  const { headers, rows } = useMemo(() => {
    const detailKeys: string[] = []
    const seen = new Set<string>()
    for (const s of filtered) {
      for (const k of Object.keys(parseDetails(s.detailsJson))) {
        if (!seen.has(k)) { seen.add(k); detailKeys.push(k) }
      }
    }
    const headers = [...BASE_COLUMNS, ...detailKeys]
    const rows: ExportRow[] = filtered.map((s) => {
      const details = parseDetails(s.detailsJson)
      const row: ExportRow = {
        Reference: refOf.get(s.id) ?? s.id.slice(0, 8),
        Project: projectName(s.projectId),
        Latitude: s.latitude,
        Longitude: s.longitude,
        'Accuracy (m)': s.accuracyMeters ?? '',
        'Captured At (UTC)': s.capturedAtUtc,
        Status: s.status,
        Foto: s.photos.length,
      }
      for (const k of detailKeys) row[k] = detailText(details[k])
      return row
    })
    return { headers, rows }
  }, [filtered, projectName, refOf])

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    download(csvBlob(headers, rows), `geofold-surveys-${stamp}.csv`)
  }

  const exportXlsx = async () => {
    setPreparing(true)
    try {
      // Fetch the first photo of each record (in row order) to embed into the sheet.
      const images = await Promise.all(
        filtered.map((s) => (s.photos.length ? fetchPhotoImage(s.id, s.photos[0].id) : Promise.resolve(null))),
      )
      const stamp = new Date().toISOString().slice(0, 10)
      download(xlsxBlob(headers, rows, { imageColumn: 'Foto', images }), `geofold-surveys-${stamp}.xlsx`)
    } finally {
      setPreparing(false)
    }
  }

  const resetFilters = () => { setProjectId(''); setStatus(''); setQuery(''); setFrom(''); setTo('') }
  const hasFilters = projectId || status || query || from || to

  return (
    <div>
      <div className="page-head">
        <h1>Records</h1>
        <p>Every survey point you&apos;ve captured. Filter, search, view photos, and export to CSV or Excel.</p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="filters">
        <div className="fld wide search">
          <label>Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Reference, coordinates, notes…" style={{ paddingLeft: 30 }} />
          </div>
        </div>
        <div className="fld">
          <label>Project</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="fld">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="fld">
          <label>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="fld">
          <label>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="exportbar">
        <span className="hint">
          {surveys === null ? 'Loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`}
          {hasFilters && surveys !== null && ` of ${surveys.length}`}
          {hasFilters && <button className="ghost" onClick={resetFilters} style={{ marginLeft: 10, padding: '4px 10px' }}>Clear filters</button>}
        </span>
        <div className="btns">
          <button className="ghost" onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={15} style={{ verticalAlign: -3, marginRight: 6 }} /> CSV
          </button>
          <button onClick={exportXlsx} disabled={rows.length === 0 || preparing}>
            {preparing ? <span className="spinner" style={{ marginRight: 8 }} /> : <Download size={15} style={{ verticalAlign: -3, marginRight: 6 }} />}
            {preparing ? 'Menyiapkan…' : 'Excel + foto'}
          </button>
        </div>
      </div>

      {surveys !== null && filtered.length === 0 && (
        <div className="empty">
          {surveys.length === 0
            ? <>No records yet. <Link href="/capture">Capture your first survey</Link>.</>
            : 'No records match these filters.'}
        </div>
      )}

      {filtered.map((s) => {
        const details = Object.entries(parseDetails(s.detailsJson))
        const pending = s.status.toLowerCase() === 'pending'
        return (
          <div key={s.id} className={`rec${pending ? ' pending' : ''}`}>
            {s.photos.length > 0 && <PhotoThumb surveyId={s.id} photoId={s.photos[0].id} onOpen={setLightbox} />}
            <div className="rec-body">
              <div className="rec-ref">{refOf.get(s.id) ?? s.id.slice(0, 8)}</div>
              <div className="rec-top">
                <span className="coord mono"><MapPin size={13} /> {s.latitude.toFixed(6)}, {s.longitude.toFixed(6)}</span>
                <span className={`badge status-${s.status.toLowerCase()}`}>{s.status}</span>
              </div>
              <div className="rec-meta">
                <span className="rec-proj">{projectName(s.projectId)}</span>
                <span className="mono">{new Date(s.capturedAtUtc).toLocaleString()}</span>
                {s.accuracyMeters != null && <span>±{Math.round(s.accuracyMeters)}m</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Camera size={13} /> {s.photos.length}</span>
              </div>
              {details.length > 0 && (
                <div className="chips">
                  {details.map(([k, v]) => <span key={k} className="chip"><b>{k}:</b> {detailText(v) || '—'}</span>)}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Survey photo" />
        </div>
      )}
    </div>
  )
}

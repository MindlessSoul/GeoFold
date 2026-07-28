'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import type { ProjectResponse, SubscriptionMe, SurveyFeatureCollection } from '@/lib/types'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="center" style={{ minHeight: '42vh' }}>Loading map…</div>,
})

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
      <div className="hint">{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  )
}

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectResponse[] | null>(null)
  const [me, setMe] = useState<SubscriptionMe | null>(null)
  const [fc, setFc] = useState<SurveyFeatureCollection | null>(null)
  const [mapPremium, setMapPremium] = useState(false)

  useEffect(() => {
    api<ProjectResponse[]>('/api/projects').then(setProjects).catch(() => setProjects([]))
    api<SubscriptionMe>('/api/subscriptions/me').then(setMe).catch(() => {})
    api<SurveyFeatureCollection>('/api/surveys/geojson')
      .then(setFc)
      .catch((e) => { if (e instanceof ApiError && e.status === 403) setMapPremium(true) })
  }, [])

  const features = fc?.features ?? []

  return (
    <div>
      <div className="page-head">
        <h1>Overview</h1>
        <p>Your survey projects and where they are on the ground.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <Metric label="Projects" value={me?.usage.projects ?? projects?.length ?? '—'} />
        <Metric label="Surveys this month" value={me?.usage.surveysThisMonth ?? '—'} />
        <Metric label="Storage" value={me ? `${me.usage.storageMb} MB` : '—'} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ margin: 0 }}>Survey locations</div>
          {!mapPremium && <span className="badge accent">{features.length} points</span>}
        </div>
        {mapPremium ? (
          <p className="muted" style={{ padding: '0 18px 18px', marginTop: 0 }}>
            The map is a Premium feature — surveys are still being collected. <Link href="/subscription">Upgrade</Link> to see them here.
          </p>
        ) : fc === null ? (
          <div className="center" style={{ minHeight: '42vh' }}>Loading…</div>
        ) : (
          <MapView features={features} height="46vh" />
        )}
      </div>

      <div className="row" style={{ margin: '24px 0 12px' }}>
        <h1 style={{ fontSize: 18 }}>Projects</h1>
        <Link href="/capture"><button><Camera size={16} style={{ verticalAlign: -3, marginRight: 6 }} /> New capture</button></Link>
      </div>

      {projects?.length === 0 && (
        <div className="empty">No projects yet. <Link href="/projects/new">Create your first one</Link>.</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {projects?.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card" style={{ margin: 0 }}>
            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
            <div className="hint" style={{ marginTop: 2 }}>{p.surveyCount} surveys</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

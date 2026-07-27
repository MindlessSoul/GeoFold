'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { SubscriptionMe } from '@/lib/types'

function Meter({ label, used, limit, unit = '' }: { label: string; used: number; limit: number | null; unit?: string }) {
  const unlimited = limit === null
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const near = pct >= 90
  return (
    <div className={`meter${near ? ' warn' : ''}`}>
      <div className="row" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        <span className="hint" style={{ fontFamily: 'var(--font-mono)' }}>
          {used}{unit} {unlimited ? '· unlimited' : `/ ${limit}${unit}`}
        </span>
      </div>
      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function SubscriptionPage() {
  const [me, setMe] = useState<SubscriptionMe | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<SubscriptionMe>('/api/subscriptions/me').then(setMe).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load.'))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!me) return <p className="muted">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h1>Subscription</h1>
        <p>Your plan and how much of it you&apos;re using.</p>
      </div>
      <div className="card">
        <div className="row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pill">{me.plan}</span>
            <span className="hint">{me.status}</span>
          </div>
          <span style={{ fontSize: 14, color: me.isActive ? 'var(--spruce-ink)' : 'var(--ink-3)', fontWeight: 500 }}>
            {me.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {me.currentPeriodEndUtc && (
          <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>Renews {new Date(me.currentPeriodEndUtc).toLocaleDateString()}</p>
        )}
      </div>
      <div className="card">
        <div className="card-title">Usage</div>
        <Meter label="Projects" used={me.usage.projects} limit={me.limits.maxProjects} />
        <Meter label="Surveys this month" used={me.usage.surveysThisMonth} limit={me.limits.maxSurveysPerMonth} />
        <Meter label="Storage" used={me.usage.storageMb} limit={me.limits.storageQuotaMb} unit=" MB" />
      </div>
    </div>
  )
}

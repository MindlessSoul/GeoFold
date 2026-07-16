import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { SubscriptionMe } from '../lib/types'

function Meter({ label, used, limit, unit = '' }: { label: string; used: number; limit: number | null; unit?: string }) {
  const unlimited = limit === null
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const near = pct >= 90
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row" style={{ marginBottom: 4 }}>
        <span>{label}</span>
        <span className="muted">
          {used}
          {unit} {unlimited ? '/ unlimited' : `/ ${limit}${unit}`}
        </span>
      </div>
      <div className={`bar${near ? ' warn' : ''}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SubscriptionPage() {
  const [me, setMe] = useState<SubscriptionMe | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<SubscriptionMe>('/api/v1/subscriptions/me')
      .then(setMe)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load subscription.'))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!me) return <p className="muted">Loading…</p>

  return (
    <div>
      <h1>Subscription</h1>

      <div className="card">
        <div className="row">
          <div>
            <strong style={{ textTransform: 'capitalize' }}>{me.plan}</strong>
            <span className="badge" style={{ marginLeft: 8 }}>{me.status}</span>
          </div>
          <span style={{ color: me.isActive ? 'var(--ok)' : 'var(--muted)' }}>
            {me.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {me.currentPeriodEndUtc && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Renews {new Date(me.currentPeriodEndUtc).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="card">
        <strong>Usage</strong>
        <div style={{ marginTop: 12 }}>
          <Meter label="Projects" used={me.usage.projects} limit={me.limits.maxProjects} />
          <Meter label="Surveys this month" used={me.usage.surveysThisMonth} limit={me.limits.maxSurveysPerMonth} />
          <Meter label="Storage" used={me.usage.storageMb} limit={me.limits.storageQuotaMb} unit=" MB" />
        </div>
      </div>
    </div>
  )
}

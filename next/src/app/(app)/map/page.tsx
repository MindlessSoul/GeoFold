'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { api, ApiError } from '@/lib/api-client'
import type { SurveyFeatureCollection } from '@/lib/types'

// Leaflet touches window, so load the map only on the client.
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="center" style={{ minHeight: '72vh' }}>Loading map…</div>,
})

export default function MapPage() {
  const [fc, setFc] = useState<SurveyFeatureCollection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [premiumRequired, setPremiumRequired] = useState(false)

  useEffect(() => {
    api<SurveyFeatureCollection>('/api/surveys/geojson')
      .then(setFc)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) setPremiumRequired(true)
        else setError(e instanceof Error ? e.message : 'Failed to load surveys.')
      })
  }, [])

  if (premiumRequired) {
    return (
      <div>
        <div className="page-head"><h1>Survey map</h1></div>
        <div className="card">
          <div className="card-title">Premium feature</div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Viewing surveys on a map is available on the Premium plan. Your surveys are still being collected — upgrade to see them plotted here.
          </p>
        </div>
      </div>
    )
  }

  const features = fc?.features ?? []
  return (
    <div>
      <div className="page-head">
        <div className="row">
          <h1>Survey map</h1>
          <span className="badge accent">{features.length} points</span>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {!error && fc === null && <div className="center" style={{ minHeight: '72vh' }}>Loading…</div>}
      {fc !== null && <MapView features={features} />}
      {fc !== null && features.length === 0 && !error && (
        <p className="muted">No surveys yet — points will appear here once field data is synced.</p>
      )}
    </div>
  )
}

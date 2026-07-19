import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api, ApiError } from '../lib/api'
import type { SurveyDetail, SurveyFeatureCollection, SurveyProperties } from '../lib/types'

const DEFAULT_CENTER: [number, number] = [-2.5, 118] // Indonesia-ish until data recentres it.

function parseDetails(json: string | null): [string, string][] {
  if (!json) return []
  try {
    const obj = JSON.parse(json)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.entries(obj).map(([k, v]) => [k, v == null ? '' : String(v)])
    }
  } catch {
    // ignore malformed detailsJson; the survey just shows without a description
  }
  return []
}

function SurveyMarker({ feature }: { feature: SurveyFeatureCollection['features'][number] }) {
  const props: SurveyProperties = feature.properties
  const [lng, lat] = feature.geometry.coordinates
  const details = parseDetails(props.detailsJson)

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'none'>('idle')

  // Fetch the photo only when the popup is actually opened, and only once per marker.
  const loadPhoto = async () => {
    if (state !== 'idle') return
    if (props.photoCount === 0) {
      setState('none')
      return
    }
    setState('loading')
    try {
      const detail = await api<SurveyDetail>(`/api/v1/surveys/${props.id}`)
      const photo = detail.photos.find((p) => p.uploadStatus === 'uploaded') ?? detail.photos[0]
      if (!photo) {
        setState('none')
        return
      }
      const { url } = await api<{ url: string }>(`/api/v1/surveys/${props.id}/photos/${photo.id}/url`)
      setPhotoUrl(url)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return (
    <CircleMarker center={[lat, lng]} radius={7} eventHandlers={{ popupopen: loadPhoto }}>
      <Popup maxWidth={260}>
        <div style={{ minWidth: 200 }}>
          {photoUrl ? (
            <img src={photoUrl} alt="Survey" style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />
          ) : (
            <div
              style={{
                fontSize: 12,
                color: '#666',
                padding: '18px 0',
                textAlign: 'center',
                background: '#f2f2ef',
                borderRadius: 6,
                marginBottom: 6,
              }}
            >
              {state === 'loading' && 'Loading photo…'}
              {state === 'error' && 'Photo unavailable'}
              {state === 'none' && 'No photo'}
              {state === 'idle' && !photoUrl && 'Open to load photo'}
            </div>
          )}

          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{props.status}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {new Date(props.capturedAtUtc).toLocaleString()}
          </div>

          {details.length > 0 && (
            <table style={{ marginTop: 6, fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>
                {details.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: '#666', paddingRight: 8, verticalAlign: 'top' }}>{k}</td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}

export function MapPage() {
  const [fc, setFc] = useState<SurveyFeatureCollection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [premiumRequired, setPremiumRequired] = useState(false)

  useEffect(() => {
    api<SurveyFeatureCollection>('/api/v1/surveys/geojson')
      .then(setFc)
      .catch((e) => {
        // The map feed is premium-only; a free user gets 403 here.
        if (e instanceof ApiError && e.status === 403) setPremiumRequired(true)
        else setError(e instanceof Error ? e.message : 'Failed to load surveys.')
      })
  }, [])

  if (premiumRequired) {
    return (
      <div>
        <div className="page-head">
          <h1>Survey map</h1>
        </div>
        <div className="card">
          <div className="card-title">Premium feature</div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Viewing surveys on a map is available on the Premium plan. Your surveys are still being
            collected — upgrade to see them plotted here.
          </p>
        </div>
      </div>
    )
  }

  const features = fc?.features ?? []
  const first = features[0]
  const center: [number, number] = first
    ? [first.geometry.coordinates[1], first.geometry.coordinates[0]]
    : DEFAULT_CENTER

  return (
    <div>
      <div className="page-head">
        <div className="row">
          <h1>Survey map</h1>
          <span className="badge accent">{features.length} points</span>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div style={{ height: '70vh', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer center={center} zoom={first ? 12 : 5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {features.map((f) => (
            <SurveyMarker key={f.properties.id} feature={f} />
          ))}
        </MapContainer>
      </div>

      {!error && features.length === 0 && (
        <p className="muted">No surveys yet — points will appear here once field data is synced.</p>
      )}
    </div>
  )
}

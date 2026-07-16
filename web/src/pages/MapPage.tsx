import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../lib/api'
import type { SurveyFeatureCollection } from '../lib/types'

// Indonesia-ish default view until data recentres it.
const DEFAULT_CENTER: [number, number] = [-2.5, 118]

export function MapPage() {
  const [fc, setFc] = useState<SurveyFeatureCollection | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<SurveyFeatureCollection>('/api/v1/surveys/geojson')
      .then(setFc)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load surveys.'))
  }, [])

  const features = fc?.features ?? []
  // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
  const first = features[0]
  const center: [number, number] = first
    ? [first.geometry.coordinates[1], first.geometry.coordinates[0]]
    : DEFAULT_CENTER

  return (
    <div>
      <div className="row">
        <h1>Survey map</h1>
        <span className="badge">{features.length} points</span>
      </div>
      {error && <p className="error">{error}</p>}

      <div style={{ height: '70vh', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer center={center} zoom={first ? 12 : 5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {features.map((f) => {
            const [lng, lat] = f.geometry.coordinates
            return (
              <CircleMarker key={f.properties.id} center={[lat, lng]} radius={7}>
                <Popup>
                  <strong>{f.properties.status}</strong>
                  <br />
                  {new Date(f.properties.capturedAtUtc).toLocaleString()}
                  <br />
                  {f.properties.photoCount} photo(s)
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {!error && features.length === 0 && (
        <p className="muted">No surveys yet — points will appear here once field data is synced.</p>
      )}
    </div>
  )
}

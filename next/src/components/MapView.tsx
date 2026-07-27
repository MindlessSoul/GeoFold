'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '@/lib/api-client'
import type { SurveyDetail, SurveyFeatureCollection, SurveyProperties } from '@/lib/types'

const SPRUCE = '#2c4a3b'

function parseDetails(json: string | null): [string, string][] {
  if (!json) return []
  try {
    const o = JSON.parse(json)
    if (o && typeof o === 'object' && !Array.isArray(o)) return Object.entries(o).map(([k, v]) => [k, v == null ? '' : String(v)])
  } catch { /* ignore */ }
  return []
}

function SurveyMarker({ feature }: { feature: SurveyFeatureCollection['features'][number] }) {
  const props: SurveyProperties = feature.properties
  const [lng, lat] = feature.geometry.coordinates
  const details = parseDetails(props.detailsJson)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'none'>('idle')

  const loadPhoto = async () => {
    if (state !== 'idle') return
    if (props.photoCount === 0) { setState('none'); return }
    setState('loading')
    try {
      const detail = await api<SurveyDetail>(`/api/surveys/${props.id}`)
      const photo = detail.photos.find((p) => p.uploadStatus === 'uploaded') ?? detail.photos[0]
      if (!photo) { setState('none'); return }
      const { url } = await api<{ url: string }>(`/api/surveys/${props.id}/photos/${photo.id}/url`)
      setPhotoUrl(url)
      setState('idle')
    } catch { setState('error') }
  }

  return (
    <CircleMarker center={[lat, lng]} radius={7} pathOptions={{ color: SPRUCE, fillColor: SPRUCE, fillOpacity: 0.9, weight: 2 }} eventHandlers={{ popupopen: loadPhoto }}>
      <Popup maxWidth={260}>
        <div style={{ minWidth: 200 }}>
          {photoUrl ? (
            <img src={photoUrl} alt="Survey" style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />
          ) : (
            <div style={{ fontSize: 12, color: '#666', padding: '18px 0', textAlign: 'center', background: '#eef1ea', borderRadius: 6, marginBottom: 6 }}>
              {state === 'loading' && 'Loading photo…'}{state === 'error' && 'Photo unavailable'}{state === 'none' && 'No photo'}{state === 'idle' && !photoUrl && 'Open to load photo'}
            </div>
          )}
          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{props.status}</div>
          <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{new Date(props.capturedAtUtc).toLocaleString()}</div>
          {details.length > 0 && (
            <table style={{ marginTop: 6, fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>{details.map(([k, v]) => <tr key={k}><td style={{ color: '#666', paddingRight: 8, verticalAlign: 'top' }}>{k}</td><td>{v}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}

export default function MapView({ features }: { features: SurveyFeatureCollection['features'] }) {
  const first = features[0]
  const center: [number, number] = first ? [first.geometry.coordinates[1], first.geometry.coordinates[0]] : [-2.5, 118]
  return (
    <div style={{ height: '72vh', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
      <MapContainer center={center} zoom={first ? 12 : 5} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {features.map((f) => <SurveyMarker key={f.properties.id} feature={f} />)}
      </MapContainer>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { CameraIcon, PinIcon, PanelsIcon, ExportIcon } from './icons'

export const metadata: Metadata = {
  title: 'Geofold — Field surveys that land straight in ArcGIS',
  description:
    'Geofold pairs a rugged field-capture app with a GIS-ready dashboard — every photo, point and note synced, reviewed and exported in minutes.',
}

const steps = [
  { n: '01', title: 'Capture in the field', body: 'Geo-tag every photo with sub-meter accuracy — fully offline-ready.' },
  { n: '02', title: 'Review on the dashboard', body: 'Every point lands on the map, tagged and organized by project.' },
  { n: '03', title: 'Export to ArcGIS', body: 'Shapefile, File Geodatabase or GeoJSON, in the right CRS, one click.' },
]

const features = [
  { Icon: CameraIcon, title: 'Offline field capture', body: "Works with zero signal, syncs the moment you're back online." },
  { Icon: PinIcon, title: 'Photo-linked geolocation', body: 'Every image carries its exact coordinates, accuracy and altitude.' },
  { Icon: PanelsIcon, title: 'Live project dashboard', body: 'Map and list views of every point, always current for the team.' },
  { Icon: ExportIcon, title: 'One-click ArcGIS export', body: 'Shapefile, geodatabase, GeoJSON or CSV — ready to import, every time.' },
]

export default function HomePage() {
  return (
    <>
      <div className="mk-hero lg">
        <span className="mk-eyebrow">Field-to-GIS platform</span>
        <h1>Field surveys that land straight in ArcGIS.</h1>
        <p className="mk-lede">
          Geofold pairs a rugged field-capture app with a GIS-ready dashboard — every photo, point and note
          synced, reviewed and exported in minutes.
        </p>
        <div className="mk-cta-row">
          <Link href="/contact" className="mk-btn mk-btn-primary">Request a demo</Link>
          <Link href="/product" className="mk-btn mk-btn-outline">See how it works</Link>
        </div>
      </div>

      <div style={{ padding: '0 var(--mk-pad) 72px' }}>
        <div className="mk-shot">Dashboard preview</div>
      </div>

      <div className="mk-band tall">
        <div className="mk-inner">
          <div className="mk-kicker on-green" style={{ marginBottom: 32 }}>How it works</div>
          <div className="mk-steps">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="mk-step-n">{s.n}</div>
                <div className="mk-step-t">{s.title}</div>
                <div className="mk-step-b">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mk-section">
        <div className="mk-inner">
          <h2 className="mk-centered-h2" style={{ fontSize: 30, marginBottom: 40 }}>
            Built for field teams and GIS analysts alike
          </h2>
          <div className="mk-features">
            {features.map(({ Icon, title, body }) => (
              <div key={title} className="mk-feature">
                <Icon />
                <div className="mk-feature-t">{title}</div>
                <div className="mk-feature-b">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mk-closer">
        <h2>Ready to see your survey data in ArcGIS?</h2>
        <Link href="/contact" className="mk-btn mk-btn-primary">Request a demo</Link>
      </div>
    </>
  )
}

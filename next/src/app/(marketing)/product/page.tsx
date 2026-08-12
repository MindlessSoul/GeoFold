import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Product — Geofold',
  description:
    'Capture, review and export — three parts of the survey workflow, built to work together instead of around each other.',
}

const fieldPoints = [
  'Sub-meter GPS accuracy on every photo',
  'Fully offline, syncs when signal returns',
  'Category tags, notes and altitude captured on-site',
  'Works with external GNSS receivers',
]

const dashboardPoints = [
  'Split map + list view of every survey point',
  'Photo gallery with flag-for-review',
  'Multiple projects and sites, switch in one click',
  'Team and device sync status at a glance',
]

const formats = ['Shapefile', 'File Geodatabase', 'GeoJSON', 'CSV']

const metadataFields = [
  { title: 'Timestamp', body: 'Exact date and time of capture' },
  { title: 'Surveyor & device', body: 'Who collected it, and with what' },
  { title: 'Accuracy & altitude', body: 'GPS precision on every reading' },
  { title: 'Category tag', body: 'Defect, species or feature type' },
  { title: 'Field notes', body: 'Free-text observations' },
  { title: 'Coordinates', body: 'Lat/long in your chosen CRS' },
]

export default function ProductPage() {
  return (
    <>
      <div className="mk-hero pad-b">
        <span className="mk-eyebrow">Product</span>
        <h1>One platform, from the field to ArcGIS.</h1>
        <p className="mk-lede">
          Capture, review and export — three parts of the survey workflow, built to work together instead
          of around each other.
        </p>
      </div>

      <div className="mk-band">
        <div className="mk-inner mk-split">
          <div>
            <div className="mk-kicker on-green">The field app</div>
            <h2>Capture once, correctly.</h2>
            <div className="mk-dashes on-green">
              {fieldPoints.map((p) => <div key={p}>— {p}</div>)}
            </div>
          </div>
          <div className="mk-slot on-green">Field app</div>
        </div>
      </div>

      <div className="mk-section tight">
        <div className="mk-inner mk-split">
          <div className="mk-slot on-paper">Dashboard</div>
          <div>
            <div className="mk-kicker on-paper">The dashboard</div>
            <h2>Review everything, in one place.</h2>
            <div className="mk-dashes on-paper">
              {dashboardPoints.map((p) => <div key={p}>— {p}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="mk-band">
        <div className="mk-inner mk-split">
          <div>
            <div className="mk-kicker on-green">ArcGIS export</div>
            <h2>Export straight into your GIS.</h2>
            <div className="mk-chips">
              {formats.map((f) => <span key={f} className="mk-chip">{f}</span>)}
            </div>
            <div style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--mk-on-green)' }}>
              Pick your coordinate system — WGS 84, NAD83 or Web Mercator — and export a scoped set of
              points in one click, straight into ArcGIS Online or Pro.
            </div>
          </div>
          <div className="mk-slot on-green">Export panel</div>
        </div>
      </div>

      <div className="mk-section">
        <div className="mk-inner">
          <h2 className="mk-centered-h2">Every point carries full metadata</h2>
          <div className="mk-meta-grid">
            {metadataFields.map((m) => (
              <div key={m.title} className="mk-meta">
                <div className="mk-meta-t">{m.title}</div>
                <div className="mk-meta-b">{m.body}</div>
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

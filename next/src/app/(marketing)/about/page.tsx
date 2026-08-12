import type { Metadata } from 'next'
import Link from 'next/link'
import { CameraIcon, LayersIcon, UsersIcon } from '../icons'

export const metadata: Metadata = {
  title: 'About — Geofold',
  description:
    'Geofold is the all-in-one package connecting field surveyors to ArcGIS — one app to capture, one dashboard to review and export.',
}

const pillars = [
  {
    Icon: CameraIcon,
    title: 'Field-ready',
    body: 'Built to survive a full day outdoors — offline-first, rugged-device friendly, no signal required.',
  },
  {
    Icon: LayersIcon,
    title: 'GIS-native',
    body: 'Every export is shaped for ArcGIS from the start — correct CRS, clean fields, no manual rework.',
  },
  {
    Icon: UsersIcon,
    title: 'Team-synced',
    body: "See every surveyor's device, sync status and points collected in one shared view.",
  },
]

export default function AboutPage() {
  return (
    <>
      <div className="mk-hero pad-b">
        <span className="mk-eyebrow">About</span>
        <h1>Built for the people who do the fieldwork.</h1>
        <p className="mk-lede" style={{ maxWidth: 600 }}>
          Geofold is the all-in-one package connecting field surveyors to ArcGIS — one app to capture,
          one dashboard to review and export.
        </p>
      </div>

      <div style={{ padding: '0 var(--mk-pad) 72px' }}>
        <div className="mk-prose">
          <p>
            Environmental and land survey teams have always split their work across too many tools: a
            camera for photos, a separate GPS unit for coordinates, a spreadsheet to tie it all together,
            and hours of manual cleanup before anything is usable in ArcGIS.
          </p>
          <p>
            Geofold collapses that into one workflow. Surveyors capture geo-tagged photos and notes in the
            field, offline if needed. Analysts review every point on a live dashboard the moment it syncs.
            And when it&apos;s time to bring the data into ArcGIS, it&apos;s already structured, tagged and
            ready — no reformatting, no lost metadata.
          </p>
        </div>
      </div>

      <div className="mk-band">
        <div className="mk-inner">
          <h2 className="mk-centered-h2" style={{ marginBottom: 40 }}>Why teams switch to Geofold</h2>
          <div className="mk-pillars">
            {pillars.map(({ Icon, title, body }) => (
              <div key={title} className="mk-pillar">
                <Icon size={26} stroke="#f6f4ee" />
                <div className="mk-pillar-t">{title}</div>
                <div className="mk-pillar-b">{body}</div>
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

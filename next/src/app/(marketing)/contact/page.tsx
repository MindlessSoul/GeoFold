import type { Metadata } from 'next'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact — Geofold',
  description:
    'Questions about a project, pricing, or an ArcGIS integration — we usually reply within a business day.',
}

export default function ContactPage() {
  return (
    <>
      <div className="mk-hero pad-b-sm">
        <span className="mk-eyebrow">Contact</span>
        <h1 style={{ maxWidth: 640 }}>Talk to the team.</h1>
        <p className="mk-lede" style={{ maxWidth: 520 }}>
          Questions about a project, pricing, or an ArcGIS integration — we usually reply within a
          business day.
        </p>
      </div>

      <div style={{ padding: '0 var(--mk-pad) 88px' }}>
        <div className="mk-contact">
          <ContactForm />
          <aside className="mk-aside">
            <div>
              <div className="mk-aside-t">Sales</div>
              <div className="mk-aside-b">sales@geofold.app</div>
            </div>
            <div>
              <div className="mk-aside-t">Support</div>
              <div className="mk-aside-b">support@geofold.app</div>
            </div>
            <div>
              <div className="mk-aside-t">Office</div>
              <div className="mk-aside-b">418 Millrace Ave, Suite 200<br />Corvallis, OR 97330</div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

import Link from 'next/link'
import { MapPin, Camera, Map as MapIcon, WifiOff, Check, ArrowRight } from 'lucide-react'

const Contour = () => (
  <svg className="contour" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
    <g fill="none" stroke="#eaf1e9" strokeWidth="1.3">
      <path d="M-20 80 C120 20 240 130 400 80 560 30 680 140 820 80" />
      <path d="M-20 130 C120 70 240 180 400 130 560 80 680 190 820 130" />
      <path d="M-20 180 C120 120 240 230 400 180 560 130 680 240 820 180" />
      <path d="M-20 230 C120 170 240 280 400 230 560 180 680 290 820 230" />
      <path d="M-20 30 C120 -30 240 80 400 30 560 -20 680 90 820 30" />
    </g>
  </svg>
)

const features = [
  { icon: Camera, bg: 'var(--spruce)', title: 'Capture in the field', body: 'Snap a photo on site and it is stamped with GPS coordinates and time, watermarked into the image itself.' },
  { icon: WifiOff, bg: 'var(--clay)', title: 'Works with no signal', body: 'No bars? No problem. Surveys are saved on the device and sync themselves the moment you are back online.' },
  { icon: MapIcon, bg: 'var(--sky)', title: 'See the ground truth', body: 'Every point plotted on an interactive map, so you know exactly where each observation was made.' },
]

const steps = [
  { title: 'Photograph the spot', body: 'Open Capture, take a photo of what you are surveying, add a short description.' },
  { title: 'It gets geo-stamped', body: 'GPS coordinates, accuracy and timestamp are embedded and queued — even offline.' },
  { title: 'Review & export', body: 'Back at base, browse points on the map or export the records to CSV or Excel.' },
]

export default function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="brand"><span className="mark"><MapPin size={16} /></span>GeoFold</div>
        <nav className="lp-nav">
          <Link href="/login" className="lp-btn ghost">Sign in</Link>
          <Link href="/login" className="lp-btn">Get started</Link>
        </nav>
      </header>

      <section className="lp-hero">
        <Contour />
        <div className="lp-hero-in">
          <span className="lp-eyebrow">Field GPS survey tool</span>
          <h1>Map the ground truth, one photo at a time.</h1>
          <p>GeoFold turns a phone into a field survey kit: geo-tagged photos, offline capture, and every point on a map you can export and report from.</p>
          <div className="lp-cta">
            <Link href="/login" className="lp-btn light big">Start free <ArrowRight size={17} /></Link>
            <Link href="#how" className="lp-btn on-dark big">How it works</Link>
          </div>
          <div className="coordline">◎ -0.037622, 111.283981 · captured offline · synced 2 min ago</div>
        </div>
      </section>

      <main className="lp-main">
        <section className="lp-section center">
          <span className="lp-kicker">Why GeoFold</span>
          <h2>Everything a surveyor needs, nothing they don&apos;t.</h2>
          <p className="sub">Built for people who work where the pavement ends — bridges, wells, roads, plots of land.</p>
          <div className="lp-grid">
            {features.map((f) => (
              <div key={f.title} className="lp-feature">
                <div className="ic" style={{ background: f.bg }}><f.icon size={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section center" id="how">
          <span className="lp-kicker">How it works</span>
          <h2>From the field to a report in three steps.</h2>
          <div className="lp-steps">
            {steps.map((s, i) => (
              <div key={s.title} className="lp-step">
                <div className="n">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section center" id="pricing">
          <span className="lp-kicker">Pricing</span>
          <h2>Start free. Upgrade when you scale.</h2>
          <p className="sub">Free is enough to run a small survey. Premium unlocks the map and lifts every limit.</p>
          <div className="lp-pricing">
            <div className="lp-plan">
              <div className="pname"><h3>Free</h3><span className="pill">Starter</span></div>
              <div className="lp-price">Rp0<small> /month</small></div>
              <ul>
                <li><Check size={16} /> Up to 3 projects</li>
                <li><Check size={16} /> 100 surveys per month</li>
                <li><Check size={16} /> 500 MB photo storage</li>
                <li><Check size={16} /> Offline capture &amp; CSV/Excel export</li>
              </ul>
              <Link href="/login" className="lp-btn ghost big" style={{ width: '100%', justifyContent: 'center' }}>Get started</Link>
            </div>
            <div className="lp-plan featured">
              <div className="pname"><h3>Premium</h3><span className="badge accent">Most popular</span></div>
              <div className="lp-price">—<small> contact us</small></div>
              <ul>
                <li><Check size={16} /> Unlimited projects &amp; surveys</li>
                <li><Check size={16} /> Interactive survey map</li>
                <li><Check size={16} /> 50 GB photo storage</li>
                <li><Check size={16} /> Priority support</li>
              </ul>
              <Link href="/login" className="lp-btn big" style={{ width: '100%', justifyContent: 'center' }}>Start free trial</Link>
            </div>
          </div>
        </section>

        <section className="lp-band">
          <Contour />
          <h2>Ready to map your first site?</h2>
          <p>Sign in and capture a point in under a minute. No install, works on any phone.</p>
          <Link href="/login" className="lp-btn light big">Get started <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="brand" style={{ padding: 0, fontSize: 15 }}><span className="mark" style={{ width: 22, height: 22 }}><MapPin size={13} /></span>GeoFold</div>
        <span>© {new Date().getFullYear()} GeoFold · Field GPS surveys</span>
        <span style={{ display: 'flex', gap: 16 }}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Sign in</Link>
        </span>
      </footer>
    </div>
  )
}

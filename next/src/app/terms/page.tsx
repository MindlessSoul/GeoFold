import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Terms of Service — GeoFold' }

// NOTE: template wording. Fill in the operator's legal name + jurisdiction and have it
// reviewed before relying on it commercially.
const CONTACT = 'sayba.help@gmail.com'
const UPDATED = '30 July 2026'

export default function TermsPage() {
  return (
    <div className="legal">
      <Link href="/" className="back hint"><ArrowLeft size={14} /> Back to home</Link>
      <h1>Terms of Service</h1>
      <div className="updated">Last updated: {UPDATED}</div>

      <p>By creating an account or using GeoFold (&quot;the service&quot;), you agree to these Terms. If you do not agree, do not use the service.</p>

      <h2>1. Your account</h2>
      <p>You are responsible for keeping your login credentials secure and for all activity under your account. You must provide accurate information and be old enough to form a binding contract in your jurisdiction.</p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>Do not use the service for unlawful purposes or to store unlawful content.</li>
        <li>Do not attempt to break, overload, or gain unauthorized access to the service or other users&apos; data.</li>
        <li>Do not capture data about people or property without the right to do so.</li>
      </ul>

      <h2>3. Your data</h2>
      <p>You retain ownership of the survey data you create. You grant us the limited rights needed to store and display it back to you as part of operating the service. See our <Link href="/privacy">Privacy Policy</Link> for details.</p>

      <h2>4. Plans &amp; limits</h2>
      <p>Free accounts are subject to usage limits (projects, monthly surveys, and storage). Paid plans, where offered, lift these limits according to the plan you choose. We may adjust limits or pricing with reasonable notice.</p>

      <h2>5. Availability</h2>
      <p>The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind. We do not guarantee uninterrupted or error-free operation and are not liable for loss of data or profits to the extent permitted by law. You are responsible for keeping your own copies of important data (e.g. via export).</p>

      <h2>6. Termination</h2>
      <p>You may stop using the service and delete your account at any time. We may suspend or terminate accounts that violate these Terms.</p>

      <h2>7. Changes</h2>
      <p>We may update these Terms. Continued use after changes take effect constitutes acceptance of the updated Terms.</p>

      <h2>8. Contact</h2>
      <p>Questions about these Terms? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </div>
  )
}

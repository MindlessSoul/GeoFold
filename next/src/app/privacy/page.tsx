import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — GeoFold' }

// NOTE: template wording. Fill in the operator's legal name + contact and have it reviewed
// before relying on it commercially.
const CONTACT = 'sayba.help@gmail.com'
const UPDATED = '30 July 2026'

export default function PrivacyPage() {
  return (
    <div className="legal">
      <Link href="/" className="back hint"><ArrowLeft size={14} /> Back to home</Link>
      <h1>Privacy Policy</h1>
      <div className="updated">Last updated: {UPDATED}</div>

      <p>This Privacy Policy explains how GeoFold (&quot;we&quot;, &quot;the service&quot;) collects, uses, and protects information when you use the app to capture and manage field survey data.</p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address and authentication credentials (passwords are hashed by our authentication provider and never stored in plain text).</li>
        <li><strong>Survey data you create:</strong> photos, GPS coordinates, accuracy, timestamps, project definitions, and the field values you enter.</li>
        <li><strong>Technical data:</strong> basic request and error logs needed to operate and secure the service.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To provide the core service — storing your surveys and showing them back to you on the map, records, and exports.</li>
        <li>To authenticate you and keep your data separated from other users.</li>
        <li>To maintain, secure, and improve the service.</li>
      </ul>

      <h2>3. Location &amp; camera</h2>
      <p>The app accesses your device&apos;s location and camera <strong>only</strong> when you capture a survey, and only to embed coordinates and a photo into that survey. It does not track your location in the background.</p>

      <h2>4. Storage &amp; processing</h2>
      <p>Data is stored using Supabase (Postgres database and object storage). Photos are kept in a private bucket and served through short-lived signed links. Your survey data is isolated to your account and is not shared with other users.</p>

      <h2>5. Sharing</h2>
      <p>We do not sell your data. We share it only with the infrastructure providers required to run the service (e.g. hosting and database), and where required by law.</p>

      <h2>6. Your rights</h2>
      <p>You may request access to, correction of, or deletion of your account and its data by contacting us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

      <h2>7. Retention</h2>
      <p>We keep your data for as long as your account is active. When you delete your account, associated survey data and photos are removed.</p>

      <h2>8. Contact</h2>
      <p>Questions about this policy? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </div>
  )
}

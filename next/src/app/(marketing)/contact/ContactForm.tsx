'use client'

import { useState } from 'react'

// The design ships this form without a backend, and the app has no contact endpoint.
// Rather than silently discard messages, submitting composes a mail to sales@geofold.app.
// Swap this for a POST to an API route when one exists.
const INBOX = 'sales@geofold.app'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [message, setMessage] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const header = [
      org ? `Organization: ${org}` : null,
      email ? `Email: ${email}` : null,
    ].filter((line): line is string => line !== null)
    const body = [...header, '', message].join('\n')
    const subject = name ? `Geofold enquiry — ${name}` : 'Geofold enquiry'
    window.location.href = `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <form className="mk-form" onSubmit={onSubmit}>
      <div>
        <label className="mk-label" htmlFor="c-name">Name</label>
        <input id="c-name" className="mk-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mk-label" htmlFor="c-email">Email</label>
        <input id="c-email" type="email" className="mk-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="mk-label" htmlFor="c-org">Organization</label>
        <input id="c-org" className="mk-input" value={org} onChange={(e) => setOrg(e.target.value)} />
      </div>
      <div>
        <label className="mk-label" htmlFor="c-msg">Message</label>
        <textarea id="c-msg" rows={5} className="mk-input" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button type="submit" className="mk-send">Send message</button>
    </form>
  )
}

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Work_Sans } from 'next/font/google'
import '@/styles/marketing.css'
import { MarketingNav } from './MarketingNav'

// Body face for the marketing site. Headings stay on Archivo (--font-sans), which
// the root layout already loads.
const workSans = Work_Sans({
  variable: '--font-work',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`mk ${workSans.variable}`}>
      <MarketingNav />
      {children}
      <footer className="mk-footer">
        <div>
          <div className="mk-footer-brand">Geofold</div>
          <div className="mk-copy">© {new Date().getFullYear()} Geofold. All rights reserved.</div>
        </div>
        <div className="mk-footer-cols">
          <div className="mk-footer-col">
            <span>Product</span>
            <Link href="/product">Features</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="mk-footer-col">
            <span>Company</span>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="mk-footer-col">
            <span>Account</span>
            <Link href="/login">Portal login</Link>
          </div>
          <div className="mk-footer-col">
            <span>Help</span>
            <Link href="/support">Support</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="mk-footer-col">
            <span>Legal</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

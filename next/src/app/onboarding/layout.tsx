import type { ReactNode } from 'react'
import { Work_Sans } from 'next/font/google'
import '@/styles/marketing.css'

// Onboarding rides on the marketing brand, same as the sign-in portal.
const workSans = Work_Sans({
  variable: '--font-work',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className={`mk ${workSans.variable}`}>{children}</div>
}

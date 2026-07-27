'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Camera, FolderKanban, Map as MapIcon, CreditCard, LogOut, MapPin } from 'lucide-react'
import { useSync } from '@/lib/SyncContext'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { DEMO_MODE } from '@/lib/demo'
import { ThemeToggle } from './ThemeToggle'

const items = [
  { href: '/capture', label: 'Capture', icon: Camera },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/map', label: 'Map', icon: MapIcon },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { pending, syncing } = useSync()

  const signOut = async () => {
    if (!DEMO_MODE) await createSupabaseBrowserClient().auth.signOut()
    router.replace('/login')
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark"><MapPin size={16} /></span>
        GeoFold
      </div>
      <nav className="side-nav">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''}>
            <Icon /> {label}
            {href === '/capture' && pending > 0 && (
              <span className="badge accent" style={{ marginLeft: 'auto' }}>{syncing ? '…' : pending}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="side-foot" style={{ display: 'flex', gap: 8 }}>
        <button className="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={signOut}>
          <LogOut size={15} style={{ verticalAlign: -3, marginRight: 6 }} /> Sign out
        </button>
        <ThemeToggle />
      </div>
    </aside>
  )
}

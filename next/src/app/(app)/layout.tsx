'use client'

import type { ReactNode } from 'react'
import { RequireAuth } from '@/components/RequireAuth'
import { SyncProvider } from '@/lib/SyncContext'
import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <SyncProvider>
        <div className="shell">
          <Sidebar />
          <div className="content">
            <MobileNav />
            <div className="container">{children}</div>
          </div>
        </div>
      </SyncProvider>
    </RequireAuth>
  )
}

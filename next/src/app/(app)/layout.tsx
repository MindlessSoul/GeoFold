'use client'

import type { ReactNode } from 'react'
import { RequireAuth } from '@/components/RequireAuth'
import { SyncProvider } from '@/lib/SyncContext'
import { Sidebar } from '@/components/Sidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <SyncProvider>
        <div className="shell">
          <Sidebar />
          <div className="content">
            <div className="container">{children}</div>
          </div>
        </div>
      </SyncProvider>
    </RequireAuth>
  )
}

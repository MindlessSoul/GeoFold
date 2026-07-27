'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { warmBackend } from './api-client'
import { pendingCount } from './outbox'
import { syncAll } from './sync-client'

interface SyncValue {
  pending: number
  syncing: boolean
  refresh: () => Promise<void>
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncValue>({ pending: 0, syncing: false, refresh: async () => {}, syncNow: async () => {} })
export const useSync = () => useContext(SyncContext)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => setPending(await pendingCount()), [])
  const syncNow = useCallback(async () => {
    setSyncing(true)
    try {
      await syncAll()
    } finally {
      setSyncing(false)
      await refresh()
    }
  }, [refresh])

  useEffect(() => {
    warmBackend()
    void syncNow()
    const onOnline = () => void syncNow()
    window.addEventListener('online', onOnline)
    const t = setInterval(() => void syncNow(), 30000)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(t)
    }
  }, [syncNow])

  return <SyncContext.Provider value={{ pending, syncing, refresh, syncNow }}>{children}</SyncContext.Provider>
}

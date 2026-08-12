import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import { allItems, resetStuckItems, type OutboxItem } from './outbox';
import { syncAll } from './sync';

interface SyncValue {
  items: OutboxItem[];
  pending: number;
  failed: number;
  syncing: boolean;
  online: boolean;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncValue>({
  items: [],
  pending: 0,
  failed: 0,
  syncing: false,
  online: true,
  refresh: async () => {},
  syncNow: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const onlineRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setItems(await allItems());
    } catch {
      // A failed read of the queue must not surface as an unhandled rejection; the banner simply
      // keeps showing the last known state.
    }
  }, []);

  // Every caller fires this with `void`, so it must never reject.
  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAll(onlineRef.current);
    } catch {
      // syncOne already records per-item errors; a failure here is the loop itself, not a survey.
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  // An item marked `syncing` when the app was killed would never be retried otherwise.
  useEffect(() => {
    resetStuckItems()
      .then(refresh)
      .catch(() => {});
  }, [refresh]);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const reachable = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !onlineRef.current;
      onlineRef.current = reachable;
      setOnline(reachable);
      // Coming back into coverage is the moment that matters — drain the queue straight away.
      if (reachable && wasOffline && session) void syncNow();
    });
  }, [session, syncNow]);

  useEffect(() => {
    if (!session) return;

    // Deferred by a tick so the first drain starts after the first paint rather than during it —
    // the surveyor should see the screen immediately, not wait on a network round trip.
    const timer = setTimeout(() => void syncNow(), 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [session, syncNow]);

  const value = useMemo<SyncValue>(
    () => ({
      items,
      pending: items.length,
      failed: items.filter((i) => i.status === 'error').length,
      syncing,
      online,
      refresh,
      syncNow,
    }),
    [items, syncing, online, refresh, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

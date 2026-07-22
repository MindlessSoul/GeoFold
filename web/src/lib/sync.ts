import { api } from './api'
import { DEMO_MODE } from './demo'
import { allItems, removeItem, updateItem } from './outbox'
import type { OutboxItem } from './outbox'
import type { InitiatePhotoResponse } from './types'

let running = false

/** Drains the outbox to the server. Safe to call often; it no-ops if already running or offline. */
export async function syncAll(): Promise<void> {
  if (running) return
  if (!DEMO_MODE && !navigator.onLine) return

  running = true
  try {
    for (const item of await allItems()) {
      if (item.status === 'syncing') continue
      await syncOne(item)
    }
  } finally {
    running = false
  }
}

async function syncOne(item: OutboxItem): Promise<void> {
  await updateItem(item.id, { status: 'syncing', error: undefined })
  try {
    if (DEMO_MODE) {
      // No backend in demo — simulate a successful sync so the flow is visible.
      await new Promise((r) => setTimeout(r, 700))
      await removeItem(item.id)
      return
    }

    // Idempotent on the client-generated id, so re-sending after a flaky upload never duplicates.
    await api('/api/v1/surveys', {
      method: 'POST',
      body: JSON.stringify({
        id: item.id,
        projectId: item.projectId,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracyMeters: item.accuracyMeters,
        capturedAtUtc: item.capturedAtUtc,
        detailsJson: item.detailsJson,
      }),
    })

    if (item.photo) {
      const init = await api<InitiatePhotoResponse>(`/api/v1/surveys/${item.id}/photos/initiate`, {
        method: 'POST',
        body: JSON.stringify({
          id: item.photoId,
          fileName: 'photo.jpg',
          contentType: 'image/jpeg',
          sizeBytes: item.photo.size,
          latitude: item.latitude,
          longitude: item.longitude,
          capturedAtUtc: item.capturedAtUtc,
        }),
      })

      const put = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: item.photo,
      })
      if (!put.ok) throw new Error(`Photo upload failed (${put.status}).`)

      await api(`/api/v1/surveys/${item.id}/photos/${item.photoId}/complete`, { method: 'POST' })
    }

    await removeItem(item.id)
  } catch (e) {
    // Stays in the outbox and is retried on the next sync (reconnect, interval, or new capture).
    await updateItem(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Sync failed.' })
  }
}

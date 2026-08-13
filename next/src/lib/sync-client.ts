import { api } from './api-client'
import { DEMO_MODE } from './demo'
import { allItems, removeItem, updateItem } from './outbox'
import type { OutboxItem } from './outbox'
import type { InitiatePhotoResponse } from './types'

let running = false

const MAX_BATCH = 200

/**
 * Push every queued survey row in one request before touching photos. A surveyor who was offline
 * for a day comes back with dozens of points; this turns that into a single round trip instead of
 * one per point. Photos still go individually — only the rows batch.
 *
 * Returns the ids the server actually stored. Failure is not fatal: every write is idempotent, so
 * anything missing from the set simply falls through to the per-item path below.
 */
async function batchUpsert(items: OutboxItem[]): Promise<Set<string>> {
  const done = new Set<string>()
  if (DEMO_MODE || items.length < 2) return done

  for (let i = 0; i < items.length; i += MAX_BATCH) {
    const chunk = items.slice(i, i + MAX_BATCH)
    try {
      const res = await api<{ results: { id: string; status: string }[] }>('/api/sync/surveys', {
        method: 'POST',
        body: JSON.stringify({
          surveys: chunk.map((it) => ({
            id: it.id, projectId: it.projectId, latitude: it.latitude, longitude: it.longitude,
            accuracyMeters: it.accuracyMeters, capturedAtUtc: it.capturedAtUtc, detailsJson: it.detailsJson,
          })),
        }),
      })
      // Only created/updated count. A rejected row falls through so the per-item call can
      // surface the real validation message against that specific survey.
      for (const r of res.results ?? []) {
        if (r.status === 'created' || r.status === 'updated') done.add(r.id)
      }
    } catch {
      // Server too old, offline mid-flight, whatever — the per-item path still handles it.
    }
  }
  return done
}

export async function syncAll(): Promise<void> {
  if (running) return
  if (!DEMO_MODE && typeof navigator !== 'undefined' && !navigator.onLine) return
  running = true
  try {
    const pending = (await allItems()).filter((i) => i.status !== 'syncing')
    const upserted = await batchUpsert(pending)
    for (const item of pending) {
      await syncOne(item, upserted.has(item.id))
    }
  } finally {
    running = false
  }
}

async function syncOne(item: OutboxItem, alreadyUpserted = false): Promise<void> {
  await updateItem(item.id, { status: 'syncing', error: undefined })
  try {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 700))
      await removeItem(item.id)
      return
    }

    if (!alreadyUpserted) {
      await api('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          id: item.id, projectId: item.projectId, latitude: item.latitude, longitude: item.longitude,
          accuracyMeters: item.accuracyMeters, capturedAtUtc: item.capturedAtUtc, detailsJson: item.detailsJson,
        }),
      })
    }

    if (item.photo) {
      const init = await api<InitiatePhotoResponse>(`/api/surveys/${item.id}/photos/initiate`, {
        method: 'POST',
        body: JSON.stringify({
          id: item.photoId, fileName: 'photo.jpg', contentType: 'image/jpeg', sizeBytes: item.photo.size,
          latitude: item.latitude, longitude: item.longitude, capturedAtUtc: item.capturedAtUtc,
        }),
      })
      const put = await fetch(init.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: item.photo })
      if (!put.ok) throw new Error(`Photo upload failed (${put.status}).`)
      await api(`/api/surveys/${item.id}/photos/${item.photoId}/complete`, { method: 'POST' })
    }

    await removeItem(item.id)
  } catch (e) {
    await updateItem(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Sync failed.' })
  }
}

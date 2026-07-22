// Offline outbox: captured surveys are written here (IndexedDB, so it can hold the photo Blob)
// and drained to the server in the background. The field user never waits on the network.

export interface OutboxItem {
  id: string // surveyId — client UUID, idempotency key for retries
  projectId: string
  projectName: string
  latitude: number
  longitude: number
  accuracyMeters: number | null
  capturedAtUtc: string
  detailsJson: string
  photo: Blob | null
  photoId: string
  status: 'pending' | 'syncing' | 'error'
  error?: string
  createdAt: number
}

const DB_NAME = 'geofold'
const STORE = 'outbox'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const addItem = (item: OutboxItem) => run<IDBValidKey>('readwrite', (s) => s.put(item))
export const allItems = () => run<OutboxItem[]>('readonly', (s) => s.getAll())
export const removeItem = (id: string) => run<undefined>('readwrite', (s) => s.delete(id))
export const pendingCount = () => run<number>('readonly', (s) => s.count())

export async function updateItem(id: string, patch: Partial<OutboxItem>): Promise<void> {
  const current = await run<OutboxItem | undefined>('readonly', (s) => s.get(id))
  if (!current) return
  await run('readwrite', (s) => s.put({ ...current, ...patch }))
}

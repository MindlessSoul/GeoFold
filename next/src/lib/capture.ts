import type { FormField } from './types'

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This device does not support location.'))
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const u = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(u); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('Could not read the photo.')) }
    img.src = u
  })
}

// Burns coordinate + timestamp into the photo (the spec's "koordinat embedded di foto") and caps
// the longest edge. Returns a JPEG blob ready to upload.
export async function watermarkPhoto(file: File, lines: string[]): Promise<Blob> {
  const img = await loadImage(file)
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available on this device.')
  ctx.drawImage(img, 0, 0, width, height)
  const pad = Math.round(width * 0.02)
  const fontSize = Math.max(14, Math.round(width * 0.026))
  const lineH = Math.round(fontSize * 1.35)
  const boxH = lineH * lines.length + pad
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, height - boxH, width, boxH)
  ctx.fillStyle = '#fff'
  ctx.font = `${fontSize}px monospace`
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, pad, height - boxH + pad / 2 + i * lineH))
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo.'))), 'image/jpeg', 0.85),
  )
}

export function buildDetails(fields: FormField[], values: Record<string, string | boolean>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const v = values[f.key]
    if (v === undefined || v === '') continue
    const t = f.type.toLowerCase()
    if (t === 'number') out[f.key] = Number(v)
    else if (t === 'integer') out[f.key] = parseInt(String(v), 10)
    else if (t === 'boolean' || t === 'bool') out[f.key] = Boolean(v)
    else out[f.key] = String(v)
  }
  return out
}

import type { FormField } from './types'

/** Promise wrapper around the browser geolocation API (mobile GPS). */
export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This device does not support location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read the photo.'))
    }
    img.src = url
  })
}

/**
 * Burns the coordinate + timestamp into the bottom of the photo, so the location travels with the
 * image itself (the spec's "koordinat embedded di foto"), not just as separate columns. Also caps
 * the longest edge so field uploads stay reasonable. Returns a JPEG blob ready to upload.
 */
export async function watermarkPhoto(file: File, lines: string[]): Promise<Blob> {
  const img = await loadImage(file)

  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available on this device.')

  ctx.drawImage(img, 0, 0, width, height)

  const pad = Math.round(width * 0.02)
  const fontSize = Math.max(14, Math.round(width * 0.026))
  const lineH = Math.round(fontSize * 1.35)
  const boxH = lineH * lines.length + pad

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, height - boxH, width, boxH)

  ctx.fillStyle = '#ffffff'
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, height - boxH + pad / 2 + i * lineH)
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the photo.'))),
      'image/jpeg',
      0.85,
    )
  })
}

/** Builds the form_data object from schema + entered values, coercing types the backend validates. */
export function buildDetails(
  fields: FormField[],
  values: Record<string, string | boolean>,
): Record<string, unknown> {
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

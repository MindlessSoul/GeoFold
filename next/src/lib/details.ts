// Shared helpers for rendering a survey's submitted field values against its project's
// form schema (so we show the field *label*, e.g. "Kondisi lokasi", not the raw key).

export function parseDetails(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function detailText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export interface LabeledValue {
  key: string
  label: string
  value: string
}

// Schema fields first (in their defined order, even if empty), then any extra keys the
// survey carries that the schema doesn't define (e.g. the built-in "catatan" note).
export function labeledValues(
  details: Record<string, unknown>,
  fields: { key: string; label?: string }[],
): LabeledValue[] {
  const out: LabeledValue[] = []
  const used = new Set<string>()
  for (const f of fields) {
    used.add(f.key)
    out.push({ key: f.key, label: f.label ?? f.key, value: detailText(details[f.key]) })
  }
  for (const [k, v] of Object.entries(details)) {
    if (used.has(k)) continue
    out.push({ key: k, label: k === 'catatan' ? 'Catatan' : k, value: detailText(v) })
  }
  return out
}

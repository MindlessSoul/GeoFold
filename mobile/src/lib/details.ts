// Renders a survey's submitted values against its project's form schema, so the surveyor sees the
// field label ("Kondisi lokasi") rather than the raw key. Port of `next/src/lib/details.ts`.

import type { FormField } from './types';

export function parseDetails(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const value = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function detailText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export interface LabeledValue {
  key: string;
  label: string;
  value: string;
}

/** Schema fields first in their defined order, then any extra keys the survey carries. */
export function labeledValues(
  details: Record<string, unknown>,
  fields: FormField[],
): LabeledValue[] {
  const out: LabeledValue[] = [];
  const used = new Set<string>();

  for (const field of fields) {
    used.add(field.key);
    out.push({
      key: field.key,
      label: field.label ?? field.key,
      value: detailText(details[field.key]),
    });
  }

  for (const [key, value] of Object.entries(details)) {
    if (used.has(key)) continue;
    out.push({ key, label: key === 'catatan' ? 'Catatan' : key, value: detailText(value) });
  }

  return out;
}

import { Platform } from 'react-native';

/**
 * Palette from the "GeoFold mobile app prototype" Claude Design project.
 *
 * The design is authored in oklch(); React Native's color parser does not support that function,
 * so every value here is the sRGB conversion of the design's token. Keep the oklch source in the
 * comment when changing one, so the two stay traceable to each other.
 */
export const C = {
  // Accent — oklch(0.52 0.16 241) / tint 0.95 0.028 / dark 0.40 0.16
  accent: '#0070bb',
  accentTint: '#dff1ff',
  accentDark: '#004b94',

  // Text
  ink: '#10171c', // 0.20 0.014 240 — headings
  ink30: '#282f34', // body on light
  ink42: '#484e52', // chip label, inactive
  ink46: '#51595f', // secondary
  ink55: '#6b7379', // tertiary / captions
  ink60: '#7b8186', // inactive tab icon
  ink62: '#7f878e', // placeholder
  ink75: '#a8afb4', // chevrons

  // Lines & surfaces
  line80: '#babec1',
  line85: '#caced1',
  line88: '#d4d8db', // input border
  line90: '#dbdfe2', // card border
  line92: '#e2e5e8', // row divider
  bg95: '#eceff1', // segmented control track
  bg96: '#eff2f4', // page backdrop
  bg98: '#f7f9fa', // input fill
  surface: '#ffffff',

  // Status
  neutralChip: '#636a6f',
  warn: '#a06700',
  warnBg: '#fbecd9',
  ok: '#137738',
  okBg: '#e1f5e4',
  danger: '#ba3535',
  dangerBg: '#ffe7e4',

  // Map + photo placeholders
  mapBase: '#e4edef',
  mapGreen: '#d2e4d2',
  mapGreen2: '#d6e7d6',
  mapBlue: '#bfdde8',
  hatchA: '#d2d8dd',
  hatchB: '#c5cbd0',
  hatchInk: '#50565a',
} as const;

/** Status pill styling, mirroring the design's statusMeta()/photoStatusMeta(). */
export const STATUS = {
  pending: { label: 'Pending sync', color: C.warn, bg: C.warnBg },
  syncing: { label: 'Syncing', color: C.accent, bg: C.accentTint },
  synced: { label: 'Synced', color: C.ok, bg: C.okBg },
  failed: { label: 'Failed', color: C.danger, bg: C.dangerBg },
  reviewed: { label: 'Reviewed', color: C.ok, bg: C.okBg },
  submitted: { label: 'Submitted', color: C.accent, bg: C.accentTint },
  none: { label: 'Not started', color: C.neutralChip, bg: C.bg95 },
} as const;

export type StatusKey = keyof typeof STATUS;

/**
 * The design specifies Roboto, which is the system face on Android — the platform it was drawn
 * for — so the system stack matches it exactly there without shipping a 1 MB font file. iOS falls
 * back to SF Pro.
 */
export const Fonts = {
  sans: Platform.select({ android: 'Roboto', default: 'System' })!,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
};

export const Radius = { sm: 6, md: 10, lg: 12, xl: 14, sheet: 18, pill: 999 } as const;

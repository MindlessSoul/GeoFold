// Icon paths lifted verbatim from the Claude Design pages so the marketing site
// matches the comp exactly — lucide-react's equivalents differ in a few paths.

type Props = { size?: number; stroke?: string; className?: string }

const base = (size: number, stroke: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke,
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const CameraIcon = ({ size = 24, stroke = '#1f3a2e', className }: Props) => (
  <svg {...base(size, stroke)} className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)

export const PinIcon = ({ size = 24, stroke = '#1f3a2e', className }: Props) => (
  <svg {...base(size, stroke)} className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

export const PanelsIcon = ({ size = 24, stroke = '#1f3a2e', className }: Props) => (
  <svg {...base(size, stroke)} className={className}>
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
)

export const ExportIcon = ({ size = 24, stroke = '#1f3a2e', className }: Props) => (
  <svg {...base(size, stroke)} className={className}>
    <path d="M12 3v12" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 21h16" />
  </svg>
)

export const LayersIcon = ({ size = 26, stroke = '#f6f4ee', className }: Props) => (
  <svg {...base(size, stroke)} className={className}>
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
  </svg>
)

export const UsersIcon = ({ size = 26, stroke = '#f6f4ee', className }: Props) => (
  <svg {...base(size, stroke)} className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

export const CheckIcon = ({ size = 15, stroke = '#1f3a2e', className }: Props) => (
  <svg {...base(size, stroke)} strokeWidth={2} className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

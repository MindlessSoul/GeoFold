import { LayoutGrid, Camera, FolderKanban, Map as MapIcon, CreditCard } from 'lucide-react'

export const navItems = [
  { href: '/home', label: 'Overview', short: 'Home', icon: LayoutGrid },
  { href: '/capture', label: 'Capture', short: 'Capture', icon: Camera },
  { href: '/projects', label: 'Projects', short: 'Projects', icon: FolderKanban },
  { href: '/map', label: 'Map', short: 'Map', icon: MapIcon },
  { href: '/subscription', label: 'Subscription', short: 'Plan', icon: CreditCard },
]

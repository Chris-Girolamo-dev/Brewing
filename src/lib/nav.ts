import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  Package,
  PlusCircle,
  Settings,
  Wine,
  Container,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_PRIMARY: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/batches', label: 'Batches', icon: FlaskConical },
  { href: '/batches/new', label: 'New Batch', icon: PlusCircle },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
]

export const NAV_RECORDS: NavItem[] = [
  { href: '/tastings', label: 'Tastings', icon: Wine },
  { href: '/packaging', label: 'Packaging', icon: Package },
  { href: '/vessels', label: 'Vessels', icon: Container },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export const NAV_FOOTER: NavItem[] = [{ href: '/settings', label: 'Settings', icon: Settings }]

export const NAV_ALL = [...NAV_PRIMARY, ...NAV_RECORDS, ...NAV_FOOTER]

import {
  LayoutDashboard,
  Building2,
  Users,
  HandCoins,
  BarChart3,
  Megaphone,
  Settings,
  CreditCard,
} from 'lucide-react'
import type { Permission } from '@/lib/auth/permissions'

export interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  permission: Permission | null
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
  { label: 'Branches', href: '/branches', icon: Building2, permission: 'branches:manage' },
  { label: 'Members', href: '/members', icon: Users, permission: 'members:create' },
  { label: 'Loans', href: '/loans', icon: CreditCard, permission: 'loans:view' },
  { label: 'Collections', href: '/collections', icon: HandCoins, permission: 'collections:create' },
  { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports:view' },
  { label: 'Leads', href: '/leads', icon: Megaphone, permission: null },
  { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings:manage' },
]

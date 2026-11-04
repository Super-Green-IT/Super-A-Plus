import {
  LayoutDashboard,
  Users,
  CreditCard,
  HandCoins,
  BarChart3,
  Megaphone,
  Settings,
  Landmark,
  ClockAlert,
  Code2,
} from 'lucide-react'
import type { Permission } from '@/lib/auth/permissions'
import type { Role } from '@/types'

export interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  permission?: Permission | null
  allowedRoles?: Role[]
  badge?: string
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Megaphone },
  { label: 'Members', href: '/members', icon: Users, permission: 'members:create' },
  { label: 'Loans', href: '/loans', icon: CreditCard, permission: 'loans:view' },
  { label: 'Collections', href: '/collections', icon: HandCoins, permission: 'collections:create' },
  {
    label: 'Accounting',
    href: '/accounting',
    icon: Landmark,
    allowedRoles: ['ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT'],
  },
  { label: 'Arrears', href: '/arrears', icon: ClockAlert, permission: 'loans:view' },
  { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports:view' },
  { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings:manage' },
]

export const devNavItems: NavItem[] = [
  { label: 'UI Primitives', href: '/dev/components', icon: Code2 },
]

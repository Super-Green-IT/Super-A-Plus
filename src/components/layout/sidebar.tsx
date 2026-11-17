'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, LogOut, Moon, Sun } from 'lucide-react'
import { navItems } from './nav-items'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/types'
import { hasPermission } from '@/lib/auth/permissions'

interface SidebarProps {
  user: SessionUser | null
  collapsed: boolean
  onToggleCollapse: () => void
  onCloseMobile?: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  onLogout: () => void
  loggingOut: boolean
}

export function Sidebar({ user, collapsed, onToggleCollapse, onCloseMobile, darkMode, onToggleDarkMode, onLogout, loggingOut }: SidebarProps) {
  const pathname = usePathname()

  // Filter items based on user's role and permissions
  const filteredNavItems = navItems.filter((item) => {
    if (!user) return true
    if (user.role === 'ADMIN') return true

    if (item.allowedRoles && !item.allowedRoles.includes(user.role)) {
      return false
    }

    if (item.permission && !hasPermission(user.role, item.permission)) {
      return false
    }

    return true
  })

  return (
    <aside
      className={cn(
        'relative z-30 flex flex-col border-r border-emerald-900 bg-emerald-700 text-white transition-[width] duration-200 ease-out select-none',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className={cn(
        'flex border-b border-white/15',
        collapsed ? 'h-[52px] justify-center px-2' : 'h-[76px] items-center justify-between px-5'
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/25 bg-white">
              <Image src="/favicon.jpeg" alt="Super A Plus logo" width={40} height={40} className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-[15px] text-white tracking-tight leading-tight truncate">
                Super A Plus
              </span>
              <span className="mt-1 text-[10px] text-emerald-100 font-medium tracking-[0.14em] uppercase">
                Microfinance
              </span>
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-md border border-white/20 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!collapsed && (
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Workspace
          </div>
        )}

        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = (pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`))) &&
            !filteredNavItems.some((other) => other.href !== item.href && other.href.startsWith(`${item.href}/`) &&
              (pathname === other.href || pathname.startsWith(`${other.href}/`)))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-white/12 text-white border border-white/15'
                  : 'text-white/75 hover:bg-white/8 hover:text-white',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-white/65 group-hover:text-white'
                )}
              />
              {!collapsed && (
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
              )}
            </Link>
          )
        })}

      </div>

      {/* Field View Switcher (for Field Officers or Admins testing mobile) */}
      {/* {(user?.role === 'ADMIN' || user?.role === 'FIELD_OFFICER') && (
        <div className="p-3 border-t border-slate-900">
          <Link
            href="/field"
            onClick={onCloseMobile}
            className={cn(
              'flex items-center gap-2.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-900/50 transition-colors',
              collapsed && 'justify-center px-0'
            )}
            title="Switch to Mobile Field App"
          >
            <Smartphone className="h-4 w-4 shrink-0 text-emerald-400" />
            {!collapsed && <span className="font-medium truncate">Field Officer App</span>}
          </Link>
        </div>
      )} */}

      {/* Bottom Status / Database Mode */}
      <div className="border-t border-white/15 p-3 text-[11px] text-white/65">
        {!collapsed ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
            <div className="flex items-center justify-between px-3 pt-1">
              <span className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full bg-emerald-200" />
                Connected
              </span>
              <span className="text-[10px] text-white/55">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <button type="button" onClick={onToggleDarkMode} className="flex h-11 w-11 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`} title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onLogout} disabled={loggingOut} className="flex h-11 w-11 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50" aria-label="Sign out" title={loggingOut ? 'Signing out…' : 'Sign out'}>
              <LogOut className="h-4 w-4" />
            </button>
            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
          </div>
        )}
      </div>
    </aside>
  )
}

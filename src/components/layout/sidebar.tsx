'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Smartphone,
} from 'lucide-react'
import { navItems, devNavItems } from './nav-items'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/types'
import { hasPermission } from '@/lib/auth/permissions'

interface SidebarProps {
  user: SessionUser | null
  collapsed: boolean
  onToggleCollapse: () => void
  onCloseMobile?: () => void
}

export function Sidebar({ user, collapsed, onToggleCollapse, onCloseMobile }: SidebarProps) {
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
        'relative flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out z-30 select-none',
        collapsed ? 'w-18' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40">
              S+
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm text-slate-100 tracking-tight leading-tight truncate">
                Super A Plus
              </span>
              <span className="text-[10px] text-emerald-400 font-medium tracking-wide uppercase">
                Microfinance
              </span>
            </div>
          </Link>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40">
            S+
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className={cn('text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2', collapsed ? 'text-center' : 'px-3')}>
          {collapsed ? '•' : 'Main Menu'}
        </div>

        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && (
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
              )}
            </Link>
          )
        })}

        {/* Dev Primitives Link */}
        <div className="pt-4 border-t border-slate-900 mt-4">
          {!collapsed && (
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 mb-2">
              Development
            </div>
          )}
          {devNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                    : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Field View Switcher (for Field Officers or Admins testing mobile) */}
      {(user?.role === 'ADMIN' || user?.role === 'FIELD_OFFICER') && (
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
      )}

      {/* Bottom Status / Database Mode */}
      <div className="border-t border-slate-800/80 p-3 bg-slate-950/60 text-[11px] text-slate-500">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
            <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
          </div>
        )}
      </div>
    </aside>
  )
}

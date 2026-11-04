'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Menu,
  Building2,
  LogOut,
  User,
  ChevronRight,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import type { SessionUser } from '@/types'

interface TopbarProps {
  user: SessionUser | null
  onOpenMobileMenu: () => void
}

export function Topbar({ user, onOpenMobileMenu }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  // Derive breadcrumb path segment
  const pathSegments = pathname.split('/').filter(Boolean)
  const currentTitle = pathSegments.length > 0
    ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
    : 'Dashboard'

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Super A Plus</span>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className="font-semibold text-slate-100">{currentTitle}</span>
        </nav>
      </div>

      {/* Right: Branch indicator, User profile, Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Branch Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs text-slate-300">
          <Building2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-medium text-slate-200">Head Office</span>
        </div>

        {/* User Card */}
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs font-medium text-slate-200 leading-tight">
                {user.fullName || user.email}
              </div>
              <div className="mt-0.5">
                <StatusBadge status={user.role} size="sm" showDot={false} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400">
            <User className="h-4 w-4" />
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-400 hover:bg-rose-950/40 hover:border-rose-500/40 hover:text-rose-400 transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

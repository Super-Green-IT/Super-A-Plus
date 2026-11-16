'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  Menu,
  Building2,
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
  const pathname = usePathname()

  // Derive breadcrumb path segment
  const pathSegments = pathname.split('/').filter(Boolean)
  const currentTitle = pathSegments.length > 0
    ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
    : 'Dashboard'

  return (
    <header className="sticky top-0 z-20 flex h-[72px] w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-4 sm:px-7">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-800 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
          <span className="hidden text-slate-400 sm:inline">Super A Plus</span>
          <ChevronRight className="hidden h-3 w-3 text-slate-400 sm:inline" />
          <span className="font-semibold text-slate-700">{currentTitle === 'Dashboard' ? 'Overview' : currentTitle}</span>
        </nav>
      </div>

      {/* Right: Branch indicator and user profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Branch Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium text-slate-700">Head Office</span>
        </div>

        {/* User Card */}
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs font-medium text-slate-700 leading-tight">
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

      </div>
    </header>
  )
}

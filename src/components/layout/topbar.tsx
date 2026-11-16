'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Menu,
  Building2,
  User,
  ChevronRight,
  Bell,
  AlertTriangle,
  Clock3,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import type { SessionUser } from '@/types'

interface TopbarProps {
  user: SessionUser | null
  onOpenMobileMenu: () => void
  onLogout: () => Promise<void>
  loggingOut: boolean
}

interface NotificationsData {
  pendingLoans: { count: number; members: string[] }
  overdueAccounts: { count: number; members: string[] }
  loading: boolean
  failed: boolean
}

export function Topbar({ user, onOpenMobileMenu, onLogout, loggingOut }: TopbarProps) {
  const pathname = usePathname()
  const mounted = React.useSyncExternalStore(() => () => {}, () => true, () => false)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationsData>({
    pendingLoans: { count: 0, members: [] },
    overdueAccounts: { count: 0, members: [] },
    loading: true,
    failed: false,
  })
  const notificationRef = React.useRef<HTMLDivElement>(null)
  const profileRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let cancelled = false
    const loadNotifications = async () => {
      try {
        const [loansResponse, arrearsResponse] = await Promise.all([
          fetch('/api/loans?status=SUBMITTED&limit=5'),
          fetch('/api/arrears'),
        ])
        if (!loansResponse.ok || !arrearsResponse.ok) throw new Error('Could not load notifications')
        const [loansData, arrearsData] = await Promise.all([loansResponse.json(), arrearsResponse.json()])
        if (cancelled) return
        setNotifications({
          pendingLoans: {
            count: loansData.pagination?.total ?? loansData.loans?.length ?? 0,
            members: (loansData.loans ?? []).slice(0, 3).map((loan: { member?: { fullName?: string } }) => loan.member?.fullName ?? 'Member'),
          },
          overdueAccounts: {
            count: arrearsData.summary?.totalLoans ?? arrearsData.arrears?.length ?? 0,
            members: (arrearsData.arrears ?? []).slice(0, 3).map((account: { member?: { fullName?: string } }) => account.member?.fullName ?? 'Member'),
          },
          loading: false,
          failed: false,
        })
      } catch {
        if (!cancelled) setNotifications((current) => ({ ...current, loading: false, failed: true }))
      }
    }
    loadNotifications()
    const refresh = window.setInterval(loadNotifications, 60_000)
    return () => { cancelled = true; window.clearInterval(refresh) }
  }, [])

  React.useEffect(() => {
    if (!notificationsOpen && !profileOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false)
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('click', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('click', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [notificationsOpen, profileOpen])

  const notificationCount = notifications.pendingLoans.count + notifications.overdueAccounts.count

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

        {/* Operational notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            aria-label={`Notifications${notificationCount ? `, ${notificationCount} items` : ''}`}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-slate-50 dark:ring-[#1d2a23]">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <section
              role="dialog"
              aria-label="Operational notifications"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-800 shadow-lg dark:border-white/10 dark:bg-[#24332a] dark:text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                <h2 className="text-sm font-semibold">Notifications</h2>
                {!notifications.loading && !notifications.failed && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{notificationCount} open</span>
                )}
              </div>
              {notifications.loading ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading updates…</p>
              ) : notifications.failed ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Notifications are unavailable right now.</p>
              ) : notificationCount === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">You’re all caught up.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  <Link href="/loans?status=SUBMITTED" onClick={() => setNotificationsOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 dark:hover:bg-white/5 dark:focus-visible:bg-white/5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Clock3 className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm font-medium"><span>Loans awaiting review</span><span className="tabular-nums text-amber-700 dark:text-amber-300">{notifications.pendingLoans.count}</span></span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{notifications.pendingLoans.members.join(', ') || 'View submitted applications'}</span>
                    </span>
                  </Link>
                  <Link href="/arrears" onClick={() => setNotificationsOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 dark:hover:bg-white/5 dark:focus-visible:bg-white/5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"><AlertTriangle className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm font-medium"><span>Accounts in arrears</span><span className="tabular-nums text-rose-700 dark:text-rose-300">{notifications.overdueAccounts.count}</span></span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{notifications.overdueAccounts.members.join(', ') || 'View overdue accounts'}</span>
                    </span>
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>

        {/* User Card */}
        {!mounted ? (
          <div aria-hidden="true" className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/10" />
        ) : user ? (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:hover:bg-white/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-xs font-semibold text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-xs font-medium leading-tight text-slate-700 dark:text-slate-100">
                  {user.fullName || user.email}
                </span>
                <span className="mt-0.5 block">
                  <StatusBadge status={user.role} size="sm" showDot={false} />
                </span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-500 lg:block dark:text-slate-400" />
            </button>
            {profileOpen && (
              <div role="menu" aria-label="Profile menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-slate-800 shadow-lg dark:border-white/10 dark:bg-[#24332a] dark:text-slate-100">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
                  <p className="truncate text-sm font-semibold">{user.fullName || user.email}</p>
                  {user.fullName && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>}
                  <div className="mt-2"><StatusBadge status={user.role} size="sm" showDot={false} /></div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  disabled={loggingOut}
                  onClick={() => { setProfileOpen(false); void onLogout() }}
                  className="flex h-10 w-full items-center gap-2.5 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-rose-700 focus-visible:bg-slate-50 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-rose-300 dark:focus-visible:bg-white/5"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
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

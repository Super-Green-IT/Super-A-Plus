'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { useAuth } from '@/components/providers/auth-provider'
import { X } from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const router = useRouter()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [darkMode, setDarkMode] = React.useState<boolean | null>(null)
  const [loggingOut, setLoggingOut] = React.useState(false)

  React.useEffect(() => {
    setDarkMode(localStorage.getItem('superaplus-theme') === 'dark')
  }, [])

  React.useEffect(() => {
    if (darkMode === null) return
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('superaplus-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

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

  // Auth pages (/login) and dedicated mobile field pages (/field) manage their own layout
  const isAuthPage = pathname.startsWith('/login')
  const isFieldPage = pathname.startsWith('/field')

  if (isAuthPage || isFieldPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar
          user={user}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          darkMode={darkMode ?? false}
          onToggleDarkMode={() => setDarkMode((value) => !value)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </div>

      {/* Mobile Drawer (Responsive) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-[#274b38]/40 transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-emerald-700 pt-5 pb-4 shadow-xl">
            <div className="absolute right-3 top-3 z-40">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-md text-white/75 hover:bg-white/10 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar
              user={user}
              collapsed={false}
              onToggleCollapse={() => {}}
              darkMode={darkMode ?? false}
              onToggleDarkMode={() => setDarkMode((value) => !value)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
              onCloseMobile={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          user={user}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
        <main className="min-w-0 flex-1 overflow-y-auto bg-background px-4 py-5 sm:px-7 sm:py-7 lg:px-9">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

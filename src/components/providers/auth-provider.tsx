'use client'

import * as React from 'react'
import type { SessionUser } from '@/types'

interface AuthContextType {
  user: SessionUser | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({
  initialUser = null,
  children,
}: {
  initialUser?: SessionUser | null
  children: React.ReactNode
}) {
  const [user, setUser] = React.useState<SessionUser | null>(initialUser)
  const [loading, setLoading] = React.useState(!initialUser)

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!initialUser) {
      fetchUser()
    }
  }, [initialUser, fetchUser])

  const logout = React.useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}

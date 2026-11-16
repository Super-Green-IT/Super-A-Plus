import { cookies } from 'next/headers'
import 'server-only'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/types'
import { AUTH_COOKIE_NAME, encryptSession, decryptSession } from './jwt'

export { AUTH_COOKIE_NAME, encryptSession, decryptSession }

export async function createSession(user: SessionUser) {
  const token = await encryptSession(user)
  const cookieStore = await cookies()

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) return null

  const session = await decryptSession(token)
  if (!session) return null

  const user = await prisma.userProfile.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, fullName: true, role: true, branchId: true, isActive: true },
  })

  if (!user?.isActive) return null

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    branchId: user.branchId,
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

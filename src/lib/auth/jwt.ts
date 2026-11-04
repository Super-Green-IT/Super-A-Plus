import { SignJWT, jwtVerify } from 'jose'
import type { SessionUser } from '@/types'

export const AUTH_COOKIE_NAME = 'auth_session'
const SESSION_EXPIRATION = '7d'

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || 'super-a-plus-fallback-secret-key-32-chars-min!!'
  return new TextEncoder().encode(secret)
}

export async function encryptSession(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(getSecretKey())
}

export async function decryptSession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    })
    return {
      id: payload.id as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as SessionUser['role'],
      branchId: (payload.branchId as string) ?? null,
    }
  } catch {
    return null
  }
}

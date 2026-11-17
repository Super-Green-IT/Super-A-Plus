import { SignJWT, jwtVerify } from 'jose'
import type { SessionUser } from '@/types'

export const AUTH_COOKIE_NAME = 'auth_session'
const SESSION_EXPIRATION = '7d'

export type SessionClaims = SessionUser & { authVersion: number }

function getSecretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export async function encryptSession(payload: SessionUser, authVersion: number): Promise<string> {
  return new SignJWT({ ...payload, authVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(getSecretKey())
}

export async function decryptSession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    })
    const authVersion = payload.authVersion
    if (typeof authVersion !== 'number' || !Number.isInteger(authVersion)) return null
    return {
      id: payload.id as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as SessionUser['role'],
      branchId: (payload.branchId as string) ?? null,
      authVersion,
    }
  } catch {
    return null
  }
}

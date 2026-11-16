import 'server-only'
import { NextResponse } from 'next/server'
import type { SessionUser } from '@/types'
import { getCurrentUser } from './session'
import { hasPermission, type Permission } from './permissions'

type ApiAuthorization =
  | { user: SessionUser; response?: never }
  | { user?: never; response: NextResponse }

export async function authorizeApi(permission?: Permission): Promise<ApiAuthorization> {
  const user = await getCurrentUser()

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (user.role !== 'ADMIN' && !user.branchId) {
    return { response: NextResponse.json({ error: 'No branch is assigned to this account' }, { status: 403 }) }
  }

  if (permission && !hasPermission(user.role, permission)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export function branchScope(user: SessionUser): { branchId?: string } {
  return user.role === 'ADMIN' ? {} : { branchId: user.branchId! }
}

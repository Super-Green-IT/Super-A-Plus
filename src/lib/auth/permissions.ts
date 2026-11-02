import type { Role } from '@prisma/client'

export type Permission =
  | 'loans:approve'
  | 'loans:disburse'
  | 'loans:create'
  | 'loans:view'
  | 'members:create'
  | 'members:edit'
  | 'collections:create'
  | 'dayclose:create'
  | 'reports:view'
  | 'settings:manage'
  | 'branches:manage'

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'loans:approve',
    'loans:disburse',
    'loans:create',
    'loans:view',
    'members:create',
    'members:edit',
    'collections:create',
    'dayclose:create',
    'reports:view',
    'settings:manage',
    'branches:manage',
  ],
  BRANCH_MANAGER: [
    'loans:approve',
    'loans:disburse',
    'loans:create',
    'loans:view',
    'members:create',
    'members:edit',
    'collections:create',
    'dayclose:create',
    'reports:view',
  ],
  ACCOUNTANT: [
    'loans:view',
    'collections:create',
    'dayclose:create',
    'reports:view',
  ],
  FIELD_OFFICER: [
    'loans:create',
    'loans:view',
    'members:create',
    'collections:create',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAccess(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

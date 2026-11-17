import type { Role } from '@prisma/client'

export type Permission =
  | 'branches:view'
  | 'centres:view'
  | 'products:view'
  | 'members:view'
  | 'accounting:view'
  | 'collections:view'
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
  | 'users:view'
  | 'users:manage'
  | 'team:view'
  | 'team:manage'
  | 'audit:view'

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
    'branches:view',
    'centres:view',
    'products:view',
    'members:view',
    'collections:view',
    'accounting:view',
    'users:view',
    'users:manage',
    'team:view',
    'team:manage',
    'audit:view',
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
    'branches:view',
    'centres:view',
    'products:view',
    'members:view',
    'collections:view',
    'accounting:view',
    'team:view',
    'team:manage',
  ],
  ACCOUNTANT: [
    'loans:view',
    'collections:create',
    'dayclose:create',
    'reports:view',
    'branches:view',
    'centres:view',
    'products:view',
    'members:view',
    'accounting:view',
    'collections:view',
  ],
  FIELD_OFFICER: [
    'loans:create',
    'loans:view',
    'members:create',
    'collections:create',
    'centres:view',
    'products:view',
    'members:view',
    'collections:view',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAccess(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

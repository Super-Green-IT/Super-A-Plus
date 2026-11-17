import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { hashPassword } from '@/lib/auth/password'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'

const userUpdateSchema = z.object({
  email: z.string().trim().email().max(254).optional(),
  fullName: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'FIELD_OFFICER']).optional(),
  branchId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes').optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update')

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('team:manage')
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = userUpdateSchema.safeParse(body.value)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid user update' }, { status: 400 })
    }

    const existing = await prisma.userProfile.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, branchId: true, isActive: true },
    })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (auth.user.role === 'BRANCH_MANAGER' && (
      existing.branchId !== auth.user.branchId ||
      !['ACCOUNTANT', 'FIELD_OFFICER'].includes(existing.role)
    )) return NextResponse.json({ error: 'Staff member not found in your branch' }, { status: 404 })

    const update = parsed.data
    const role = update.role ?? existing.role
    if (auth.user.role === 'BRANCH_MANAGER' && (
      (update.role !== undefined && !['ACCOUNTANT', 'FIELD_OFFICER'].includes(update.role)) ||
      (update.branchId !== undefined && update.branchId !== auth.user.branchId)
    )) return NextResponse.json({ error: 'Branch managers can only manage staff roles and assignments within their branch' }, { status: 403 })
    const branchId = update.branchId === undefined ? existing.branchId : update.branchId
    if (!branchId) return NextResponse.json({ error: 'Every account must be assigned to a branch' }, { status: 400 })
    if (branchId && update.branchId !== undefined) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, isActive: true }, select: { id: true } })
      if (!branch) return NextResponse.json({ error: 'Active branch not found' }, { status: 404 })
    }
    if (id === auth.user.id && (update.isActive === false || (update.role !== undefined && update.role !== 'ADMIN'))) {
      return NextResponse.json({ error: 'You cannot deactivate or demote your own account' }, { status: 409 })
    }

    const data = {
      ...(update.email !== undefined ? { email: update.email.toLowerCase() } : {}),
      ...(update.fullName !== undefined ? { fullName: update.fullName } : {}),
      ...(update.role !== undefined ? { role: update.role } : {}),
      ...(update.branchId !== undefined ? { branchId: update.branchId } : {}),
      ...(update.isActive !== undefined ? { isActive: update.isActive } : {}),
      ...(update.password !== undefined ? { passwordHash: await hashPassword(update.password) } : {}),
      ...(update.password !== undefined ? { authVersion: { increment: 1 } } : {}),
    }
    const user = await prisma.$transaction(async (tx) => {
      const changesAdminAccess = update.role !== undefined || update.isActive !== undefined
      let current = existing
      if (changesAdminAccess) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('super-a-plus:admin-account-guard')::bigint)`
        current = await tx.userProfile.findUniqueOrThrow({
          where: { id },
          select: { id: true, email: true, role: true, branchId: true, isActive: true },
        })
        const removesActiveAdmin = current.role === 'ADMIN' && (update.isActive === false || (update.role !== undefined && update.role !== 'ADMIN'))
        if (removesActiveAdmin) {
          const otherActiveAdmins = await tx.userProfile.count({
            where: { id: { not: id }, role: 'ADMIN', isActive: true },
          })
          if (otherActiveAdmins === 0) throw new Error('LAST_ACTIVE_ADMIN')
        }
      }
      const updateResult = await tx.userProfile.updateMany({
        where: auth.user.role === 'BRANCH_MANAGER'
          ? { id, branchId: auth.user.branchId!, role: { in: ['ACCOUNTANT', 'FIELD_OFFICER'] } }
          : { id },
        data,
      })
      if (updateResult.count !== 1) throw new Error('TEAM_MEMBER_NOT_FOUND')
      const changed = await tx.userProfile.findUniqueOrThrow({
        where: { id },
        select: { id: true, email: true, fullName: true, role: true, branchId: true, isActive: true, updatedAt: true },
      })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'USER_UPDATED',
        tableName: 'user_profiles',
        recordId: id,
        oldValues: { email: current.email, role: current.role, branchId: current.branchId, isActive: current.isActive },
        newValues: { email: changed.email, role: changed.role, branchId: changed.branchId, isActive: changed.isActive },
      })
      return changed
    })
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof Error && error.message === 'LAST_ACTIVE_ADMIN') {
      return NextResponse.json({ error: 'At least one active administrator must remain' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'TEAM_MEMBER_NOT_FOUND') {
      return NextResponse.json({ error: 'Staff member not found in your branch' }, { status: 404 })
    }
    if (isUniqueViolation(error)) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

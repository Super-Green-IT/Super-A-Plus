import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { hashPassword } from '@/lib/auth/password'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'

const userSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(['ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'FIELD_OFFICER']),
  branchId: z.string().uuid(),
  password: z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes'),
}).strict()

export async function GET() {
  const auth = await authorizeApi('team:view')
  if (!auth.user) return auth.response

  try {
    const users = await prisma.userProfile.findMany({
      where: auth.user.role === 'ADMIN'
        ? {}
        : { branchId: auth.user.branchId!, role: { in: ['ACCOUNTANT', 'FIELD_OFFICER'] } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi('team:manage')
  if (!auth.user) return auth.response

  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = userSchema.safeParse(body.value)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid user details' }, { status: 400 })
    }

    const { email, fullName, role, password } = parsed.data
    if (auth.user.role === 'BRANCH_MANAGER' && !['ACCOUNTANT', 'FIELD_OFFICER'].includes(role)) {
      return NextResponse.json({ error: 'Branch managers can add accountants and field officers only' }, { status: 403 })
    }
    if (auth.user.role === 'BRANCH_MANAGER' && parsed.data.branchId !== auth.user.branchId) {
      return NextResponse.json({ error: 'You can only add staff to your assigned branch' }, { status: 403 })
    }
    const branchId = auth.user.role === 'ADMIN' ? parsed.data.branchId : auth.user.branchId!
    const branch = await prisma.branch.findFirst({ where: { id: branchId, isActive: true }, select: { id: true } })
    if (!branch) return NextResponse.json({ error: 'Active branch not found' }, { status: 404 })

    const passwordHash = await hashPassword(password)
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.userProfile.create({
        data: { email: email.toLowerCase(), fullName, role, branchId, passwordHash },
        select: { id: true, email: true, fullName: true, role: true, branchId: true, isActive: true },
      })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'USER_CREATED',
        tableName: 'user_profiles',
        recordId: created.id,
        newValues: { email: created.email, role: created.role, branchId: created.branchId, isActive: created.isActive },
      })
      return created
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

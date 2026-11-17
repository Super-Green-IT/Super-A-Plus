import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { authorizeApi } from '@/lib/auth/api'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'

const centreSchema = z.object({
  name: z.string().trim().min(2, 'Centre name is required').max(100),
  branchId: z.string().uuid('Valid Branch ID is required'),
}).strict()

export async function GET(request: Request) {
  const auth = await authorizeApi('centres:view')
  if (!auth.user) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    if (branchId && !z.string().uuid().safeParse(branchId).success) {
      return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 })
    }

    const centres = await prisma.centre.findMany({
      where: {
        isActive: true,
        branchId: auth.user.role === 'ADMIN' ? branchId || undefined : auth.user.branchId!,
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ centres })
  } catch (error) {
    console.error('Error fetching centres:', error)
    return NextResponse.json({ error: 'Failed to fetch centres' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi('branches:manage')
  if (!auth.user) return auth.response

  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = centreSchema.safeParse(body.value)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid centre data' },
        { status: 400 }
      )
    }

    const branch = await prisma.branch.findFirst({ where: { id: parsed.data.branchId, isActive: true }, select: { id: true } })
    if (!branch) return NextResponse.json({ error: 'Active branch not found' }, { status: 404 })

    const centre = await prisma.$transaction(async (tx) => {
      const created = await tx.centre.create({ data: parsed.data, include: { branch: true } })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'CENTRE_CREATED',
        tableName: 'centres',
        recordId: created.id,
        newValues: { name: created.name, branchId: created.branchId },
      })
      return created
    })

    return NextResponse.json({ centre }, { status: 201 })
  } catch (error) {
    console.error('Error creating centre:', error)
    return NextResponse.json({ error: 'Failed to create centre' }, { status: 500 })
  }
}

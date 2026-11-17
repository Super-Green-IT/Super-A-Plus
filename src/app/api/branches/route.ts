import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { authorizeApi } from '@/lib/auth/api'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'

const branchSchema = z.object({
  name: z.string().trim().min(2, 'Branch name is required').max(100),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(40).optional(),
}).strict()

export async function GET() {
  const auth = await authorizeApi('branches:view')
  if (!auth.user) return auth.response

  try {
    const branches = await prisma.branch.findMany({
      where: auth.user.role === 'ADMIN' ? {} : { id: auth.user.branchId! },
      include: {
        centres: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { staff: true, loans: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi('branches:manage')
  if (!auth.user) return auth.response

  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = branchSchema.safeParse(body.value)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid branch data' },
        { status: 400 }
      )
    }

    const branch = await prisma.$transaction(async (tx) => {
      const created = await tx.branch.create({ data: parsed.data })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'BRANCH_CREATED',
        tableName: 'branches',
        recordId: created.id,
        newValues: { name: created.name, isActive: created.isActive },
      })
      return created
    })

    return NextResponse.json({ branch }, { status: 201 })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
  }
}

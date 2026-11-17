import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateNIC } from '@/lib/validation/nic'
import { authorizeApi, branchScope } from '@/lib/auth/api'
import { nextDisplayNumber } from '@/lib/db/numbering'
import { writeAuditLog } from '@/lib/audit'
import { parsePagination } from '@/lib/http/query'
import { readJson } from '@/lib/http/json'

const memberCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  nic: z.string().trim().min(10, 'NIC must be valid').max(16),
  phone: z.string().trim().max(32).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dateOfBirth: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Invalid date of birth').optional().nullable(),
  centreId: z.string().uuid().optional().nullable(),
}).strict()

export async function GET(request: Request) {
  const auth = await authorizeApi('members:view')
  if (!auth.user) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const centreId = searchParams.get('centreId')
    const pagination = parsePagination(searchParams, 20)
    if (!pagination) return NextResponse.json({ error: 'Invalid pagination values' }, { status: 400 })
    const { page, limit, skip } = pagination

    const where: any = {}
    if (searchParams.get('activeOnly') === 'true') where.isActive = true

    if (search && search.length > 100) return NextResponse.json({ error: 'Search is too long' }, { status: 400 })
    if (centreId && centreId !== 'ALL' && !z.string().uuid().safeParse(centreId).success) {
      return NextResponse.json({ error: 'Invalid centre ID' }, { status: 400 })
    }

    if (centreId && centreId !== 'ALL') {
      where.centreId = centreId
    }
    if (auth.user.role !== 'ADMIN') {
      where.centre = { branchId: auth.user.branchId! }
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nic: { contains: search, mode: 'insensitive' } },
        { memberNumber: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        include: {
          centre: { select: { id: true, name: true } },
          loans: {
            where: branchScope(auth.user),
            select: {
              id: true,
              loanNumber: true,
              status: true,
              principalAmount: true,
              totalInterest: true,
              installments: {
                select: {
                  status: true,
                  totalDue: true,
                },
              },
            },
          },
          _count: {
            select: {
              loans: true,
              guaranteedFor: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.member.count({ where }),
    ])

    // Format members with active loan statistics
    const formatted = members.map((m) => {
      const activeLoan = m.loans.find(
        (l) => l.status === 'ACTIVE' || l.status === 'APPROVED' || l.status === 'DISBURSED'
      )
      const outstanding = activeLoan
        ? activeLoan.installments
            .filter((inst) => inst.status !== 'PAID' && inst.status !== 'WAIVED')
            .reduce((sum, inst) => sum + Number(inst.totalDue), 0)
        : 0

      return {
        id: m.id,
        memberNumber: m.memberNumber,
        fullName: m.fullName,
        nic: m.nic,
        phone: m.phone,
        address: m.address,
        gender: m.gender,
        dateOfBirth: m.dateOfBirth,
        isActive: m.isActive,
        createdAt: m.createdAt,
        centre: m.centre,
        activeLoansCount: m.loans.filter((l) => l.status === 'ACTIVE').length,
        totalLoansCount: m._count.loans,
        guaranteeCount: m._count.guaranteedFor,
        outstandingBalance: outstanding,
      }
    })

    return NextResponse.json({
      members: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi('members:create')
  if (!auth.user) return auth.response

  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = memberCreateSchema.safeParse(body.value)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid member details' },
        { status: 400 }
      )
    }

    const { fullName, nic, phone, address, gender, dateOfBirth, centreId } = parsed.data

    if (!centreId && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'A centre in your branch is required' }, { status: 400 })
    }
    if (centreId) {
      const centre = await prisma.centre.findFirst({
        where: auth.user.role === 'ADMIN'
          ? { id: centreId, isActive: true }
          : { id: centreId, branchId: auth.user.branchId!, isActive: true },
      })
      if (!centre) return NextResponse.json({ error: 'Active centre not found' }, { status: 404 })
    }

    // Validate NIC
    const nicResult = validateNIC(nic)
    if (!nicResult.isValid) {
      return NextResponse.json({ error: nicResult.error || 'Invalid NIC format' }, { status: 400 })
    }

    // Check duplicate NIC
    const existing = await prisma.member.findUnique({
      where: { nic: nicResult.formatted },
    })

    if (existing) {
      return NextResponse.json(
        { error: `A member with NIC ${nicResult.formatted} is already registered (${existing.memberNumber} - ${existing.fullName})` },
        { status: 409 }
      )
    }

    const member = await prisma.$transaction(async (tx) => {
      const memberNumber = await nextDisplayNumber(tx, 'member')
      const created = await tx.member.create({
        data: {
          memberNumber,
          fullName,
          nic: nicResult.formatted,
          phone: phone || null,
          address: address || null,
          gender: gender || nicResult.gender || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          centreId: centreId || null,
          isActive: true,
        },
        include: {
          centre: { select: { id: true, name: true } },
        },
      })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'MEMBER_CREATED',
        tableName: 'members',
        recordId: created.id,
        newValues: { memberNumber: created.memberNumber, centreId: created.centreId, isActive: created.isActive },
      })
      return created
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A member with that NIC is already registered' }, { status: 409 })
    }
    console.error('Error creating member:', error)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}

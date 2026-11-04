import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateNIC } from '@/lib/validation/nic'

const memberCreateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  nic: z.string().min(10, 'NIC must be valid'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  centreId: z.string().uuid().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const centreId = searchParams.get('centreId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: any = {}

    if (centreId && centreId !== 'ALL') {
      where.centreId = centreId
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
  try {
    const body = await request.json()
    const parsed = memberCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid member details' },
        { status: 400 }
      )
    }

    const { fullName, nic, phone, address, gender, dateOfBirth, centreId } = parsed.data

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

    // Generate next Member Number (e.g. M-0001)
    const count = await prisma.member.count()
    const memberNumber = `M-${String(count + 1).padStart(4, '0')}`

    const member = await prisma.member.create({
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

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Error creating member:', error)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}

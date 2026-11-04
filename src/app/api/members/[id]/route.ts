import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const memberUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  centreId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        centre: {
          include: { branch: true },
        },
        loans: {
          include: {
            product: { select: { id: true, name: true, loanType: true } },
            guarantor: {
              include: {
                member: { select: { id: true, memberNumber: true, fullName: true, nic: true } },
              },
            },
            installments: {
              select: {
                id: true,
                weekNumber: true,
                dueDate: true,
                principalDue: true,
                interestDue: true,
                totalDue: true,
                status: true,
              },
              orderBy: { weekNumber: 'asc' },
            },
            _count: {
              select: { receipts: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        // Loans this member is currently guaranteeing for other members
        guarantors: {
          include: {
            borrower: {
              select: { id: true, memberNumber: true, fullName: true, nic: true, phone: true },
            },
            loan: {
              include: {
                product: { select: { name: true } },
              },
            },
          },
        },
        // Guarantors who guaranteed for this member's loans
        guaranteedFor: {
          include: {
            member: {
              select: { id: true, memberNumber: true, fullName: true, nic: true, phone: true },
            },
            loan: {
              select: { id: true, loanNumber: true, status: true },
            },
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Compute key financial stats for this member
    const activeLoan = member.loans.find((l) => l.status === 'ACTIVE' || l.status === 'APPROVED')
    const totalBorrowed = member.loans.reduce((sum: number, l) => sum + Number(l.principalAmount), 0)
    const activeOutstanding = activeLoan
      ? activeLoan.installments
          .filter((inst) => inst.status !== 'PAID' && inst.status !== 'WAIVED')
          .reduce((sum: number, inst) => sum + Number(inst.totalDue), 0)
      : 0

    // Next installment due date
    const nextInstallment = activeLoan?.installments.find(
      (inst) => inst.status === 'PENDING' || inst.status === 'PARTIAL' || inst.status === 'OVERDUE'
    )

    return NextResponse.json({
      member: {
        ...member,
        activeOutstanding,
        totalBorrowed,
        nextDueAmount: nextInstallment ? Number(nextInstallment.totalDue) : 0,
        nextDueDate: nextInstallment ? nextInstallment.dueDate : null,
      },
    })
  } catch (error) {
    console.error('Error fetching member profile:', error)
    return NextResponse.json({ error: 'Failed to fetch member details' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = memberUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid update data' },
        { status: 400 }
      )
    }

    const member = await prisma.member.update({
      where: { id },
      data: parsed.data,
      include: {
        centre: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateNIC, formatSLPhone } from '@/lib/validation/nic'

const memberUpdateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  nic: z.string().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
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

    const { fullName, nic, phone, address, gender, dateOfBirth, centreId, isActive } = parsed.data

    const updateData: {
      fullName?: string
      nic?: string
      phone?: string | null
      address?: string | null
      gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
      dateOfBirth?: Date | null
      centreId?: string | null
      isActive?: boolean
    } = {}

    if (fullName !== undefined) {
      updateData.fullName = fullName.trim()
    }

    if (nic !== undefined) {
      const nicResult = validateNIC(nic)
      if (!nicResult.isValid) {
        return NextResponse.json(
          { error: nicResult.error || 'Invalid NIC format' },
          { status: 400 }
        )
      }

      // Check if duplicate exists for other member
      const duplicate = await prisma.member.findFirst({
        where: {
          nic: nicResult.formatted,
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          {
            error: `A member with NIC ${nicResult.formatted} is already registered (${duplicate.memberNumber} - ${duplicate.fullName})`,
          },
          { status: 409 }
        )
      }

      updateData.nic = nicResult.formatted
    }

    if (phone !== undefined) {
      updateData.phone = phone && phone.trim() ? formatSLPhone(phone.trim()) : null
    }

    if (address !== undefined) {
      updateData.address = address && address.trim() ? address.trim() : null
    }

    if (gender !== undefined) {
      updateData.gender = gender || null
    }

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    }

    if (centreId !== undefined) {
      updateData.centreId = centreId || null
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const member = await prisma.member.update({
      where: { id },
      data: updateData,
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

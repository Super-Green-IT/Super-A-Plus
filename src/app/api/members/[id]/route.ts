import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateNIC, formatSLPhone } from '@/lib/validation/nic'
import { authorizeApi, branchScope } from '@/lib/auth/api'
import { getDocumentMimeType, getDocumentUrl } from '@/lib/storage/documents'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'

const memberUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  nic: z.string().trim().min(10).max(16).optional(),
  phone: z.string().trim().max(32).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dateOfBirth: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Invalid date of birth').optional().nullable(),
  centreId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('members:view')
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 })

    const member = await prisma.member.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id }
        : { id, centre: { branchId: auth.user.branchId! } },
      include: {
        centre: {
          include: { branch: true },
        },
        loans: {
          where: branchScope(auth.user),
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
          where: { loan: branchScope(auth.user) },
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
          where: { loan: branchScope(auth.user) },
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
        documents: member.documents.map((document) => ({
          ...document,
          mimeType: getDocumentMimeType(document.storagePath) ?? 'application/octet-stream',
          storagePath: getDocumentUrl(member.id, document.id),
        })),
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
  const auth = await authorizeApi('members:edit')
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 })
    const existingMember = await prisma.member.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id }
        : { id, centre: { branchId: auth.user.branchId! } },
      select: {
        id: true,
        centreId: true,
        isActive: true,
        centre: { select: { branchId: true } },
        _count: { select: { loans: true, guarantors: true, guaranteedFor: true } },
      },
    })
    if (!existingMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = memberUpdateSchema.safeParse(body.value)

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
      if (!centreId && auth.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'A centre in your branch is required' }, { status: 400 })
      }
      const centre = centreId
        ? await prisma.centre.findFirst({
            where: auth.user.role === 'ADMIN' ? { id: centreId, isActive: true } : { id: centreId, branchId: auth.user.branchId!, isActive: true },
            select: { id: true, branchId: true },
          })
        : null
      if (centreId && !centre) return NextResponse.json({ error: 'Centre not found' }, { status: 404 })
      const currentBranchId = existingMember.centre?.branchId ?? null
      const nextBranchId = centre?.branchId ?? null
      const hasFinancialRecords = existingMember._count.loans + existingMember._count.guarantors + existingMember._count.guaranteedFor > 0
      if (hasFinancialRecords && currentBranchId !== nextBranchId) {
        return NextResponse.json({ error: 'A member with loan or guarantee records cannot be moved to another branch' }, { status: 409 })
      }
      updateData.centreId = centreId || null
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const accessWhere = auth.user.role === 'ADMIN'
      ? { id }
      : { id, centre: { branchId: auth.user.branchId! } }
    const member = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "members" WHERE "id" = ${id}::uuid FOR UPDATE`
      const current = await tx.member.findFirst({
        where: accessWhere,
        select: {
          id: true,
          centreId: true,
          isActive: true,
          centre: { select: { branchId: true } },
          _count: { select: { loans: true, guarantors: true, guaranteedFor: true } },
        },
      })
      if (!current) return null
      if (updateData.centreId !== undefined) {
        const nextCentre = updateData.centreId
          ? await tx.centre.findUnique({ where: { id: updateData.centreId }, select: { branchId: true } })
          : null
        const hasFinancialRecords = current._count.loans + current._count.guarantors + current._count.guaranteedFor > 0
        if (hasFinancialRecords && (current.centre?.branchId ?? null) !== (nextCentre?.branchId ?? null)) {
          throw new Error('MEMBER_BRANCH_TRANSFER')
        }
      }
      const changedCount = await tx.member.updateMany({ where: accessWhere, data: updateData })
      if (changedCount.count !== 1) return null
      const changed = await tx.member.findFirstOrThrow({
        where: accessWhere,
        include: { centre: { select: { id: true, name: true } } },
      })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'MEMBER_UPDATED',
        tableName: 'members',
        recordId: id,
        oldValues: { centreId: current.centreId, isActive: current.isActive },
        newValues: { changedFields: Object.keys(updateData), centreId: changed.centreId, isActive: changed.isActive },
      })
      return changed
    })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    return NextResponse.json({ member })
  } catch (error) {
    if (error instanceof Error && error.message === 'MEMBER_BRANCH_TRANSFER') {
      return NextResponse.json({ error: 'A member with loan or guarantee records cannot be moved to another branch' }, { status: 409 })
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A member with that NIC is already registered' }, { status: 409 })
    }
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

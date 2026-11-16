import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { authorizeApi } from '@/lib/auth/api'
import { hasPermission } from '@/lib/auth/permissions'

const actionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'DISBURSE', 'SUBMIT']),
  rejectionReason: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('loans:view')
  if (!auth.user) return auth.response

  try {
    const { id } = await params

    const loan = await prisma.loan.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id }
        : { id, branchId: auth.user.branchId },
      include: {
        member: {
          include: {
            centre: { include: { branch: true } },
          },
        },
        product: true,
        branch: true,
        guarantor: {
          include: {
            member: {
              select: {
                id: true,
                memberNumber: true,
                fullName: true,
                nic: true,
                phone: true,
                address: true,
              },
            },
          },
        },
        installments: {
          orderBy: { weekNumber: 'asc' },
        },
        receipts: {
          include: {
            collectedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { collectedAt: 'desc' },
        },
        submittedBy: { select: { id: true, fullName: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, role: true } },
        rejectedBy: { select: { id: true, fullName: true, role: true } },
        disbursedBy: { select: { id: true, fullName: true, role: true } },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan record not found' }, { status: 404 })
    }

    const totalPaid = loan.installments.reduce(
      (sum, inst) => sum + Number(inst.totalPaid),
      0
    )
    const totalRemaining = Number(loan.totalRepayable) - totalPaid
    const overdueAmount = loan.installments
      .filter((inst) => inst.status === 'OVERDUE')
      .reduce((sum, inst) => sum + (Number(inst.totalDue) - Number(inst.totalPaid)), 0)

    return NextResponse.json({
      loan: {
        ...loan,
        principalAmount: Number(loan.principalAmount),
        annualInterestRate: Number(loan.annualInterestRate),
        processingFee: Number(loan.processingFee),
        totalInterest: Number(loan.totalInterest),
        totalRepayable: Number(loan.totalRepayable),
        weeklyInstallment: Number(loan.weeklyInstallment),
        totalPaid,
        totalRemaining: Math.max(0, totalRemaining),
        overdueAmount,
      },
    })
  } catch (error) {
    console.error('Error fetching loan detail:', error)
    return NextResponse.json({ error: 'Failed to fetch loan details' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi()
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = actionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid action' },
        { status: 400 }
      )
    }

    const { action, rejectionReason } = parsed.data

    const neededPermission = action === 'APPROVE' || action === 'REJECT'
      ? 'loans:approve'
      : action === 'DISBURSE'
        ? 'loans:disburse'
        : 'loans:create'
    if (!hasPermission(auth.user.role, neededPermission)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const loan = await prisma.loan.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id }
        : { id, branchId: auth.user.branchId },
      include: { product: true },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const now = new Date()
    const scopedLoanWhere = {
      id,
      ...(auth.user.role === 'ADMIN' ? {} : { branchId: auth.user.branchId }),
    }

    if (action === 'APPROVE') {
      const result = await prisma.loan.updateMany({
        where: { ...scopedLoanWhere, status: { in: ['SUBMITTED', 'DRAFT'] } },
        data: { status: 'APPROVED', approvedById: auth.user.id },
      })
      if (result.count !== 1) {
        return NextResponse.json({ error: 'Loan cannot be approved from its current status.' }, { status: 409 })
      }
      const updated = await prisma.loan.findUniqueOrThrow({ where: { id } })
      return NextResponse.json({ loan: updated })
    }

    if (action === 'REJECT') {
      const result = await prisma.loan.updateMany({
        where: { ...scopedLoanWhere, status: { in: ['SUBMITTED', 'DRAFT'] } },
        data: {
          status: 'REJECTED',
          rejectedById: auth.user.id,
          rejectionReason: rejectionReason || 'Application rejected by management',
        },
      })
      if (result.count !== 1) {
        return NextResponse.json({ error: 'Loan cannot be rejected from its current status.' }, { status: 409 })
      }
      const updated = await prisma.loan.findUniqueOrThrow({ where: { id } })
      return NextResponse.json({ loan: updated })
    }

    if (action === 'DISBURSE') {
      const updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.loan.updateMany({
          where: { ...scopedLoanWhere, status: 'APPROVED' },
          data: {
            status: 'ACTIVE',
            disbursedAt: now,
            disbursedById: auth.user.id,
          },
        })
        if (claimed.count !== 1) return null

        // Create initial Double-Entry Ledger Entry for Loan Disbursement
        await tx.ledgerEntry.createMany({
          data: [
            {
              loanId: id,
              account: 'LOANS_RECEIVABLE',
              entryType: 'DEBIT',
              amount: loan.principalAmount,
              description: `Disbursement of Loan ${loan.loanNumber}`,
              entryDate: now,
            },
            {
              loanId: id,
              account: 'CASH',
              entryType: 'CREDIT',
              amount: loan.principalAmount,
              description: `Cash Outflow - Disbursement ${loan.loanNumber}`,
              entryDate: now,
            },
          ],
        })

        return tx.loan.findUniqueOrThrow({ where: { id } })
      })
      if (!updated) {
        return NextResponse.json({ error: 'Only approved loans can be disbursed.' }, { status: 409 })
      }

      return NextResponse.json({ loan: updated })
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating loan:', error)
    return NextResponse.json({ error: 'Failed to update loan status' }, { status: 500 })
  }
}

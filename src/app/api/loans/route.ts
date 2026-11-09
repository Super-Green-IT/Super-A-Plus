import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { generateSchedule } from '@/lib/finance/schedule'
import { getCurrentUser } from '@/lib/auth/session'

const loanCreateSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  productId: z.string().uuid('Invalid product ID'),
  principalAmount: z.number().positive('Principal amount must be greater than zero'),
  termWeeks: z.number().int().min(4, 'Minimum term is 4 weeks'),
  firstRepaymentDate: z.string(),
  guarantorMemberId: z.string().uuid().optional().nullable(),
  purposeNotes: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '30', 10)))
    const skip = (page - 1) * limit

    const where: any = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { loanNumber: { contains: search, mode: 'insensitive' } },
        { member: { fullName: { contains: search, mode: 'insensitive' } } },
        { member: { nic: { contains: search, mode: 'insensitive' } } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              fullName: true,
              nic: true,
              phone: true,
              centre: { select: { id: true, name: true } },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              loanType: true,
              interestMethod: true,
            },
          },
          guarantor: {
            include: {
              member: {
                select: { id: true, memberNumber: true, fullName: true, nic: true },
              },
            },
          },
          installments: {
            select: {
              status: true,
              totalDue: true,
              totalPaid: true,
              dueDate: true,
            },
          },
          _count: {
            select: { receipts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loan.count({ where }),
    ])

    const formatted = loans.map((l) => {
      const remainingBalance = l.installments
        .filter((inst) => inst.status !== 'PAID' && inst.status !== 'WAIVED')
        .reduce((sum, inst) => sum + (Number(inst.totalDue) - Number(inst.totalPaid)), 0)

      const overdueCount = l.installments.filter((inst) => inst.status === 'OVERDUE').length

      const nextInstallment = l.installments.find(
        (inst) => inst.status === 'PENDING' || inst.status === 'PARTIAL' || inst.status === 'OVERDUE'
      )

      return {
        id: l.id,
        loanNumber: l.loanNumber,
        member: l.member,
        product: l.product,
        principalAmount: Number(l.principalAmount),
        totalInterest: Number(l.totalInterest),
        totalRepayable: Number(l.totalRepayable),
        weeklyInstallment: Number(l.weeklyInstallment),
        termWeeks: l.termWeeks,
        status: l.status,
        guarantor: l.guarantor?.member || null,
        disbursedAt: l.disbursedAt,
        createdAt: l.createdAt,
        remainingBalance: Math.max(0, remainingBalance),
        overdueCount,
        nextDueDate: nextInstallment?.dueDate || null,
        nextDueAmount: nextInstallment ? Number(nextInstallment.totalDue) - Number(nextInstallment.totalPaid) : 0,
      }
    })

    return NextResponse.json({
      loans: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const parsed = loanCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid loan data' },
        { status: 400 }
      )
    }

    const {
      memberId,
      productId,
      principalAmount,
      termWeeks,
      firstRepaymentDate,
      guarantorMemberId,
      purposeNotes,
    } = parsed.data

    // 1. Fetch Borrower Member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { centre: true },
    })

    if (!member) {
      return NextResponse.json({ error: 'Borrower member not found' }, { status: 404 })
    }

    // 2. Fetch Product
    const product = await prisma.loanProduct.findUnique({
      where: { id: productId },
    })

    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Loan product not available' }, { status: 404 })
    }

    // Validate min/max limits
    if (principalAmount < Number(product.minAmount) || principalAmount > Number(product.maxAmount)) {
      return NextResponse.json(
        {
          error: `Principal amount must be between LKR ${Number(product.minAmount).toLocaleString()} and LKR ${Number(product.maxAmount).toLocaleString()}`,
        },
        { status: 400 }
      )
    }

    if (termWeeks < product.minTermWeeks || termWeeks > product.maxTermWeeks) {
      return NextResponse.json(
        {
          error: `Term must be between ${product.minTermWeeks} and ${product.maxTermWeeks} weeks`,
        },
        { status: 400 }
      )
    }

    // 3. Validate Guarantor if required
    if (product.requiresGuarantor) {
      if (!guarantorMemberId) {
        return NextResponse.json(
          { error: 'A guarantor is required for this loan product.' },
          { status: 400 }
        )
      }

      if (guarantorMemberId === memberId) {
        return NextResponse.json(
          { error: 'Borrower cannot act as their own guarantor.' },
          { status: 400 }
        )
      }

      const guarantor = await prisma.member.findUnique({
        where: { id: guarantorMemberId },
      })

      if (!guarantor || !guarantor.isActive) {
        return NextResponse.json({ error: 'Selected guarantor not found or inactive.' }, { status: 400 })
      }

      // Check if guarantor is already locked in an active loan
      const activeGuarantee = await prisma.guarantor.findFirst({
        where: {
          memberId: guarantorMemberId,
          loan: {
            status: { in: ['ACTIVE', 'DISBURSED', 'APPROVED'] },
          },
        },
        include: { loan: true },
      })

      if (activeGuarantee) {
        return NextResponse.json(
          {
            error: `${guarantor.fullName} is already an active guarantor on ongoing loan ${activeGuarantee.loan.loanNumber}. A member can only guarantee one active loan.`,
          },
          { status: 400 }
        )
      }
    }

    // 4. Calculate Financial Repayment Schedule
    const scheduleResult = generateSchedule({
      principalAmount: new Decimal(principalAmount),
      annualInterestRate: new Decimal(product.annualInterestRate),
      termWeeks,
      interestMethod: product.interestMethod,
      firstRepaymentDate: new Date(firstRepaymentDate),
    })

    const processingFee = new Decimal(principalAmount).mul(product.processingFeeRate).toDecimalPlaces(2)

    // 5. Generate Loan Number (e.g. L-0001)
    const count = await prisma.loan.count()
    const loanNumber = `L-${String(count + 1).padStart(4, '0')}`

    // Find branch
    let branchId = member.centre?.branchId
    if (!branchId) {
      const headOffice = await prisma.branch.findFirst()
      branchId = headOffice?.id
    }

    if (!branchId) {
      return NextResponse.json({ error: 'No branch available for this loan.' }, { status: 400 })
    }

    // 6. Prisma Transaction to persist Loan, Guarantor & Installments
    const newLoan = await prisma.$transaction(async (tx) => {
      const createdLoan = await tx.loan.create({
        data: {
          loanNumber,
          memberId,
          branchId,
          productId,
          loanType: product.loanType,
          interestMethod: product.interestMethod,
          principalAmount: new Decimal(principalAmount),
          annualInterestRate: new Decimal(product.annualInterestRate),
          termWeeks,
          processingFee,
          totalInterest: scheduleResult.totalInterest,
          totalRepayable: scheduleResult.totalRepayable,
          weeklyInstallment: scheduleResult.weeklyInstallment,
          status: 'SUBMITTED',
          purposeNotes: purposeNotes || null,
          firstRepaymentDate: new Date(firstRepaymentDate),
          submittedById: user?.id || null,
        },
      })

      if (guarantorMemberId) {
        await tx.guarantor.create({
          data: {
            loanId: createdLoan.id,
            memberId: guarantorMemberId,
            borrowerId: memberId,
          },
        })
      }

      const installmentData = scheduleResult.installments.map((inst) => ({
        loanId: createdLoan.id,
        weekNumber: inst.weekNumber,
        dueDate: inst.dueDate,
        principalDue: inst.principalDue,
        interestDue: inst.interestDue,
        totalDue: inst.totalDue,
        status: 'PENDING' as const,
      }))

      await tx.installment.createMany({
        data: installmentData,
      })

      return createdLoan
    })

    return NextResponse.json({ loan: newLoan }, { status: 201 })
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan application' }, { status: 500 })
  }
}

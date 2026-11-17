import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { generateSchedule } from '@/lib/finance/schedule'
import { authorizeApi, branchScope } from '@/lib/auth/api'
import { nextDisplayNumber } from '@/lib/db/numbering'
import { writeAuditLog } from '@/lib/audit'
import { parsePagination } from '@/lib/http/query'
import { readJson } from '@/lib/http/json'
import { lockGuarantor } from '@/lib/finance/guarantor'

const loanCreateSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  productId: z.string().uuid('Invalid product ID'),
  principalAmount: z.number().finite().positive('Principal amount must be greater than zero').multipleOf(0.01),
  termWeeks: z.number().int().min(4, 'Minimum term is 4 weeks').max(520),
  firstRepaymentDate: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Invalid first repayment date'),
  guarantorMemberId: z.string().uuid().optional().nullable(),
  purposeNotes: z.string().trim().max(1000).optional().nullable(),
}).strict()

export async function GET(request: Request) {
  const auth = await authorizeApi('loans:view')
  if (!auth.user) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')
    const pagination = parsePagination(searchParams, 30)
    if (!pagination) return NextResponse.json({ error: 'Invalid pagination values' }, { status: 400 })
    const { page, limit, skip } = pagination

    const where: any = {}

    if (search && search.length > 100) return NextResponse.json({ error: 'Search is too long' }, { status: 400 })

    if (status && status !== 'ALL') {
      const parsedStatus = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DISBURSED', 'ACTIVE', 'CLOSED', 'WRITTEN_OFF']).safeParse(status)
      if (!parsedStatus.success) return NextResponse.json({ error: 'Invalid loan status' }, { status: 400 })
      where.status = parsedStatus.data
    }
    Object.assign(where, branchScope(auth.user))

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
  const auth = await authorizeApi('loans:create')
  if (!auth.user) return auth.response

  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = loanCreateSchema.safeParse(body.value)

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
    const member = await prisma.member.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id: memberId }
        : { id: memberId, centre: { branchId: auth.user.branchId! } },
      include: { centre: { select: { branchId: true, isActive: true } } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Borrower member not found' }, { status: 404 })
    }
    if (!member.isActive) return NextResponse.json({ error: 'Inactive members cannot apply for loans' }, { status: 409 })
    if (!member.centre?.isActive && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Member must be assigned to an active centre' }, { status: 409 })
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

    const branchId = member.centre?.branchId ?? (auth.user.role === 'ADMIN'
      ? (await prisma.branch.findFirst({ where: { name: 'Head Office', isActive: true }, select: { id: true } }))?.id
      : undefined)
    if (!branchId) return NextResponse.json({ error: 'No branch available for this loan.' }, { status: 400 })
    const branchIsActive = await prisma.branch.findFirst({ where: { id: branchId, isActive: true }, select: { id: true } })
    if (!branchIsActive) return NextResponse.json({ error: 'The member branch is inactive' }, { status: 409 })

    // 3. Validate Guarantor if required
    if (product.requiresGuarantor && !guarantorMemberId) {
      return NextResponse.json({ error: 'A guarantor is required for this loan product.' }, { status: 400 })
    }
    if (guarantorMemberId) {
      if (guarantorMemberId === memberId) {
        return NextResponse.json(
          { error: 'Borrower cannot act as their own guarantor.' },
          { status: 400 }
        )
      }

      const guarantor = await prisma.member.findFirst({
        where: { id: guarantorMemberId, isActive: true, centre: { branchId, isActive: true } },
      })

      if (!guarantor || !guarantor.isActive) {
        return NextResponse.json({ error: 'Selected guarantor not found or inactive.' }, { status: 400 })
      }

      // Check early for a friendly response; the transaction checks again under a lock.
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

    // 6. Prisma Transaction to persist Loan, Guarantor & Installments
    const newLoan = await prisma.$transaction(async (tx) => {
      const memberIdsToLock = [...new Set([memberId, ...(guarantorMemberId ? [guarantorMemberId] : [])])].sort()
      for (const idToLock of memberIdsToLock) {
        await tx.$queryRaw`SELECT "id" FROM "members" WHERE "id" = ${idToLock}::uuid FOR UPDATE`
      }
      const currentMember = await tx.member.findUnique({
        where: { id: memberId },
        include: { centre: { select: { branchId: true, isActive: true } } },
      })
      const headOffice = currentMember?.centreId ? null : await tx.branch.findFirst({
        where: { name: 'Head Office', isActive: true },
        select: { id: true },
      })
      const currentMemberBranchId = currentMember?.centre?.branchId ?? headOffice?.id
      if (!currentMember?.isActive || currentMemberBranchId !== branchId || (currentMember.centre && !currentMember.centre.isActive)) {
        throw new Error('BORROWER_CHANGED')
      }

      await tx.$queryRaw`SELECT "id" FROM "loan_products" WHERE "id" = ${productId}::uuid FOR UPDATE`
      const currentProduct = await tx.loanProduct.findFirst({ where: { id: productId, isActive: true } })
      if (!currentProduct ||
        currentProduct.loanType !== product.loanType ||
        currentProduct.interestMethod !== product.interestMethod ||
        currentProduct.annualInterestRate.toString() !== product.annualInterestRate.toString() ||
        currentProduct.minAmount.toString() !== product.minAmount.toString() ||
        currentProduct.maxAmount.toString() !== product.maxAmount.toString() ||
        currentProduct.minTermWeeks !== product.minTermWeeks ||
        currentProduct.maxTermWeeks !== product.maxTermWeeks ||
        currentProduct.processingFeeRate.toString() !== product.processingFeeRate.toString() ||
        currentProduct.requiresGuarantor !== product.requiresGuarantor) {
        throw new Error('PRODUCT_CHANGED')
      }

      const loanNumber = await nextDisplayNumber(tx, 'loan')
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
          submittedById: auth.user.id,
        },
      })

      if (guarantorMemberId) {
        await lockGuarantor(tx, guarantorMemberId)
        const currentGuarantor = await tx.member.findUnique({
          where: { id: guarantorMemberId },
          include: { centre: { select: { branchId: true, isActive: true } } },
        })
        if (!currentGuarantor?.isActive || !currentGuarantor.centre?.isActive || currentGuarantor.centre.branchId !== branchId) {
          throw new Error('GUARANTOR_CHANGED')
        }
        const activeGuarantee = await tx.guarantor.findFirst({
          where: {
            memberId: guarantorMemberId,
            loan: { status: { in: ['ACTIVE', 'DISBURSED', 'APPROVED'] } },
          },
          include: { loan: { select: { loanNumber: true } } },
        })
        if (activeGuarantee) {
          throw new Error(`GUARANTOR_IN_USE:${activeGuarantee.loan.loanNumber}`)
        }
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
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'LOAN_CREATED',
        tableName: 'loans',
        recordId: createdLoan.id,
        newValues: { loanNumber: createdLoan.loanNumber, memberId, branchId, productId, principalAmount: createdLoan.principalAmount.toString(), status: createdLoan.status },
      })

      return createdLoan
    })

    return NextResponse.json({ loan: newLoan }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'BORROWER_CHANGED') {
      return NextResponse.json({ error: 'Borrower account or branch changed. Refresh and try again.' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'PRODUCT_CHANGED') {
      return NextResponse.json({ error: 'Loan product changed. Refresh and try again.' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'GUARANTOR_CHANGED') {
      return NextResponse.json({ error: 'Guarantor account or branch changed. Refresh and try again.' }, { status: 409 })
    }
    if (error instanceof Error && error.message.startsWith('GUARANTOR_IN_USE:')) {
      return NextResponse.json({ error: `Selected member is already a guarantor on ongoing loan ${error.message.slice('GUARANTOR_IN_USE:'.length)}` }, { status: 409 })
    }
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan application' }, { status: 500 })
  }
}

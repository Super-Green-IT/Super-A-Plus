import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { authorizeApi, branchScope } from '@/lib/auth/api'
import { nextDisplayNumber } from '@/lib/db/numbering'
import { isAccountingDayClosed, lockAccountingDay } from '@/lib/finance/accounting-day'
import { writeAuditLog } from '@/lib/audit'
import { parsePagination } from '@/lib/http/query'
import { readJson } from '@/lib/http/json'

const collectionSchema = z.object({
  loanId: z.string().uuid('Invalid loan ID'),
  amount: z.number().finite().positive('Amount must be positive').multipleOf(0.01),
  notes: z.string().max(500).optional().nullable(),
  collectedAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Invalid collection date').optional(),
  idempotencyKey: z.string().uuid(),
})

class CollectionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function GET(request: Request) {
  const auth = await authorizeApi('collections:view')
  if (!auth.user) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams, 30)
    if (!pagination) return NextResponse.json({ error: 'Invalid pagination values' }, { status: 400 })
    const { page, limit, skip } = pagination

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where: { loan: branchScope(auth.user) },
        include: {
          loan: {
            include: {
              member: {
                select: { id: true, memberNumber: true, fullName: true, phone: true },
              },
              product: { select: { name: true } },
            },
          },
          collectedBy: {
            select: { id: true, fullName: true, role: true },
          },
          lines: {
            include: {
              installment: { select: { weekNumber: true, dueDate: true } },
            },
          },
        },
        orderBy: { collectedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.receipt.count({ where: { loan: branchScope(auth.user) } }),
    ])

    const formatted = receipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      loanId: r.loanId,
      loanNumber: r.loan.loanNumber,
      member: r.loan.member,
      productName: r.loan.product.name,
      totalAmount: Number(r.totalAmount),
      notes: r.notes,
      collectedAt: r.collectedAt,
      collectedBy: r.collectedBy,
      linesCount: r.lines.length,
    }))

    return NextResponse.json({
      collections: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi('collections:create')
  if (!auth.user) return auth.response

  let submittedKey: string | undefined
  let submittedLoanId: string | undefined
  let submittedAmount: number | undefined

  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = collectionSchema.safeParse(body.value)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid collection details' },
        { status: 400 }
      )
    }

    const { loanId, amount, notes, collectedAt, idempotencyKey } = parsed.data
    submittedKey = idempotencyKey
    submittedLoanId = loanId
    submittedAmount = amount

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "loans" WHERE "id" = ${loanId}::uuid FOR UPDATE`

      const priorReceipt = await tx.receipt.findUnique({ where: { idempotencyKey } })
      if (priorReceipt) {
        const sameRequest = priorReceipt.loanId === loanId && new Decimal(priorReceipt.totalAmount).eq(amount)
        if (!sameRequest) throw new CollectionError('Idempotency key was already used for another payment', 409)
        return { receipt: priorReceipt, duplicate: true as const }
      }

      const loan = await tx.loan.findFirst({
        where: auth.user.role === 'ADMIN'
          ? { id: loanId }
          : { id: loanId, branchId: auth.user.branchId! },
        include: {
          installments: {
            where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
            orderBy: { weekNumber: 'asc' },
          },
        },
      })
      if (!loan) throw new CollectionError('Loan not found', 404)
      const receiptDate = collectedAt ? new Date(collectedAt) : new Date()
      if (receiptDate.getTime() > Date.now()) {
        throw new CollectionError('Collection date cannot be in the future', 400)
      }
      await lockAccountingDay(tx, loan.branchId, receiptDate)
      if (await isAccountingDayClosed(tx, loan.branchId, receiptDate)) {
        throw new CollectionError('This branch is already closed for the selected collection date', 409)
      }
      if (loan.status !== 'ACTIVE' && loan.status !== 'DISBURSED') {
        throw new CollectionError(`Cannot collect payment for a loan with status ${loan.status}`, 400)
      }
      if (loan.installments.length === 0) {
        throw new CollectionError('All installments for this loan have already been fully paid.', 400)
      }

      let remainingToAllocate = new Decimal(amount)
      let totalPrincipalPaid = new Decimal(0)
      let totalInterestPaid = new Decimal(0)
      const installmentUpdates: {
        id: string
        totalPaid: Decimal
        principalPaid: Decimal
        interestPaid: Decimal
        status: 'PAID' | 'PARTIAL'
        linePrincipal: Decimal
        lineInterest: Decimal
      }[] = []

      for (const inst of loan.installments) {
        if (remainingToAllocate.lte(0)) break
        const totalDue = new Decimal(inst.totalDue)
        const currentPaid = new Decimal(inst.totalPaid)
        const pendingDue = totalDue.sub(currentPaid)

        if (remainingToAllocate.gte(pendingDue)) {
          const principalDelta = new Decimal(inst.principalDue).sub(inst.principalPaid)
          const interestDelta = new Decimal(inst.interestDue).sub(inst.interestPaid)
          installmentUpdates.push({
            id: inst.id,
            totalPaid: totalDue,
            principalPaid: new Decimal(inst.principalDue),
            interestPaid: new Decimal(inst.interestDue),
            status: 'PAID',
            linePrincipal: principalDelta,
            lineInterest: interestDelta,
          })
          totalPrincipalPaid = totalPrincipalPaid.add(principalDelta)
          totalInterestPaid = totalInterestPaid.add(interestDelta)
          remainingToAllocate = remainingToAllocate.sub(pendingDue)
        } else {
          const portion = remainingToAllocate
          const principalDue = new Decimal(inst.principalDue)
          const totalDueVal = new Decimal(inst.totalDue)
          const principalRatio = totalDueVal.gt(0) ? principalDue.div(totalDueVal) : new Decimal(0)
          const linePrincipal = portion.mul(principalRatio).toDecimalPlaces(2)
          const lineInterest = portion.sub(linePrincipal).toDecimalPlaces(2)
          installmentUpdates.push({
            id: inst.id,
            totalPaid: currentPaid.add(portion),
            principalPaid: new Decimal(inst.principalPaid).add(linePrincipal),
            interestPaid: new Decimal(inst.interestPaid).add(lineInterest),
            status: 'PARTIAL',
            linePrincipal,
            lineInterest,
          })
          totalPrincipalPaid = totalPrincipalPaid.add(linePrincipal)
          totalInterestPaid = totalInterestPaid.add(lineInterest)
          remainingToAllocate = new Decimal(0)
        }
      }
      if (remainingToAllocate.gt(0)) {
        throw new CollectionError('Payment exceeds the remaining loan balance', 400)
      }

      const receiptNumber = await nextDisplayNumber(tx, 'receipt')
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          idempotencyKey,
          loanId: loan.id,
          collectedById: auth.user.id,
          collectedAt: receiptDate,
          totalAmount: new Decimal(amount),
          notes: notes || null,
        },
      })

      for (const update of installmentUpdates) {
        await tx.installment.update({
          where: { id: update.id },
          data: {
            totalPaid: update.totalPaid,
            principalPaid: update.principalPaid,
            interestPaid: update.interestPaid,
            status: update.status,
            lastUpdated: receiptDate,
          },
        })

        await tx.receiptLine.create({
          data: {
            receiptId: receipt.id,
            installmentId: update.id,
            principalPaid: update.linePrincipal,
            interestPaid: update.lineInterest,
          },
        })
      }

      await tx.ledgerEntry.createMany({
        data: [
          {
            loanId: loan.id,
            receiptId: receipt.id,
            account: 'CASH',
            entryType: 'DEBIT',
            amount: new Decimal(amount),
            description: `Payment collected on ${loan.loanNumber} (${receipt.receiptNumber})`,
            entryDate: receiptDate,
          },
          {
            loanId: loan.id,
            receiptId: receipt.id,
            account: 'LOANS_RECEIVABLE',
            entryType: 'CREDIT',
            amount: totalPrincipalPaid,
            description: `Principal reduction on ${loan.loanNumber}`,
            entryDate: receiptDate,
          },
          {
            loanId: loan.id,
            receiptId: receipt.id,
            account: 'INTEREST_INCOME',
            entryType: 'CREDIT',
            amount: totalInterestPaid,
            description: `Interest income on ${loan.loanNumber}`,
            entryDate: receiptDate,
          },
        ],
      })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'RECEIPT_CREATED',
        tableName: 'receipts',
        recordId: receipt.id,
        newValues: { loanId: loan.id, receiptNumber: receipt.receiptNumber, amount: amount.toFixed(2), collectedAt: receiptDate.toISOString() },
      })

      const remainingUnpaidCount = await tx.installment.count({
        where: {
          loanId: loan.id,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
      })

      if (remainingUnpaidCount === 0) {
        await tx.loan.update({
          where: { id: loan.id },
          data: { status: 'CLOSED' },
        })
        await writeAuditLog(tx, {
          userId: auth.user.id,
          action: 'LOAN_CLOSED',
          tableName: 'loans',
          recordId: loan.id,
          oldValues: { status: loan.status },
          newValues: { status: 'CLOSED', closingReceiptId: receipt.id },
        })
      }

      return { receipt, duplicate: false as const }
    }, { isolationLevel: 'Serializable' })

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 })
  } catch (error) {
    if (error instanceof CollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (submittedKey && isUniqueViolation(error)) {
      const receipt = await prisma.receipt.findUnique({ where: { idempotencyKey: submittedKey } })
      if (receipt && receipt.loanId === submittedLoanId && new Decimal(receipt.totalAmount).eq(submittedAmount ?? -1)) {
        return NextResponse.json({ receipt, duplicate: true })
      }
      if (receipt) return NextResponse.json({ error: 'Idempotency key was already used for another payment' }, { status: 409 })
    }
    console.error('Error processing collection:', error)
    return NextResponse.json({ error: 'Failed to record collection receipt' }, { status: 500 })
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

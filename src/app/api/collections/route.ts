import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { getCurrentUser } from '@/lib/auth/session'

const collectionSchema = z.object({
  loanId: z.string().uuid('Invalid loan ID'),
  amount: z.number().positive('Amount must be positive'),
  notes: z.string().optional().nullable(),
  collectedAt: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '30', 10)))
    const skip = (page - 1) * limit

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
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
      prisma.receipt.count(),
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
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const parsed = collectionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid collection details' },
        { status: 400 }
      )
    }

    const { loanId, amount, notes, collectedAt } = parsed.data

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        installments: {
          where: {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
          orderBy: { weekNumber: 'asc' },
        },
        member: true,
      },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    if (loan.status !== 'ACTIVE' && loan.status !== 'DISBURSED') {
      return NextResponse.json(
        { error: `Cannot collect payment for a loan with status ${loan.status}` },
        { status: 400 }
      )
    }

    if (loan.installments.length === 0) {
      return NextResponse.json(
        { error: 'All installments for this loan have already been fully paid.' },
        { status: 400 }
      )
    }

    // Default collector to user or first user in branch
    let collectorId = user?.id
    if (!collectorId) {
      const fallbackStaff = await prisma.userProfile.findFirst()
      collectorId = fallbackStaff?.id
    }

    if (!collectorId) {
      return NextResponse.json({ error: 'No staff user available as collector' }, { status: 400 })
    }

    const receiptDate = collectedAt ? new Date(collectedAt) : new Date()

    // Generate receipt number (e.g. RCP-0001)
    const receiptCount = await prisma.receipt.count()
    const receiptNumber = `RCP-${String(receiptCount + 1).padStart(5, '0')}`
    const idempotencyKey = `PAY-${loan.id}-${Date.now()}`

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
        // Full payment of this installment
        const principalDue = new Decimal(inst.principalDue)
        const interestDue = new Decimal(inst.interestDue)
        const instPrincipalPaid = new Decimal(inst.principalPaid)
        const instInterestPaid = new Decimal(inst.interestPaid)

        const principalDelta = principalDue.sub(instPrincipalPaid)
        const interestDelta = interestDue.sub(instInterestPaid)

        installmentUpdates.push({
          id: inst.id,
          totalPaid: totalDue,
          principalPaid: principalDue,
          interestPaid: interestDue,
          status: 'PAID',
          linePrincipal: principalDelta,
          lineInterest: interestDelta,
        })

        totalPrincipalPaid = totalPrincipalPaid.add(principalDelta)
        totalInterestPaid = totalInterestPaid.add(interestDelta)
        remainingToAllocate = remainingToAllocate.sub(pendingDue)
      } else {
        // Partial payment of this installment
        const portion = remainingToAllocate
        const principalDue = new Decimal(inst.principalDue)
        const totalDueVal = new Decimal(inst.totalDue)
        const principalRatio = totalDueVal.gt(0) ? principalDue.div(totalDueVal) : new Decimal(0.8)

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

    const resultReceipt = await prisma.$transaction(async (tx) => {
      // 1. Create Receipt
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          idempotencyKey,
          loanId: loan.id,
          collectedById: collectorId,
          collectedAt: receiptDate,
          totalAmount: new Decimal(amount),
          notes: notes || null,
        },
      })

      // 2. Update Installments & Create ReceiptLines
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

      // 3. Ledger Entries
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

      // 4. Check if loan is fully paid
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
      }

      return receipt
    })

    return NextResponse.json({ receipt: resultReceipt }, { status: 201 })
  } catch (error) {
    console.error('Error processing collection:', error)
    return NextResponse.json({ error: 'Failed to record collection receipt' }, { status: 500 })
  }
}

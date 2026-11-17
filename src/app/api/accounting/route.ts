import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { authorizeApi, branchScope } from '@/lib/auth/api'
import { getLocalDayRange, isAccountingDayClosed, lockAccountingDay } from '@/lib/finance/accounting-day'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'

const dayCloseSchema = z.object({
  branchId: z.string().uuid().optional(),
  openingCash: z.number().finite().min(0).multipleOf(0.01),
  closingCash: z.number().finite().min(0).multipleOf(0.01),
  notes: z.string().max(1000).optional().nullable(),
}).strict()

export async function GET() {
  const auth = await authorizeApi('accounting:view')
  if (!auth.user) return auth.response

  try {
    const { start: today, end: tomorrow } = getLocalDayRange(new Date())
    const accountingScope = auth.user.role === 'ADMIN' && auth.user.branchId
      ? { branchId: auth.user.branchId }
      : branchScope(auth.user)

    const [dayCloses, recentLedger, todayReceipts, todayDisbursements, cashFlows] = await Promise.all([
      prisma.dayClose.findMany({
        where: accountingScope,
        include: {
          branch: { select: { id: true, name: true } },
          closedBy: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { closeDate: 'desc' },
        take: 15,
      }),
      prisma.ledgerEntry.findMany({
        where: { loan: accountingScope },
        include: {
          loan: { select: { loanNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.receipt.aggregate({
        where: {
          loan: accountingScope,
          collectedAt: { gte: today, lt: tomorrow },
          isReversed: false,
        },
        _sum: { totalAmount: true },
      }),
      prisma.loan.aggregate({
        where: {
          ...accountingScope,
          disbursedAt: { gte: today, lt: tomorrow },
        },
        _sum: { principalAmount: true },
      }),
      prisma.cashFlow.findMany({
        where: accountingScope,
        include: { branch: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: 20,
      }),
    ])

    const totalCollectedToday = Number(todayReceipts._sum.totalAmount ?? 0)
    const totalDisbursedToday = Number(todayDisbursements._sum.principalAmount ?? 0)

    return NextResponse.json({
      dayCloses,
      recentLedger,
      cashFlows,
      todaySummary: {
        totalCollected: totalCollectedToday,
        totalDisbursed: totalDisbursedToday,
        netCashFlow: totalCollectedToday - totalDisbursedToday,
      },
    })
  } catch (error) {
    console.error('Error fetching accounting overview:', error)
    return NextResponse.json({ error: 'Failed to fetch accounting data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApi('dayclose:create')
  if (!auth.user) return auth.response

  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = dayCloseSchema.safeParse(body.value)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid day close details' },
        { status: 400 }
      )
    }

    const { openingCash, closingCash, notes } = parsed.data
    const branchId = auth.user.role === 'ADMIN' ? parsed.data.branchId ?? auth.user.branchId : auth.user.branchId

    if (!branchId) {
      return NextResponse.json({ error: 'A branch is required for day close' }, { status: 400 })
    }
    const activeBranch = await prisma.branch.findFirst({ where: { id: branchId, isActive: true }, select: { id: true } })
    if (!activeBranch) return NextResponse.json({ error: 'Active branch not found' }, { status: 404 })

    if (auth.user.role !== 'ADMIN' && parsed.data.branchId && parsed.data.branchId !== auth.user.branchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = getLocalDayRange(new Date()).start
    const dayClose = await prisma.$transaction(async (tx) => {
      const { start, end } = await lockAccountingDay(tx, branchId, today)
      if (await isAccountingDayClosed(tx, branchId, today)) {
        throw new Error('DAY_ALREADY_CLOSED')
      }

      const [collected, disbursed] = await Promise.all([
        tx.receipt.aggregate({
          where: { loan: { branchId }, collectedAt: { gte: start, lt: end }, isReversed: false },
          _sum: { totalAmount: true },
        }),
        tx.loan.aggregate({
          where: { branchId, disbursedAt: { gte: start, lt: end } },
          _sum: { principalAmount: true },
        }),
      ])
      const totalCollected = collected._sum.totalAmount ?? new Decimal(0)
      const totalDisbursed = disbursed._sum.principalAmount ?? new Decimal(0)
      const expectedClosing = new Decimal(openingCash).add(totalCollected).sub(totalDisbursed)
      const variance = new Decimal(closingCash).sub(expectedClosing)

      const created = await tx.dayClose.create({
        data: {
          branchId,
          closeDate: start,
          closedById: auth.user.id,
          openingCash: new Decimal(openingCash),
          totalCollected,
          totalDisbursed,
          closingCash: new Decimal(closingCash),
          variance,
          status: 'CLOSED',
          notes: notes || null,
        },
      })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'DAY_CLOSED',
        tableName: 'day_closes',
        recordId: created.id,
        newValues: { branchId, closeDate: start.toISOString(), totalCollected: totalCollected.toString(), totalDisbursed: totalDisbursed.toString(), variance: variance.toString() },
      })
      return created
    })

    return NextResponse.json({ dayClose }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'DAY_ALREADY_CLOSED') {
      return NextResponse.json({ error: 'This branch has already been closed for today' }, { status: 409 })
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'This branch has already been closed for today' }, { status: 409 })
    }
    console.error('Error submitting day close:', error)
    return NextResponse.json({ error: 'Failed to record day close' }, { status: 500 })
  }
}

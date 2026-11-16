import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { authorizeApi, branchScope } from '@/lib/auth/api'

const dayCloseSchema = z.object({
  branchId: z.string().uuid().optional(),
  openingCash: z.number().min(0),
  closingCash: z.number().min(0),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  const auth = await authorizeApi('accounting:view')
  if (!auth.user) return auth.response

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [dayCloses, recentLedger, todayReceipts, todayDisbursements, cashFlows] = await Promise.all([
      prisma.dayClose.findMany({
        where: branchScope(auth.user),
        include: {
          branch: { select: { id: true, name: true } },
          closedBy: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { closeDate: 'desc' },
        take: 15,
      }),
      prisma.ledgerEntry.findMany({
        where: { loan: branchScope(auth.user) },
        include: {
          loan: { select: { loanNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.receipt.findMany({
        where: {
          loan: branchScope(auth.user),
          collectedAt: { gte: today, lt: tomorrow },
          isReversed: false,
        },
        select: { totalAmount: true },
      }),
      prisma.loan.findMany({
        where: {
          ...branchScope(auth.user),
          disbursedAt: { gte: today, lt: tomorrow },
        },
        select: { principalAmount: true },
      }),
      prisma.cashFlow.findMany({
        where: branchScope(auth.user),
        include: { branch: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: 20,
      }),
    ])

    const totalCollectedToday = todayReceipts.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0
    )
    const totalDisbursedToday = todayDisbursements.reduce(
      (sum, l) => sum + Number(l.principalAmount),
      0
    )

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
    const body = await request.json()
    const parsed = dayCloseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid day close details' },
        { status: 400 }
      )
    }

    const { openingCash, closingCash, notes } = parsed.data
    const branchId = auth.user.role === 'ADMIN' ? parsed.data.branchId : auth.user.branchId

    if (!branchId) {
      return NextResponse.json({ error: 'A branch is required for day close' }, { status: 400 })
    }

    if (auth.user.role !== 'ADMIN' && parsed.data.branchId && parsed.data.branchId !== auth.user.branchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [todayReceipts, todayDisbursements] = await Promise.all([
      prisma.receipt.findMany({
        where: {
          loan: branchScope(auth.user),
          collectedAt: { gte: today, lt: tomorrow },
          isReversed: false,
        },
        select: { totalAmount: true },
      }),
      prisma.loan.findMany({
        where: {
          ...branchScope(auth.user),
          disbursedAt: { gte: today, lt: tomorrow },
        },
        select: { principalAmount: true },
      }),
    ])

    const totalCollected = todayReceipts.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0
    )
    const totalDisbursed = todayDisbursements.reduce(
      (sum, l) => sum + Number(l.principalAmount),
      0
    )

    const expectedClosing = openingCash + totalCollected - totalDisbursed
    const variance = closingCash - expectedClosing

    const dayClose = await prisma.dayClose.upsert({
      where: {
        branchId_closeDate: {
          branchId,
          closeDate: today,
        },
      },
      create: {
        branchId,
        closeDate: today,
        closedById: auth.user.id,
        openingCash: new Decimal(openingCash),
        totalCollected: new Decimal(totalCollected),
        totalDisbursed: new Decimal(totalDisbursed),
        closingCash: new Decimal(closingCash),
        variance: new Decimal(variance),
        status: 'CLOSED',
        notes: notes || null,
      },
      update: {
        closedById: auth.user.id,
        openingCash: new Decimal(openingCash),
        totalCollected: new Decimal(totalCollected),
        totalDisbursed: new Decimal(totalDisbursed),
        closingCash: new Decimal(closingCash),
        variance: new Decimal(variance),
        status: 'CLOSED',
        notes: notes || null,
      },
    })

    return NextResponse.json({ dayClose }, { status: 201 })
  } catch (error) {
    console.error('Error submitting day close:', error)
    return NextResponse.json({ error: 'Failed to record day close' }, { status: 500 })
  }
}

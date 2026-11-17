import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi, branchScope } from '@/lib/auth/api'

export async function GET() {
  const auth = await authorizeApi('reports:view')
  if (!auth.user) return auth.response

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [products, centres, membersCount, loans, receipts] = await Promise.all([
      prisma.loanProduct.findMany({
        where: { isActive: true },
        include: {
          loans: {
            where: { ...branchScope(auth.user), status: { in: ['ACTIVE', 'DISBURSED'] } },
            include: {
              installments: {
                select: { totalDue: true, totalPaid: true, status: true },
              },
            },
          },
        },
      }),
      prisma.centre.findMany({
        where: { ...branchScope(auth.user), isActive: true },
        include: {
          members: {
            where: { isActive: true },
            include: {
              loans: {
                where: { ...branchScope(auth.user), status: { in: ['ACTIVE', 'DISBURSED'] } },
                include: {
                  installments: {
                    select: { totalDue: true, totalPaid: true, status: true, dueDate: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.member.count({ where: {
        isActive: true,
        loans: { some: { ...branchScope(auth.user), status: { in: ['ACTIVE', 'DISBURSED'] } } },
        ...(auth.user.role === 'ADMIN' ? {} : { centre: { branchId: auth.user.branchId! } }),
      } }),
      prisma.loan.findMany({
        where: branchScope(auth.user),
        include: {
          installments: {
            select: { totalDue: true, totalPaid: true, status: true, dueDate: true },
          },
        },
      }),
      prisma.receipt.findMany({
        where: { isReversed: false, loan: branchScope(auth.user) },
        select: { totalAmount: true, collectedAt: true },
        orderBy: { collectedAt: 'desc' },
      }),
    ])

    // Portfolio by Product
    const productStats = products.map((prod) => {
      const activeLoans = prod.loans.length
      const principalSum = prod.loans.reduce((sum, l) => sum + Number(l.principalAmount), 0)
      const outstandingSum = prod.loans.reduce((sum, l) => {
        const remaining = l.installments
          .filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED')
          .reduce((acc, i) => acc + (Number(i.totalDue) - Number(i.totalPaid)), 0)
        return sum + remaining
      }, 0)

      return {
        id: prod.id,
        name: prod.name,
        activeLoans,
        principalSum,
        outstandingSum,
      }
    })

    // Centre Efficiency
    const centreStats = centres.map((centre) => {
      const activeMembers = centre.members.length
      let activeLoansCount = 0
      let totalOutstanding = 0
      let totalOverdue = 0

      for (const m of centre.members) {
        activeLoansCount += m.loans.length
        for (const l of m.loans) {
          for (const inst of l.installments) {
            if (inst.status !== 'PAID' && inst.status !== 'WAIVED') {
              const due = Number(inst.totalDue) - Number(inst.totalPaid)
              totalOutstanding += due
              if (new Date(inst.dueDate) < today) {
                totalOverdue += due
              }
            }
          }
        }
      }

      const collectionEfficiency =
        totalOutstanding > 0
          ? Math.max(0, Math.min(100, Math.round(((totalOutstanding - totalOverdue) / totalOutstanding) * 100)))
          : 100

      return {
        id: centre.id,
        name: centre.name,
        membersCount: activeMembers,
        activeLoansCount,
        totalOutstanding,
        totalOverdue,
        collectionEfficiency,
      }
    })

    // Global KPIs
    const totalDisbursed = loans.reduce((sum, l) => {
      if (l.disbursedAt) return sum + Number(l.principalAmount)
      return sum
    }, 0)

    const totalCollected = receipts.reduce((sum, r) => sum + Number(r.totalAmount), 0)

    let totalActivePortfolio = 0
    let totalArrearsPortfolio = 0

    loans.forEach((l) => {
      if (l.status === 'ACTIVE' || l.status === 'DISBURSED') {
        let isLoanInArrears = false
        let loanOutstanding = 0
        l.installments.forEach((inst) => {
          if (inst.status !== 'PAID' && inst.status !== 'WAIVED') {
            const due = Number(inst.totalDue) - Number(inst.totalPaid)
            totalActivePortfolio += due
            loanOutstanding += due
            if (new Date(inst.dueDate) < today) {
              isLoanInArrears = true
            }
          }
        })
        if (isLoanInArrears) {
          totalArrearsPortfolio += loanOutstanding
        }
      }
    })

    const parRate =
      totalActivePortfolio > 0
        ? Math.round((totalArrearsPortfolio / totalActivePortfolio) * 1000) / 10
        : 0

    return NextResponse.json({
      summary: {
        activeBorrowers: membersCount,
        totalDisbursed,
        totalCollected,
        totalActivePortfolio,
        parRate,
      },
      productStats,
      centreStats,
    })
  } catch (error) {
    console.error('Error compiling reports:', error)
    return NextResponse.json({ error: 'Failed to compile reports' }, { status: 500 })
  }
}

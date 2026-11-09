import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch active loans with unpaid installments past their due date
    const loansWithArrears = await prisma.loan.findMany({
      where: {
        status: { in: ['ACTIVE', 'DISBURSED'] },
        installments: {
          some: {
            dueDate: { lt: today },
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
        },
      },
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
        product: { select: { name: true } },
        installments: {
          where: {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    })

    const parsedArrears = loansWithArrears.map((loan) => {
      const overdueInstallments = loan.installments.filter(
        (inst) => new Date(inst.dueDate) < today
      )

      const oldestOverdue = overdueInstallments[0]
      const daysOverdue = oldestOverdue
        ? Math.max(
            1,
            Math.floor((today.getTime() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          )
        : 0

      const overdueAmount = overdueInstallments.reduce(
        (sum, inst) => sum + (Number(inst.totalDue) - Number(inst.totalPaid)),
        0
      )

      const totalBalance = loan.installments.reduce(
        (sum, inst) => sum + (Number(inst.totalDue) - Number(inst.totalPaid)),
        0
      )

      let bucket: '1-7' | '8-30' | '31-60' | '60+' = '1-7'
      if (daysOverdue > 60) bucket = '60+'
      else if (daysOverdue > 30) bucket = '31-60'
      else if (daysOverdue > 7) bucket = '8-30'

      return {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        productName: loan.product.name,
        member: loan.member,
        daysOverdue,
        overdueAmount,
        totalBalance,
        bucket,
        oldestDueDate: oldestOverdue ? oldestOverdue.dueDate : null,
        overdueInstallmentsCount: overdueInstallments.length,
      }
    })

    // Sort by days overdue descending
    parsedArrears.sort((a, b) => b.daysOverdue - a.daysOverdue)

    const totalOverdue = parsedArrears.reduce((sum, item) => sum + item.overdueAmount, 0)
    const totalAtRiskPortfolio = parsedArrears.reduce((sum, item) => sum + item.totalBalance, 0)

    const bucketCounts = {
      '1-7': parsedArrears.filter((x) => x.bucket === '1-7').length,
      '8-30': parsedArrears.filter((x) => x.bucket === '8-30').length,
      '31-60': parsedArrears.filter((x) => x.bucket === '31-60').length,
      '60+': parsedArrears.filter((x) => x.bucket === '60+').length,
    }

    return NextResponse.json({
      arrears: parsedArrears,
      summary: {
        totalLoans: parsedArrears.length,
        totalOverdue,
        totalAtRiskPortfolio,
        bucketCounts,
      },
    })
  } catch (error) {
    console.error('Error fetching arrears:', error)
    return NextResponse.json({ error: 'Failed to fetch arrears report' }, { status: 500 })
  }
}

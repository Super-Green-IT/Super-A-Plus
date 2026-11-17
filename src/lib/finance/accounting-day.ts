import 'server-only'
import type { Prisma } from '@prisma/client'

export function getLocalDayRange(value: Date) {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export async function lockAccountingDay(tx: Prisma.TransactionClient, branchId: string, value: Date) {
  const { start } = getLocalDayRange(value)
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`super-a-plus:accounting-day:${branchId}:${date}`})::bigint)`
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export async function isAccountingDayClosed(tx: Prisma.TransactionClient, branchId: string, value: Date) {
  const { start } = getLocalDayRange(value)
  const closed = await tx.dayClose.findUnique({
    where: { branchId_closeDate: { branchId, closeDate: start } },
    select: { status: true },
  })
  return closed?.status === 'CLOSED'
}

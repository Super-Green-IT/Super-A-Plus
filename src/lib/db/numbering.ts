import 'server-only'
import type { Prisma } from '@prisma/client'

type NumberKind = 'member' | 'loan' | 'receipt'

export async function nextDisplayNumber(tx: Prisma.TransactionClient, kind: NumberKind): Promise<string> {
  if (kind === 'member') {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('super-a-plus:member-number')::bigint)`
    const [row] = await tx.$queryRaw<Array<{ next: bigint }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING("memberNumber" FROM 3) AS BIGINT)), 0) + 1 AS next
      FROM "members"
    `
    return `M-${row.next.toString().padStart(4, '0')}`
  }

  if (kind === 'loan') {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('super-a-plus:loan-number')::bigint)`
    const [row] = await tx.$queryRaw<Array<{ next: bigint }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING("loanNumber" FROM 3) AS BIGINT)), 0) + 1 AS next
      FROM "loans"
    `
    return `L-${row.next.toString().padStart(4, '0')}`
  }

  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('super-a-plus:receipt-number')::bigint)`
  const [row] = await tx.$queryRaw<Array<{ next: bigint }>>`
    SELECT COALESCE(MAX(CAST(SUBSTRING("receiptNumber" FROM 5) AS BIGINT)), 0) + 1 AS next
    FROM "receipts"
  `
  return `RCP-${row.next.toString().padStart(5, '0')}`
}


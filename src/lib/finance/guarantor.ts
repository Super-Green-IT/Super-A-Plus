import 'server-only'
import type { Prisma } from '@prisma/client'

export async function lockGuarantor(tx: Prisma.TransactionClient, memberId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`super-a-plus:guarantor:${memberId}`})::bigint)`
}

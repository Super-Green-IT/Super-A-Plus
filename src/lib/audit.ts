import 'server-only'
import type { Prisma } from '@prisma/client'

type AuditEntry = {
  userId: string
  action: string
  tableName: string
  recordId: string
  ipAddress?: string | null
  oldValues?: Prisma.InputJsonValue
  newValues?: Prisma.InputJsonValue
}

export async function writeAuditLog(tx: Prisma.TransactionClient, entry: AuditEntry) {
  await tx.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      tableName: entry.tableName,
      recordId: entry.recordId,
      ...(entry.ipAddress ? { ipAddress: entry.ipAddress.slice(0, 64) } : {}),
      ...(entry.oldValues !== undefined ? { oldValues: entry.oldValues } : {}),
      ...(entry.newValues !== undefined ? { newValues: entry.newValues } : {}),
    },
  })
}

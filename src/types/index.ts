import type {
  Role,
  LoanStatus,
  InstallmentStatus,
  DayCloseStatus,
  LeadStatus,
  InterestMethod,
  LoanType,
} from '@prisma/client'

export type {
  Role,
  LoanStatus,
  InstallmentStatus,
  DayCloseStatus,
  LeadStatus,
  InterestMethod,
  LoanType,
}

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: Role
  branchId: string | null
}

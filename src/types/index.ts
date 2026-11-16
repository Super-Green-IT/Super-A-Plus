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


export interface LoanProduct {
  id: string
  name: string
  loanType: LoanType
  interestMethod: InterestMethod
  annualInterestRate: string
  minAmount: string
  maxAmount: string
  minTermWeeks: number
  maxTermWeeks: number
  processingFeeRate: string
  requiresGuarantor: boolean
  isActive: boolean
  createdAt: string
}
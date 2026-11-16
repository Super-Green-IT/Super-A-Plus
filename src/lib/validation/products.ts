import { z } from 'zod'

const fields = {
  name: z.string().trim().min(2).max(100),
  loanType: z.enum(['PERSONAL', 'BUSINESS']),
  interestMethod: z.enum(['FLAT', 'REDUCING_BALANCE']),
  annualInterestRate: z.coerce.number().finite().min(0).max(1),
  minAmount: z.coerce.number().finite().min(0),
  maxAmount: z.coerce.number().finite().positive(),
  minTermWeeks: z.coerce.number().int().min(1).max(520),
  maxTermWeeks: z.coerce.number().int().min(1).max(520),
  processingFeeRate: z.coerce.number().finite().min(0).max(1),
  requiresGuarantor: z.boolean(),
  isActive: z.boolean().optional(),
}

export const productCreateSchema = z.object({
  ...fields,
  isActive: z.boolean().optional(),
}).strict().refine((value) => value.minAmount < value.maxAmount, {
  message: 'Maximum loan amount must exceed minimum loan amount',
  path: ['maxAmount'],
}).refine((value) => value.minTermWeeks <= value.maxTermWeeks, {
  message: 'Maximum term must be at least the minimum term',
  path: ['maxTermWeeks'],
})

export const productUpdateSchema = z.object({
  name: fields.name.optional(),
  loanType: fields.loanType.optional(),
  interestMethod: fields.interestMethod.optional(),
  annualInterestRate: fields.annualInterestRate.optional(),
  minAmount: fields.minAmount.optional(),
  maxAmount: fields.maxAmount.optional(),
  minTermWeeks: fields.minTermWeeks.optional(),
  maxTermWeeks: fields.maxTermWeeks.optional(),
  processingFeeRate: fields.processingFeeRate.optional(),
  requiresGuarantor: fields.requiresGuarantor.optional(),
  isActive: fields.isActive,
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one product field is required')

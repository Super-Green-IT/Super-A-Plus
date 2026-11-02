import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type InterestMethod = 'FLAT' | 'REDUCING_BALANCE'

export interface LoanInput {
  principalAmount: Decimal
  annualInterestRate: Decimal // e.g. 0.24 = 24%
  termWeeks: number
  interestMethod: InterestMethod
  firstRepaymentDate: Date
}

export interface InstallmentRow {
  weekNumber: number
  dueDate: Date
  principalDue: Decimal
  interestDue: Decimal
  totalDue: Decimal
  openingBalance: Decimal
  closingBalance: Decimal
}

export interface ScheduleResult {
  installments: InstallmentRow[]
  totalInterest: Decimal
  totalRepayable: Decimal
  weeklyInstallment: Decimal // For flat: constant. For reducing: first installment.
}

const WEEKS_PER_YEAR = new Decimal(52)

/**
 * Generate a flat-rate weekly repayment schedule.
 * Interest = Principal × AnnualRate × (TermWeeks / 52)
 * Equal installments of (Principal + TotalInterest) / TermWeeks
 */
function generateFlatSchedule(input: LoanInput): ScheduleResult {
  const { principalAmount, annualInterestRate, termWeeks, firstRepaymentDate } = input
  const weeklyRate = annualInterestRate.div(WEEKS_PER_YEAR)
  const totalInterest = principalAmount.mul(weeklyRate).mul(termWeeks)
  const totalRepayable = principalAmount.add(totalInterest)
  const weeklyPayment = totalRepayable.div(termWeeks).toDecimalPlaces(2)

  // Adjust last installment for rounding
  const sumBeforeLast = weeklyPayment.mul(termWeeks - 1)
  const lastPayment = totalRepayable.sub(sumBeforeLast).toDecimalPlaces(2)

  const weeklyPrincipal = principalAmount.div(termWeeks).toDecimalPlaces(2)
  const weeklyInterest = totalInterest.div(termWeeks).toDecimalPlaces(2)

  const installments: InstallmentRow[] = []
  let balance = principalAmount

  for (let i = 1; i <= termWeeks; i++) {
    const dueDate = new Date(firstRepaymentDate)
    dueDate.setDate(dueDate.getDate() + (i - 1) * 7)

    const isLast = i === termWeeks
    const principal = isLast ? balance : weeklyPrincipal
    const interest = isLast ? lastPayment.sub(principal) : weeklyInterest
    const total = principal.add(interest)
    const closingBalance = balance.sub(principal)

    installments.push({
      weekNumber: i,
      dueDate,
      principalDue: principal,
      interestDue: interest,
      totalDue: total,
      openingBalance: balance,
      closingBalance,
    })

    balance = closingBalance
  }

  return {
    installments,
    totalInterest,
    totalRepayable,
    weeklyInstallment: weeklyPayment,
  }
}

/**
 * Generate a reducing-balance weekly repayment schedule.
 * Weekly rate = AnnualRate / 52
 * Annuity formula for equal total installments.
 */
function generateReducingBalanceSchedule(input: LoanInput): ScheduleResult {
  const { principalAmount, annualInterestRate, termWeeks, firstRepaymentDate } = input
  const weeklyRate = annualInterestRate.div(WEEKS_PER_YEAR)

  // Annuity payment: P * r / (1 - (1+r)^-n)
  const onePlusR = weeklyRate.add(1)
  const onePlusRpowN = onePlusR.pow(termWeeks)
  const weeklyPayment = principalAmount
    .mul(weeklyRate)
    .div(new Decimal(1).sub(new Decimal(1).div(onePlusRpowN)))
    .toDecimalPlaces(2)

  const installments: InstallmentRow[] = []
  let balance = principalAmount
  let totalInterest = new Decimal(0)

  for (let i = 1; i <= termWeeks; i++) {
    const dueDate = new Date(firstRepaymentDate)
    dueDate.setDate(dueDate.getDate() + (i - 1) * 7)

    const interest = balance.mul(weeklyRate).toDecimalPlaces(2)
    const isLast = i === termWeeks
    const payment = isLast ? balance.add(interest) : weeklyPayment
    const principal = payment.sub(interest)
    const closingBalance = balance.sub(principal)

    installments.push({
      weekNumber: i,
      dueDate,
      principalDue: principal,
      interestDue: interest,
      totalDue: payment,
      openingBalance: balance,
      closingBalance: isLast ? new Decimal(0) : closingBalance,
    })

    totalInterest = totalInterest.add(interest)
    balance = isLast ? new Decimal(0) : closingBalance
  }

  const totalRepayable = principalAmount.add(totalInterest)

  return {
    installments,
    totalInterest,
    totalRepayable,
    weeklyInstallment: weeklyPayment,
  }
}

export function generateSchedule(input: LoanInput): ScheduleResult {
  if (input.interestMethod === 'FLAT') {
    return generateFlatSchedule(input)
  }
  return generateReducingBalanceSchedule(input)
}

import Decimal from 'decimal.js'
import { generateSchedule } from './schedule'

const ONE_JAN = new Date('2025-01-06') // A Monday

describe('Flat rate schedule', () => {
  const result = generateSchedule({
    principalAmount: new Decimal(100000),
    annualInterestRate: new Decimal(0.24),
    termWeeks: 52,
    interestMethod: 'FLAT',
    firstRepaymentDate: ONE_JAN,
  })

  it('has 52 installments', () => {
    expect(result.installments).toHaveLength(52)
  })

  it('total principal repaid equals loan amount', () => {
    const totalPrincipal = result.installments.reduce(
      (sum, i) => sum.add(i.principalDue),
      new Decimal(0)
    )
    expect(totalPrincipal.toNumber()).toBeCloseTo(100000, 0)
  })

  it('totalRepayable = principal + totalInterest', () => {
    expect(result.totalRepayable.toNumber()).toBeCloseTo(
      result.installments.reduce((s, i) => s.add(i.totalDue), new Decimal(0)).toNumber(),
      0
    )
  })

  it('closing balance of last installment is zero', () => {
    const last = result.installments[51]
    expect(last.closingBalance.toNumber()).toBeCloseTo(0, 1)
  })
})

describe('Reducing balance schedule', () => {
  const result = generateSchedule({
    principalAmount: new Decimal(100000),
    annualInterestRate: new Decimal(0.24),
    termWeeks: 52,
    interestMethod: 'REDUCING_BALANCE',
    firstRepaymentDate: ONE_JAN,
  })

  it('has 52 installments', () => {
    expect(result.installments).toHaveLength(52)
  })

  it('total principal repaid equals loan amount', () => {
    const totalPrincipal = result.installments.reduce(
      (sum, i) => sum.add(i.principalDue),
      new Decimal(0)
    )
    expect(totalPrincipal.toNumber()).toBeCloseTo(100000, 0)
  })

  it('interest is lower than flat rate', () => {
    const flatResult = generateSchedule({
      principalAmount: new Decimal(100000),
      annualInterestRate: new Decimal(0.24),
      termWeeks: 52,
      interestMethod: 'FLAT',
      firstRepaymentDate: ONE_JAN,
    })
    expect(result.totalInterest.lessThan(flatResult.totalInterest)).toBe(true)
  })

  it('closing balance of last installment is zero', () => {
    const last = result.installments[51]
    expect(last.closingBalance.toNumber()).toBeCloseTo(0, 1)
  })
})

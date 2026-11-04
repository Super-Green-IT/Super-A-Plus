import Decimal from 'decimal.js'
import { formatLKR, formatDate } from './formatters'

describe('formatLKR', () => {
  it('formats positive numbers with LKR prefix and two decimals', () => {
    expect(formatLKR(1250000)).toBe('LKR 1,250,000.00')
    expect(formatLKR(500.5)).toBe('LKR 500.50')
  })

  it('formats Prisma Decimal objects correctly', () => {
    const dec = new Decimal('987654.32')
    expect(formatLKR(dec)).toBe('LKR 987,654.32')
  })

  it('supports hiding currency prefix', () => {
    expect(formatLKR(1250, { showCurrency: false })).toBe('1,250.00')
  })

  it('handles null, undefined and empty values safely', () => {
    expect(formatLKR(null)).toBe('LKR 0.00')
    expect(formatLKR(undefined)).toBe('LKR 0.00')
    expect(formatLKR('')).toBe('LKR 0.00')
  })

  it('supports compact notation', () => {
    const formatted = formatLKR(1500000, { compact: true })
    expect(formatted).toMatch(/LKR 1\.5[MK]?/)
  })
})

describe('formatDate', () => {
  it('formats dates consistently', () => {
    const d = new Date(2026, 10, 4) // Nov 4, 2026
    expect(formatDate(d)).toBe('04 Nov 2026')
  })

  it('handles invalid dates gracefully', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('invalid-date')).toBe('—')
  })
})

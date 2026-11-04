import { validateNIC, formatSLPhone } from './nic'

describe('validateNIC', () => {
  it('validates old 9-digit NIC for male', () => {
    // 891234567V -> 1989, day 123 (Male)
    const result = validateNIC('891234567v')
    expect(result.isValid).toBe(true)
    expect(result.formatted).toBe('891234567V')
    expect(result.yearOfBirth).toBe(1989)
    expect(result.gender).toBe('MALE')
  })

  it('validates old 9-digit NIC for female (day > 500)', () => {
    // 926541234X -> 1992, day 654 -> female (day 154)
    const result = validateNIC('926541234X')
    expect(result.isValid).toBe(true)
    expect(result.gender).toBe('FEMALE')
  })

  it('validates new 12-digit NIC', () => {
    // 199512345678 -> 1995, day 123 (Male)
    const result = validateNIC('199512345678')
    expect(result.isValid).toBe(true)
    expect(result.yearOfBirth).toBe(1995)
    expect(result.gender).toBe('MALE')
  })

  it('rejects invalid NIC numbers', () => {
    expect(validateNIC('12345').isValid).toBe(false)
    expect(validateNIC('891234567A').isValid).toBe(false)
    expect(validateNIC('890004567V').isValid).toBe(false) // day 000 is invalid
  })
})

describe('formatSLPhone', () => {
  it('formats standard 10-digit mobile', () => {
    expect(formatSLPhone('0771234567')).toBe('+94 77 123 4567')
  })
})

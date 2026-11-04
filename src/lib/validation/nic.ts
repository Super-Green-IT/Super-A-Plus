/**
 * Sri Lankan National Identity Card (NIC) Validator & Parser
 * Supports both:
 * - Old format: 9 digits + 'V' or 'X' (e.g., 891234567V)
 * - New format: 12 digits (e.g., 198912345678)
 */

export interface ParsedNIC {
  isValid: boolean
  formatted: string
  yearOfBirth?: number
  dayOfYear?: number
  gender?: 'MALE' | 'FEMALE'
  error?: string
}

export function validateNIC(rawNic: string): ParsedNIC {
  const clean = rawNic.trim().toUpperCase()

  // Old format: 9 digits followed by V or X
  const oldRegex = /^(\d{2})(\d{3})(\d{4})([VX])$/
  // New format: 12 digits
  const newRegex = /^(\d{4})(\d{3})(\d{5})$/

  const isOld = oldRegex.test(clean)
  const isNew = newRegex.test(clean)

  if (!isOld && !isNew) {
    return {
      isValid: false,
      formatted: clean,
      error: 'Invalid format. Use 9 digits with V/X (e.g. 891234567V) or 12 digits.',
    }
  }

  let birthYear: number
  let dayText: number

  if (isOld) {
    const match = clean.match(oldRegex)!
    birthYear = 1900 + parseInt(match[1], 10)
    dayText = parseInt(match[2], 10)
  } else {
    const match = clean.match(newRegex)!
    birthYear = parseInt(match[1], 10)
    dayText = parseInt(match[2], 10)
  }

  // In SL NIC, days > 500 indicate female
  let gender: 'MALE' | 'FEMALE' = 'MALE'
  let dayOfYear = dayText

  if (dayOfYear > 500) {
    gender = 'FEMALE'
    dayOfYear -= 500
  }

  if (dayOfYear < 1 || dayOfYear > 366) {
    return {
      isValid: false,
      formatted: clean,
      error: 'Invalid day of year encoded in NIC.',
    }
  }

  return {
    isValid: true,
    formatted: clean,
    yearOfBirth: birthYear,
    dayOfYear,
    gender,
  }
}

/**
 * Format Sri Lankan Phone Numbers
 * Converts "0771234567" or "771234567" into "+94 77 123 4567"
 */
export function formatSLPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('94') && digits.length === 11) {
    return `+94 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+94 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  if (digits.length === 9) {
    return `+94 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }
  return phone
}

import Decimal from 'decimal.js'
import { format, formatDistanceToNow, isValid } from 'date-fns'

export interface FormatLKROptions {
  showCurrency?: boolean
  decimals?: number
  compact?: boolean
}

/**
 * Format a number, string, or Prisma Decimal to Sri Lankan Rupees (LKR)
 * Example: 1250000 -> "LKR 1,250,000.00"
 */
export function formatLKR(
  amount: Decimal | number | string | null | undefined,
  options: FormatLKROptions = {}
): string {
  const { showCurrency = true, decimals = 2, compact = false } = options

  if (amount === null || amount === undefined || amount === '') {
    return showCurrency ? 'LKR 0.00' : '0.00'
  }

  let dec: Decimal
  try {
    dec = amount instanceof Decimal ? amount : new Decimal(amount.toString())
  } catch {
    return showCurrency ? 'LKR 0.00' : '0.00'
  }

  const num = dec.toNumber()

  if (compact) {
    const formatted = new Intl.NumberFormat('en-LK', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num)
    return showCurrency ? `LKR ${formatted}` : formatted
  }

  const formatted = new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)

  return showCurrency ? `LKR ${formatted}` : formatted
}

/**
 * Format date consistently across the entire platform
 * Example: "04 Nov 2026"
 */
export function formatDate(date: Date | string | null | undefined, formatStr = 'dd MMM yyyy'): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (!isValid(d)) return '—'
  return format(d, formatStr)
}

/**
 * Format date & time
 * Example: "04 Nov 2026, 09:30 AM"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'dd MMM yyyy, hh:mm a')
}

/**
 * Format relative date (e.g. "3 days ago", "in 2 hours")
 */
export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (!isValid(d)) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

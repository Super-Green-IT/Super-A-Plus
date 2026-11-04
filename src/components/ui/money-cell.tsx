import * as React from 'react'
import Decimal from 'decimal.js'
import { formatLKR, type FormatLKROptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface MoneyCellProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: Decimal | number | string | null | undefined
  options?: FormatLKROptions
  variant?: 'default' | 'positive' | 'negative' | 'overdue' | 'muted'
  subtext?: string
}

export function MoneyCell({
  amount,
  options,
  variant = 'default',
  subtext,
  className,
  ...props
}: MoneyCellProps) {
  const formatted = formatLKR(amount, options)

  const variantStyles = {
    default: 'text-slate-100',
    positive: 'text-emerald-400 font-semibold',
    negative: 'text-rose-400 font-semibold',
    overdue: 'text-rose-400 font-bold',
    muted: 'text-slate-400',
  }

  return (
    <div className={cn('text-right tabular-nums font-mono', className)} {...props}>
      <div className={cn('text-sm tracking-tight', variantStyles[variant])}>
        {formatted}
      </div>
      {subtext && <div className="text-[11px] text-slate-500 font-sans">{subtext}</div>}
    </div>
  )
}

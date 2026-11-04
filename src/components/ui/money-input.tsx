import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatLKR } from '@/lib/formatters'

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number | string
  onChange?: (val: number | string) => void
  showPreview?: boolean
  error?: string
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, showPreview = false, error, className, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '')
      // Prevent multiple decimals
      const parts = raw.split('.')
      const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw
      onChange?.(sanitized)
    }

    return (
      <div className="w-full">
        <div className="relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-xs font-semibold tracking-wider text-emerald-400">LKR</span>
          </div>
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={value ?? ''}
            onChange={handleChange}
            className={cn(
              'block w-full rounded-md border border-slate-700 bg-slate-900 py-2 pl-12 pr-3 text-right font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
              className
            )}
            placeholder="0.00"
            {...props}
          />
        </div>
        {showPreview && value !== undefined && value !== '' && (
          <p className="mt-1 text-right text-xs text-slate-400">
            Preview: <span className="text-emerald-400 font-mono">{formatLKR(value)}</span>
          </p>
        )}
        {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      </div>
    )
  }
)

MoneyInput.displayName = 'MoneyInput'

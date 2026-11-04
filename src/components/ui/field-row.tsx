import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FieldRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  required?: boolean
  hint?: string
  error?: string
  id?: string
}

export function FieldRow({
  label,
  required,
  hint,
  error,
  id,
  children,
  className,
  ...props
}: FieldRowProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4 sm:items-start', className)} {...props}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-300 sm:pt-2 sm:text-right"
      >
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      <div className="sm:col-span-2">
        {children}
        {hint && !error && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
      </div>
    </div>
  )
}

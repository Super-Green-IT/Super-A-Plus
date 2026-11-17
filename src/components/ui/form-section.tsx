import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

export function FormSection({
  title,
  description,
  action,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#202d25]', className)}
      {...props}
    >
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

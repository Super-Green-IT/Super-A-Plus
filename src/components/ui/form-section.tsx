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
      className={cn('rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow-xs', className)}
      {...props}
    >
      <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3">
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

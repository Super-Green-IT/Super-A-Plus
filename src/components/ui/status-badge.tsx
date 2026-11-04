import * as React from 'react'
import { Badge } from './badge'
import { cn } from '@/lib/utils'
import type { LoanStatus, InstallmentStatus, LeadStatus, Role } from '@/types'

type StatusType =
  | LoanStatus
  | InstallmentStatus
  | LeadStatus
  | Role
  | 'ACTIVE'
  | 'INACTIVE'
  | 'OPEN'
  | 'CLOSED'
  | string

interface StatusConfig {
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info'
  dotColor?: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  // LoanStatus
  DRAFT: { label: 'Draft', variant: 'outline', dotColor: 'bg-slate-400' },
  SUBMITTED: { label: 'Submitted', variant: 'info', dotColor: 'bg-sky-400' },
  APPROVED: { label: 'Approved', variant: 'success', dotColor: 'bg-emerald-400' },
  REJECTED: { label: 'Rejected', variant: 'danger', dotColor: 'bg-rose-400' },
  DISBURSED: { label: 'Disbursed', variant: 'info', dotColor: 'bg-sky-400' },
  ACTIVE: { label: 'Active', variant: 'success', dotColor: 'bg-emerald-400' },
  CLOSED: { label: 'Closed', variant: 'secondary', dotColor: 'bg-slate-400' },
  WRITTEN_OFF: { label: 'Written Off', variant: 'danger', dotColor: 'bg-rose-400' },

  // InstallmentStatus
  PENDING: { label: 'Pending', variant: 'secondary', dotColor: 'bg-slate-400' },
  PARTIAL: { label: 'Partial', variant: 'warning', dotColor: 'bg-amber-400' },
  PAID: { label: 'Paid', variant: 'success', dotColor: 'bg-emerald-400' },
  OVERDUE: { label: 'Overdue', variant: 'danger', dotColor: 'bg-rose-400' },
  WAIVED: { label: 'Waived', variant: 'outline', dotColor: 'bg-slate-400' },

  // LeadStatus
  NEW: { label: 'New Lead', variant: 'info', dotColor: 'bg-sky-400' },
  CONTACTED: { label: 'Contacted', variant: 'secondary', dotColor: 'bg-slate-400' },
  APPOINTMENT_SET: { label: 'Appointment', variant: 'warning', dotColor: 'bg-amber-400' },
  CONVERTED: { label: 'Converted', variant: 'success', dotColor: 'bg-emerald-400' },
  LOST: { label: 'Lost', variant: 'danger', dotColor: 'bg-rose-400' },

  // Roles
  ADMIN: { label: 'Admin', variant: 'info', dotColor: 'bg-sky-400' },
  BRANCH_MANAGER: { label: 'Manager', variant: 'success', dotColor: 'bg-emerald-400' },
  ACCOUNTANT: { label: 'Accountant', variant: 'warning', dotColor: 'bg-amber-400' },
  FIELD_OFFICER: { label: 'Field Officer', variant: 'secondary', dotColor: 'bg-slate-400' },

  // Day Close
  OPEN: { label: 'Open', variant: 'warning', dotColor: 'bg-amber-400' },
  INACTIVE: { label: 'Inactive', variant: 'secondary', dotColor: 'bg-slate-500' },
}

export interface StatusBadgeProps {
  status: StatusType
  className?: string
  showDot?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, className, showDot = true, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    variant: 'secondary' as const,
    dotColor: 'bg-slate-400',
  }

  return (
    <Badge variant={config.variant} size={size} className={cn('whitespace-nowrap font-medium', className)}>
      {showDot && (
        <span
          className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0', config.dotColor)}
          aria-hidden="true"
        />
      )}
      {config.label}
    </Badge>
  )
}

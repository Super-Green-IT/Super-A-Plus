'use client'

import * as React from 'react'
import { StatusBadge } from '@/components/ui/status-badge'
import { MoneyCell } from '@/components/ui/money-cell'
import { MoneyInput } from '@/components/ui/money-input'
import { FormSection } from '@/components/ui/form-section'
import { FieldRow } from '@/components/ui/field-row'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ColumnDef } from '@tanstack/react-table'
import { ShieldAlert, Trash2, ArrowRight } from 'lucide-react'

interface SampleLoan {
  loanNo: string
  member: string
  principal: number
  totalDue: number
  status: string
  dueDate: string
}

const SAMPLE_LOANS: SampleLoan[] = [
  { loanNo: 'LN-2026-001', member: 'Kamal Perera', principal: 100000, totalDue: 124000, status: 'ACTIVE', dueDate: '10 Nov 2026' },
  { loanNo: 'LN-2026-002', member: 'Nimali Silva', principal: 50000, totalDue: 62000, status: 'APPROVED', dueDate: '12 Nov 2026' },
  { loanNo: 'LN-2026-003', member: 'Sunil Jayasuriya', principal: 150000, totalDue: 186000, status: 'OVERDUE', dueDate: '01 Nov 2026' },
  { loanNo: 'LN-2026-004', member: 'Anusha Fernando', principal: 75000, totalDue: 93000, status: 'SUBMITTED', dueDate: '15 Nov 2026' },
  { loanNo: 'LN-2026-005', member: 'Pradeep Bandara', principal: 200000, totalDue: 0, status: 'CLOSED', dueDate: '20 Oct 2026' },
]

export default function DevComponentsPage() {
  const [moneyVal, setMoneyVal] = React.useState<number | string>('125000')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const columns: ColumnDef<SampleLoan>[] = [
    {
      accessorKey: 'loanNo',
      header: 'Loan No',
      cell: ({ row }) => <span className="font-mono font-medium text-slate-200">{row.original.loanNo}</span>,
    },
    {
      accessorKey: 'member',
      header: 'Member Name',
      cell: ({ row }) => <span className="font-medium text-slate-300">{row.original.member}</span>,
    },
    {
      accessorKey: 'principal',
      header: 'Principal',
      cell: ({ row }) => <MoneyCell amount={row.original.principal} />,
    },
    {
      accessorKey: 'totalDue',
      header: 'Total Due',
      cell: ({ row }) => (
        <MoneyCell
          amount={row.original.totalDue}
          variant={row.original.status === 'OVERDUE' ? 'overdue' : 'default'}
        />
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => <span className="text-slate-400">{row.original.dueDate}</span>,
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">UI Primitives & Design System</h1>
        <p className="mt-1 text-sm text-slate-400">
          Component sandbox for testing foundational UI tokens, money formatters, data tables, and forms.
        </p>
      </div>

      {/* 1. Status Badges */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider text-xs">
          1. Semantic Status Badges
        </h2>
        
        <div>
          <span className="text-xs text-slate-400 block mb-2 font-medium">Loan Lifecycle:</span>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="DRAFT" />
            <StatusBadge status="SUBMITTED" />
            <StatusBadge status="APPROVED" />
            <StatusBadge status="ACTIVE" />
            <StatusBadge status="CLOSED" />
            <StatusBadge status="REJECTED" />
            <StatusBadge status="WRITTEN_OFF" />
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-2 font-medium">Installment Statuses:</span>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="PENDING" />
            <StatusBadge status="PARTIAL" />
            <StatusBadge status="PAID" />
            <StatusBadge status="OVERDUE" />
            <StatusBadge status="WAIVED" />
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-2 font-medium">System Roles:</span>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="ADMIN" />
            <StatusBadge status="BRANCH_MANAGER" />
            <StatusBadge status="ACCOUNTANT" />
            <StatusBadge status="FIELD_OFFICER" />
          </div>
        </div>
      </div>

      {/* 2. Money Formatting & Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSection title="2. Money Formatting (LKR)" description="Consistent currency display & right-aligned tabular numbers">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-xs text-slate-400">Standard Balance:</span>
              <MoneyCell amount={245000} />
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-xs text-slate-400">Collected (Positive):</span>
              <MoneyCell amount={18500} variant="positive" subtext="Receipt #4912" />
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-xs text-slate-400">Overdue (Danger):</span>
              <MoneyCell amount={6200} variant="overdue" subtext="14 days late" />
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-slate-400">Compact Notation:</span>
              <MoneyCell amount={1500000} options={{ compact: true }} />
            </div>
          </div>
        </FormSection>

        <FormSection title="3. Keyboard-Friendly Money Input" description="Auto-sanitizes digits with live LKR preview">
          <FieldRow label="Loan Amount" hint="Enter principal between LKR 25,000 and 500,000">
            <MoneyInput
              value={moneyVal}
              onChange={setMoneyVal}
              showPreview
              placeholder="e.g. 100000"
            />
          </FieldRow>
        </FormSection>
      </div>

      {/* 4. Form Layout & Confirm Dialog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSection title="4. High Density Field Rows" description="Label and control grid designed for quick data entry">
          <FieldRow label="Member Name" required>
            <input
              type="text"
              defaultValue="Sunil Jayasuriya"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </FieldRow>
          <FieldRow label="National ID (NIC)" required hint="Format: 123456789V or 12 digits">
            <input
              type="text"
              defaultValue="891234567V"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none font-mono"
            />
          </FieldRow>
        </FormSection>

        <FormSection title="5. Typed Safety Dialog" description="Requires typing confirmation for destructive or reversing operations">
          <p className="text-xs text-slate-400">
            Click below to test typed safety protection for payment reversals or member deletions.
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-rose-600/20 border border-rose-500/30 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-600/30 transition-colors"
          >
            <ShieldAlert className="h-4 w-4" />
            Trigger Reversal Confirmation
          </button>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Reverse Payment Receipt #4912"
            description="Reversing this transaction will restore the installment balance and generate an audit ledger reversal entry. This action cannot be undone."
            confirmWord="REVERSE"
            confirmText="Reverse Payment"
            variant="danger"
            onConfirm={() => {
              alert('Payment successfully reversed with audit trace!')
            }}
          />
        </FormSection>
      </div>

      {/* 6. DataTable Primitive */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider text-xs">
            6. TanStack DataTable (Sorting, Filtering, Pagination & CSV Export)
          </h2>
        </div>
        <DataTable
          columns={columns}
          data={SAMPLE_LOANS}
          searchPlaceholder="Search loans or members..."
          exportFilename="loans-sample.csv"
        />
      </div>

      {/* 7. Skeletons & Empty States */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSection title="7. Loading Skeletons" description="Placeholder pulses for async data loading">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </FormSection>

        <FormSection title="8. Empty State" description="Clear call to action when no records exist">
          <EmptyState
            title="No Active Arrears"
            description="All members in this centre are currently up to date on their weekly installments."
          />
        </FormSection>
      </div>
    </div>
  )
}

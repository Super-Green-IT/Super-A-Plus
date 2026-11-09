'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ShieldCheck,
  FileText,
  HandCoins,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { MoneyCell } from '@/components/ui/money-cell'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatDate, formatDateTime } from '@/lib/formatters'

export default function LoanDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <LoanDetailContent />
    </React.Suspense>
  )
}

function LoanDetailContent() {
  const params = useParams()
  const router = useRouter()
  const loanId = params?.id as string

  const [loan, setLoan] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'schedule' | 'receipts'>('schedule')

  // Action dialog states
  const [approveOpen, setApproveOpen] = React.useState(false)
  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [disburseOpen, setDisburseOpen] = React.useState(false)

  const fetchLoan = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/loans/${loanId}`)
      if (res.ok) {
        const data = await res.json()
        setLoan(data.loan)
      } else {
        router.push('/loans')
      }
    } finally {
      setLoading(false)
    }
  }, [loanId, router])

  React.useEffect(() => {
    if (loanId) {
      fetchLoan()
    }
  }, [loanId, fetchLoan])

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'DISBURSE') => {
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        fetchLoan()
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!loan) {
    return (
      <EmptyState
        title="Loan Record Not Found"
        description="The requested loan application could not be found."
        action={
          <Link href="/loans" className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white">
            Back to Loans
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/loans"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl font-mono">
                {loan.loanNumber}
              </h1>
              <StatusBadge status={loan.status} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Product: <span className="text-slate-200 font-medium">{loan.product.name}</span> &bull; Created {formatDate(loan.createdAt)}
            </p>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {loan.status === 'SUBMITTED' && (
            <>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="rounded-md border border-rose-800/60 bg-rose-950/40 px-3.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
              >
                Approve Loan
              </button>
            </>
          )}

          {loan.status === 'APPROVED' && (
            <button
              type="button"
              onClick={() => setDisburseOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              Disburse Loan
            </button>
          )}

          {(loan.status === 'ACTIVE' || loan.status === 'DISBURSED') && (
            <Link
              href={`/collections`}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <HandCoins className="h-4 w-4" />
              Record Collection
            </Link>
          )}
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Principal</div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-100">
            <MoneyCell amount={loan.principalAmount} />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Interest: {Math.round(loan.annualInterestRate * 100)}% ({loan.interestMethod})
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Repayable</div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-100">
            <MoneyCell amount={loan.totalRepayable} />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Weekly: LKR {Math.round(loan.weeklyInstallment).toLocaleString()} &times; {loan.termWeeks} wks
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">Total Paid</div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-400">
            <MoneyCell amount={loan.totalPaid} />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {loan.receipts?.length || 0} collections recorded
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Remaining Balance</div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-100">
            <MoneyCell
              amount={loan.totalRemaining}
              variant={loan.overdueAmount > 0 ? 'overdue' : loan.totalRemaining > 0 ? 'default' : 'muted'}
            />
          </div>
          {loan.overdueAmount > 0 && (
            <div className="mt-1 text-[11px] text-rose-400 font-semibold">
              Overdue: LKR {Math.round(loan.overdueAmount).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Two Columns: Borrower & Guarantor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Borrower Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Borrower Member
              </span>
            </div>
            <Link
              href={`/members/${loan.member.id}`}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              View Profile &rarr;
            </Link>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Full Name:</span>
              <span className="font-semibold text-slate-100">{loan.member.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Member ID / NIC:</span>
              <span className="font-mono text-slate-200">{loan.member.memberNumber} &bull; {loan.member.nic}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-mono text-slate-200">{loan.member.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Centre:</span>
              <span className="text-slate-200">{loan.member.centre?.name || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* Guarantor Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Loan Guarantor
              </span>
            </div>
            {loan.guarantor?.member?.id && (
              <Link
                href={`/members/${loan.guarantor.member.id}`}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                View Profile &rarr;
              </Link>
            )}
          </div>
          {loan.guarantor?.member ? (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Full Name:</span>
                <span className="font-semibold text-slate-100">{loan.guarantor.member.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Member ID / NIC:</span>
                <span className="font-mono text-slate-200">
                  {loan.guarantor.member.memberNumber} &bull; {loan.guarantor.member.nic}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono text-slate-200">{loan.guarantor.member.phone || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-500">No guarantor registered for this loan.</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`border-b-2 pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'schedule'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Repayment Schedule ({loan.installments?.length || 0} Weeks)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`border-b-2 pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'receipts'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Repayment Receipts ({loan.receipts?.length || 0})
        </button>
      </div>

      {/* Tab Content 1: Repayment Schedule Table */}
      {activeTab === 'schedule' && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Week #</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Principal Due</th>
                <th className="px-4 py-3">Interest Due</th>
                <th className="px-4 py-3">Total Due</th>
                <th className="px-4 py-3">Paid Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loan.installments?.map((inst: any) => (
                <tr key={inst.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-mono text-slate-400">Week {inst.weekNumber}</td>
                  <td className="px-4 py-2.5 font-mono">{formatDate(inst.dueDate)}</td>
                  <td className="px-4 py-2.5 font-mono"><MoneyCell amount={Number(inst.principalDue)} className="text-xs" /></td>
                  <td className="px-4 py-2.5 font-mono"><MoneyCell amount={Number(inst.interestDue)} className="text-xs" /></td>
                  <td className="px-4 py-2.5 font-mono font-medium text-slate-100"><MoneyCell amount={Number(inst.totalDue)} className="text-xs" /></td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400">
                    <MoneyCell amount={Number(inst.totalPaid)} className="text-xs" variant={Number(inst.totalPaid) > 0 ? 'positive' : 'muted'} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={inst.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content 2: Receipts */}
      {activeTab === 'receipts' && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          {loan.receipts?.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No collection receipts recorded for this loan yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Receipt Number</th>
                  <th className="px-4 py-3">Collected Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Collected By</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loan.receipts?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                      {r.receiptNumber}
                    </td>
                    <td className="px-4 py-3 font-mono">{formatDateTime(r.collectedAt)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-100">
                      <MoneyCell amount={Number(r.totalAmount)} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.collectedBy?.fullName || 'Staff'}</td>
                    <td className="px-4 py-3 text-slate-400">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Loan Application"
        description={`Are you sure you want to approve loan ${loan.loanNumber} for ${loan.member.fullName} in the amount of LKR ${loan.principalAmount.toLocaleString()}?`}
        confirmText="Approve Loan"
        onConfirm={() => handleAction('APPROVE')}
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Loan Application"
        description={`Are you sure you want to reject loan ${loan.loanNumber}? This decision will be logged.`}
        variant="danger"
        confirmText="Reject Application"
        onConfirm={() => handleAction('REJECT')}
      />

      <ConfirmDialog
        open={disburseOpen}
        onOpenChange={setDisburseOpen}
        title="Disburse Loan Funds"
        description={`Confirming disbursement will release LKR ${loan.principalAmount.toLocaleString()} to ${loan.member.fullName}, activate the loan repayment schedule, and record the double-entry ledger outflow.`}
        confirmText="Confirm Disbursement"
        onConfirm={() => handleAction('DISBURSE')}
      />
    </div>
  )
}

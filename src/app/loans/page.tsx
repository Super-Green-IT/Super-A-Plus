'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Eye,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { MoneyCell } from '@/components/ui/money-cell'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/formatters'
import type { LoanStatus } from '@/types'

interface LoanItem {
  id: string
  loanNumber: string
  member: {
    id: string
    memberNumber: string
    fullName: string
    nic: string
    phone: string | null
    centre: { id: string; name: string } | null
  }
  product: {
    id: string
    name: string
    loanType: string
    interestMethod: string
  }
  principalAmount: number
  totalInterest: number
  totalRepayable: number
  weeklyInstallment: number
  termWeeks: number
  status: LoanStatus
  guarantor: { id: string; fullName: string; memberNumber: string } | null
  disbursedAt: string | null
  createdAt: string
  remainingBalance: number
  overdueCount: number
  nextDueDate: string | null
  nextDueAmount: number
}

export default function LoansListPage() {
  const router = useRouter()
  const [loans, setLoans] = React.useState<LoanItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [searchTerm, setSearchTerm] = React.useState('')

  const fetchLoans = React.useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (searchTerm) params.set('search', searchTerm)

      const res = await fetch(`/api/loans?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLoans(data.loans || [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm])

  React.useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  // Computed summary
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'DISBURSED')
  const totalActivePortfolio = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0)
  const pendingApprovalCount = loans.filter((l) => l.status === 'SUBMITTED').length
  const approvedCount = loans.filter((l) => l.status === 'APPROVED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Loan Portfolio & Applications
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Originate, approve, disburse, and monitor weekly microfinance and business loans.
          </p>
        </div>

        <Link
          href="/loans/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Apply for Loan
        </Link>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Active Loans
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
            {loading ? <Skeleton className="h-8 w-16" /> : activeLoans.length}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Outstanding Portfolio
          </div>
          <div className="mt-1">
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <MoneyCell amount={totalActivePortfolio} variant="default" className="text-xl font-bold" />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-sky-400">
            Pending Approval
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-sky-400">
            {loading ? <Skeleton className="h-8 w-16" /> : pendingApprovalCount}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
            Ready to Disburse
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-400">
            {loading ? <Skeleton className="h-8 w-16" /> : approvedCount}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-slate-800 bg-slate-950/60 text-xs w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Loans' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'SUBMITTED', label: 'Submitted' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'CLOSED', label: 'Closed' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded px-3 py-1 font-medium transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search loan #, member, or NIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Loans Table */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10 text-slate-500" />}
          title="No Loans Found"
          description="No loans match the selected criteria."
          action={
            <Link
              href="/loans/new"
              className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Originate New Loan
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Loan ID</th>
                <th className="px-4 py-3">Borrower (Member)</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Principal Amount</th>
                <th className="px-4 py-3">Weekly Installment</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loans.map((loan) => (
                <tr
                  key={loan.id}
                  onClick={() => router.push(`/loans/${loan.id}`)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                    {loan.loanNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{loan.member.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {loan.member.memberNumber} &bull; {loan.member.nic}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
                      {loan.product.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-200">
                    <MoneyCell amount={loan.principalAmount} />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    <MoneyCell amount={loan.weeklyInstallment} />
                    <span className="text-[10px] text-slate-500"> / {loan.termWeeks} wks</span>
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell
                      amount={loan.remainingBalance}
                      variant={loan.overdueCount > 0 ? 'overdue' : loan.remainingBalance > 0 ? 'default' : 'muted'}
                    />
                    {loan.overdueCount > 0 && (
                      <span className="inline-block mt-0.5 text-[10px] text-rose-400 font-medium">
                        {loan.overdueCount} overdue
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={loan.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/loans/${loan.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

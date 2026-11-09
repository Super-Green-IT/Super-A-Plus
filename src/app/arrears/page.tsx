'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ClockAlert,
  Search,
  Phone,
  AlertTriangle,
  Building2,
  Calendar,
  HandCoins,
  ShieldAlert,
} from 'lucide-react'
import { MoneyCell } from '@/components/ui/money-cell'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/formatters'

interface ArrearsLoan {
  loanId: string
  loanNumber: string
  productName: string
  member: {
    id: string
    memberNumber: string
    fullName: string
    nic: string
    phone: string | null
    centre: { id: string; name: string } | null
  }
  daysOverdue: number
  overdueAmount: number
  totalBalance: number
  bucket: '1-7' | '8-30' | '31-60' | '60+'
  oldestDueDate: string | null
  overdueInstallmentsCount: number
}

interface ArrearsSummary {
  totalLoans: number
  totalOverdue: number
  totalAtRiskPortfolio: number
  bucketCounts: {
    '1-7': number
    '8-30': number
    '31-60': number
    '60+': number
  }
}

export default function ArrearsPage() {
  const [arrears, setArrears] = React.useState<ArrearsLoan[]>([])
  const [summary, setSummary] = React.useState<ArrearsSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedBucket, setSelectedBucket] = React.useState<string>('ALL')
  const [searchTerm, setSearchTerm] = React.useState('')

  const fetchArrears = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/arrears')
      if (res.ok) {
        const data = await res.json()
        setArrears(data.arrears || [])
        setSummary(data.summary || null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchArrears()
  }, [fetchArrears])

  const filtered = arrears.filter((a) => {
    const matchesBucket = selectedBucket === 'ALL' || a.bucket === selectedBucket
    const matchesSearch =
      a.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.member.phone && a.member.phone.includes(searchTerm))
    return matchesBucket && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Arrears & Delinquency Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor portfolio-at-risk (PAR), overdue weekly installments, and borrower follow-ups.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-rose-400">
              Total Overdue Amount
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-rose-400">
              <MoneyCell amount={summary.totalOverdue} variant="overdue" />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Across {summary.totalLoans} delinquent loans
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
              Portfolio At Risk (PAR)
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-400">
              <MoneyCell amount={summary.totalAtRiskPortfolio} />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Total outstanding balance of overdue loans
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              PAR 1-30 Days
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-200">
              {(summary.bucketCounts['1-7'] || 0) + (summary.bucketCounts['8-30'] || 0)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Early stage arrears</div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-rose-400">
              PAR 30+ Days (Severe)
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-rose-400">
              {(summary.bucketCounts['31-60'] || 0) + (summary.bucketCounts['60+'] || 0)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Requires senior officer escalation</div>
          </div>
        </div>
      )}

      {/* Toolbar & Bucket Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Bucket Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-slate-800 bg-slate-950/60 text-xs w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Overdue' },
            { id: '1-7', label: '1 - 7 Days' },
            { id: '8-30', label: '8 - 30 Days' },
            { id: '31-60', label: '31 - 60 Days' },
            { id: '60+', label: '60+ Days' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedBucket(tab.id)}
              className={`rounded px-3 py-1 font-medium transition-colors cursor-pointer ${
                selectedBucket === tab.id
                  ? 'bg-rose-600 text-white shadow-xs'
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
            placeholder="Search borrower, loan #, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClockAlert className="h-10 w-10 text-emerald-400" />}
          title="No Arrears in Selected Filter"
          description="Great news! There are no overdue installments under this criteria."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Borrower (Member)</th>
                <th className="px-4 py-3">Loan Number</th>
                <th className="px-4 py-3">Overdue Days</th>
                <th className="px-4 py-3">Overdue Amount</th>
                <th className="px-4 py-3">Remaining Balance</th>
                <th className="px-4 py-3">Centre</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((item) => (
                <tr key={item.loanId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/members/${item.member.id}`}
                      className="font-medium text-slate-100 hover:text-emerald-400"
                    >
                      {item.member.fullName}
                    </Link>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-slate-500" />
                      {item.member.phone || 'No phone'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/loans/${item.loanId}`}
                      className="font-mono text-emerald-400 hover:underline font-semibold"
                    >
                      {item.loanNumber}
                    </Link>
                    <div className="text-[11px] text-slate-400">{item.productName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.daysOverdue > 30
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.daysOverdue} days
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {item.overdueInstallmentsCount} installment(s)
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-rose-400">
                    <MoneyCell amount={item.overdueAmount} variant="overdue" />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    <MoneyCell amount={item.totalBalance} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Building2 className="h-3 w-3 text-slate-500" />
                      {item.member.centre?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/collections`}
                      className="inline-flex items-center gap-1 rounded border border-emerald-700/60 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                    >
                      <HandCoins className="h-3 w-3" />
                      Collect
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

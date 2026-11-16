'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { formatLKR, formatDate } from '@/lib/formatters'
import { MoneyCell } from '@/components/ui/money-cell'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  HandCoins,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  FileText,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [today, setToday] = React.useState<Date | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [reportData, setReportData] = React.useState<any>(null)
  const [pendingLoans, setPendingLoans] = React.useState<any[]>([])
  const [reportError, setReportError] = React.useState(false)
  const [loanError, setLoanError] = React.useState(false)

  React.useEffect(() => {
    setToday(new Date())

    async function loadDashboard() {
      try {
        setLoading(true)
        const [repRes, loanRes] = await Promise.all([
          fetch('/api/reports'),
          fetch('/api/loans?status=SUBMITTED&limit=5'),
        ])
        if (repRes.ok) setReportData(await repRes.json())
        else setReportError(true)
        if (loanRes.ok) {
          const loanJson = await loanRes.json()
          setPendingLoans(loanJson.loans || [])
        } else setLoanError(true)
      } catch (e) {
        console.error(e)
        setReportError(true)
        setLoanError(true)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const summary = reportData?.summary
  const figures = [
    { label: 'Active portfolio', value: summary?.totalActivePortfolio == null ? null : formatLKR(summary.totalActivePortfolio) },
    { label: 'Active borrowers', value: summary?.activeBorrowers == null ? null : summary.activeBorrowers.toLocaleString() },
    { label: 'Total disbursed', value: summary?.totalDisbursed == null ? null : formatLKR(summary.totalDisbursed) },
    { label: 'Portfolio at risk', value: summary?.parRate == null ? null : `${summary.parRate}%`, alert: Number(summary?.parRate) >= 5 },
  ]

  return (
    <div className="space-y-7 sm:space-y-8">
      <section className="flex flex-col gap-4 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-slate-500">Head Office <span aria-hidden="true">·</span> {today ? formatDate(today, 'EEEE, dd MMMM yyyy') : 'Today'}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-800 sm:text-[28px]">Good day, {user?.fullName || 'Staff'}</h1>
          <p className="mt-1 text-sm text-slate-500">Member accounts, lending and collections at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/loans/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800">
            <PlusCircle className="h-4 w-4" /> New loan
          </Link>
          <Link href="/members?action=new" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            <Users className="h-4 w-4 text-emerald-700" /> Register member
          </Link>
        </div>
      </section>

      <section aria-label="Portfolio summary" className="grid grid-cols-2 border-y border-slate-300 bg-white sm:grid-cols-4">
        {figures.map((figure, index) => (
          <div key={figure.label} className={`min-h-[105px] px-4 py-4 sm:px-5 ${index > 0 ? 'border-l border-slate-200' : ''} ${index > 1 ? 'border-t border-slate-200 sm:border-t-0' : ''}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">{figure.label}</p>
            <div className={`mt-3 text-lg font-semibold tabular-nums tracking-tight sm:text-xl ${figure.alert ? 'text-rose-600' : 'text-slate-800'}`}>
              {loading ? <Skeleton className="h-6 w-28" /> : reportError ? 'Unavailable' : figure.value ?? '—'}
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex items-end justify-between border-b border-slate-300 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Pending loan approvals</h2>
              <p className="mt-1 text-xs text-slate-500">Submitted applications awaiting manager review</p>
            </div>
            <Link href="/loans" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
              All applications <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border-y border-slate-200 bg-white">
            {loading ? (
              <div className="space-y-3 p-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : loanError ? (
              <p role="status" className="py-10 text-center text-sm text-slate-600">Pending applications could not be loaded. Please refresh and try again.</p>
            ) : pendingLoans.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No pending loan applications.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Member</th><th className="px-3 py-3">Centre</th><th className="px-3 py-3 text-right">Requested</th><th className="px-3 py-3">Term</th><th className="px-4 py-3">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {pendingLoans.map((loan) => (
                      <tr key={loan.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/loans/${loan.id}`} className="font-medium text-slate-800 hover:text-emerald-800">{loan.member.fullName}</Link>
                        <div className="mt-1 font-mono text-[11px] tracking-wide text-slate-500">{loan.member.memberNumber || loan.member.id}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{loan.member.centre?.name || 'Unassigned'}</td>
                      <td className="px-3 py-3 text-right"><MoneyCell amount={loan.principalAmount} /></td>
                      <td className="px-3 py-3 text-slate-600">{loan.termWeeks} weeks</td>
                      <td className="px-4 py-3"><StatusBadge status={loan.status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <aside>
          <div className="mb-3 border-b border-slate-300 pb-3">
            <h2 className="text-base font-semibold text-slate-800">Work areas</h2>
            <p className="mt-1 text-xs text-slate-500">Go to today’s operational records</p>
          </div>
          <nav aria-label="Work areas" className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
            <Link href="/collections" className="group flex min-h-[68px] items-center justify-between gap-3 px-4 transition-colors hover:bg-slate-50">
              <span className="flex items-center gap-3"><HandCoins className="h-4 w-4 text-emerald-700" /><span><span className="block text-sm font-medium text-slate-800">Daily collection sheet</span><span className="mt-1 block text-xs text-slate-500">Payments and receipts</span></span></span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700" />
            </Link>
            <Link href="/arrears" className="group flex min-h-[68px] items-center justify-between gap-3 px-4 transition-colors hover:bg-slate-50">
              <span className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-rose-500" /><span><span className="block text-sm font-medium text-slate-800">Arrears & follow-ups</span><span className="mt-1 block text-xs text-slate-500">Overdue accounts</span></span></span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700" />
            </Link>
            <Link href="/reports" className="group flex min-h-[68px] items-center justify-between gap-3 px-4 transition-colors hover:bg-slate-50">
              <span className="flex items-center gap-3"><FileText className="h-4 w-4 text-slate-500" /><span><span className="block text-sm font-medium text-slate-800">Financial reports</span><span className="mt-1 block text-xs text-slate-500">Portfolio and PAR</span></span></span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700" />
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  )
}

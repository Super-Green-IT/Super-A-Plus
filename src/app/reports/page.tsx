'use client'

import * as React from 'react'
import {
  BarChart3,
  Download,
  Building2,
  CreditCard,
  Percent,
  TrendingUp,
  Users,
  ShieldAlert,
} from 'lucide-react'
import { MoneyCell } from '@/components/ui/money-cell'
import { Skeleton } from '@/components/ui/skeleton'

export default function ReportsPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchReports = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/reports')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleExportCSV = () => {
    if (!data?.centreStats) return
    const headers = ['Centre Name', 'Members Count', 'Active Loans', 'Outstanding Portfolio (LKR)', 'Overdue (LKR)', 'Efficiency %']
    const rows = data.centreStats.map((c: any) => [
      `"${c.name}"`,
      c.membersCount,
      c.activeLoansCount,
      c.totalOutstanding,
      c.totalOverdue,
      `${c.collectionEfficiency}%`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `super-a-plus-portfolio-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Executive Portfolio & Operations Reports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Key financial performance indicators, centre recovery rates, and portfolio risk distributions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export Centre Report (CSV)
        </button>
      </div>

      {/* KPI Metric Summary */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Active Portfolio</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-100">
              <MoneyCell amount={data?.summary?.totalActivePortfolio || 0} />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Across {data?.summary?.activeBorrowers || 0} active members
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Total Disbursed</span>
              <CreditCard className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-sky-400">
              <MoneyCell amount={data?.summary?.totalDisbursed || 0} />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Cumulative capital released</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Total Recovered</span>
              <Building2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-emerald-400">
              <MoneyCell amount={data?.summary?.totalCollected || 0} variant="positive" />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Principal + interest collections</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Portfolio At Risk (PAR)</span>
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-rose-400">
              {data?.summary?.parRate || 0}%
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Target below 5.0%</div>
          </div>
        </div>
      )}

      {/* Two Column Section: Products & Centres */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Distribution */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Loan Product Distribution
            </h2>
            <span className="text-xs text-slate-400">Active Portfolios</span>
          </div>

          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-4">
              {data?.productStats?.map((prod: any) => (
                <div key={prod.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{prod.name}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
                      {prod.activeLoans} Active Loans
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Outstanding:</span>
                    <span className="font-mono font-medium text-slate-100">
                      <MoneyCell amount={prod.outstandingSum} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Centre Efficiency */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Centre Recovery & Efficiency
            </h2>
            <span className="text-xs text-slate-400">Field Performance</span>
          </div>

          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2">Centre</th>
                    <th className="py-2">Members</th>
                    <th className="py-2">Outstanding</th>
                    <th className="py-2">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data?.centreStats?.map((c: any) => (
                    <tr key={c.id}>
                      <td className="py-2.5 font-medium text-slate-200">{c.name}</td>
                      <td className="py-2.5 font-mono text-slate-400">{c.membersCount}</td>
                      <td className="py-2.5 font-mono">
                        <MoneyCell amount={c.totalOutstanding} className="text-xs" />
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.collectionEfficiency >= 95
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : c.collectionEfficiency >= 85
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {c.collectionEfficiency}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

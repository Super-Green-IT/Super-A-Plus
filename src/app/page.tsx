'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { formatLKR, formatDate } from '@/lib/formatters'
import { MoneyCell } from '@/components/ui/money-cell'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Users,
  CreditCard,
  HandCoins,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  FileText,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [today, setToday] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setToday(new Date())
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Welcome back, {user?.fullName || 'Staff'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Branch: <span className="text-slate-200 font-medium">Head Office</span> &bull; {today ? formatDate(today, 'EEEE, dd MMMM yyyy') : 'Today'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/loans/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Loan
          </Link>
          <Link
            href="/members/new"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            Register Member
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Outstanding */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Portfolio</span>
            <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-100 font-mono">
              {formatLKR(14250000)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>+4.2% from last month</span>
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Borrowers</span>
            <div className="rounded-md bg-sky-500/10 p-1.5 text-sky-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-100 font-mono">
              284
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Across 12 micro centres
            </div>
          </div>
        </div>

        {/* Today's Due */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Today's Target</span>
            <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-400">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-100 font-mono">
              {formatLKR(385000)}
            </div>
            <div className="mt-1 text-[11px] text-amber-400">
              4 centres scheduled today
            </div>
          </div>
        </div>

        {/* Portfolio at Risk (PAR) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">PAR (30+ Days)</span>
            <div className="rounded-md bg-rose-500/10 p-1.5 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-rose-400 font-mono">
              2.18%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {formatLKR(310650)} overdue
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Actions & Today's Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Applications & Approvals */}
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Pending Loan Approvals</h2>
              <p className="text-xs text-slate-400">Applications awaiting manager appraisal</p>
            </div>
            <Link
              href="/loans"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Applicant</th>
                  <th className="py-2 px-3">Centre</th>
                  <th className="py-2 px-3 text-right">Requested</th>
                  <th className="py-2 px-3">Term</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="py-2.5 pr-3 font-medium text-slate-200">Kusuma Ranasinghe</td>
                  <td className="py-2.5 px-3 text-slate-400">Mahaweli Centre A</td>
                  <td className="py-2.5 px-3"><MoneyCell amount={100000} /></td>
                  <td className="py-2.5 px-3 text-slate-400">52 wks (Flat)</td>
                  <td className="py-2.5 pl-3"><StatusBadge status="SUBMITTED" size="sm" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium text-slate-200">Rohitha Jayawardena</td>
                  <td className="py-2.5 px-3 text-slate-400">Kiribathgoda C</td>
                  <td className="py-2.5 px-3"><MoneyCell amount={150000} /></td>
                  <td className="py-2.5 px-3 text-slate-400">26 wks (Reducing)</td>
                  <td className="py-2.5 pl-3"><StatusBadge status="SUBMITTED" size="sm" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium text-slate-200">Priyantha Dissanayake</td>
                  <td className="py-2.5 px-3 text-slate-400">Kadawatha B</td>
                  <td className="py-2.5 px-3"><MoneyCell amount={75000} /></td>
                  <td className="py-2.5 px-3 text-slate-400">52 wks (Flat)</td>
                  <td className="py-2.5 pl-3"><StatusBadge status="APPROVED" size="sm" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Quick Links & System Shortcuts */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Quick Navigation</h2>
            <div className="space-y-2">
              <Link
                href="/collections"
                className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/40 p-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HandCoins className="h-4 w-4 text-emerald-400" />
                  <span>Daily Collection Sheet</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-slate-500" />
              </Link>

              <Link
                href="/arrears"
                className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/40 p-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span>Arrears & Follow-ups</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-slate-500" />
              </Link>

              <Link
                href="/reports"
                className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/40 p-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-400" />
                  <span>Financial & PAR Reports</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* Dev Showcase Banner */}
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
            <h3 className="text-xs font-semibold text-emerald-300">Component Sandbox Active</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Test and preview all design system primitives, TanStack data tables, LKR formatters, and typed dialogs.
            </p>
            <Link
              href="/dev/components"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Explore UI Primitives &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

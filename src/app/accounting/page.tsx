'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Landmark,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { MoneyCell } from '@/components/ui/money-cell'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDateTime } from '@/lib/formatters'

export default function AccountingPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'dayclose' | 'ledger' | 'cashflow'>('dayclose')
  const [dayCloseModalOpen, setDayCloseModalOpen] = React.useState(false)

  const fetchAccounting = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/accounting')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAccounting()
  }, [fetchAccounting])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Branch Accounting & Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Double-entry bookkeeping, daily vault cash reconciliation, and loan disbursements ledger.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDayCloseModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Perform Day Close
        </button>
      </div>

      {/* Today's Cash Flow Summary */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-36" />
            </div>
          ))}
        </div>
      ) : data?.todaySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Today's Collections (Inflow)</span>
              <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-400">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-emerald-400">
              <MoneyCell amount={data.todaySummary.totalCollected} variant="positive" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Today's Disbursements (Outflow)</span>
              <div className="rounded-md bg-rose-500/10 p-1.5 text-rose-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-rose-400">
              <MoneyCell amount={data.todaySummary.totalDisbursed} variant="overdue" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Net Cash Movement</span>
              <div className="rounded-md bg-sky-500/10 p-1.5 text-sky-400">
                <Landmark className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-100">
              <MoneyCell
                amount={data.todaySummary.netCashFlow}
                variant={data.todaySummary.netCashFlow >= 0 ? 'positive' : 'overdue'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('dayclose')}
          className={`border-b-2 pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'dayclose'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Day Closes & Vault Audits
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`border-b-2 pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          General Ledger (Double-Entry)
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : activeTab === 'dayclose' ? (
        /* Day Closes Table */
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Close Date</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Opening Cash</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3">Disbursed</th>
                <th className="px-4 py-3">Closing Cash</th>
                <th className="px-4 py-3">Variance</th>
                <th className="px-4 py-3">Officer</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.dayCloses?.map((dc: any) => (
                <tr key={dc.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono font-medium text-slate-200">
                    {formatDate(dc.closeDate)}
                  </td>
                  <td className="px-4 py-3">{dc.branch?.name}</td>
                  <td className="px-4 py-3 font-mono"><MoneyCell amount={Number(dc.openingCash)} className="text-xs" /></td>
                  <td className="px-4 py-3 font-mono text-emerald-400"><MoneyCell amount={Number(dc.totalCollected)} className="text-xs" /></td>
                  <td className="px-4 py-3 font-mono text-rose-400"><MoneyCell amount={Number(dc.totalDisbursed)} className="text-xs" /></td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-100"><MoneyCell amount={Number(dc.closingCash)} className="text-xs" /></td>
                  <td className="px-4 py-3 font-mono">
                    <span
                      className={
                        Number(dc.variance) === 0
                          ? 'text-emerald-400'
                          : 'text-rose-400 font-bold'
                      }
                    >
                      <MoneyCell amount={Number(dc.variance)} className="text-xs" />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{dc.closedBy?.fullName || 'Manager'}</td>
                  <td className="px-4 py-3"><StatusBadge status={dc.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Ledger Entries Table */
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Entry Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Loan Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.recentLedger?.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-mono text-slate-400">
                    {formatDate(entry.entryDate || entry.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-200">
                    {entry.account}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.entryType === 'DEBIT'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {entry.entryType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono font-medium text-slate-100">
                    <MoneyCell amount={Number(entry.amount)} className="text-xs" />
                  </td>
                  <td className="px-4 py-2.5 text-slate-300 max-w-sm truncate">
                    {entry.description}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400">
                    {entry.loan?.loanNumber || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Perform Day Close Modal */}
      <DayCloseModal
        open={dayCloseModalOpen}
        onOpenChange={setDayCloseModalOpen}
        todaySummary={data?.todaySummary}
        onSuccess={() => fetchAccounting()}
      />
    </div>
  )
}

function DayCloseModal({
  open,
  onOpenChange,
  todaySummary,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  todaySummary?: { totalCollected: number; totalDisbursed: number }
  onSuccess: () => void
}) {
  const [openingCash, setOpeningCash] = React.useState<number>(50000)
  const [closingCash, setClosingCash] = React.useState<number>(0)
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const collected = todaySummary?.totalCollected || 0
  const disbursed = todaySummary?.totalDisbursed || 0
  const expectedClosing = openingCash + collected - disbursed
  const variance = closingCash - expectedClosing

  React.useEffect(() => {
    if (open) {
      setClosingCash(expectedClosing)
      setError(null)
    }
  }, [open, expectedClosing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      setSubmitting(true)
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingCash,
          closingCash,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit day close')
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error closing day')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-emerald-400">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold text-slate-100">
                  Daily Branch Vault Close
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-slate-400">
                  Reconcile opening cash, collections, and disbursements to lock the day.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Today's Collections:</span>
                <span className="font-mono text-emerald-400 font-semibold">+ LKR {collected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Today's Disbursements:</span>
                <span className="font-mono text-rose-400 font-semibold">- LKR {disbursed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1">
                <span className="text-slate-300 font-medium">Expected Closing Cash:</span>
                <span className="font-mono text-slate-100 font-bold">LKR {expectedClosing.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Opening Cash Balance (LKR)
              </label>
              <input
                type="number"
                min={0}
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Actual Physical Closing Cash (LKR)
              </label>
              <input
                type="number"
                min={0}
                value={closingCash}
                onChange={(e) => setClosingCash(Number(e.target.value))}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800">
              <span className="text-slate-400">Variance:</span>
              <span
                className={`font-mono font-bold ${
                  variance === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                LKR {variance.toLocaleString()} {variance === 0 ? '(Balanced)' : '(Discrepancy)'}
              </span>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Notes / Discrepancy Explanation</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes on vault count or cash transport..."
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Locking Day...
                  </>
                ) : (
                  <span>Lock & Complete Day Close</span>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  HandCoins,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Receipt,
  User,
  CreditCard,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { MoneyCell } from '@/components/ui/money-cell'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatDateTime } from '@/lib/formatters'

interface CollectionItem {
  id: string
  receiptNumber: string
  loanId: string
  loanNumber: string
  member: {
    id: string
    memberNumber: string
    fullName: string
    phone: string | null
  }
  productName: string
  totalAmount: number
  notes: string | null
  collectedAt: string
  collectedBy: { id: string; fullName: string; role: string }
  linesCount: number
}

export default function CollectionsPage() {
  const [collections, setCollections] = React.useState<CollectionItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const fetchCollections = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/collections?limit=50')
      if (res.ok) {
        const data = await res.json()
        setCollections(data.collections || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const filteredCollections = collections.filter(
    (c) =>
      c.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.member.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalCollectedSum = collections.reduce((sum, c) => sum + c.totalAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Loan Collections & Receipts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Record loan installment repayments from weekly centre meetings and counter collections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Record Collection
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Total Collections Count
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-100">
            {loading ? <Skeleton className="h-8 w-16" /> : collections.length}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
            Total Volume Collected
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">
            {loading ? <Skeleton className="h-8 w-32" /> : <MoneyCell amount={totalCollectedSum} />}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-sky-400">
            Latest Receipt
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-200">
            {loading ? <Skeleton className="h-7 w-28" /> : (collections[0]?.receiptNumber || 'None')}
          </div>
          <div className="text-[11px] text-slate-500">
            {loading ? <Skeleton className="h-3 w-32 mt-1" /> : (collections[0] ? formatDateTime(collections[0].collectedAt) : 'No receipts')}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search receipt #, loan #, or borrower..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredCollections.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-10 w-10 text-slate-500" />}
          title="No Collections Found"
          description="No receipts have been recorded matching your search query."
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Record First Collection
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Receipt Number</th>
                <th className="px-4 py-3">Borrower (Member)</th>
                <th className="px-4 py-3">Loan Number</th>
                <th className="px-4 py-3">Collected Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Officer</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCollections.map((col) => (
                <tr key={col.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                    {col.receiptNumber}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/members/${col.member.id}`}
                      className="font-medium text-slate-100 hover:text-emerald-400"
                    >
                      {col.member.fullName}
                    </Link>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {col.member.memberNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/loans/${col.loanId}`}
                      className="font-mono text-emerald-400 hover:underline"
                    >
                      {col.loanNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {formatDateTime(col.collectedAt)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-100">
                    <MoneyCell amount={col.totalAmount} variant="positive" />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {col.collectedBy?.fullName || 'Staff'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {col.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Collection Pop-up Modal */}
      <RecordCollectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => fetchCollections()}
      />
    </div>
  )
}

function RecordCollectionModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [loans, setLoans] = React.useState<any[]>([])
  const [loadingLoans, setLoadingLoans] = React.useState(false)

  const [loanId, setLoanId] = React.useState('')
  const [amount, setAmount] = React.useState<number>(0)
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    async function loadActiveLoans() {
      try {
        setLoadingLoans(true)
        const res = await fetch('/api/loans?status=ACTIVE&limit=100')
        if (res.ok) {
          const data = await res.json()
          setLoans(data.loans || [])
          if (data.loans?.length > 0 && !loanId) {
            setLoanId(data.loans[0].id)
            setAmount(data.loans[0].weeklyInstallment || 0)
          }
        }
      } finally {
        setLoadingLoans(false)
      }
    }
    loadActiveLoans()
  }, [open])

  const selectedLoan = loans.find((l) => l.id === loanId)

  const handleLoanChange = (lid: string) => {
    setLoanId(lid)
    const l = loans.find((x) => x.id === lid)
    if (l) {
      setAmount(l.weeklyInstallment || l.nextDueAmount || 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!loanId) {
      setError('Please select an active loan')
      return
    }

    if (!amount || amount <= 0) {
      setError('Please enter a valid repayment amount')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          amount,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to record collection')
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing collection')
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
                <HandCoins className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold text-slate-100">
                  Record Repayment Collection
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-slate-400">
                  Issue receipt and allocate payment to due installments.
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
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Select Active Loan / Borrower <span className="text-rose-400">*</span>
              </label>
              {loadingLoans ? (
                <p className="text-slate-500">Loading active loans...</p>
              ) : (
                <select
                  value={loanId}
                  onChange={(e) => handleLoanChange(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Choose Active Loan --</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loanNumber} &bull; {l.member.fullName} ({l.product.name}) - Due: LKR {Math.round(l.weeklyInstallment).toLocaleString()}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedLoan && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Borrower:</span>
                  <span className="text-slate-200 font-medium">{selectedLoan.member.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Weekly Installment:</span>
                  <span className="font-mono text-emerald-400">
                    <MoneyCell amount={selectedLoan.weeklyInstallment} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining Balance:</span>
                  <span className="font-mono text-slate-200">
                    <MoneyCell amount={selectedLoan.remainingBalance} />
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Collected Amount (LKR) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Receipt Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Centre meeting cash collection, counter receipt"
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
                    Recording...
                  </>
                ) : (
                  <span>Confirm Receipt</span>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

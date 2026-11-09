'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  CreditCard,
  Calculator,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { FormSection } from '@/components/ui/form-section'
import { FieldRow } from '@/components/ui/field-row'
import { MoneyCell } from '@/components/ui/money-cell'
import { Skeleton } from '@/components/ui/skeleton'
import { generateSchedule } from '@/lib/finance/schedule'
import { formatDate } from '@/lib/formatters'
import Decimal from 'decimal.js'

export default function NewLoanApplicationPage() {
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
      <NewLoanFormContent />
    </React.Suspense>
  )
}

function NewLoanFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMemberId = searchParams.get('memberId') || ''

  // Data Options
  const [members, setMembers] = React.useState<any[]>([])
  const [products, setProducts] = React.useState<any[]>([])
  const [loadingData, setLoadingData] = React.useState(true)

  // Form Fields
  const [memberId, setMemberId] = React.useState(initialMemberId)
  const [productId, setProductId] = React.useState('')
  const [principalAmount, setPrincipalAmount] = React.useState<number>(50000)
  const [termWeeks, setTermWeeks] = React.useState<number>(26)
  const [firstRepaymentDate, setFirstRepaymentDate] = React.useState<string>(() => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek.toISOString().split('T')[0]
  })
  const [guarantorMemberId, setGuarantorMemberId] = React.useState('')
  const [purposeNotes, setPurposeNotes] = React.useState('')

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load initial options
  React.useEffect(() => {
    async function loadOptions() {
      try {
        setLoadingData(true)
        const [memRes, prodRes] = await Promise.all([
          fetch('/api/members?limit=100'),
          fetch('/api/products'),
        ])

        if (memRes.ok) {
          const memData = await memRes.json()
          setMembers(memData.members || [])
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json()
          setProducts(prodData.products || [])
          if (prodData.products?.length > 0 && !productId) {
            const first = prodData.products[0]
            setProductId(first.id)
            setPrincipalAmount(Math.max(Number(first.minAmount), 50000))
            setTermWeeks(first.minTermWeeks || 26)
          }
        }
      } catch (e) {
        console.error('Failed to load form options:', e)
      } finally {
        setLoadingData(false)
      }
    }

    loadOptions()
  }, [])

  // Currently selected product
  const selectedProduct = products.find((p) => p.id === productId)
  const selectedMember = members.find((m) => m.id === memberId)
  const selectedGuarantor = members.find((m) => m.id === guarantorMemberId)

  // When product changes, adjust defaults if out of bounds
  const handleProductChange = (prodId: string) => {
    setProductId(prodId)
    const prod = products.find((p) => p.id === prodId)
    if (prod) {
      if (principalAmount < Number(prod.minAmount)) setPrincipalAmount(Number(prod.minAmount))
      if (principalAmount > Number(prod.maxAmount)) setPrincipalAmount(Number(prod.maxAmount))
      if (termWeeks < prod.minTermWeeks) setTermWeeks(prod.minTermWeeks)
      if (termWeeks > prod.maxTermWeeks) setTermWeeks(prod.maxTermWeeks)
    }
  }

  // Live Repayment Schedule Calculation
  const schedulePreview = React.useMemo(() => {
    if (!selectedProduct || !principalAmount || !termWeeks || !firstRepaymentDate) {
      return null
    }

    try {
      return generateSchedule({
        principalAmount: new Decimal(principalAmount),
        annualInterestRate: new Decimal(selectedProduct.annualInterestRate),
        termWeeks,
        interestMethod: selectedProduct.interestMethod,
        firstRepaymentDate: new Date(firstRepaymentDate),
      })
    } catch (e) {
      console.error('Schedule error:', e)
      return null
    }
  }, [selectedProduct, principalAmount, termWeeks, firstRepaymentDate])

  const processingFee = selectedProduct && principalAmount
    ? Number(new Decimal(principalAmount).mul(selectedProduct.processingFeeRate).toDecimalPlaces(2))
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!memberId) {
      setError('Please select a borrower member')
      return
    }

    if (!productId) {
      setError('Please select a loan product')
      return
    }

    if (selectedProduct?.requiresGuarantor && !guarantorMemberId) {
      setError('A guarantor is required for this loan product')
      return
    }

    if (guarantorMemberId && guarantorMemberId === memberId) {
      setError('Borrower cannot be their own guarantor')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          productId,
          principalAmount,
          termWeeks,
          firstRepaymentDate,
          guarantorMemberId: guarantorMemberId || null,
          purposeNotes: purposeNotes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit loan application')
        return
      }

      router.push(`/loans/${data.loan.id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred submitting loan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Link
          href="/loans"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Originate Loan Application
          </h1>
          <p className="text-xs text-slate-400">
            Select borrower, loan product, terms, and calculate weekly repayment schedule.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Borrower & Product Selection */}
        <FormSection
          title="1. Borrower & Loan Product"
          description="Select verified member and microfinance financing package"
        >
          <FieldRow label="Borrower Member" required hint="Must be an active KYC member">
            {loadingData ? (
              <p className="text-xs text-slate-500">Loading members...</p>
            ) : (
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- Choose Member --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.memberNumber}) &bull; NIC: {m.nic}
                  </option>
                ))}
              </select>
            )}
            {selectedMember && (
              <div className="mt-2 rounded border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-400">
                <span>Centre: <strong className="text-slate-200">{selectedMember.centre?.name || 'Unassigned'}</strong></span>
                <span className="mx-2">&bull;</span>
                <span>Active Loans: <strong className="text-slate-200">{selectedMember.activeLoansCount || 0}</strong></span>
              </div>
            )}
          </FieldRow>

          <FieldRow label="Loan Product" required hint="Defines interest rate and repayment method">
            {loadingData ? (
              <p className="text-xs text-slate-500">Loading products...</p>
            ) : (
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} &bull; {Math.round(Number(p.annualInterestRate) * 100)}% p.a. ({p.interestMethod})
                  </option>
                ))}
              </select>
            )}
            {selectedProduct && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                <span>Min/Max: <strong>LKR {Number(selectedProduct.minAmount).toLocaleString()} - {Number(selectedProduct.maxAmount).toLocaleString()}</strong></span>
                <span>&bull;</span>
                <span>Weeks: <strong>{selectedProduct.minTermWeeks} - {selectedProduct.maxTermWeeks}</strong></span>
                <span>&bull;</span>
                <span>Fee: <strong>{Number(selectedProduct.processingFeeRate) * 100}%</strong></span>
              </div>
            )}
          </FieldRow>
        </FormSection>

        {/* 2. Loan Parameters & Live Calculator */}
        <FormSection
          title="2. Loan Terms & Schedule Simulation"
          description="Enter loan amount and repayment duration to preview weekly installments"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldRow label="Principal Amount (LKR)" required>
              <input
                type="number"
                min={selectedProduct ? Number(selectedProduct.minAmount) : 10000}
                max={selectedProduct ? Number(selectedProduct.maxAmount) : 1000000}
                step={5000}
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </FieldRow>

            <FieldRow label="Term (Weeks)" required>
              <input
                type="number"
                min={selectedProduct ? selectedProduct.minTermWeeks : 4}
                max={selectedProduct ? selectedProduct.maxTermWeeks : 104}
                value={termWeeks}
                onChange={(e) => setTermWeeks(Number(e.target.value))}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </FieldRow>

            <FieldRow label="First Repayment Date" required>
              <input
                type="date"
                value={firstRepaymentDate}
                onChange={(e) => setFirstRepaymentDate(e.target.value)}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </FieldRow>
          </div>

          {/* Schedule Calculation Summary Box */}
          {schedulePreview && (
            <div className="mt-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Calculator className="h-4 w-4" />
                Schedule Calculation Summary
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] text-slate-400">Weekly Installment</div>
                  <div className="mt-1 text-lg font-bold font-mono text-emerald-400">
                    <MoneyCell amount={schedulePreview.weeklyInstallment.toNumber()} />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Total Interest</div>
                  <div className="mt-1 text-lg font-bold font-mono text-slate-200">
                    <MoneyCell amount={schedulePreview.totalInterest.toNumber()} />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Processing Fee</div>
                  <div className="mt-1 text-lg font-bold font-mono text-slate-200">
                    <MoneyCell amount={processingFee} />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Total Repayable</div>
                  <div className="mt-1 text-lg font-bold font-mono text-slate-100">
                    <MoneyCell amount={schedulePreview.totalRepayable.toNumber()} />
                  </div>
                </div>
              </div>

              {/* Installments Table Preview Snippet */}
              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <div className="text-xs text-slate-400 mb-2 font-medium">
                  First 3 Installments Preview (of {termWeeks} weeks):
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="py-1">Week</th>
                        <th className="py-1">Due Date</th>
                        <th className="py-1">Principal</th>
                        <th className="py-1">Interest</th>
                        <th className="py-1">Total Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {schedulePreview.installments.slice(0, 3).map((inst) => (
                        <tr key={inst.weekNumber}>
                          <td className="py-1 font-mono text-slate-400">W-{inst.weekNumber}</td>
                          <td className="py-1">{formatDate(inst.dueDate)}</td>
                          <td className="py-1 font-mono"><MoneyCell amount={inst.principalDue.toNumber()} className="text-xs" /></td>
                          <td className="py-1 font-mono"><MoneyCell amount={inst.interestDue.toNumber()} className="text-xs" /></td>
                          <td className="py-1 font-mono font-medium text-emerald-400"><MoneyCell amount={inst.totalDue.toNumber()} className="text-xs" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </FormSection>

        {/* 3. Guarantor Selection */}
        <FormSection
          title="3. Loan Guarantor"
          description="Assign another active member to guarantee this loan agreement"
        >
          <FieldRow
            label="Select Guarantor Member"
            required={selectedProduct?.requiresGuarantor}
            hint="Guarantor cannot be the borrower and cannot have an active guarantee on another ongoing loan."
          >
            <select
              value={guarantorMemberId}
              onChange={(e) => setGuarantorMemberId(e.target.value)}
              required={selectedProduct?.requiresGuarantor}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">-- Choose Guarantor Member --</option>
              {members
                .filter((m) => m.id !== memberId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.memberNumber}) &bull; NIC: {m.nic}
                  </option>
                ))}
            </select>
          </FieldRow>

          <FieldRow label="Business Purpose / Notes">
            <textarea
              rows={2}
              value={purposeNotes}
              onChange={(e) => setPurposeNotes(e.target.value)}
              placeholder="e.g. Working capital for grocery store restocking, sewing machine purchase..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </FieldRow>
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
          <Link
            href="/loans"
            className="rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            {submitting ? 'Submitting Application...' : 'Submit Loan Application'}
          </button>
        </div>
      </form>
    </div>
  )
}

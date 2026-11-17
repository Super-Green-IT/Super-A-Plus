'use client'

import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Package, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LoanType = 'PERSONAL' | 'BUSINESS'
type InterestMethod = 'FLAT' | 'REDUCING_BALANCE'

interface LoanProduct {
  id: string
  name: string
  loanType: LoanType
  interestMethod: InterestMethod
  annualInterestRate: string
  minAmount: string
  maxAmount: string
  minTermWeeks: number
  maxTermWeeks: number
  processingFeeRate: string
  requiresGuarantor: boolean
  isActive: boolean
  createdAt: string
}

interface ProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: LoanProduct | null    // null/undefined = Add mode
  onSaved: (product: LoanProduct) => void
}

const defaultForm = {
  name: '',
  loanType: 'BUSINESS' as LoanType,
  interestMethod: 'FLAT' as InterestMethod,
  annualInterestRate: '',
  minAmount: '',
  maxAmount: '',
  minTermWeeks: '',
  maxTermWeeks: '',
  processingFeeRate: '',
  requiresGuarantor: true,
  isActive: true,
}

type FormState = typeof defaultForm

function InputField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  error,
  suffix,
  required,
  step,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  error?: string
  suffix?: string
  required?: boolean
  step?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="ml-0.5 text-rose-700 dark:text-rose-400">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          step={step ?? (type === 'number' ? 'any' : undefined)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(
            'h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors dark:bg-[#1b2820] dark:text-slate-100 dark:placeholder-slate-500',
            'focus-visible:ring-2 focus-visible:ring-emerald-700/40 focus-visible:border-emerald-700 dark:focus-visible:border-emerald-400',
            error ? 'border-rose-600 dark:border-rose-400' : 'border-slate-300 dark:border-white/15',
            suffix ? 'pr-10' : ''
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && <p className="text-[11px] text-slate-600 dark:text-slate-400">{hint}</p>}
      {error && <p className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  )
}

function SelectField<T extends string>({
  label,
  id,
  value,
  onChange,
  options,
  required,
}: {
  label: string
  id: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="ml-0.5 text-rose-700 dark:text-rose-400">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        required={required}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-white/15 dark:bg-[#1b2820] dark:text-slate-100 dark:focus-visible:border-emerald-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function ProductModal({ open, onOpenChange, product, onSaved }: ProductModalProps) {
  const isEdit = Boolean(product)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [saved, setSaved] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (open) {
      setSaved(false)
      setApiError('')
      setErrors({})
      if (product) {
        setForm({
          name: product.name,
          loanType: product.loanType,
          interestMethod: product.interestMethod,
          annualInterestRate: (parseFloat(product.annualInterestRate) * 100).toFixed(2),
          minAmount: product.minAmount,
          maxAmount: product.maxAmount,
          minTermWeeks: String(product.minTermWeeks),
          maxTermWeeks: String(product.maxTermWeeks),
          processingFeeRate: (parseFloat(product.processingFeeRate) * 100).toFixed(2),
          requiresGuarantor: product.requiresGuarantor,
          isActive: product.isActive,
        })
      } else {
        setForm(defaultForm)
      }
    }
  }, [open, product])

  function set(key: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = 'Product name is required'
    const rate = parseFloat(form.annualInterestRate)
    if (isNaN(rate) || rate <= 0 || rate > 200) errs.annualInterestRate = 'Enter a rate between 0.01% and 200%'
    const minA = parseFloat(form.minAmount)
    const maxA = parseFloat(form.maxAmount)
    if (isNaN(minA) || minA < 0) errs.minAmount = 'Enter a valid minimum amount'
    if (isNaN(maxA) || maxA <= 0) errs.maxAmount = 'Enter a valid maximum amount'
    if (!isNaN(minA) && !isNaN(maxA) && minA >= maxA) errs.maxAmount = 'Max must be greater than min'
    const minW = parseInt(form.minTermWeeks)
    const maxW = parseInt(form.maxTermWeeks)
    if (isNaN(minW) || minW < 1) errs.minTermWeeks = 'Min term must be at least 1 week'
    if (isNaN(maxW) || maxW < 1) errs.maxTermWeeks = 'Max term must be at least 1 week'
    if (!isNaN(minW) && !isNaN(maxW) && minW >= maxW) errs.maxTermWeeks = 'Max must be greater than min'
    const fee = parseFloat(form.processingFeeRate)
    if (!form.processingFeeRate || isNaN(fee) || fee < 0 || fee > 100) {
      errs.processingFeeRate = 'Enter a fee between 0% and 100%'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        name: form.name.trim(),
        loanType: form.loanType,
        interestMethod: form.interestMethod,
        annualInterestRate: (parseFloat(form.annualInterestRate) / 100).toFixed(4),
        minAmount: parseFloat(form.minAmount).toFixed(2),
        maxAmount: parseFloat(form.maxAmount).toFixed(2),
        minTermWeeks: parseInt(form.minTermWeeks),
        maxTermWeeks: parseInt(form.maxTermWeeks),
        processingFeeRate: (parseFloat(form.processingFeeRate) / 100).toFixed(4),
        requiresGuarantor: form.requiresGuarantor,
        isActive: form.isActive,
      }

      const url = isEdit ? `/api/products/${product!.id}` : '/api/products'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error || 'Failed to save product')
        return
      }

      setSaved(true)
      onSaved(data.product)
      setTimeout(() => onOpenChange(false), 900)
    } catch {
      setApiError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#17231b]/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-xl flex-col border-l border-slate-200 bg-[#fffefa] text-slate-900 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right dark:border-white/10 dark:bg-[#202d25] dark:text-slate-100">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-[#fffefa] px-5 py-4 dark:border-white/10 dark:bg-[#202d25] sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e4ece2] dark:bg-emerald-300/10">
                <Package className="h-5 w-5 text-[#274b38] dark:text-emerald-200" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isEdit ? 'Edit Loan Product' : 'New Loan Product'}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-600 dark:text-slate-400">
                  {isEdit ? `Editing "${product?.name}"` : 'Configure a new lending product'}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close product configuration" className="rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
            {/* Product name */}
            <InputField
              label="Product Name"
              id="prod-name"
              value={form.name}
              onChange={(v) => set('name', v)}
              placeholder="e.g. Business Weekly Flat"
              error={errors.name}
              required
            />

            {/* Type & Method */}
            <div className="grid grid-cols-2 gap-4">
              <SelectField<LoanType>
                label="Loan Type"
                id="prod-loanType"
                value={form.loanType}
                onChange={(v) => set('loanType', v)}
                options={[
                  { value: 'BUSINESS', label: 'Business' },
                  { value: 'PERSONAL', label: 'Personal' },
                ]}
                required
              />
              <SelectField<InterestMethod>
                label="Interest Method"
                id="prod-method"
                value={form.interestMethod}
                onChange={(v) => set('interestMethod', v)}
                options={[
                  { value: 'FLAT', label: 'Flat Rate' },
                  { value: 'REDUCING_BALANCE', label: 'Reducing Balance' },
                ]}
                required
              />
            </div>

            {/* Rate & Fee */}
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Annual Interest Rate"
                id="prod-rate"
                type="number"
                value={form.annualInterestRate}
                onChange={(v) => set('annualInterestRate', v)}
                placeholder="24.00"
                suffix="%"
                hint="e.g. 24 = 24% per annum"
                error={errors.annualInterestRate}
                required
              />
              <InputField
                label="Processing Fee"
                id="prod-fee"
                type="number"
                value={form.processingFeeRate}
                onChange={(v) => set('processingFeeRate', v)}
                placeholder="1.00"
                suffix="%"
                hint="One-time fee as % of principal"
                error={errors.processingFeeRate}
                required
              />
            </div>

            {/* Amount limits */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-200">Loan Amount Range</p>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Minimum Amount"
                  id="prod-minAmt"
                  type="number"
                  value={form.minAmount}
                  onChange={(v) => set('minAmount', v)}
                  placeholder="5000.00"
                  suffix="LKR"
                  error={errors.minAmount}
                  required
                />
                <InputField
                  label="Maximum Amount"
                  id="prod-maxAmt"
                  type="number"
                  value={form.maxAmount}
                  onChange={(v) => set('maxAmount', v)}
                  placeholder="150000.00"
                  suffix="LKR"
                  error={errors.maxAmount}
                  required
                />
              </div>
            </div>

            {/* Term limits */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-200">Repayment Term Range</p>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Minimum Term"
                  id="prod-minW"
                  type="number"
                step="1"
                  value={form.minTermWeeks}
                  onChange={(v) => set('minTermWeeks', v)}
                  placeholder="12"
                  suffix="wks"
                  error={errors.minTermWeeks}
                  required
                />
                <InputField
                  label="Maximum Term"
                  id="prod-maxW"
                  type="number"
                step="1"
                  value={form.maxTermWeeks}
                  onChange={(v) => set('maxTermWeeks', v)}
                  placeholder="52"
                  suffix="wks"
                  error={errors.maxTermWeeks}
                  required
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-5 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <button type="button" role="switch" aria-label="Requires guarantor" aria-checked={form.requiresGuarantor} onClick={() => set('requiresGuarantor', !form.requiresGuarantor)} className={cn('inline-flex h-5 w-9 shrink-0 items-center rounded-full border-0 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8eb39a] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#202d25]', form.requiresGuarantor ? 'bg-[#396349]' : 'bg-slate-300 dark:bg-slate-600')}>
                  <span aria-hidden="true" className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', form.requiresGuarantor ? 'translate-x-4' : 'translate-x-0')} />
                </button>
                Requires guarantor
              </label>

              {isEdit && (
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <button type="button" role="switch" aria-label="Product active" aria-checked={form.isActive} onClick={() => set('isActive', !form.isActive)} className={cn('inline-flex h-5 w-9 shrink-0 items-center rounded-full border-0 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8eb39a] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#202d25]', form.isActive ? 'bg-[#396349]' : 'bg-slate-300 dark:bg-slate-600')}>
                    <span aria-hidden="true" className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', form.isActive ? 'translate-x-4' : 'translate-x-0')} />
                  </button>
                  Active
                </label>
              )}
            </div>

            {/* API error */}
            {apiError && (
              <div role="alert" className="flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {apiError}
              </div>
            )}

            {/* Footer */}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-[#fffefa] px-5 py-4 dark:border-white/10 dark:bg-[#202d25] sm:px-6">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={saving || saved}
                className={cn(
                  'flex min-h-10 items-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#202d25]',
                  saved
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#274b38] text-white hover:bg-[#396349] disabled:cursor-not-allowed disabled:opacity-60'
                )}
              >
                {saved ? (
                  <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                ) : saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  isEdit ? 'Save Changes' : 'Create Product'
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

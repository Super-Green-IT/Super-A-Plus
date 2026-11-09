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
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors',
            'focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60',
            error ? 'border-red-500/60' : 'border-slate-700',
            suffix ? 'pr-10' : ''
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && <p className="text-[10px] text-slate-500">{hint}</p>}
      {error && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
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
      <label htmlFor={id} className="block text-xs font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/20">
                <Package className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-slate-100">
                  {isEdit ? 'Edit Loan Product' : 'New Loan Product'}
                </Dialog.Title>
                <p className="text-[11px] text-slate-400">
                  {isEdit ? `Editing "${product?.name}"` : 'Configure a new lending product'}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              <p className="text-xs font-medium text-slate-300 mb-2">Loan Amount Range</p>
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
              <p className="text-xs font-medium text-slate-300 mb-2">Repayment Term Range</p>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Minimum Term"
                  id="prod-minW"
                  type="number"
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
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => set('requiresGuarantor', !form.requiresGuarantor)}
                  className={cn(
                    'relative h-5 w-9 rounded-full transition-colors cursor-pointer',
                    form.requiresGuarantor ? 'bg-emerald-500' : 'bg-slate-700'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    form.requiresGuarantor ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
                <span className="text-xs text-slate-300">Requires Guarantor</span>
              </label>

              {isEdit && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => set('isActive', !form.isActive)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors cursor-pointer',
                      form.isActive ? 'bg-emerald-500' : 'bg-slate-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                      form.isActive ? 'translate-x-4' : 'translate-x-0.5'
                    )} />
                  </div>
                  <span className="text-xs text-slate-300">Active</span>
                </label>
              )}
            </div>

            {/* API error */}
            {apiError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {apiError}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={saving || saved}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-semibold transition-all',
                  saved
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 disabled:cursor-not-allowed'
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

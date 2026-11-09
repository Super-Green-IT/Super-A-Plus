'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  TrendingUp,
  Percent,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductModal } from '@/components/products/product-modal'

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

function Badge({ children, variant }: { children: React.ReactNode; variant: 'active' | 'inactive' | 'type' | 'method' }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
      variant === 'active' && 'bg-emerald-500/15 text-emerald-400',
      variant === 'inactive' && 'bg-slate-700 text-slate-500',
      variant === 'type' && 'bg-blue-500/15 text-blue-400',
      variant === 'method' && 'bg-violet-500/15 text-violet-400',
    )}>
      {children}
    </span>
  )
}

function fmt(n: string) {
  return parseFloat(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(n: string) {
  return (parseFloat(n) * 100).toFixed(2) + '%'
}

export default function ProductsPage() {
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LoanProduct | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProducts(data.products)
    } catch {
      setError('Failed to load loan products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(product: LoanProduct) {
    setEditing(product)
    setModalOpen(true)
  }

  function handleSaved(product: LoanProduct) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = product
        return next
      }
      return [...prev, product]
    })
  }

  async function handleDelete(product: LoanProduct) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    setDeleteError('')
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Remove from list or mark inactive
      setProducts((prev) =>
        prev
          .map((p) => (p.id === product.id ? { ...p, isActive: false } : p))
          .filter((p) => !(p.id === product.id && !p.isActive && data.message?.includes('deleted')))
      )
      // Refresh to get accurate state
      fetchProducts()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const activeCount = products.filter((p) => p.isActive).length
  const totalCount = products.length

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Loan Products</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeCount} active · {totalCount} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Product
          </button>
        </div>
      </div>

      {/* Error banner */}
      {(error || deleteError) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || deleteError}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800/60" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <Package className="h-10 w-10 text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-300">No loan products yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first lending product to get started.</p>
          <button
            onClick={openAdd}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Product
          </button>
        </div>
      )}

      {/* Product cards */}
      {!loading && products.length > 0 && (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={cn(
                'group relative rounded-xl border bg-slate-900/60 p-5 transition-all',
                product.isActive
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-slate-800/50 opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: identity */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                    <Package className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-sm font-semibold text-slate-100 truncate">{product.name}</h2>
                      <Badge variant={product.isActive ? 'active' : 'inactive'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="type">{product.loanType}</Badge>
                      <Badge variant="method">
                        {product.interestMethod === 'FLAT' ? 'Flat' : 'Reducing'}
                      </Badge>
                    </div>
                    {/* Stats row */}
                    <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3 text-slate-500" />
                        <span className="font-mono text-slate-200">{fmtPct(product.annualInterestRate)}</span>
                        <span>p.a.</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-slate-500" />
                        <span className="font-mono">LKR {fmt(product.minAmount)}</span>
                        <span>–</span>
                        <span className="font-mono">LKR {fmt(product.maxAmount)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span className="font-mono">{product.minTermWeeks}–{product.maxTermWeeks}</span>
                        <span>weeks</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        Processing fee:
                        <span className="font-mono text-slate-400">{fmtPct(product.processingFeeRate)}</span>
                      </span>
                      {product.requiresGuarantor && (
                        <span className="text-amber-500/80">Guarantor required</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(product)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                    title="Edit product"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={deleting === product.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete product"
                  >
                    {deleting === product.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editing}
        onSaved={handleSaved}
      />
    </div>
  )
}

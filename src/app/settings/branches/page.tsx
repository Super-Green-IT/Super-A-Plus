'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Building2,
  Plus,
  Users,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { FormSection } from '@/components/ui/form-section'
import { FieldRow } from '@/components/ui/field-row'
import { Skeleton } from '@/components/ui/skeleton'

interface Centre {
  id: string
  name: string
  _count?: { members: number }
}

interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  isActive: boolean
  centres: Centre[]
  _count?: { staff: number; loans: number }
}

export default function BranchCentreSettingsPage() {
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [loading, setLoading] = React.useState(true)

  // New Branch Form
  const [showNewBranch, setShowNewBranch] = React.useState(false)
  const [branchName, setBranchName] = React.useState('')
  const [branchAddress, setBranchAddress] = React.useState('')
  const [branchPhone, setBranchPhone] = React.useState('')
  const [savingBranch, setSavingBranch] = React.useState(false)

  // New Centre Form
  const [selectedBranchId, setSelectedBranchId] = React.useState<string | null>(null)
  const [centreName, setCentreName] = React.useState('')
  const [savingCentre, setSavingCentre] = React.useState(false)

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/branches')
      if (res.ok) {
        const data = await res.json()
        setBranches(data.branches || [])
      }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchBranches()
  }, [])

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchName.trim()) return
    try {
      setSavingBranch(true)
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchName.trim(),
          address: branchAddress.trim() || null,
          phone: branchPhone.trim() || null,
        }),
      })
      if (res.ok) {
        setBranchName('')
        setBranchAddress('')
        setBranchPhone('')
        setShowNewBranch(false)
        fetchBranches()
      }
    } finally {
      setSavingBranch(false)
    }
  }

  const handleCreateCentre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBranchId || !centreName.trim()) return
    try {
      setSavingCentre(true)
      const res = await fetch('/api/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: centreName.trim(),
          branchId: selectedBranchId,
        }),
      })
      if (res.ok) {
        setCentreName('')
        setSelectedBranchId(null)
        fetchBranches()
      }
    } finally {
      setSavingCentre(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Branches & Micro Centres
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage physical branches, service territories, and assigned weekly collection centres.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewBranch(!showNewBranch)}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {showNewBranch ? 'Cancel' : 'New Branch'}
        </button>
      </div>

      {/* New Branch Expandable Form */}
      {showNewBranch && (
        <form onSubmit={handleCreateBranch}>
          <FormSection
            title="Create New Branch"
            description="Add a regional office or operational branch"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Kandy Branch"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Street, City"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="+94 11 234 5678"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingBranch}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingBranch ? 'Saving...' : 'Save Branch'}
              </button>
            </div>
          </FormSection>
        </form>
      )}

      {/* Branches & Centres List */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm"
            >
              {/* Branch Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-100">{branch.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {branch.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-500" />
                          {branch.address}
                        </span>
                      )}
                      {branch.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-500" />
                          {branch.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedBranchId(selectedBranchId === branch.id ? null : branch.id)
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Centre
                </button>
              </div>

              {/* Add Centre under this Branch */}
              {selectedBranchId === branch.id && (
                <form
                  onSubmit={handleCreateCentre}
                  className="mb-4 rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4"
                >
                  <h4 className="text-xs font-semibold text-emerald-300 mb-2">
                    Create New Centre under {branch.name}
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      required
                      value={centreName}
                      onChange={(e) => setCentreName(e.target.value)}
                      placeholder="e.g. Mahaweli Centre B"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingCentre}
                        className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {savingCentre ? 'Adding...' : 'Add Centre'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBranchId(null)}
                        className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Centres Grid */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  Assigned Micro Centres ({branch.centres.length})
                </h3>

                {branch.centres.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {branch.centres.map((centre) => (
                      <div
                        key={centre.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-medium text-slate-200">
                            {centre.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {centre._count?.members || 0} Registered Members
                          </div>
                        </div>
                        <Link
                          href={`/members?centreId=${centre.id}`}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                          title="View Members in this Centre"
                        >
                          View &rarr;
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2">
                    No centres created yet. Click &ldquo;Add Centre&rdquo; to create the first weekly meeting centre.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

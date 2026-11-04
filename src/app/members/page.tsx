'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, Users, Search, Building2, Eye, Filter } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { MoneyCell } from '@/components/ui/money-cell'
import { Skeleton } from '@/components/ui/skeleton'

interface MemberRow {
  id: string
  memberNumber: string
  fullName: string
  nic: string
  phone: string | null
  centre: { id: string; name: string } | null
  activeLoansCount: number
  outstandingBalance: number
  isActive: boolean
}

export default function MembersListPage() {
  const router = useRouter()
  const [members, setMembers] = React.useState<MemberRow[]>([])
  const [centres, setCentres] = React.useState<{ id: string; name: string }[]>([])
  const [selectedCentre, setSelectedCentre] = React.useState<string>('ALL')
  const [loading, setLoading] = React.useState(true)

  const fetchMembers = React.useCallback(async () => {
    try {
      setLoading(true)
      const url = selectedCentre === 'ALL'
        ? '/api/members'
        : `/api/members?centreId=${selectedCentre}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCentre])

  const fetchCentres = async () => {
    try {
      const res = await fetch('/api/centres')
      if (res.ok) {
        const data = await res.json()
        setCentres(data.centres || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  React.useEffect(() => {
    fetchCentres()
  }, [])

  React.useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const columns: ColumnDef<MemberRow>[] = [
    {
      accessorKey: 'memberNumber',
      header: 'Member ID',
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-emerald-400">
          {row.original.memberNumber}
        </span>
      ),
    },
    {
      accessorKey: 'fullName',
      header: 'Full Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-100">{row.original.fullName}</div>
          <div className="font-mono text-[11px] text-slate-400">{row.original.nic}</div>
        </div>
      ),
    },
    {
      accessorKey: 'centre',
      header: 'Centre',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
          <Building2 className="h-3 w-3 text-slate-400" />
          {row.original.centre?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Contact',
      cell: ({ row }) => (
        <span className="font-mono text-slate-300 text-xs">{row.original.phone || '—'}</span>
      ),
    },
    {
      accessorKey: 'activeLoansCount',
      header: 'Active Loans',
      cell: ({ row }) => (
        <span className="text-center font-mono">
          {row.original.activeLoansCount > 0 ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              {row.original.activeLoansCount} Active
            </span>
          ) : (
            <span className="text-slate-500 text-xs">None</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'outstandingBalance',
      header: 'Outstanding Balance',
      cell: ({ row }) => (
        <MoneyCell
          amount={row.original.outstandingBalance}
          variant={row.original.outstandingBalance > 0 ? 'default' : 'muted'}
        />
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link
          href={`/members/${row.original.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Eye className="h-3 w-3" />
          Profile
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Members & Borrowers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage KYC profiles, micro centres, active loans, and guarantor histories.
          </p>
        </div>

        <Link
          href="/members/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Register New Member
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-xs font-medium text-slate-400">Centre:</span>
          <select
            value={selectedCentre}
            onChange={(e) => setSelectedCentre(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none w-full sm:w-auto"
          >
            <option value="ALL">All Centres ({centres.length})</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={members}
          searchPlaceholder="Search by name, NIC, member #, or phone..."
          exportFilename="super-a-plus-members.csv"
          onRowClick={(row) => router.push(`/members/${row.id}`)}
        />
      )}
    </div>
  )
}

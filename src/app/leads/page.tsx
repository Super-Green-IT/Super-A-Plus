'use client'

import * as React from 'react'
import Link from 'next/link'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Megaphone,
  Plus,
  Phone,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Filter,
  UserPlus,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/formatters'
import type { LeadStatus } from '@/types'

interface LeadItem {
  id: string
  fullName: string
  phone: string
  source: string
  status: LeadStatus
  notes: string | null
  appointmentAt: string | null
  createdAt: string
  assignedTo?: { id: string; fullName: string } | null
}

export default function LeadsPage() {
  const [leads, setLeads] = React.useState<LeadItem[]>([])
  const [metrics, setMetrics] = React.useState({
    total: 0,
    new: 0,
    contacted: 0,
    appointment: 0,
    converted: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL')
  const [searchTerm, setSearchTerm] = React.useState('')

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingLead, setEditingLead] = React.useState<LeadItem | null>(null)

  const fetchLeads = React.useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus)
      if (searchTerm) params.set('search', searchTerm)

      const res = await fetch(`/api/leads?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
        if (data.metrics) setMetrics(data.metrics)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, searchTerm])

  React.useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleOpenAdd = () => {
    setEditingLead(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (lead: LeadItem) => {
    setEditingLead(lead)
    setModalOpen(true)
  }

  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      })
      if (res.ok) {
        fetchLeads()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Borrower Leads & Inquiries
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track inquiries from Facebook ads, field campaigns, and appointments before KYC registration.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add New Lead
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Total Leads
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-100">
            {loading ? <Skeleton className="h-8 w-16" /> : metrics.total}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-sky-400">
            New Inquiries
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-sky-400">
            {loading ? <Skeleton className="h-8 w-16" /> : metrics.new}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
            Appointments Set
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-400">
            {loading ? <Skeleton className="h-8 w-16" /> : metrics.appointment}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
            Converted to Loans
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
            {loading ? <Skeleton className="h-8 w-16" /> : metrics.converted}
          </div>
        </div>
      </div>

      {/* Toolbar & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-slate-800 bg-slate-950/60 text-xs w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'NEW', label: 'New' },
            { id: 'CONTACTED', label: 'Contacted' },
            { id: 'APPOINTMENT_SET', label: 'Appointment' },
            { id: 'CONVERTED', label: 'Converted' },
            { id: 'LOST', label: 'Lost' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`rounded px-3 py-1 font-medium transition-colors cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Leads Table / List */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10 text-slate-500" />}
          title="No Leads Found"
          description="No leads match the selected status or search filter."
          action={
            <button
              type="button"
              onClick={handleOpenAdd}
              className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Add First Lead
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Lead Name & Source</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{lead.fullName}</div>
                    <span className="inline-block mt-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    <a
                      href={`tel:${lead.phone}`}
                      className="hover:text-emerald-400 flex items-center gap-1.5"
                    >
                      <Phone className="h-3 w-3 text-slate-500" />
                      {lead.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="NEW">New Lead</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="APPOINTMENT_SET">Appointment Set</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {lead.appointmentAt ? (
                      <span className="flex items-center gap-1 text-amber-400 font-mono">
                        <Calendar className="h-3 w-3" />
                        {formatDate(lead.appointmentAt, 'dd MMM yyyy, HH:mm')}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-400">
                    {lead.notes || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(lead)}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        Edit
                      </button>
                      {lead.status !== 'CONVERTED' && (
                        <Link
                          href={`/members?action=new`}
                          className="rounded border border-emerald-700/50 bg-emerald-950/40 px-2 py-1 text-emerald-400 hover:bg-emerald-900/60"
                        >
                          Register Member
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Lead Pop-up Modal */}
      <LeadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        lead={editingLead}
        onSuccess={() => fetchLeads()}
      />
    </div>
  )
}

function LeadModal({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: LeadItem | null
  onSuccess: () => void
}) {
  const isEdit = Boolean(lead)
  const [fullName, setFullName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [source, setSource] = React.useState('FACEBOOK')
  const [status, setStatus] = React.useState<LeadStatus>('NEW')
  const [appointmentAt, setAppointmentAt] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (lead) {
      setFullName(lead.fullName || '')
      setPhone(lead.phone || '')
      setSource(lead.source || 'FACEBOOK')
      setStatus(lead.status || 'NEW')
      setAppointmentAt(lead.appointmentAt ? lead.appointmentAt.slice(0, 16) : '')
      setNotes(lead.notes || '')
    } else {
      setFullName('')
      setPhone('')
      setSource('FACEBOOK')
      setStatus('NEW')
      setAppointmentAt('')
      setNotes('')
    }
    setError(null)
  }, [open, lead])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim() || !phone.trim()) {
      setError('Please provide lead name and phone number')
      return
    }

    try {
      setSubmitting(true)

      const url = '/api/leads'
      const method = isEdit ? 'PATCH' : 'POST'
      const payload: any = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        source,
        notes: notes.trim() || null,
        appointmentAt: appointmentAt || null,
      }
      if (isEdit && lead) {
        payload.id = lead.id
        payload.status = status
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save lead')
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting form')
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
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold text-slate-100">
                  {isEdit ? 'Edit Borrower Lead' : 'Add New Inquiry Lead'}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-slate-400">
                  Record prospect contact details, inquiry origin, and follow-up appointment.
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
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Ruwan Wickramasinghe"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Mobile Phone <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="077 123 4567"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Lead Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="FACEBOOK">Facebook Ads</option>
                  <option value="FIELD_OFFICER">Field Officer Referral</option>
                  <option value="WALK_IN">Branch Walk-In</option>
                  <option value="EXISTING_MEMBER">Member Referral</option>
                  <option value="FLYER">Flyer / Poster</option>
                </select>
              </div>

              {isEdit && (
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Pipeline Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LeadStatus)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="NEW">New Lead</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="APPOINTMENT_SET">Appointment Set</option>
                    <option value="CONVERTED">Converted</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Appointment Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                value={appointmentAt}
                onChange={(e) => setAppointmentAt(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Notes & Follow-up</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Business type, loan requirement (e.g. LKR 100,000 for retail store), caller notes..."
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
                    Saving...
                  </>
                ) : (
                  <span>{isEdit ? 'Save Changes' : 'Create Lead'}</span>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Building2,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Upload,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pencil,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { MoneyCell } from '@/components/ui/money-cell'
import { FormSection } from '@/components/ui/form-section'
import { FieldRow } from '@/components/ui/field-row'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberModal } from '@/components/members/member-modal'
import { formatLKR, formatDate, formatDateTime } from '@/lib/formatters'

type TabKey = 'overview' | 'loans' | 'guarantors' | 'documents'

export default function MemberProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <MemberProfileContent />
    </React.Suspense>
  )
}

function MemberProfileContent() {
  const params = useParams()
  const router = useRouter()
  const memberId = params?.id as string

  const [member, setMember] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<TabKey>('overview')
  const [editModalOpen, setEditModalOpen] = React.useState(false)

  // Document Upload State
  const [docLabel, setDocLabel] = React.useState('NIC Front')
  const [docFile, setDocFile] = React.useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  const fetchMember = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/members/${memberId}`)
      if (res.ok) {
        const data = await res.json()
        setMember(data.member)
      } else {
        router.push('/members')
      }
    } finally {
      setLoading(false)
    }
  }, [memberId, router])

  React.useEffect(() => {
    if (memberId) {
      fetchMember()
    }
  }, [memberId, fetchMember])

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docFile) return
    try {
      setUploadingDoc(true)
      setUploadError(null)

      const formData = new FormData()
      formData.append('file', docFile)
      formData.append('label', docLabel)

      const res = await fetch(`/api/members/${memberId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error || 'Failed to upload document')
        return
      }

      setDocFile(null)
      fetchMember()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error uploading document')
    } finally {
      setUploadingDoc(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!member) {
    return (
      <EmptyState
        title="Member Not Found"
        description="The requested member record could not be found."
        action={
          <Link
            href="/members"
            className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white"
          >
            Back to Members
          </Link>
        }
      />
    )
  }

  // Check active guarantee status
  const activeGuarantees = member.guarantors?.filter(
    (g: any) => g.loan?.status === 'ACTIVE' || g.loan?.status === 'DISBURSED'
  )
  const isGuarantorLocked = activeGuarantees && activeGuarantees.length > 0

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/members"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-xs text-slate-400">Back to Members List</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
          <Link
            href={`/loans/new?memberId=${member.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Apply for Loan
          </Link>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-md">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Member Identity & Details */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-slate-800 text-2xl font-bold text-white shadow-lg shadow-emerald-950/40">
              {member.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-100">{member.fullName}</h1>
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-400 border border-slate-700">
                  {member.memberNumber}
                </span>
                <StatusBadge status={member.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  NIC: <strong className="font-mono text-slate-200">{member.nic}</strong>
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  {member.centre?.name || 'Unassigned'} ({member.centre?.branch?.name || 'Head Office'})
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  {member.phone || 'No phone'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Financial Summary Chips */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4 lg:border-t-0 lg:pt-0">
            {/* Outstanding Balance */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 min-w-[140px]">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Active Balance
              </div>
              <div className="mt-1">
                <MoneyCell
                  amount={member.activeOutstanding}
                  variant={member.activeOutstanding > 0 ? 'default' : 'muted'}
                />
              </div>
            </div>

            {/* Next Due */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 min-w-[140px]">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Next Due
              </div>
              <div className="mt-1">
                <MoneyCell
                  amount={member.nextDueAmount}
                  variant={member.nextDueAmount > 0 ? 'overdue' : 'muted'}
                  subtext={member.nextDueDate ? formatDate(member.nextDueDate) : 'No due'}
                />
              </div>
            </div>

            {/* Guarantor Status Risk Chip */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 min-w-[140px]">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Guarantor Risk
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                {isGuarantorLocked ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Locked (1 Active)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Eligible
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="mt-6 flex border-b border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & KYC
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('loans')}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === 'loans'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Loans History ({member.loans?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guarantors')}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === 'guarantors'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Guarantors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === 'documents'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Documents ({member.documents?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab 1: Overview & Personal Info */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormSection title="Personal & Identification" description="Member's verified KYC information">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Full Name:</span>
                <span className="font-medium text-slate-100">{member.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">NIC Number:</span>
                <span className="font-mono font-semibold text-emerald-400">{member.nic}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Gender:</span>
                <span className="text-slate-200">{member.gender || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Date of Birth:</span>
                <span className="text-slate-200">{member.dateOfBirth ? formatDate(member.dateOfBirth) : '—'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Member Since:</span>
                <span className="text-slate-200">{formatDate(member.createdAt)}</span>
              </div>
            </div>
          </FormSection>

          <FormSection title="Contact & Centre Placement" description="Residential address and assigned micro centre">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Mobile Phone:</span>
                <span className="font-mono text-slate-100">{member.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Centre:</span>
                <span className="text-slate-100 font-medium">{member.centre?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Branch:</span>
                <span className="text-slate-100">{member.centre?.branch?.name || 'Head Office'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Address:</span>
                <span className="text-right text-slate-200 max-w-[240px] truncate">{member.address || '—'}</span>
              </div>
            </div>
          </FormSection>
        </div>
      )}

      {/* Tab 2: Loans History */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">All Loans for {member.fullName}</h2>
            <Link
              href={`/loans/new?memberId=${member.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Loan Application
            </Link>
          </div>

          {member.loans && member.loans.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 shadow-xs">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Loan ID</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Principal</th>
                    <th className="px-4 py-3 text-right">Weekly Due</th>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Guarantor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {member.loans.map((loan: any) => (
                    <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-emerald-400">
                        {loan.loanNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {loan.product?.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <MoneyCell amount={loan.principalAmount} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <MoneyCell amount={loan.weeklyInstallment} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {loan.termWeeks} wks
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={loan.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {loan.guarantor?.member ? (
                          <span className="text-slate-300">
                            {loan.guarantor.member.fullName} ({loan.guarantor.member.memberNumber})
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/loans/${loan.id}`}
                          className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          View Schedule
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Loans Registered"
              description="This member currently does not have any active or past loan applications."
            />
          )}
        </div>
      )}

      {/* Tab 3: Guarantor Relations */}
      {activeTab === 'guarantors' && (
        <div className="space-y-6">
          {/* Section A: Who guaranteed for this member */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              Guarantors for {member.fullName}&apos;s Loans
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Registered members who agreed to guarantee loans taken by this member.
            </p>

            {member.guaranteedFor && member.guaranteedFor.length > 0 ? (
              <div className="space-y-2">
                {member.guaranteedFor.map((g: any) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{g.member?.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {g.member?.memberNumber} &bull; NIC: {g.member?.nic} &bull; {g.member?.phone}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">Loan: {g.loan?.loanNumber}</span>
                      <StatusBadge status={g.loan?.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No guarantor records found on active loans.</p>
            )}
          </div>

          {/* Section B: Loans this member is guaranteeing for others */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Loans Guaranteed by {member.fullName}
                </h3>
                <p className="text-xs text-slate-400">
                  A member cannot be an active guarantor on more than one ongoing loan.
                </p>
              </div>
              <div>
                {isGuarantorLocked ? (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                    Active Guarantee Limit Reached
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    Eligible to Guarantee
                  </span>
                )}
              </div>
            </div>

            {member.guarantors && member.guarantors.length > 0 ? (
              <div className="space-y-2 mt-4">
                {member.guarantors.map((g: any) => {
                  const isLoanActive = g.loan?.status === 'ACTIVE' || g.loan?.status === 'DISBURSED'
                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-200">
                          Borrower: {g.borrower?.fullName} ({g.borrower?.memberNumber})
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NIC: {g.borrower?.nic} &bull; {g.borrower?.phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{g.loan?.product?.name}</span>
                        <StatusBadge status={g.loan?.status || 'ACTIVE'} size="sm" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">
                This member is not currently acting as a guarantor for any loans.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: KYC Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Document Upload Box */}
          <FormSection
            title="Upload KYC Document"
            description="Upload scanned NIC, customer photo, or address verification"
          >
            {uploadError && (
              <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded">
                {uploadError}
              </div>
            )}
            <form onSubmit={handleUploadDocument} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Document Type
                </label>
                <select
                  value={docLabel}
                  onChange={(e) => setDocLabel(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="NIC Front">NIC Front</option>
                  <option value="NIC Back">NIC Back</option>
                  <option value="Customer Photo">Customer Photo</option>
                  <option value="Billing Proof / Address">Billing Proof / Address</option>
                  <option value="Income Proof">Income Proof</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={!docFile || uploadingDoc}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadingDoc ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </FormSection>

          {/* Uploaded Documents Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Verified Documents ({member.documents?.length || 0})
            </h3>

            {member.documents && member.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {member.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-xs text-slate-200">{doc.label}</span>
                      <FileText className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 flex items-center justify-center min-h-[100px] bg-slate-950/80 rounded border border-slate-800/80 p-2">
                      {doc.mimeType?.startsWith('image/') ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={doc.storagePath}
                          alt={doc.label}
                          className="max-h-24 object-contain rounded"
                        />
                      ) : (
                        <div className="text-center text-xs text-slate-400">
                          PDF Document
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{formatDate(doc.uploadedAt)}</span>
                      <a
                        href={doc.storagePath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        View Full &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-slate-500" />}
                title="No Documents Uploaded"
                description="Upload KYC documents such as NIC Front, NIC Back, or Customer Photo above."
              />
            )}
          </div>
        </div>
      )}

      {/* Edit Member Profile Modal */}
      <MemberModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        member={member}
        onSuccess={() => {
          fetchMember()
        }}
      />
    </div>
  )
}

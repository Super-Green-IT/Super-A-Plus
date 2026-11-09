'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  X,
  UserPlus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Phone,
  Calendar,
  MapPin,
  Shield,
} from 'lucide-react'
import { validateNIC, formatSLPhone } from '@/lib/validation/nic'

export interface MemberModalData {
  id?: string
  memberNumber?: string
  fullName: string
  nic: string
  phone?: string | null
  address?: string | null
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  dateOfBirth?: string | Date | null
  centreId?: string | null
  centre?: { id: string; name: string } | null
  isActive?: boolean
}

export interface MemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: MemberModalData | null
  centres?: { id: string; name: string }[]
  onSuccess?: (savedMember: any) => void
}

export function MemberModal({
  open,
  onOpenChange,
  member,
  centres: initialCentres,
  onSuccess,
}: MemberModalProps) {
  const isEdit = Boolean(member && member.id)

  const [centres, setCentres] = React.useState<{ id: string; name: string }[]>(
    initialCentres || []
  )
  const [loadingCentres, setLoadingCentres] = React.useState(false)

  // Form state
  const [fullName, setFullName] = React.useState('')
  const [nic, setNic] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [centreId, setCentreId] = React.useState('')
  const [gender, setGender] = React.useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE')
  const [dob, setDob] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  // Validation & Submission State
  const [nicInfo, setNicInfo] = React.useState<ReturnType<typeof validateNIC> | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Load centres if not supplied
  React.useEffect(() => {
    if (initialCentres && initialCentres.length > 0) {
      setCentres(initialCentres)
      return
    }

    let isMounted = true
    async function loadCentres() {
      try {
        setLoadingCentres(true)
        const res = await fetch('/api/centres')
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setCentres(data.centres || [])
          }
        }
      } catch (e) {
        console.error('Failed to load centres:', e)
      } finally {
        if (isMounted) setLoadingCentres(false)
      }
    }

    if (open) {
      loadCentres()
    }

    return () => {
      isMounted = false
    }
  }, [open, initialCentres])

  // Populate or reset form whenever modal opens or active member changes
  React.useEffect(() => {
    if (!open) return

    setError(null)

    if (member && member.id) {
      setFullName(member.fullName || '')
      setNic(member.nic || '')
      setPhone(member.phone || '')
      setAddress(member.address || '')
      setGender((member.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'MALE')

      let formattedDob = ''
      if (member.dateOfBirth) {
        if (typeof member.dateOfBirth === 'string') {
          formattedDob = member.dateOfBirth.split('T')[0]
        } else if (member.dateOfBirth instanceof Date) {
          formattedDob = member.dateOfBirth.toISOString().split('T')[0]
        }
      }
      setDob(formattedDob)

      const cid = member.centreId || member.centre?.id || ''
      setCentreId(cid)
      setIsActive(member.isActive ?? true)

      if (member.nic) {
        setNicInfo(validateNIC(member.nic))
      } else {
        setNicInfo(null)
      }
    } else {
      setFullName('')
      setNic('')
      setPhone('')
      setAddress('')
      setGender('MALE')
      setDob('')
      setIsActive(true)
      setNicInfo(null)
      if (centres.length > 0 && !centreId) {
        setCentreId(centres[0].id)
      }
    }
  }, [open, member, centres])

  // Default centreId if none selected once centres load
  React.useEffect(() => {
    if (open && !centreId && centres.length > 0) {
      setCentreId(centres[0].id)
    }
  }, [open, centres, centreId])

  // Live NIC Validation and Auto-parser (auto-fills Gender & DOB on valid SL NIC)
  const handleNicChange = (val: string) => {
    setNic(val)
    if (val.trim().length >= 9) {
      const parsed = validateNIC(val)
      setNicInfo(parsed)
      if (parsed.isValid) {
        if (parsed.gender) {
          setGender(parsed.gender)
        }
        if (parsed.yearOfBirth && parsed.dayOfYear) {
          const date = new Date(parsed.yearOfBirth, 0)
          date.setDate(parsed.dayOfYear)
          const iso = date.toISOString().split('T')[0]
          setDob(iso)
        }
      }
    } else {
      setNicInfo(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Please provide full member name')
      return
    }

    const nicValidation = validateNIC(nic)
    if (!nicValidation.isValid) {
      setError(nicValidation.error || 'Please enter a valid National ID Card (NIC) number')
      return
    }

    try {
      setSubmitting(true)

      const formattedPhone = phone.trim() ? formatSLPhone(phone) : null
      const formattedAddress = address.trim() || null

      if (isEdit && member?.id) {
        // Update existing member
        const res = await fetch(`/api/members/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            nic: nicValidation.formatted,
            phone: formattedPhone,
            address: formattedAddress,
            gender,
            dateOfBirth: dob || null,
            centreId: centreId || null,
            isActive,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to update member profile')
          return
        }

        onSuccess?.(data.member)
        onOpenChange(false)
      } else {
        // Create new member
        const res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            nic: nicValidation.formatted,
            phone: formattedPhone,
            address: formattedAddress,
            gender,
            dateOfBirth: dob || null,
            centreId: centreId || null,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to register member')
          return
        }

        onSuccess?.(data.member)
        onOpenChange(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs transition-opacity duration-200" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] max-h-[92vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl transition-all duration-200 focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
                {isEdit ? (
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <UserPlus className="h-5 w-5 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogPrimitive.Title className="text-base font-bold text-slate-100 sm:text-lg">
                    {isEdit ? 'Update Member Profile' : 'Register New Member'}
                  </DialogPrimitive.Title>
                  {isEdit && member?.memberNumber && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-400 border border-slate-700">
                      {member.memberNumber}
                    </span>
                  )}
                </div>
                <DialogPrimitive.Description className="text-xs text-slate-400 mt-0.5">
                  {isEdit
                    ? 'Modify verified KYC information, phone, address, and centre placement.'
                    : 'Create a KYC member profile and assign to a microfinance centre.'}
                </DialogPrimitive.Description>
              </div>
            </div>

            <DialogPrimitive.Close className="rounded-md p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {/* 1. Identity & KYC Section */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800/80 pb-2">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                1. Identity Verification (KYC)
              </div>

              {/* NIC */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  National ID (NIC) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nic}
                    onChange={(e) => handleNicChange(e.target.value)}
                    required
                    placeholder="e.g. 851234567V or 198512345678"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm uppercase text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  {nicInfo?.isValid && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                  )}
                </div>
                {nicInfo && !nicInfo.isValid && (
                  <p className="mt-1 text-[11px] text-rose-400">{nicInfo.error}</p>
                )}
                {nicInfo?.isValid && (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2 py-1 rounded">
                    <span>Year of Birth: <strong>{nicInfo.yearOfBirth}</strong></span>
                    <span>&bull;</span>
                    <span>Gender: <strong>{nicInfo.gender}</strong></span>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-500">
                  Supports old (9 digits + V/X) and new (12 digits) formats with auto-detection.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Kamal Perera"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Gender and DOB Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Gender
                  </label>
                  <div className="flex gap-4 pt-1 text-xs text-slate-200">
                    {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                      <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="member-gender"
                          value={g}
                          checked={gender === g}
                          onChange={() => setGender(g)}
                          className="accent-emerald-500"
                        />
                        {g.charAt(0) + g.slice(1).toLowerCase()}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Contact & Micro Centre Section */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800/80 pb-2">
                <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                2. Contact & Centre Placement
              </div>

              {/* Centre Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Centre <span className="text-rose-400">*</span>
                </label>
                {loadingCentres ? (
                  <p className="text-xs text-slate-500">Loading centres...</p>
                ) : (
                  <select
                    value={centreId}
                    onChange={(e) => setCentreId(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select micro centre
                    </option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mobile Phone
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="077 123 4567 or +94 77 123 4567"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No, Street, Town"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Membership Status (in Edit Mode) */}
              {isEdit && (
                <div className="border-t border-slate-800/80 pt-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Membership Status
                  </label>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="member-status"
                        checked={isActive}
                        onChange={() => setIsActive(true)}
                        className="accent-emerald-500"
                      />
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="member-status"
                        checked={!isActive}
                        onChange={() => setIsActive(false)}
                        className="accent-rose-500"
                      />
                      <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-700">
                        Inactive
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{isEdit ? 'Saving Changes...' : 'Registering...'}</span>
                  </>
                ) : isEdit ? (
                  <>
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Register Member</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

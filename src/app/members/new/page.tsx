'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, UserPlus, AlertCircle, Building2, Calendar, Phone, MapPin } from 'lucide-react'
import { FormSection } from '@/components/ui/form-section'
import { FieldRow } from '@/components/ui/field-row'
import { validateNIC, formatSLPhone } from '@/lib/validation/nic'

export default function RegisterMemberPage() {
  const router = useRouter()
  const [centres, setCentres] = React.useState<{ id: string; name: string }[]>([])
  const [loadingCentres, setLoadingCentres] = React.useState(true)

  // Form State
  const [fullName, setFullName] = React.useState('')
  const [nic, setNic] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [centreId, setCentreId] = React.useState('')
  const [gender, setGender] = React.useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE')
  const [dob, setDob] = React.useState('')

  // Validation State
  const [nicInfo, setNicInfo] = React.useState<ReturnType<typeof validateNIC> | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    async function loadCentres() {
      try {
        const res = await fetch('/api/centres')
        if (res.ok) {
          const data = await res.json()
          setCentres(data.centres || [])
          if (data.centres?.length > 0) {
            setCentreId(data.centres[0].id)
          }
        }
      } finally {
        setLoadingCentres(false)
      }
    }
    loadCentres()
  }, [])

  // Live NIC Validation and Auto-parser
  const handleNicChange = (val: string) => {
    setNic(val)
    if (val.trim().length >= 9) {
      const parsed = validateNIC(val)
      setNicInfo(parsed)
      if (parsed.isValid && parsed.gender) {
        setGender(parsed.gender)
        if (parsed.yearOfBirth && parsed.dayOfYear) {
          // Approximate or calculate date from year and day of year
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
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          nic: nicValidation.formatted,
          phone: phone.trim() ? formatSLPhone(phone) : null,
          address: address.trim() || null,
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

      router.push(`/members/${data.member.id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Link
          href="/members"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Register New Member
          </h1>
          <p className="text-xs text-slate-400">
            Create a KYC member profile and assign to a microfinance centre.
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
        {/* National ID & Identification */}
        <FormSection
          title="1. Identity Verification (KYC)"
          description="Sri Lankan National Identity Card (NIC) with auto-detection of Gender & Date of Birth"
        >
          <FieldRow
            label="National ID (NIC)"
            required
            hint="Supports old format (e.g. 851234567V) and new format (e.g. 198512345678)"
            error={nicInfo && !nicInfo.isValid ? nicInfo.error : undefined}
          >
            <div className="relative">
              <input
                type="text"
                value={nic}
                onChange={(e) => handleNicChange(e.target.value)}
                required
                placeholder="e.g. 851234567V"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 uppercase placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {nicInfo?.isValid && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
              )}
            </div>
            {nicInfo?.isValid && (
              <div className="mt-2 flex items-center gap-3 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 p-2 rounded">
                <span>Born: <strong>{nicInfo.yearOfBirth}</strong></span>
                <span>&bull;</span>
                <span>Gender: <strong>{nicInfo.gender}</strong></span>
              </div>
            )}
          </FieldRow>

          <FieldRow label="Full Name" required hint="As written on the National Identity Card">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. Kamal Perera"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </FieldRow>

          <FieldRow label="Gender">
            <div className="flex gap-4 pt-1 text-xs text-slate-200">
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={() => setGender(g)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  {g.charAt(0) + g.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </FieldRow>

          <FieldRow label="Date of Birth" hint="Auto-filled from NIC if recognized">
            <div className="relative">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </FieldRow>
        </FormSection>

        {/* Contact & Location */}
        <FormSection
          title="2. Contact & Micro Centre"
          description="Member's contact information and assigned meeting centre"
        >
          <FieldRow label="Assigned Centre" required hint="The group centre the member attends weekly">
            {loadingCentres ? (
              <p className="text-xs text-slate-500">Loading centres...</p>
            ) : (
              <select
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </FieldRow>

          <FieldRow label="Mobile Phone" hint="e.g. 0771234567 or +94 77 123 4567">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="077 123 4567"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </FieldRow>

          <FieldRow label="Residential Address">
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House No, Street, Town"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </FieldRow>
        </FormSection>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
          <Link
            href="/members"
            className="rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? 'Registering...' : 'Register Member'}
          </button>
        </div>
      </form>
    </div>
  )
}

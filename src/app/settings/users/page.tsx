'use client'

import * as React from 'react'
import { Search, UserPlus, UserRound, Pencil, X, Check, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import type { Role } from '@/types'

interface StaffUser {
  id: string
  fullName: string
  email: string
  role: Role
  branchId: string | null
  branch: { id: string; name: string } | null
  isActive: boolean
}

interface Branch { id: string; name: string; isActive: boolean }

const roles: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'FIELD_OFFICER', label: 'Field Officer' },
]

const fieldClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-white/15 dark:bg-[#1b2820] dark:text-slate-100'

export default function UserManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const [staff, setStaff] = React.useState<StaffUser[]>([])
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('ALL')
  const [editing, setEditing] = React.useState<StaffUser | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<Role>('FIELD_OFFICER')
  const [branchId, setBranchId] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const canManage = user?.role === 'ADMIN' || user?.role === 'BRANCH_MANAGER'
  const availableRoles = user?.role === 'ADMIN' ? roles : roles.filter((item) => ['ACCOUNTANT', 'FIELD_OFFICER'].includes(item.value))

  const loadTeam = React.useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usersResponse, branchesResponse] = await Promise.all([fetch('/api/users'), fetch('/api/branches')])
      const usersData = await usersResponse.json()
      const branchesData = await branchesResponse.json()
      if (!usersResponse.ok) throw new Error(usersData.error || 'Unable to load staff')
      if (!branchesResponse.ok) throw new Error(branchesData.error || 'Unable to load branches')
      setStaff(usersData.users)
      setBranches(branchesData.branches.filter((branch: Branch) => branch.isActive))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load staff')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!authLoading && canManage) void loadTeam()
  }, [authLoading, canManage, loadTeam])

  if (authLoading) return <div aria-label="Loading team" className="h-40 animate-pulse border-y border-slate-200 dark:border-white/10" />
  if (!canManage) {
    return <div className="border-y border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#202d25]">
      <ShieldCheck className="mx-auto h-8 w-8 text-slate-500 dark:text-slate-400" />
      <h1 className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">Management access required</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Only administrators and branch managers can manage staff.</p>
    </div>
  }

  const visibleUsers = staff.filter((item) =>
    `${item.fullName} ${item.email} ${item.branch?.name ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (roleFilter === 'ALL' || item.role === roleFilter)
  )

  const openNewUser = () => {
    setEditing(null)
    setName('')
    setEmail('')
    setRole('FIELD_OFFICER')
    setBranchId(user?.branchId ?? branches[0]?.id ?? '')
    setPassword('')
    setError('')
    setFormOpen(true)
  }

  const openEditUser = (item: StaffUser) => {
    setEditing(item)
    setName(item.fullName)
    setEmail(item.email)
    setRole(item.role)
    setBranchId(item.branchId ?? '')
    setPassword('')
    setError('')
    setFormOpen(true)
  }

  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload: Record<string, string> = { fullName: name.trim(), email: email.trim(), role, branchId }
    if (password) payload.password = password
    if (!editing && !password) {
      setSaving(false)
      setError('Set an initial password with at least 12 characters.')
      return
    }
    try {
      const response = await fetch(editing ? `/api/users/${editing.id}` : '/api/users', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save staff member')
      setFormOpen(false)
      await loadTeam()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save staff member')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: StaffUser) => {
    setError('')
    try {
      const response = await fetch(`/api/users/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update staff status')
      await loadTeam()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update staff status')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4  pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Team management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{user?.role === 'ADMIN' ? 'Manage staff access across branches.' : 'Manage employees assigned to your branch.'}</p>
        </div>
        <button type="button" onClick={openNewUser} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#274b38] px-4 text-sm font-medium text-white transition-colors hover:bg-[#396349] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
          <UserPlus className="h-4 w-4" /> Add employee
        </button>
      </header>

      {error && <p role="alert" className="border-y border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-100">{error}</p>}

      {formOpen && <form onSubmit={saveUser} className="border-y border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#202d25]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{editing ? 'Edit employee' : 'Add employee'}</h2>
          <button type="button" onClick={() => setFormOpen(false)} aria-label="Close form" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} autoComplete="name" /></label>
          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} autoComplete="email" /></label>
          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">Role<select value={role} onChange={(event) => setRole(event.target.value as Role)} className={fieldClass}>{availableRoles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">Branch<select required value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={user?.role !== 'ADMIN'} className={fieldClass}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">{editing ? 'Reset password (optional)' : 'Initial password'}<input type="password" required={!editing} minLength={12} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} autoComplete="new-password" placeholder={editing ? 'Leave blank to keep current password' : 'At least 12 characters'} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setFormOpen(false)} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#274b38] px-4 text-sm font-medium text-white hover:bg-[#396349] disabled:opacity-60"><Check className="h-4 w-4" />{saving ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}</button>
        </div>
      </form>}

      <section className="overflow-hidden border-y border-slate-200 bg-white dark:border-white/10 dark:bg-[#202d25]">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" /><input aria-label="Search employees" placeholder="Search name, email, or branch" value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} pl-9`} /></div>
          <select aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={`${fieldClass} sm:w-52`}><option value="ALL">All roles</option>{availableRoles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f5f4ed] text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:bg-white/5 dark:text-slate-400"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">Loading team…</td></tr> : visibleUsers.map((item) => (
                <tr key={item.id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4ece2] text-sm font-semibold text-[#274b38] dark:bg-emerald-300/10 dark:text-emerald-200"><UserRound className="h-4 w-4" /></span><span className="min-w-0"><span className="block font-medium text-slate-900 dark:text-slate-100">{item.fullName}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.email}</span></span></div></td>
                  <td className="px-4 py-3.5">{roles.find((entry) => entry.value === item.role)?.label ?? item.role}</td><td className="px-4 py-3.5">{item.branch?.name ?? 'Unassigned'}</td>
                  <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.isActive ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? 'bg-emerald-600 dark:bg-emerald-300' : 'bg-slate-400'}`} />{item.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3.5"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEditUser(item)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"><Pencil className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => void toggleActive(item)} className="h-9 rounded-md px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">{item.isActive ? 'Deactivate' : 'Activate'}</button></div></td>
                </tr>
              ))}
              {!loading && visibleUsers.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No employees match your search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">Showing {visibleUsers.length} of {staff.length} employees</div>
      </section>
    </div>
  )
}

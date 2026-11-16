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
  branch: string
  active: boolean
}

const previewUsers: StaffUser[] = [
  { id: 'demo-1', fullName: 'Sample Administrator', email: 'admin@example.test', role: 'ADMIN', branch: 'All branches', active: true },
  { id: 'demo-2', fullName: 'Sample Branch Manager', email: 'manager@example.test', role: 'BRANCH_MANAGER', branch: 'Central Branch', active: true },
  { id: 'demo-3', fullName: 'Sample Accountant', email: 'accounts@example.test', role: 'ACCOUNTANT', branch: 'Central Branch', active: true },
  { id: 'demo-4', fullName: 'Sample Field Officer', email: 'field@example.test', role: 'FIELD_OFFICER', branch: 'North Branch', active: false },
]

const roles: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'FIELD_OFFICER', label: 'Field Officer' },
]

const fieldClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-white/15 dark:bg-[#1b2820] dark:text-slate-100'

export default function UserManagementPage() {
  const { user, loading } = useAuth()
  const [staff, setStaff] = React.useState(previewUsers)
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('ALL')
  const [editing, setEditing] = React.useState<StaffUser | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<Role>('FIELD_OFFICER')
  const [branch, setBranch] = React.useState('Central Branch')

  if (loading) {
    return <div aria-label="Loading user access" className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#202d25]" />
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#202d25]">
        <ShieldCheck className="mx-auto h-8 w-8 text-slate-500 dark:text-slate-400" />
        <h1 className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">Administrator access required</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">System users can only be managed by an administrator.</p>
      </div>
    )
  }

  const visibleUsers = staff.filter((item) => {
    const matchesSearch = `${item.fullName} ${item.email} ${item.branch}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (roleFilter === 'ALL' || item.role === roleFilter)
  })

  const openNewUser = () => {
    setEditing(null)
    setName('')
    setEmail('')
    setRole('FIELD_OFFICER')
    setBranch('Central Branch')
    setFormOpen(true)
  }

  const openEditUser = (item: StaffUser) => {
    setEditing(item)
    setName(item.fullName)
    setEmail(item.email)
    setRole(item.role)
    setBranch(item.branch)
    setFormOpen(true)
  }

  const saveUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextUser = { id: editing?.id ?? `preview-${Date.now()}`, fullName: name.trim(), email: email.trim(), role, branch, active: editing?.active ?? true }
    setStaff((current) => editing ? current.map((item) => item.id === editing.id ? nextUser : item) : [nextUser, ...current])
    setFormOpen(false)
  }

  const toggleActive = (id: string) => {
    setStaff((current) => current.map((item) => item.id === id ? { ...item, active: !item.active } : item))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">User management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Review staff access, roles, and branch assignments.</p>
        </div>
        <button type="button" onClick={openNewUser} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#274b38] px-4 text-sm font-medium text-white transition-colors hover:bg-[#396349] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1c2921]">
          <UserPlus className="h-4 w-4" /> Add staff user
        </button>
      </header>

      <aside className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
        <span className="font-semibold">Preview only.</span>
        <span>Sample users and changes on this page are temporary and are not saved to the system.</span>
      </aside>

      {formOpen && (
        <form onSubmit={saveUser} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#202d25]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{editing ? 'Edit staff user' : 'Add staff user'}</h2>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close form" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} autoComplete="name" /></label>
            <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} autoComplete="email" /></label>
            <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">System role<select value={role} onChange={(event) => setRole(event.target.value as Role)} className={fieldClass}>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">Branch assignment<select value={branch} onChange={(event) => setBranch(event.target.value)} className={fieldClass}><option>Central Branch</option><option>North Branch</option><option>All branches</option></select></label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">Cancel</button>
            <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#274b38] px-4 text-sm font-medium text-white hover:bg-[#396349]"><Check className="h-4 w-4" />{editing ? 'Save changes' : 'Add user'}</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#202d25]">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input aria-label="Search staff users" placeholder="Search name, email, or branch" value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} pl-9`} />
          </div>
          <select aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={`${fieldClass} sm:w-52`}>
            <option value="ALL">All roles</option>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f5f4ed] text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:bg-white/5 dark:text-slate-400">
              <tr><th className="px-4 py-3">Staff user</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {visibleUsers.map((item) => (
                <tr key={item.id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4ece2] text-sm font-semibold text-[#274b38] dark:bg-emerald-300/10 dark:text-emerald-200"><UserRound className="h-4 w-4" /></span><span className="min-w-0"><span className="block font-medium text-slate-900 dark:text-slate-100">{item.fullName}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.email}</span></span></div></td>
                  <td className="px-4 py-3.5">{roles.find((entry) => entry.value === item.role)?.label}</td>
                  <td className="px-4 py-3.5">{item.branch}</td>
                  <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.active ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${item.active ? 'bg-emerald-600 dark:bg-emerald-300' : 'bg-slate-400'}`} />{item.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3.5"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEditUser(item)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"><Pencil className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => toggleActive(item.id)} className="h-9 rounded-md px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">{item.active ? 'Deactivate' : 'Activate'}</button></div></td>
                </tr>
              ))}
              {visibleUsers.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No staff users match your search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">Showing {visibleUsers.length} of {staff.length} preview users</div>
      </section>
    </div>
  )
}

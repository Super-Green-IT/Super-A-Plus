import Link from 'next/link'
import {
  Building2,
  Package,
  Users2,
  FileSpreadsheet,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react'

export default function SettingsHubPage() {
  const sections = [
    {
      title: 'Branches & Micro Centres',
      description: 'Manage physical branches, service areas, and assigned weekly collection centres.',
      href: '/settings/branches',
      icon: Building2,
      badge: 'Active',
    },
    {
      title: 'Loan Products',
      description: 'Define flat/reducing interest rates, loan limits, repayment terms, and processing fees.',
      href: '/settings/products',
      icon: Package,
      badge: '2 Products',
    },
    {
      title: 'Users & System Roles',
      description: 'Manage staff user accounts, assign branch access, and control RBAC permissions.',
      href: '/settings/users',
      icon: Users2,
      badge: 'RBAC',
    },
    {
      title: 'Audit & Compliance Logs',
      description: 'Review immutable audit trails for loan approvals, disbursements, and payment reversals.',
      href: '/settings/audit',
      icon: Shield,
      badge: 'Security',
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
          Platform Settings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure organization branches, lending products, staff roles, and audit compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec) => {
          const Icon = sec.icon
          return (
            <Link
              key={sec.href}
              href={sec.href}
              className="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-500/40 hover:bg-slate-900 transition-all shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 group-hover:bg-emerald-600/20 group-hover:text-emerald-400 transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                    {sec.title}
                  </h2>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    {sec.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {sec.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 self-center transition-colors" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function AccountingLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-36" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 pb-2.5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Table */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function CollectionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-36" />
          </div>
        ))}
      </div>

      {/* Search */}
      <Skeleton className="h-9 w-80 rounded-md" />

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

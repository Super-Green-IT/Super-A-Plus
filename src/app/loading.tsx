import { Skeleton } from '@/components/ui/skeleton'

export default function GlobalLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 sm:w-64" />
          <Skeleton className="h-4 w-72 sm:w-96" />
        </div>
        <Skeleton className="h-9 w-36 self-start sm:self-auto rounded-md" />
      </div>

      {/* KPI Cards Skeleton Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-64 rounded-md" />
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((row) => (
          <Skeleton key={row} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

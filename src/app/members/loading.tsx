import { Skeleton } from '@/components/ui/skeleton'

export default function MembersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-44 rounded-md" />
      </div>

      {/* Table Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}

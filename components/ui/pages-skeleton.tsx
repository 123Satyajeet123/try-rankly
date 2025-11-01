import { Skeleton } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function PagesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page Performance Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>

            {/* Conversion Event Selector and Summary Metrics */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-40" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
            
            {/* Table Skeleton */}
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 p-4 border-b">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              
              {/* Table Rows */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-4 p-4 border-b">
                  {/* Page column (2 cols worth) */}
                  <div className="col-span-2 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  {/* LLM Sessions */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-12" />
                  </div>
                  {/* Platform */}
                  <div className="flex items-center justify-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-sm" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  {/* SQS */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-16" />
                  </div>
                  {/* Conversion Rate */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

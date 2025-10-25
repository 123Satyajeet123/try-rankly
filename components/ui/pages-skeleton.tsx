import { Skeleton } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function PagesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page Performance Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-80" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-18" />
              </div>
            </div>
            
            {/* Chart Area */}
            <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
            
            {/* Chart Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Top Pages Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
            
            {/* Pages Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 rounded-lg">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              
              {/* Table Rows */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                <div key={row} className="grid grid-cols-5 gap-4 p-3 border rounded-lg">
                  <div className="col-span-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4 mt-1" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Page Categories Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            
            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <Skeleton className="h-2 w-3/4 rounded-full" />
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

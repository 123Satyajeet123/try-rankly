import { Skeleton } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function PlatformSkeleton() {
  return (
    <div className="space-y-6">
      {/* Traffic Split Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-80" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
            
            {/* Total Sessions */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-20" />
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

      {/* Platform Rankings Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            
            {/* Rankings List */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Traffic Performance Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
            
            {/* Performance Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-8 gap-4 p-3 bg-muted/50 rounded-lg">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              
              {/* Table Rows */}
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-8 gap-4 p-3 border rounded-lg">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
                    <Skeleton key={col} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}


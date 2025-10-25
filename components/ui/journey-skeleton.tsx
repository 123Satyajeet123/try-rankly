import { Skeleton } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function JourneySkeleton() {
  return (
    <div className="space-y-6">
      {/* User Journey Flow Section */}
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
            
            {/* Journey Flow Diagram */}
            <div className="h-[400px] bg-muted animate-pulse rounded-lg relative">
              {/* Flow Nodes */}
              <div className="absolute top-4 left-4">
                <Skeleton className="h-12 w-24 rounded-lg" />
              </div>
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <Skeleton className="h-12 w-24 rounded-lg" />
              </div>
              <div className="absolute top-4 right-4">
                <Skeleton className="h-12 w-24 rounded-lg" />
              </div>
              <div className="absolute top-1/2 left-1/4">
                <Skeleton className="h-12 w-24 rounded-lg" />
              </div>
              <div className="absolute top-1/2 right-1/4">
                <Skeleton className="h-12 w-24 rounded-lg" />
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <Skeleton className="h-12 w-24 rounded-lg" />
              </div>
              
              {/* Flow Arrows */}
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="absolute top-16 right-1/4">
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="absolute top-1/2 left-1/3">
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="absolute top-1/2 right-1/3">
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Journey Metrics Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Journey Steps Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            
            {/* Journey Steps List */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Conversion Funnel Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72" />
            </div>
            
            {/* Funnel Steps */}
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="h-8 bg-muted rounded-full relative">
                    <Skeleton className="h-8 w-3/4 rounded-full" />
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

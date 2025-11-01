import { Skeleton } from '@/components/ui/skeleton'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'

export function JourneySkeleton() {
  return (
    <div className="space-y-4">
      {/* User Journey Flow Section */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <Skeleton className="h-7 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="text-center">
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-center">
                  <Skeleton className="h-7 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            
            {/* Journey Flow Diagram (Sankey Chart) */}
            <div className="h-[600px] bg-muted/50 animate-pulse rounded-lg" />
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

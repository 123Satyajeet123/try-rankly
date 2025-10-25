import { Skeleton } from "@/components/ui/skeleton"

export function GeoDeviceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Geographic Performance Skeleton */}
      <div className="w-full">
        <div className="bg-card rounded-lg border border-border/20 p-6">
          <div className="space-y-4">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-3">
                {/* Platform icons skeleton */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>

            {/* Map/Chart area skeleton */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="space-y-2 text-center">
                  <Skeleton className="h-8 w-8 mx-auto rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>

            {/* Country list skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-8 rounded" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Device Performance Skeleton */}
      <div className="w-full">
        <div className="bg-card rounded-lg border border-border/20 p-6">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>

            {/* Device Category Breakdown */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-muted/20 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            </div>

            {/* OS Breakdown */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-muted/20 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </div>
            </div>

            {/* Browser Breakdown */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-36" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-4 bg-muted/20 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-10" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

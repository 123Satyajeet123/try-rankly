import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/30 dark:bg-muted/20",
        className
      )}
      {...props}
    />
  )
}

// Base shimmer effect for skeleton elements
function SkeletonShimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/30 dark:bg-muted/20",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        "dark:before:via-white/5",
        className
      )}
      {...props}
    />
  )
}

// Skeleton for metric cards
function MetricCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 space-y-4", className)} {...props}>
      <div className="flex items-center justify-between">
        <SkeletonShimmer className="h-4 w-24" />
        <SkeletonShimmer className="h-4 w-4 rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonShimmer className="h-8 w-16" />
        <SkeletonShimmer className="h-3 w-20" />
      </div>
    </div>
  )
}

// Skeleton for table rows
function TableRowSkeleton({ 
  columns = 4, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { columns?: number }) {
  return (
    <div className={cn("flex items-center space-x-4 py-3", className)} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonShimmer 
          key={i} 
          className={cn(
            "h-4",
            i === 0 ? "w-8" : i === columns - 1 ? "w-16" : "w-20"
          )} 
        />
      ))}
    </div>
  )
}

// Skeleton for chart containers
function ChartSkeleton({ 
  type = "bar", 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { type?: "bar" | "line" | "donut" }) {
  if (type === "donut") {
    return (
      <div className={cn("flex items-center justify-center h-64", className)} {...props}>
        <div className="relative">
          <SkeletonShimmer className="h-32 w-32 rounded-full" />
          <SkeletonShimmer className="absolute inset-4 h-24 w-24 rounded-full bg-background" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Chart area */}
      <div className="h-48 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonShimmer 
            key={i} 
            className={cn(
              "h-4 rounded",
              type === "line" ? "w-full" : `w-${Math.floor(Math.random() * 60) + 20}`
            )} 
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex justify-center space-x-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <SkeletonShimmer className="h-3 w-3 rounded-full" />
            <SkeletonShimmer className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton for sidebar elements
function SidebarSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4 p-4", className)} {...props}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <SkeletonShimmer className="h-5 w-5 rounded" />
          <SkeletonShimmer className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}

// Skeleton for modal content
function ModalSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-6 p-6", className)} {...props}>
      {/* Header */}
      <div className="space-y-2">
        <SkeletonShimmer className="h-6 w-48" />
        <SkeletonShimmer className="h-4 w-32" />
      </div>
      
      {/* Content sections */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <SkeletonShimmer className="h-4 w-20" />
          <SkeletonShimmer className="h-20 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonShimmer className="h-4 w-24" />
          <SkeletonShimmer className="h-20 w-full" />
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonShimmer className="h-4 w-16" />
            <SkeletonShimmer className="h-8 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonShimmer, 
  MetricCardSkeleton, 
  TableRowSkeleton, 
  ChartSkeleton, 
  SidebarSkeleton, 
  ModalSkeleton 
}

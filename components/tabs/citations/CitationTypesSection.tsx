'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Info, 
  FileText, 
  Users, 
  Folder,
  Check,
  Settings,
  ChevronDown
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Citation type data
const citationTypes = [
  {
    type: 'Brand',
    percentage: 91.9,
    color: '#3b82f6', // Blue
    icon: FileText,
    description: 'Citations from brand-owned content and official sources'
  },
  {
    type: 'Earned',
    percentage: 0.7,
    color: '#8b5cf6', // Purple
    icon: Users,
    description: 'Citations earned through third-party mentions and reviews'
  },
  {
    type: 'Social',
    percentage: 7.4,
    color: '#10b981', // Green
    icon: Folder,
    description: 'Citations from social media and community platforms'
  }
]

export function CitationTypesSection() {
  const handleClick = () => {
    // Scroll to the detailed view section
    const detailSection = document.getElementById('citation-types-detail')
    if (detailSection) {
      detailSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Citation Types</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Citation breakdown over total citations in the selected period by type.
          </p>
        </div>
        
        {/* Chart Config Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              <Settings className="mr-2 h-4 w-4" />
              View Config
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Bar Chart</DropdownMenuItem>
            <DropdownMenuItem>Donut Chart</DropdownMenuItem>
            <DropdownMenuItem>List View</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
        <UnifiedCardContent className="p-3">
          <div className="space-y-4">
            {/* Click instruction */}
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Click to get detailed view
            </p>

          {/* Horizontal Bar Chart */}
          <div className="space-y-3">
            <div className="relative h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              {citationTypes.map((item, index) => {
                const Icon = item.icon
                const leftPosition = citationTypes
                  .slice(0, index)
                  .reduce((sum, prevItem) => sum + prevItem.percentage, 0)
                
                return (
                  <div
                    key={item.type}
                    className="absolute top-0 h-full flex items-center justify-center"
                    style={{
                      left: `${leftPosition}%`,
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  >
                    <div className="flex items-center gap-1 text-white">
                      <Icon className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4">
              {citationTypes.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={item.type} className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3 rounded flex items-center justify-center"
                      style={{ backgroundColor: item.color }}
                    >
                      <Check className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-xs font-medium">{item.type}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            {citationTypes.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={item.type} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <div className="text-xl font-bold" style={{ color: item.color }}>
                    {item.percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

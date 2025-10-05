'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { 
  ChevronDown, 
  Settings, 
  Download, 
  Filter,
  Info,
  Eye,
  Palette,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  MousePointer
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

// Enhanced cluster data with more realistic positioning and competition levels
const clusterData = [
  {
    id: "personalization",
    topic: "Topic 1",
    label: "Topic 1",
    status: "High Competition",
    position: { x: 150, y: 120 },
    size: { width: 180, height: 120 },
    competitionLevel: "high",
    brands: [
      { name: "Company 1", color: "#FF4B91", density: 6, citations: 45, visibilityScore: 78.2, x: 130, y: 100, size: 8 },
      { name: "Company 2", color: "#3B82F6", density: 5, citations: 38, visibilityScore: 65.4, x: 170, y: 110, size: 7 },
      { name: "Company 3", color: "#06B6D4", density: 4, citations: 28, visibilityScore: 52.1, x: 140, y: 140, size: 6 },
      { name: "Company 4", color: "#8B5CF6", density: 7, citations: 52, visibilityScore: 89.3, x: 160, y: 105, size: 9 },
      { name: "Company 5", color: "#10B981", density: 3, citations: 18, visibilityScore: 34.7, x: 120, y: 130, size: 5 }
    ]
  },
  {
    id: "conversion",
    topic: "Topic 2",
    label: "Topic 2",
    status: "Medium Competition",
    position: { x: 400, y: 200 },
    size: { width: 160, height: 100 },
    competitionLevel: "medium",
    brands: [
      { name: "Company 1", color: "#FF4B91", density: 4, citations: 32, visibilityScore: 68.5, x: 380, y: 180, size: 6 },
      { name: "Company 2", color: "#3B82F6", density: 5, citations: 41, visibilityScore: 72.1, x: 420, y: 190, size: 7 },
      { name: "Company 3", color: "#06B6D4", density: 3, citations: 22, visibilityScore: 45.8, x: 400, y: 210, size: 5 },
      { name: "Company 4", color: "#8B5CF6", density: 6, citations: 48, visibilityScore: 81.2, x: 410, y: 185, size: 8 }
    ]
  },
  {
    id: "analytics",
    topic: "Topic 3",
    label: "Topic 3",
    status: "Low Competition",
    position: { x: 250, y: 350 },
    size: { width: 140, height: 80 },
    competitionLevel: "low",
    brands: [
      { name: "Company 1", color: "#FF4B91", density: 2, citations: 15, visibilityScore: 42.3, x: 240, y: 340, size: 4 },
      { name: "Company 2", color: "#3B82F6", density: 3, citations: 28, visibilityScore: 58.7, x: 270, y: 345, size: 5 },
      { name: "Company 3", color: "#06B6D4", density: 1, citations: 8, visibilityScore: 25.4, x: 260, y: 365, size: 3 }
    ]
  },
  {
    id: "automation",
    topic: "Topic 4",
    label: "Topic 4",
    status: "High Competition",
    position: { x: 500, y: 80 },
    size: { width: 200, height: 140 },
    competitionLevel: "high",
    brands: [
      { name: "Company 1", color: "#FF4B91", density: 8, citations: 62, visibilityScore: 91.5, x: 480, y: 60, size: 10 },
      { name: "Company 2", color: "#3B82F6", density: 7, citations: 55, visibilityScore: 84.2, x: 520, y: 70, size: 9 },
      { name: "Company 3", color: "#06B6D4", density: 6, citations: 48, visibilityScore: 76.8, x: 490, y: 90, size: 8 },
      { name: "Company 4", color: "#8B5CF6", density: 5, citations: 38, visibilityScore: 69.1, x: 510, y: 95, size: 7 },
      { name: "Company 5", color: "#10B981", density: 4, citations: 29, visibilityScore: 61.3, x: 470, y: 110, size: 6 },
      { name: "Company 6", color: "#F59E0B", density: 3, citations: 22, visibilityScore: 53.7, x: 530, y: 85, size: 5 }
    ]
  },
  {
    id: "integration",
    topic: "Topic 5",
    label: "Topic 5",
    status: "Medium Competition",
    position: { x: 100, y: 300 },
    size: { width: 120, height: 90 },
    competitionLevel: "medium",
    brands: [
      { name: "Company 1", color: "#FF4B91", density: 3, citations: 24, visibilityScore: 56.2, x: 90, y: 290, size: 5 },
      { name: "Company 2", color: "#3B82F6", density: 4, citations: 31, visibilityScore: 63.8, x: 120, y: 295, size: 6 },
      { name: "Company 3", color: "#06B6D4", density: 2, citations: 16, visibilityScore: 38.9, x: 110, y: 315, size: 4 }
    ]
  }
]

function ClusterViewSection() {
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [viewMode, setViewMode] = useState("clusters")
  const [darkMode, setDarkMode] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [hoveredBrand, setHoveredBrand] = useState<{ name: string; visibilityScore: number; citations: number } | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Filter clusters based on selected topic
  const filteredClusters = selectedTopic === "all" 
    ? clusterData 
    : clusterData.filter(cluster => cluster.topic === selectedTopic)

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Topic Clusters</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Interactive visualization of topic clusters with brand positioning and competition levels.
          </p>
        </div>
          
        {/* View Controls */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                {viewMode === "clusters" ? "Cluster View" : viewMode === "list" ? "List View" : "Heatmap"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setViewMode("clusters")}>Cluster View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("list")}>List View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("heatmap")}>Heatmap</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Enhanced Control Bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Left Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filters:</span>
                </div>
                
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    <SelectItem value="Topic 1">Topic 1</SelectItem>
                    <SelectItem value="Topic 2">Topic 2</SelectItem>
                    <SelectItem value="Topic 3">Topic 3</SelectItem>
                    <SelectItem value="Topic 4">Topic 4</SelectItem>
                    <SelectItem value="Topic 5">Topic 5</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                  <label htmlFor="dark-mode" className="text-sm font-medium text-foreground">
                    Dark Mode
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="legend"
                    checked={showLegend}
                    onCheckedChange={setShowLegend}
                  />
                  <label htmlFor="legend" className="text-sm font-medium text-foreground">
                    Show Legend
                  </label>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-foreground min-w-[60px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }) }}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Move className="w-4 h-4" />
                  Pan
                </Button>
              </div>
            </div>

            {/* Interactive Cluster Map */}
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-border/60 overflow-hidden">
              <div className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground">
                <MousePointer className="w-4 h-4" />
                <span>Click clusters to expand • Drag to pan • Scroll to zoom</span>
              </div>

              <svg
                ref={svgRef}
                width="100%"
                height="500"
                className="cursor-move"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Render clusters */}
                {filteredClusters.map((cluster) => (
                  <g key={cluster.id}>
                    {/* Cluster boundary */}
                    <ellipse
                      cx={cluster.position.x}
                      cy={cluster.position.y}
                      rx={cluster.size.width / 2}
                      ry={cluster.size.height / 2}
                      fill="none"
                      stroke={cluster.competitionLevel === "high" ? "#EF4444" : cluster.competitionLevel === "medium" ? "#F59E0B" : "#10B981"}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.6"
                      className="cursor-pointer transition-all duration-200 hover:opacity-100"
                      onClick={() => setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)}
                    />

                    {/* Cluster label */}
                    <text
                      x={cluster.position.x}
                      y={cluster.position.y - cluster.size.height / 2 - 10}
                      textAnchor="middle"
                      className="text-sm font-semibold fill-foreground pointer-events-none"
                    >
                      {cluster.label}
                    </text>

                    {/* Competition status */}
                    <text
                      x={cluster.position.x}
                      y={cluster.position.y - cluster.size.height / 2 + 15}
                      textAnchor="middle"
                      className="text-xs fill-muted-foreground pointer-events-none"
                    >
                      {cluster.status}
                    </text>

                    {/* Brand dots */}
                    {cluster.brands.map((brand, index) => (
                      <circle
                        key={`${cluster.id}-${index}`}
                        cx={brand.x}
                        cy={brand.y}
                        r={brand.size}
                        fill={brand.color}
                        stroke="white"
                        strokeWidth="1"
                        className="cursor-pointer transition-all duration-200 hover:r-12"
                        onMouseEnter={() => setHoveredBrand({
                          name: brand.name,
                          visibilityScore: brand.visibilityScore,
                          citations: brand.citations
                        })}
                        onMouseLeave={() => setHoveredBrand(null)}
                        onClick={() => {
                          // Handle brand click - could open detailed view
                          console.log(`Clicked on ${brand.name} in ${cluster.label}`)
                        }}
                      />
                    ))}
                  </g>
                ))}
              </svg>

              {/* Hover tooltip */}
              {hoveredBrand && (
                <div className="absolute z-10 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none">
                  <div className="text-white font-medium text-sm">{hoveredBrand.name}</div>
                  <div className="text-white text-xs">
                    Visibility: {hoveredBrand.visibilityScore}% • Citations: {hoveredBrand.citations}
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            {showLegend && (
              <div className="flex flex-wrap items-center gap-6 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-foreground">High Competition</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-foreground">Medium Competition</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-foreground">Low Competition</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-foreground">Brand Dots</span>
                </div>
              </div>
            )}

            {/* Selected Cluster Details */}
            {selectedCluster && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClusters
                  .filter(cluster => cluster.id === selectedCluster)
                  .map(cluster => (
                    <UnifiedCard key={cluster.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">{cluster.label}</h4>
                          <Badge 
                            variant="outline"
                            className={
                              cluster.competitionLevel === "high" 
                                ? "border-red-500 text-red-500" 
                                : cluster.competitionLevel === "medium"
                                ? "border-yellow-500 text-yellow-500"
                                : "border-green-500 text-green-500"
                            }
                          >
                            {cluster.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Brands:</span>
                            <span className="text-foreground font-medium">{cluster.brands.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Total Citations:</span>
                            <span className="text-foreground font-medium">
                              {cluster.brands.reduce((sum, brand) => sum + brand.citations, 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Avg Visibility:</span>
                            <span className="text-foreground font-medium">
                              {(cluster.brands.reduce((sum, brand) => sum + brand.visibilityScore, 0) / cluster.brands.length).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </UnifiedCard>
                  ))}
              </div>
            )}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { ClusterViewSection }

'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Settings, ChevronDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Expand } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label, Pie, PieChart, Sector, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, LabelList } from 'recharts'
import { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'

// Default fallback data for Citation Share
const defaultChartData = [
  { name: 'Housr', score: 100, color: '#3B82F6', comparisonScore: 100 },
]

// Default trend data
const defaultTrendData = [
  { month: 'Jan 1', 'Housr': 100 },
  { month: 'Jan 8', 'Housr': 100 },
  { month: 'Jan 15', 'Housr': 100 },
  { month: 'Jan 22', 'Housr': 100 },
]

interface CitationShareSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

// Transform dashboard data to citation share format
const getChartDataFromDashboard = (dashboardData: any) => {
  if (!dashboardData?.metrics?.competitorsByCitation || dashboardData.metrics.competitorsByCitation.length === 0) {
    return defaultChartData
  }

  const chartData = dashboardData.metrics.competitorsByCitation.map((competitor: any, index: number) => ({
    name: competitor.name,
    score: competitor.score || 0,
    color: competitor.fill || (index === 0 ? '#3B82F6' : '#E5E7EB'),
    comparisonScore: competitor.score || 0 // For now, use same value for comparison
  }))
  
  return chartData
}

// Transform dashboard brandMetrics to rankings
const getRankingsFromDashboard = (dashboardData: any) => {
  if (!dashboardData?.metrics?.competitorsByCitation || dashboardData.metrics.competitorsByCitation.length === 0) {
    return []
  }

  const userBrandName = dashboardData.overall?.summary?.userBrand?.name || dashboardData.metrics.competitorsByCitation[0]?.name
  
  return dashboardData.metrics.competitorsByCitation
    .map((competitor: any) => ({
      rank: competitor.rank || 1,
      name: competitor.name,
      isOwner: competitor.name === userBrandName || competitor.rank === 1,
      rankChange: 0, // TODO: Calculate from historical data when available
      citationShare: competitor.score || 0,
      computedScore: competitor.score || 0
    }))
    .sort((a: any, b: any) => a.rank - b.rank)
}

// Show top 5 by default, but include owned brand if it's not in top 5
const getDisplayRankings = (filteredRankings: any[]) => {
  const top5 = filteredRankings.slice(0, 5)
  const ownedBrand = filteredRankings.find(item => item.isOwner)
  
  // If owned brand is not in top 5, replace the last item with owned brand
  if (ownedBrand && ownedBrand.rank > 5) {
    return [...top5.slice(0, 4), ownedBrand]
  }
  
  return top5
}

interface CitationShareSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
}

function CitationShareSection({ filterContext, dashboardData }: CitationShareSectionProps) {
  // Get current data from dashboard or use defaults
  const currentChartData = getChartDataFromDashboard(dashboardData)
  
  // Get rankings from dashboard data
  const allRankings = getRankingsFromDashboard(dashboardData)
  
  // Apply filtering based on filter context
  const getFilteredData = () => {
    if (!filterContext) return { chartData: currentChartData, trendData: defaultTrendData, allRankings }

    const { selectedTopics, selectedPersonas, selectedPlatforms } = filterContext
    
    let filteredChartData = [...currentChartData]
    let filteredTrendData = [...defaultTrendData]
    let filteredRankings = [...allRankings]

    // Apply topic filtering (simulate by adjusting scores)
    if (!selectedTopics.includes('All Topics')) {
      const topicMultiplier = selectedTopics.includes('Personalization') ? 1.15 : 0.85
      filteredChartData = filteredChartData.map(item => ({
        ...item,
        score: Math.round(item.score * topicMultiplier * 10) / 10,
        comparisonScore: Math.round(item.comparisonScore * topicMultiplier * 10) / 10
      }))
    }

    // Apply persona filtering (simulate by adjusting scores)
    if (!selectedPersonas.includes('All Personas')) {
      const personaMultiplier = selectedPersonas.includes('Marketing Manager') ? 1.08 : 0.92
      filteredChartData = filteredChartData.map(item => ({
        ...item,
        score: Math.round(item.score * personaMultiplier * 10) / 10,
        comparisonScore: Math.round(item.comparisonScore * personaMultiplier * 10) / 10
      }))
    }

    // Apply platform filtering (simulate by adjusting scores)
    if (!selectedPlatforms.includes('All Platforms')) {
      const platformMultiplier = selectedPlatforms.length > 3 ? 1.03 : 0.97
      filteredChartData = filteredChartData.map(item => ({
        ...item,
        score: Math.round(item.score * platformMultiplier * 10) / 10,
        comparisonScore: Math.round(item.comparisonScore * platformMultiplier * 10) / 10
      }))
    }

    // Update trend data with filtered scores (using safe division)
    filteredTrendData = filteredTrendData.map(item => {
      const safeDivide = (index: number) => {
        const filtered = filteredChartData[index]?.score || 0
        const original = currentChartData[index]?.score || 1
        return original > 0 ? filtered / original : 1
      }
      
      return {
        ...item,
        'JPMorgan Chase': Math.round((item['JPMorgan Chase'] || 0) * safeDivide(0) * 10) / 10,
        'Bank of America': Math.round((item['Bank of America'] || 0) * safeDivide(1) * 10) / 10,
        'Wells Fargo': Math.round((item['Wells Fargo'] || 0) * safeDivide(2) * 10) / 10,
        'Citibank': Math.round((item['Citibank'] || 0) * safeDivide(3) * 10) / 10,
        'US Bank': Math.round((item['US Bank'] || 0) * safeDivide(4) * 10) / 10
      }
    })

    // Update rankings based on filtered chart data scores
    filteredRankings = filteredRankings.map(item => {
      const chartItem = filteredChartData.find(d => d.name === item.name)
      const originalChartItem = currentChartData.find(d => d.name === item.name)
      const scoreMultiplier = chartItem && originalChartItem ? chartItem.score / originalChartItem.score : 1
      
      return {
        ...item,
        // Add a computed score for sorting purposes
        computedScore: Math.round((chartItem?.score || 0) * 10) / 10
      }
    }).sort((a, b) => b.computedScore - a.computedScore).map((item, index) => ({
      ...item,
      rank: index + 1
    }))

    return { chartData: filteredChartData, trendData: filteredTrendData, allRankings: filteredRankings }
  }

  const { chartData, trendData: filteredTrendData, allRankings: filteredRankings } = getFilteredData()
  const rankings = getDisplayRankings(filteredRankings)

  const [hoveredBar, setHoveredBar] = useState<{ name: string; score: string; x: number; y: number } | null>(null)
  const [chartType, setChartType] = useState('bar')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  const [activePlatform, setActivePlatform] = useState(chartData[0]?.name || 'HDFC Bank Freedom Credit Card')
  const [showExpandedRankings, setShowExpandedRankings] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Skeleton loading
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  // Auto-switch chart type based on date selection
  useEffect(() => {
    if (comparisonDate) {
      // Range mode - use line chart for trend view
      setChartType('line')
    } else {
      // Single date mode - use bar chart for brand share view
      setChartType('bar')
    }
  }, [comparisonDate])

  // Recalculate filtered data when filter context changes
  useEffect(() => {
    const { chartData: newFilteredChartData } = getFilteredData()
    if (newFilteredChartData[0]?.name !== activePlatform) {
      setActivePlatform(newFilteredChartData[0]?.name || 'JPMorgan Chase')
    }
  }, [filterContext])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const getDateLabel = () => {
    if (!selectedDate) return 'Select Date'
    return formatDate(selectedDate)
  }

  const getComparisonLabel = () => {
    if (!selectedDate || !comparisonDate) return ''
    
    const selectedTime = selectedDate.getTime()
    const comparisonTime = comparisonDate.getTime()
    const oneDay = 1000 * 60 * 60 * 24

    const daysDiff = Math.round(Math.abs((selectedTime - comparisonTime) / oneDay))
    
    if (daysDiff === 1) return 'vs Yesterday'
    if (daysDiff === 7) return 'vs Last Week'
    if (daysDiff === 30) return 'vs Last Month'
    return `vs ${formatDate(comparisonDate)}`
  }

  const showComparison = !!comparisonDate

  return (
    <SkeletonWrapper
      show={showSkeleton}
      isVisible={isVisible}
      skeleton={
        <UnifiedCardSkeleton 
          type="mixed" 
          chartType={chartType === 'line' ? 'line' : 'bar'}
          tableColumns={4}
          tableRows={5}
        />
      }
    >
      <div className="w-full">
        {/* Unified Section Container */}
        <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section - Inside the box */}
          <div className="space-y-4 mb-6">
        <div>
              <h2 className="text-foreground">Citation Share</h2>
              <p className="body-text text-muted-foreground mt-1">How often your brand is cited in AI-generated answers</p>
        </div>
        
            {/* Calendar Row */}
            <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="body-text justify-between w-32">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {getDateLabel()}
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {selectedDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="body-text w-40">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {comparisonDate ? formatDate(comparisonDate) : 'Compare with'}
                        </span>
                      </div>
                      <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
      </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={comparisonDate}
                    onSelect={setComparisonDate}
                    initialFocus
                    disabled={(date) => date >= selectedDate}
                  />
                </PopoverContent>
              </Popover>
            )}
            </div>
            </div>

        {/* Container with full-height divider */}
        <div className="relative">
          {/* Full-height vertical divider touching top and bottom */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 transform -translate-x-1/2"></div>
          
          <div className="grid grid-cols-2 gap-8">
          
          {/* Left Section: Vertical Bar Chart */}
          <div className="space-y-6 relative">
            {/* Chart Config Dropdown - Top Right of Left Split Section */}
            <div className="absolute top-0 right-0 z-50 pointer-events-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!!comparisonDate}
                    className="body-text bg-background border-border shadow-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Chart Config
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-full">
                  <DropdownMenuItem onClick={() => setChartType('bar')}>
                    Bar Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChartType('donut')}>
                    Donut Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title and Score Display */}
            <div className="space-y-2">
              <h3 className="text-foreground">Citation Share</h3>
              <div className="flex items-baseline gap-3">
                <div className="metric text-xl font-semibold text-foreground">{chartData[0]?.score || 0}%</div>
                {showComparison && (
                  <Badge variant="outline" className="caption h-5 px-2 border-green-500 text-green-500 bg-green-500/10">
                    +2.3%
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Contained Chart */}
            <div className="relative h-64 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
              {chartType === 'bar' && (
                <>
                  {/* Y-axis labels on the left */}
                  <div className="absolute left-2 top-4 bottom-3 flex flex-col justify-between caption text-muted-foreground">
                    {(() => {
                      const maxValue = Math.max(...chartData.map(d => d.score), 1) // Ensure at least 1 to avoid division by zero
                      const step = maxValue / 5
                      return [4, 3, 2, 1, 0].map(i => (
                        <span key={i}>{Math.round(i * step * 10) / 10}%</span>
                      ))
                    })()}
                  </div>
                  
                  {/* Chart bars area */}
                  <div className="ml-10 h-full flex items-end justify-between relative">
                    {chartData.map((bar) => (
                      <div 
                        key={bar.name} 
                        className="flex flex-col items-center justify-end gap-2 flex-1 relative"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setHoveredBar({
                            name: bar.name,
                            score: `${bar.score}%`,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10
                          })
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Score labels above bars - Only show when comparing */}
                        {showComparison && (
                          <div className="text-center mb-2">
                            <div className="text-sm font-medium text-foreground">{bar.score}%</div>
                            <div className="text-xs text-muted-foreground">
                              {bar.comparisonScore}%
                            </div>
                          </div>
                        )}
                        
                        {/* Bars container */}
                        <div className="flex items-end gap-1">
                          {/* Current period bar */}
                          <div 
                            className="w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                            style={{
                              height: `${(() => {
                                const maxValue = Math.max(...chartData.map(d => d.score), 1)
                                return (bar.score / maxValue) * 120
                              })()}px`,
                              minHeight: '4px',
                              backgroundColor: bar.color
                            }}
                          />

                          {/* Comparison bar - Only show when comparison is enabled */}
                          {showComparison && (
                            <div
                              className="w-4 rounded-t-sm opacity-70 transition-all duration-300 hover:opacity-90 cursor-pointer"
                              style={{
                                height: `${(() => {
                                  const maxValue = Math.max(...chartData.map(d => d.score), 1)
                                  return (bar.comparisonScore / maxValue) * 120
                                })()}px`,
                                minHeight: '2px',
                                backgroundColor: bar.color,
                                filter: 'brightness(0.7)'
                              }}
                            />
                          )}
                        </div>

                        {/* Company name below bars */}
                        <div className="w-16 h-6 flex items-center justify-center">
                          <img 
                            src={getDynamicFaviconUrl(bar.name)} 
                            alt={bar.name}
                            className="w-4 h-4 rounded-sm"
                            onError={handleFaviconError}
                          />
                        </div>
                      </div>
                    ))}

                  </div>
                </>
              )}

              {chartType === 'donut' && (
                <div className="h-full flex items-center justify-center relative">
                  <div className="w-48 h-48">
                    <PieChart width={192} height={192}>
                      {/* Current period (outer ring) */}
                      <Pie
                        data={chartData}
                        dataKey="score"
                        nameKey="name"
                        innerRadius={showComparison ? 55 : 40}
                        outerRadius={80}
                    strokeWidth={2}
                        onMouseEnter={(data, index) => {
                          setActiveIndex(index)
                          setActivePlatform(data.name)
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(-1)
                        }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke={activeIndex === index ? '#fff' : 'none'}
                            strokeWidth={activeIndex === index ? 2 : 0}
                            style={{
                              filter: activeIndex === index ? 'brightness(1.1)' : 'none'
                            }}
                          />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              const activeData = chartData[activeIndex] || chartData[0]
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-foreground"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-lg font-bold"
                                  >
                                    {activeData.score}%
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 16}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    {activeData.name}
                                  </tspan>
                                </text>
                              )
                            }
                          }}
                        />
                      </Pie>

                      {/* Comparison period (inner ring) - Only show when comparison is enabled */}
                      {showComparison && (
                        <Pie
                          data={chartData}
                          dataKey="comparisonScore"
                          nameKey="name"
                          innerRadius={25}
                          outerRadius={45}
                          strokeWidth={2}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`comparison-cell-${index}`} fill={entry.color} opacity={0.7} />
                          ))}
                        </Pie>
                      )}
                    </PieChart>
            </div>
            
                  {/* Legend */}
                  <div className="ml-4 space-y-1">
                    {chartData.map((item, index) => (
                      <div 
                        key={item.name} 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setActivePlatform(item.name)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <img
                          src={getDynamicFaviconUrl(item.name)}
                          alt={item.name}
                          className="w-4 h-4 rounded-sm"
                          onError={handleFaviconError}
                        />
                        <span className="caption text-foreground">{item.name}</span>
                        <span className="caption text-muted-foreground">
                          {showComparison ? (
                            <div className="flex flex-col">
                              <span>{item.score}%</span>
                              <span className="text-[10px] opacity-70">
                                {item.comparisonScore}%
                              </span>
                            </div>
                          ) : (
                            item.score + '%'
                          )}
                        </span>
                      </div>
                    ))}
                    
                  </div>
                </div>
              )}

              {chartType === 'line' && (
                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredTrendData}
                      margin={{
                        top: 20,
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 6)}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[20, 65]}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'hsl(var(--foreground))',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Line
                        dataKey="US Bank"
                        type="monotone"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      >
                        <LabelList
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                        />
                      </Line>
                      <Line
                        dataKey="JPMorgan Chase"
                        type="monotone"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        dataKey="Bank of America"
                        type="monotone"
                        stroke="#EF4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        dataKey="Wells Fargo"
                        type="monotone"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        dataKey="Citibank"
                        type="monotone"
                        stroke="#06B6D4"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Line Chart Legend */}
                  <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    {chartData.map((item, index) => (
                      <div 
                        key={item.name} 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setActivePlatform(item.name)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <img
                          src={getDynamicFaviconUrl(item.name)}
                          alt={item.name}
                          className="w-4 h-4 rounded-sm"
                          onError={handleFaviconError}
                        />
                        <span className="caption text-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hover Card */}
              {hoveredBar && chartType === 'bar' && (
                <div 
                  className="fixed z-50 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg pointer-events-none min-w-[200px]"
                  style={{
                    left: `${hoveredBar.x}px`,
                    top: `${hoveredBar.y}px`,
                    transform: 'translateX(-50%) translateY(-100%)'
                  }}
                >
                  {/* Platform info */}
                  <div className="space-y-1">
                    <div className="text-white font-semibold text-sm">{hoveredBar.name}</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">Current:</span>
                      <span className="text-gray-300 font-medium">{hoveredBar.score}</span>
                    </div>
                    {showComparison && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300">{getComparisonLabel()}:</span>
                        <span className="text-gray-400">
                          {(() => {
                            const platform = chartData.find(p => p.name === hoveredBar.name)
                            return platform ? `${platform.comparisonScore}%` : '0%'
                          })()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pointer */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                </div>
              )}
            </div>
          </div>

              {/* Right Section: Ranking Table */}
              <div className="space-y-6 pl-8 relative">
            <div className="space-y-2">
                  <h3 className="text-foreground">Citation Share Rank</h3>
                  <div className="text-xl font-semibold text-foreground">#{rankings.find(item => item.isOwner)?.rank || 5}</div>
            </div>

            {/* Simple Table */}
                <div className="space-y-2 pb-8 relative">
                  <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-border/60">
                        <TableHead className="caption text-muted-foreground py-2 px-3 w-auto">
                          Company
                    </TableHead>
                        <TableHead className="text-right caption text-muted-foreground py-2 px-3 w-16">
                      Citation Share
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {rankings.map((item) => (
                        <TableRow 
                          key={item.rank} 
                          className="border-border/60 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="py-3 px-3 w-auto">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getDynamicFaviconUrl(item.name)}
                                  alt={item.name}
                                  className="w-4 h-4 rounded-sm"
                                  onError={handleFaviconError}
                                />
                                <span 
                                  className="body-text font-medium" 
                                  style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                                >
                                  {item.name}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3 px-3 w-16">
                            <div className="flex items-center justify-end gap-2">
                              <span className="body-text text-foreground">
                                #{item.rank}
                              </span>
                              {showComparison && (
                                <Badge 
                                  variant="outline" 
                                  className={`caption h-4 px-1 flex items-center gap-1 ${
                                    item.rankChange > 0 
                                      ? 'border-green-500 text-green-500 bg-green-500/10' 
                                      : item.rankChange < 0
                                      ? 'border-red-500 text-red-500 bg-red-500/10'
                                      : 'border-gray-500 text-gray-500 bg-gray-500/10'
                                  }`}
                                >
                                  {item.rankChange > 0 ? (
                                    <ArrowUp className="w-3 h-3" />
                                  ) : item.rankChange < 0 ? (
                                    <ArrowDown className="w-3 h-3" />
                                  ) : (
                                    <span className="w-3 h-3 flex items-center justify-center">—</span>
                                  )}
                                  <span>{Math.abs(item.rankChange)}</span>
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Expand Button - Bottom Right */}
                <div className="absolute bottom-2 right-2">
                  <Dialog open={showExpandedRankings} onOpenChange={setShowExpandedRankings}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="body-text bg-background border-border shadow-md hover:bg-muted h-6 px-2"
                      >
                        <Expand className="mr-1 h-3 w-3" />
                        Expand
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">All Citation Share Rankings</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/60">
                              <TableHead className="caption text-muted-foreground py-2 px-3">
                                Company
                              </TableHead>
                              <TableHead className="text-right caption text-muted-foreground py-2 px-3">
                                Rank
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRankings.map((item) => (
                    <TableRow 
                                key={item.rank} 
                      className="border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={getDynamicFaviconUrl(item.name)}
                              alt={item.name}
                              className="w-4 h-4 rounded-sm"
                              onError={handleFaviconError}
                            />
                            <span 
                              className="body-text font-medium" 
                              style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                            >
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                                    <span 
                                      className="body-text font-medium" 
                                      style={{color: item.isOwner ? '#2563EB' : 'inherit'}}
                                    >
                                      #{item.rank}
                                    </span>
                                    {showComparison && (
                                      <Badge 
                                        variant="outline" 
                                        className={`caption h-4 px-1 flex items-center gap-1 ${
                                          item.rankChange > 0 
                                            ? 'border-green-500 text-green-500 bg-green-500/10' 
                                            : item.rankChange < 0
                                            ? 'border-red-500 text-red-500 bg-red-500/10'
                                            : 'border-gray-500 text-gray-500 bg-gray-500/10'
                                        }`}
                                      >
                                        {item.rankChange > 0 ? (
                                          <ArrowUp className="w-3 h-3" />
                                        ) : item.rankChange < 0 ? (
                                          <ArrowDown className="w-3 h-3" />
                                        ) : (
                                          <span className="w-3 h-3 flex items-center justify-center">—</span>
                                        )}
                                        <span>{Math.abs(item.rankChange)}</span>
                                      </Badge>
                                    )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
                    </DialogContent>
                  </Dialog>
          </div>
          </div>
        </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
    </SkeletonWrapper>
  )
}

export { CitationShareSection }

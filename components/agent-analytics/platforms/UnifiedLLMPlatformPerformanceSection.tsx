'use client'

import { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import { ModernTrendUp, ModernTrendDown } from '@/components/ui/modern-arrows'

// Function to get the domain for each LLM platform for favicon fetching
function getLLMDomain(platform: string): string {
  const platformLower = platform.toLowerCase()
  
  if (platformLower.includes('chatgpt') || platformLower.includes('openai')) {
    return 'chatgpt.com'
  }
  if (platformLower.includes('claude') || platformLower.includes('anthropic')) {
    return 'claude.ai'
  }
  if (platformLower.includes('gemini')) {
    return 'gemini.google.com'
  }
  if (platformLower.includes('perplexity')) {
    return 'perplexity.ai'
  }
  if (platformLower.includes('google')) {
    return 'google.com'
  }
  
  return 'google.com'
}

interface UnifiedLLMPlatformPerformanceSectionProps {
  realLLMData?: any
  dateRange?: string
  isLoading?: boolean
}

function UnifiedLLMPlatformPerformanceSection({ realLLMData, dateRange = '30 days', isLoading = false }: UnifiedLLMPlatformPerformanceSectionProps) {
  // Use real LLM platform performance data from GA4
  console.log('🔍 UnifiedLLMPlatformPerformanceSection received realLLMData:', realLLMData)
  const performanceDataRaw = realLLMData?.data?.llmPerformanceData || []
  console.log('🔍 LLM Performance data structure:', performanceDataRaw)
  console.log('🔍 LLM Performance data length:', performanceDataRaw.length)
  console.log('🔍 First LLM platform performance data:', performanceDataRaw[0])
  console.log('🔍 All LLM platform names:', performanceDataRaw.map(p => p.name))
  
  // Transform real GA4 LLM performance data into component format
  const performanceData = performanceDataRaw.map((platform: any, index: number) => ({
    id: index,
    name: platform.name,
    sessions: platform.sessions || 0,
    share: platform.percentage || 0,
    sessionQualityScore: calculateSessionQualityScore(platform),
    engagementScore: calculateEngagementScore(platform),
    conversionRate: platform.conversionRate || 0,
    bounceRate: platform.bounceRate || 0,
    avgSessionDuration: platform.avgSessionDuration || 0,
    pagesPerSession: platform.pagesPerSession || 0,
    newUsers: platform.newUsers || 0,
    returningUsers: platform.returningUsers || 0,
    goalCompletions: platform.goalCompletions || 0,
    color: getLLMPlatformColor(platform.name)
  }))
  
  console.log('🔍 Final transformed LLM performance data:', performanceData)
  console.log('🔍 LLM Performance data count:', performanceData.length)

  // Calculate totals for comparison
  const totalSessions = performanceData.reduce((sum: number, item: any) => sum + item.sessions, 0)

  // Helper functions
  function calculateSessionQualityScore(platform: any): number {
    // SQS = (Engagement Rate * 0.4) + (Conversion Rate * 0.3) + (Pages per Session * 0.2) + (Session Duration * 0.1)
    const engagementRate = platform.engagementRate || 0
    const conversionRate = platform.conversionRate || 0
    const pagesPerSession = platform.pagesPerSession || 0
    const avgSessionDuration = platform.avgSessionDuration || 0
    
    return Math.round(((engagementRate * 0.4) + (conversionRate * 0.3) + (pagesPerSession * 0.2) + (avgSessionDuration / 60 * 0.1)) * 100) / 100
  }

  function calculateEngagementScore(platform: any): number {
    // Engagement Score = Engagement Rate from GA4 (already in percentage)
    return Math.min(platform.engagementRate || 0, 100)
  }

  function getLLMPlatformColor(platformName: string): string {
    const colors: Record<string, string> = {
      'ChatGPT': '#00a67e',
      'Claude': '#ff6b35',
      'Gemini': '#4285f4',
      'Perplexity': '#6366f1',
      'Other LLM': '#6b7280'
    }
    return colors[platformName] || '#6b7280'
  }

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }


  // Show loading skeleton if loading
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  // Show message if no data available
  if (performanceData.length === 0) {
    return (
      <div className="w-full space-y-4">
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-1 mb-6">
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">LLM Platform Performance</h2>
              <p className="text-sm text-muted-foreground">Comprehensive performance metrics for all LLM platforms</p>
            </div>
            
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No LLM platform performance data available. Please connect your Google Analytics account and sync data.</p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">LLM Platform Performance</h2>
              <p className="text-sm text-muted-foreground">Comprehensive performance metrics for all LLM platforms</p>
            </div>
            
            {/* Summary Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Sessions:</span>
                <span className="font-semibold text-foreground">{totalSessions.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-border/50"></div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Avg Session Quality:</span>
                <span className="font-semibold text-foreground">
                  {(performanceData.reduce((sum: number, item: any) => sum + item.sessionQualityScore, 0) / performanceData.length).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Table */}
          <div className="overflow-x-auto border border-border/20 rounded-lg">
            <Table className="w-full min-w-[1200px]">
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/20">
                  <TableHead className="sticky left-0 bg-muted/20 z-10 py-2 px-3 min-w-[140px] text-left font-normal text-foreground text-xs">
                    LLM Platform
                  </TableHead>
                  <TableHead className="text-center py-2 px-3 min-w-[120px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Sessions
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total number of sessions from this LLM platform</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Share
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Percentage of total LLM sessions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2 px-3 min-w-[120px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Session Quality Score
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs space-y-2">
                              <p className="font-semibold">Session Quality Score (SQS)</p>
                              <p className="text-sm">
                                A composite metric (0-100) that evaluates session quality based on:
                              </p>
                              <ul className="text-sm space-y-1 ml-4">
                                <li>• <strong>Engagement Rate</strong> (40% weight)</li>
                                <li>• <strong>Conversion Rate</strong> (30% weight)</li>
                                <li>• <strong>Pages per Session</strong> (20% weight)</li>
                                <li>• <strong>Session Duration</strong> (10% weight)</li>
                              </ul>
                              <p className="text-xs text-muted-foreground">
                                Higher scores indicate better-performing LLM platforms
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2 px-3 min-w-[120px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Engagement
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Percentage of engaged sessions (0-100%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Conversion Rate
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Percentage of sessions that resulted in conversions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Bounce Rate
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Percentage of single-page sessions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Average Session Duration
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Average time spent per session</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Pages per Session
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Average pages viewed per session</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      New Users
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of new users</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((item: any, index: number) => {
                  const trend = item.trend || 'neutral'
                  const change = Math.abs(item.change || 0)
                  
                  return (
                    <TableRow 
                      key={item.id} 
                      className="border-border/30 hover:bg-muted/20 transition-colors duration-200"
                    >
                      {/* LLM Platform */}
                      <TableCell className="sticky left-0 bg-background z-10 py-2 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${getLLMDomain(item.name)}&sz=16`}
                            alt={`${item.name} favicon`}
                            className="w-4 h-4 rounded-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const fallback = document.createElement('div')
                              fallback.className = 'w-4 h-4 rounded-full'
                              fallback.style.backgroundColor = item.color
                              target.parentNode?.insertBefore(fallback, target)
                            }}
                          />
                          <span className="font-normal text-foreground text-xs">{item.name}</span>
                        </div>
                      </TableCell>

                      {/* Sessions */}
                      <TableCell className="text-center py-2 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-normal text-foreground text-xs">
                            {item.sessions.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            {trend === 'up' ? (
                              <ModernTrendUp className="w-3 h-3 text-green-500" />
                            ) : (
                              <ModernTrendDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-xs font-medium ${
                              trend === 'up' ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {change.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Share */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.share.toFixed(1)}%
                        </span>
                      </TableCell>

                      {/* Session Quality Score */}
                      <TableCell className="text-center py-2 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-normal text-foreground text-xs">
                            {item.sessionQualityScore.toFixed(1)}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            item.sessionQualityScore >= 70 ? 'bg-green-500' :
                            item.sessionQualityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                        </div>
                      </TableCell>

                      {/* Engagement Score */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.engagementScore.toFixed(1)}%
                        </span>
                      </TableCell>

                      {/* Conversion Rate */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.conversionRate.toFixed(2)}%
                        </span>
                      </TableCell>

                      {/* Bounce Rate */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.bounceRate.toFixed(1)}%
                        </span>
                      </TableCell>

                      {/* Avg Session Duration */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {formatDuration(item.avgSessionDuration)}
                        </span>
                      </TableCell>

                      {/* Pages per Session */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.pagesPerSession.toFixed(1)}
                        </span>
                      </TableCell>

                      {/* New Users */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.newUsers.toLocaleString()}
                        </span>
                      </TableCell>

                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { UnifiedLLMPlatformPerformanceSection }

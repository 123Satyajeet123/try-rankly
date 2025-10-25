/**
 * Pages Tab - LLM Traffic Module (Inspired by Fibr's Design)
 *
 * Shows page-level LLM traffic performance with comprehensive analytics
 */

'use client'

import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PagesSkeleton } from '@/components/ui/pages-skeleton'

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

interface PagesTabProps {
  range: Range
  realPagesData?: any
  dateRange?: string
  isLoading?: boolean
}

export function PagesTab({ range, realPagesData, dateRange = '30 days', isLoading = false }: PagesTabProps) {
  const [conversionEvents, setConversionEvents] = useState<any[]>([])
  const [selectedConversionEvent, setSelectedConversionEvent] = useState('conversions')
  const [pagesData, setPagesData] = useState(realPagesData?.data?.pages || [])
  
  // Debug: Log the data structure
  useEffect(() => {
    if (realPagesData?.data?.pages) {
      console.log('🔍 [PagesTab] Real pages data structure:', realPagesData.data)
      console.log('🔍 [PagesTab] First page data:', realPagesData.data.pages[0])
      console.log('🔍 [PagesTab] First page platformSessions:', realPagesData.data.pages[0]?.platformSessions)
    }
  }, [realPagesData])
  
  // Show skeleton if no data and not loading
  if ((!realPagesData || !realPagesData.data || !realPagesData.data.pages || realPagesData.data.pages.length === 0) && !isLoading) {
    return <PagesSkeleton />
  }

  console.log('[PagesTab] Received data:', {
    hasRealPagesData: !!realPagesData,
    dataStructure: realPagesData ? Object.keys(realPagesData) : null,
    dataDataStructure: realPagesData?.data ? Object.keys(realPagesData.data) : null,
    hasPages: realPagesData?.data?.pages ? realPagesData.data.pages.length : 0,
    pagesData: realPagesData?.data?.pages ? realPagesData.data.pages.slice(0, 2) : null
  })

  // Fetch conversion events on component mount
  useEffect(() => {
    const fetchConversionEvents = async () => {
      try {
        const response = await fetch('/api/ga4/conversion-events')
        const data = await response.json()
        if (data.success) {
          setConversionEvents(data.data.events)
        }
      } catch (error) {
        console.error('Failed to fetch conversion events:', error)
      }
    }
    fetchConversionEvents()
  }, [])

  // Fetch pages data when conversion event changes
  useEffect(() => {
    const fetchPagesData = async () => {
      if (!dateRange) return
      
      console.log('🔄 [PagesTab] Fetching pages data with conversion event:', selectedConversionEvent)
      
      try {
        const response = await fetch(`/api/ga4/pages?dateRange=${encodeURIComponent(dateRange)}&conversionEvent=${encodeURIComponent(selectedConversionEvent)}`)
        const data = await response.json()
        
        console.log('📊 [PagesTab] Pages API response:', {
          success: data.success,
          hasData: !!data.data,
          pagesCount: data.data?.pages?.length || 0,
          conversionEvent: selectedConversionEvent
        })
        
        if (data.success) {
          setPagesData(data.data.pages || [])
          console.log('✅ [PagesTab] Updated pages data:', data.data.pages?.slice(0, 2))
        } else {
          console.error('❌ [PagesTab] API error:', data.error)
        }
      } catch (error) {
        console.error('❌ [PagesTab] Failed to fetch pages data:', error)
      }
    }
    fetchPagesData()
  }, [dateRange, selectedConversionEvent])

  // If no real data, show empty state
  if (!realPagesData || !realPagesData.data?.pages || realPagesData.data.pages.length === 0) {
    return (
      <div>
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-foreground">Page Performance</h2>
                <p className="body-text text-muted-foreground mt-1">
                  No real data available. Please connect to GA4 and sync data.
                </p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  const pages = realPagesData.data?.pages || []

  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Page Performance</h2>
                <p className="text-sm text-muted-foreground">LLM traffic metrics by page</p>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Conversion Events Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Conversion Event:</span>
                  <Select value={selectedConversionEvent} onValueChange={setSelectedConversionEvent}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select conversion event" />
                    </SelectTrigger>
                    <SelectContent>
                      {conversionEvents.map((event) => (
                        <SelectItem key={event.name} value={event.name}>
                          <div className="flex items-center gap-2">
                            <span>{event.displayName}</span>
                            {event.category && (
                              <Badge variant="outline" className="text-xs">
                                {event.category}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Summary Metrics - Single Line */}
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Total Sessions <span className="text-lg font-semibold text-foreground ml-1">
                      {pagesData.reduce((sum: number, page: any) => sum + (page.sessions || 0), 0)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Session Quality <span className="text-lg font-semibold text-foreground ml-1">
                      {pagesData.length > 0 
                        ? (pagesData.reduce((sum: number, page: any) => sum + parseFloat(page.sqs || 0), 0) / pagesData.length).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
                <div className="border rounded-lg overflow-x-auto">
                  <TooltipProvider>
                    <Table className="min-w-[1710px] table-fixed">
                  {/* Table Header */}
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[320px] text-left">
                        <div className="cursor-pointer hover:bg-muted/50 p-1 rounded text-left">
                          <span className="text-xs font-medium text-muted-foreground">Page</span>
                        </div>
                      </TableHead>

                      <TableHead className="w-[150px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">LLM Sessions</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-center">
                              <p>Number of sessions from LLM providers to this page</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[140px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Platform</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>LLM platforms by session count (top 3)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[200px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Session Quality Score</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-center">
                              <p>Measures engagement depth and page value</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Content Group</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Category like Blog, Product, Pricing, Docs</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Conversion Rate</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Percentage of LLM sessions that converted</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[140px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Bounce Rate</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Single-page sessions without engagement</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[150px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Time on Page</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Average duration LLM users spend on page</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">LLM Journey</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Entry, Middle, or Exit point in LLM flow</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                    </TableRow>
                  </TableHeader>

                  {/* Table Body */}
                      <TableBody>
                        {pagesData.slice(0, 20).map((page: any, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="w-[320px] text-left align-middle">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-foreground truncate">
                              {page.title || 'Untitled Page'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              <a
                                href={page.url?.startsWith('http') ? page.url : `https://fibr.ai${page.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-500 transition-colors"
                              >
                                {page.url?.startsWith('http') ? page.url : `https://fibr.ai${page.url}`}
                              </a>
                            </div>
                          </div>
                        </TableCell>

                        {/* Each cell below is a visual metric */}
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(page.sessions || 0)}</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {page.platformSessions && Object.keys(page.platformSessions).length > 0 ? (
                              Object.entries(page.platformSessions).map(([platform, sessions]) => (
                                <div key={platform} className="flex items-center gap-1" title={`${platform}: ${sessions} sessions`}>
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${getLLMDomain(platform)}&sz=32`}
                                    alt={`${platform} favicon`}
                                    className="w-5 h-5"
                                    onError={(e) => {
                                      // Fallback to colored circle if favicon fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = document.createElement('div');
                                      fallback.className = 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold';
                                      fallback.style.backgroundColor = platform.toLowerCase() === 'chatgpt' ? '#10a37f' :
                                                                       platform.toLowerCase() === 'gemini' ? '#4285f4' :
                                                                       platform.toLowerCase() === 'claude' ? '#ff6b35' :
                                                                       platform.toLowerCase() === 'perplexity' ? '#fca5a5' :
                                                                       platform.toLowerCase() === 'google' ? '#34d399' :
                                                                       '#94a3b8';
                                      fallback.style.color = 'white';
                                      fallback.textContent = platform.charAt(0).toUpperCase();
                                      target.parentNode?.insertBefore(fallback, target);
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">{sessions as number}</span>
                                </div>
                              ))
                            ) : (
                              // Fallback to show provider if platformSessions is not available
                              page.provider && (
                                <div className="flex items-center gap-1" title={`${page.provider}: ${page.sessions} sessions`}>
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${getLLMDomain(page.provider)}&sz=32`}
                                    alt={`${page.provider} favicon`}
                                    className="w-5 h-5"
                                    onError={(e) => {
                                      // Fallback to colored circle if favicon fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = document.createElement('div');
                                      fallback.className = 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold';
                                      fallback.style.backgroundColor = page.provider.toLowerCase() === 'chatgpt' ? '#10a37f' :
                                                                       page.provider.toLowerCase() === 'gemini' ? '#4285f4' :
                                                                       page.provider.toLowerCase() === 'claude' ? '#ff6b35' :
                                                                       page.provider.toLowerCase() === 'perplexity' ? '#fca5a5' :
                                                                       page.provider.toLowerCase() === 'google' ? '#34d399' :
                                                                       '#94a3b8';
                                      fallback.style.color = 'white';
                                      fallback.textContent = page.provider.charAt(0).toUpperCase();
                                      target.parentNode?.insertBefore(fallback, target);
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">{page.sessions}</span>
                                </div>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-semibold text-primary">{Math.round(parseFloat(page.sqs || 0))}</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <Badge variant="outline" className="text-xs font-medium">
                            {page.contentGroup}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(parseFloat(page.conversionRate || 0))}%</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-destructive">{Math.round(parseFloat(page.bounce || 0))}%</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(parseFloat(page.timeOnPage || 0))}s</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-xs font-medium text-muted-foreground">{page.llmJourney}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}
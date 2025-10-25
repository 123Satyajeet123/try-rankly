'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import apiService from '@/services/api'

interface SentimentBreakdownSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string
  }
  dashboardData?: any
}

interface SentimentPrompt {
  id: string
  text: string
  queryType: string
  sentimentSplit: {
    positive: number
    negative: number
    neutral: number
    mixed?: number
  }
  totalTests: number
}

interface SentimentTopicPersonaItem {
  id: string
  name: string
  type: 'topic' | 'persona'
  sentimentSplit: {
    positive: number
    negative: number
    neutral: number
    mixed?: number
  }
  totalSentiment: number
  prompts: SentimentPrompt[]
}

interface SentimentData {
  items: SentimentTopicPersonaItem[]
  summary: {
    totalPrompts: number
    totalTopics: number
    totalPersonas: number
  }
}

export function SentimentBreakdownSection({ filterContext, dashboardData }: SentimentBreakdownSectionProps) {
  const [sortBy, setSortBy] = useState<'topics' | 'personas'>('topics')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Skeleton loading
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  // Fetch real sentiment data from the database when sortBy or selectedAnalysisId changes
  useEffect(() => {
    const fetchRealSentimentData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔍 [SentimentBreakdownSection] Fetching real sentiment data from database...')
        console.log('🔍 [SentimentBreakdownSection] Sort by:', sortBy)
        console.log('🔍 [SentimentBreakdownSection] Analysis ID:', filterContext?.selectedAnalysisId)
        
        // Use the existing sentiment breakdown API that we created earlier
        const response = await apiService.getPromptSentimentBreakdown(
          filterContext?.selectedAnalysisId,
          sortBy
        )
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Transform the API response to match our component's expected format
          const processedItems = response.data.map((item: any, index: number) => {
            // Fix the "[object Object]" issue by properly extracting the name
            let itemName = 'Unknown'
            if (typeof item.topic === 'string') {
              itemName = item.topic
            } else if (item.topic && typeof item.topic === 'object') {
              itemName = item.topic.name || item.topic.type || 'Unknown'
            }
            
            return {
              id: `${sortBy}-${index}`,
              name: itemName,
              type: sortBy as 'topic' | 'persona',
              sentimentSplit: item.sentimentSplit || {
                positive: 0,
                neutral: 0,
                negative: 0,
                mixed: 0
              },
              totalSentiment: item.totalSentiment || 0,
              prompts: (item.prompts || []).map((prompt: any, promptIndex: number) => ({
                id: prompt.id || `prompt-${index}-${promptIndex}`,
                text: prompt.text || 'Unknown prompt',
                queryType: prompt.queryType || 'Unknown',
                sentimentSplit: prompt.sentimentSplit || {
                  positive: 0,
                  neutral: 0,
                  negative: 0,
                  mixed: 0
                },
                totalTests: prompt.totalTests || 0
              }))
            }
          })
          
          const processedData = {
            items: processedItems,
            summary: {
              totalPrompts: processedItems.reduce((sum, item) => sum + item.prompts.length, 0),
              totalTopics: sortBy === 'topics' ? processedItems.length : 0,
              totalPersonas: sortBy === 'personas' ? processedItems.length : 0
            }
          }
          
          setSentimentData(processedData)
          console.log('✅ [SentimentBreakdownSection] Real sentiment data loaded from database:', processedData)
        } else {
          setSentimentData(null)
          console.log('⚠️ [SentimentBreakdownSection] No sentiment data received from database')
        }
      } catch (err) {
        console.error('❌ [SentimentBreakdownSection] Error fetching real sentiment data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data')
        setSentimentData(null)
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if we have a selectedAnalysisId
    if (filterContext?.selectedAnalysisId) {
      fetchRealSentimentData()
    }
  }, [sortBy, filterContext?.selectedAnalysisId])

  const handleSortChange = (newSortBy: 'topics' | 'personas') => {
    setSortBy(newSortBy)
  }

  const handleColumnSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const SentimentBar = ({ sentimentSplit, totalResponses }: { 
    sentimentSplit: { positive: number; negative: number; neutral: number }
    totalResponses?: number 
  }) => {
    const total = sentimentSplit.positive + sentimentSplit.negative + sentimentSplit.neutral
    const positiveWidth = (sentimentSplit.positive / total) * 100
    const negativeWidth = (sentimentSplit.negative / total) * 100
    const neutralWidth = (sentimentSplit.neutral / total) * 100

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
              <div 
                className="bg-green-500 h-full flex items-center justify-center hover:bg-green-600 transition-colors" 
                style={{ width: `${positiveWidth}%` }}
              >
                {sentimentSplit.positive > 10 && (
                  <span className="text-xs font-medium text-white">
                    {sentimentSplit.positive}%
                  </span>
                )}
              </div>
              <div 
                className="bg-red-500 h-full flex items-center justify-center hover:bg-red-600 transition-colors" 
                style={{ width: `${negativeWidth}%` }}
              >
                {sentimentSplit.negative > 10 && (
                  <span className="text-xs font-medium text-white">
                    {sentimentSplit.negative}%
                  </span>
                )}
              </div>
              <div 
                className="bg-blue-500 h-full flex items-center justify-center hover:bg-blue-600 transition-colors" 
                style={{ width: `${neutralWidth}%` }}
              >
                {sentimentSplit.neutral > 10 && (
                  <span className="text-xs font-medium text-white">
                    {sentimentSplit.neutral}%
                  </span>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg max-w-xs">
            <div className="space-y-1">
              <div className="text-white font-semibold text-sm">Sentiment Breakdown</div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Positive:</span>
                <span className="text-gray-300 font-medium">{sentimentSplit.positive}%</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Neutral:</span>
                <span className="text-gray-300 font-medium">{sentimentSplit.neutral}%</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Negative:</span>
                <span className="text-gray-300 font-medium">{sentimentSplit.negative}%</span>
              </div>
              
              {totalResponses && (
                <div className="pt-1 border-t border-neutral-600">
                  <div className="text-xs text-gray-400">
                    Total: {totalResponses} responses analyzed
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const sortData = (data: SentimentTopicPersonaItem[]) => {
    return [...data].sort((a, b) => {
      const aValue = String(a.name || '').toLowerCase()
      const bValue = String(b.name || '').toLowerCase()
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  if (error) {
    return (
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error loading sentiment data: {error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    )
  }

  return (
    <SkeletonWrapper
      show={showSkeleton || isLoading}
      isVisible={isVisible}
      skeleton={<UnifiedCardSkeleton type="table" tableColumns={4} tableRows={6} />}
    >
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4 mb-6">
            <div>
              <h2 className="text-foreground">Sentiment Breakdown</h2>
              <p className="body-text text-muted-foreground mt-1">Detailed analysis of sentiment drivers across different topics and user personas</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="body-text">
                    {sortBy === 'topics' ? 'Topics' : 'User Persona'}
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => handleSortChange('topics')}>Topics</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('personas')}>User Persona</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {sentimentData && sentimentData.items && sentimentData.items.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {sortData(sentimentData.items).map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-border/60">
                  <AccordionTrigger className="hover:bg-muted/30 transition-colors px-4 py-3">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.prompts.length} prompt{item.prompts.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <SentimentBar sentimentSplit={item.sentimentSplit} totalResponses={item.totalSentiment} />
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Positive</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Neutral</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Negative</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      {item.prompts.length > 0 ? (
                        item.prompts.map((prompt) => (
                          <div key={prompt.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/60">
                            <div className="flex-1">
                              <span className="text-sm text-foreground">{prompt.text}</span>
                            </div>
                            <div className="ml-4 w-32">
                              <SentimentBar sentimentSplit={prompt.sentimentSplit} totalResponses={prompt.totalTests} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-muted/20 rounded-lg border border-border/60 text-center">
                          <span className="text-sm text-muted-foreground">
                            No prompts available for this {sortBy === 'topics' ? 'topic' : 'persona'}
                          </span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {isLoading ? 'Loading sentiment data...' : `No sentiment data available for ${sortBy === 'topics' ? 'topics' : 'personas'}`}
            </div>
          )}
        </UnifiedCardContent>
      </UnifiedCard>
    </SkeletonWrapper>
  )
}

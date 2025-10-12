'use client'

import React, { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronDown, ChevronRight, ArrowUpDown, TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'

interface SentimentBreakdownSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

export function SentimentBreakdownSection({ filterContext, dashboardData }: SentimentBreakdownSectionProps) {
  const [sortBy, setSortBy] = useState<'topics' | 'personas'>('topics')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())

  // Skeleton loading
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  // Process dashboard data to extract sentiment breakdown
  const processTopicData = () => {
    console.log('🔍 [processTopicData] Starting...')
    console.log('🔍 [processTopicData] dashboardData:', dashboardData)
    console.log('🔍 [processTopicData] dashboardData?.metrics:', dashboardData?.metrics)
    console.log('🔍 [processTopicData] dashboardData?.metrics?.topics:', dashboardData?.metrics?.topics)
    
    if (!dashboardData?.metrics?.topics) {
      console.log('🔍 [processTopicData] No topics data found in dashboardData.metrics.topics')
      return []
    }
    
    return dashboardData.metrics.topics.map((topic: any) => {
      // Aggregate sentiment across all brands for this topic
      let aggregatedSentiment = { positive: 0, negative: 0, neutral: 0, mixed: 0 }
      
      if (topic.brandMetrics && topic.brandMetrics.length > 0) {
        topic.brandMetrics.forEach((brand: any) => {
          if (brand.sentimentBreakdown) {
            aggregatedSentiment.positive += brand.sentimentBreakdown.positive || 0
            aggregatedSentiment.negative += brand.sentimentBreakdown.negative || 0
            aggregatedSentiment.neutral += brand.sentimentBreakdown.neutral || 0
            aggregatedSentiment.mixed += brand.sentimentBreakdown.mixed || 0
          }
        })
      }
      
      const total = aggregatedSentiment.positive + aggregatedSentiment.negative + aggregatedSentiment.neutral + aggregatedSentiment.mixed
      const sentimentSplit = total > 0 ? {
        positive: Math.round((aggregatedSentiment.positive / total) * 100),
        negative: Math.round((aggregatedSentiment.negative / total) * 100),
        neutral: Math.round((aggregatedSentiment.neutral / total) * 100)
      } : { positive: 0, negative: 0, neutral: 0 }

      // For now, we'll use empty prompts array since individual prompt sentiment isn't available in the current API structure
      const prompts: any[] = []

      return {
        id: topic._id || topic.id,
        topic: topic.scopeValue || 'Unknown Topic',
        sentimentSplit,
        prompts,
        totalSentiment: total
      }
    })
  }

  const processPersonaData = () => {
    console.log('🔍 [processPersonaData] Starting...')
    console.log('🔍 [processPersonaData] dashboardData:', dashboardData)
    console.log('🔍 [processPersonaData] dashboardData?.metrics:', dashboardData?.metrics)
    console.log('🔍 [processPersonaData] dashboardData?.metrics?.personas:', dashboardData?.metrics?.personas)
    
    if (!dashboardData?.metrics?.personas) {
      console.log('🔍 [processPersonaData] No personas data found in dashboardData.metrics.personas')
      return []
    }
    
    return dashboardData.metrics.personas.map((persona: any) => {
      // Aggregate sentiment across all brands for this persona
      let aggregatedSentiment = { positive: 0, negative: 0, neutral: 0, mixed: 0 }
      
      if (persona.brandMetrics && persona.brandMetrics.length > 0) {
        persona.brandMetrics.forEach((brand: any) => {
          if (brand.sentimentBreakdown) {
            aggregatedSentiment.positive += brand.sentimentBreakdown.positive || 0
            aggregatedSentiment.negative += brand.sentimentBreakdown.negative || 0
            aggregatedSentiment.neutral += brand.sentimentBreakdown.neutral || 0
            aggregatedSentiment.mixed += brand.sentimentBreakdown.mixed || 0
          }
        })
      }
      
      const total = aggregatedSentiment.positive + aggregatedSentiment.negative + aggregatedSentiment.neutral + aggregatedSentiment.mixed
      const sentimentSplit = total > 0 ? {
        positive: Math.round((aggregatedSentiment.positive / total) * 100),
        negative: Math.round((aggregatedSentiment.negative / total) * 100),
        neutral: Math.round((aggregatedSentiment.neutral / total) * 100)
      } : { positive: 0, negative: 0, neutral: 0 }

      // For now, we'll use empty prompts array since individual prompt sentiment isn't available in the current API structure
      const prompts: any[] = []

      return {
        id: persona._id || persona.id,
        topic: persona.scopeValue || 'Unknown Persona',
        sentimentSplit,
        prompts,
        totalSentiment: total
      }
    })
  }

  const topicsData = processTopicData()
  const personasData = processPersonaData()

  // Debug logging
  console.log('🔍 [SentimentBreakdownSection] Component rendered')
  console.log('🔍 [SentimentBreakdownSection] dashboardData:', dashboardData)
  console.log('🔍 [SentimentBreakdownSection] dashboardData?.metrics:', dashboardData?.metrics)
  console.log('🔍 [SentimentBreakdownSection] dashboardData?.metrics?.topics:', dashboardData?.metrics?.topics)
  console.log('🔍 [SentimentBreakdownSection] dashboardData?.metrics?.personas:', dashboardData?.metrics?.personas)
  console.log('🔍 [SentimentBreakdownSection] topicsData:', topicsData)
  console.log('🔍 [SentimentBreakdownSection] personasData:', personasData)

  const handleSortChange = (newSortBy: 'topics' | 'personas') => {
    setSortBy(newSortBy)
    setExpandedTopics(new Set()) // Clear expanded topics when switching
  }

  const handleColumnSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const toggleExpanded = (topicId: string) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId)
    } else {
      newExpanded.add(topicId)
    }
    setExpandedTopics(newExpanded)
  }

  const SentimentBar = ({ sentimentSplit, totalResponses }: { 
    sentimentSplit: { positive: number; negative: number; neutral: number }
    totalResponses?: number 
  }) => {
    const total = sentimentSplit.positive + sentimentSplit.negative + sentimentSplit.neutral
    const positiveWidth = (sentimentSplit.positive / total) * 100
    const negativeWidth = (sentimentSplit.negative / total) * 100
    const neutralWidth = (sentimentSplit.neutral / total) * 100

    // Calculate actual counts from percentages
    const positiveCount = Math.round((sentimentSplit.positive / 100) * (totalResponses || total))
    const neutralCount = Math.round((sentimentSplit.neutral / 100) * (totalResponses || total))
    const negativeCount = Math.round((sentimentSplit.negative / 100) * (totalResponses || total))

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex h-6 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
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
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-semibold text-sm mb-2">Sentiment Breakdown</div>
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-sm">Positive:</span>
                <span className="text-sm font-medium">{sentimentSplit.positive}%</span>
                <span className="text-xs text-muted-foreground">({positiveCount} responses)</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                <Minus className="w-3 h-3 text-blue-500" />
                <span className="text-sm">Neutral:</span>
                <span className="text-sm font-medium">{sentimentSplit.neutral}%</span>
                <span className="text-xs text-muted-foreground">({neutralCount} responses)</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-sm">Negative:</span>
                <span className="text-sm font-medium">{sentimentSplit.negative}%</span>
                <span className="text-xs text-muted-foreground">({negativeCount} responses)</span>
              </div>
              
              {totalResponses && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
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

  const getCurrentData = () => {
    return sortBy === 'topics' ? topicsData : personasData
  }

  const sortData = (data: any[]) => {
    return [...data].sort((a, b) => {
      const aValue = a.topic.toLowerCase()
      const bValue = b.topic.toLowerCase()
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  return (
    <SkeletonWrapper
      show={showSkeleton}
      isVisible={isVisible}
      skeleton={<UnifiedCardSkeleton type="table" tableColumns={4} tableRows={6} />}
    >
      <UnifiedCard className="w-full">
      <UnifiedCardContent className="p-6">
        {/* Header Section */}
        <div className="space-y-4 mb-6">
          <div>
            <h2 className="text-foreground">Sentiment Breakdown</h2>
            <p className="body-text text-muted-foreground mt-1">Detailed analysis of sentiment drivers across different topics and user personas</p>
          </div>

          {/* Sort Controls */}
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

        {/* Single Table */}
        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="caption text-muted-foreground py-2 px-3">
                <Button
                  variant="ghost"
                  onClick={handleColumnSort}
                  className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {sortBy === 'topics' ? 'Topic' : 'User Persona'}
                  <ArrowUpDown className="w-3 h-3" />
                </Button>
              </TableHead>
              <TableHead className="caption text-muted-foreground py-2 px-3">Sentiment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortData(getCurrentData()).length > 0 ? (
              sortData(getCurrentData()).map((item) => (
              <React.Fragment key={item.id}>
                {/* Topic Row */}
                <TableRow className="border-border/60 hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(item.id)}
                        className="p-0 h-auto hover:bg-transparent"
                      >
                        {expandedTopics.has(item.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      <span className="font-medium text-foreground">{item.topic}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div className="w-32">
                      <SentimentBar sentimentSplit={item.sentimentSplit} totalResponses={item.totalSentiment} />
                    </div>
                    {item.totalSentiment > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.totalSentiment} total responses
                      </div>
                    )}
                    <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
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
                  </TableCell>
                </TableRow>

                {/* Expanded Prompts */}
                {expandedTopics.has(item.id) && (
                  item.prompts.length > 0 ? (
                    item.prompts.map((prompt: any) => (
                      <TableRow key={prompt.id} className="border-border/60 hover:bg-muted/20 transition-colors bg-muted/10">
                        <TableCell className="py-2 px-3 pl-12">
                          <span className="text-sm text-muted-foreground">{prompt.text}</span>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="w-32">
                            <SentimentBar sentimentSplit={prompt.sentimentSplit} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-border/60 bg-muted/10">
                      <TableCell colSpan={2} className="py-2 px-3 pl-12">
                        <span className="text-sm text-muted-foreground">Individual prompt sentiment data not available</span>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </React.Fragment>
            ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                  No sentiment data available for {sortBy === 'topics' ? 'topics' : 'personas'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </UnifiedCardContent>
    </UnifiedCard>
    </SkeletonWrapper>
  )
}

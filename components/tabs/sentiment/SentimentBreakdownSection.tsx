'use client'

import { useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react'
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
    if (!dashboardData?.topicMetrics) return []
    
    return dashboardData.topicMetrics.map((topic: any) => {
      const sentiment = topic.sentiment || { positive: 0, negative: 0, neutral: 0 }
      const total = sentiment.positive + sentiment.negative + sentiment.neutral
      const sentimentSplit = total > 0 ? {
        positive: Math.round((sentiment.positive / total) * 100),
        negative: Math.round((sentiment.negative / total) * 100),
        neutral: Math.round((sentiment.neutral / total) * 100)
      } : { positive: 0, negative: 0, neutral: 0 }

      // Get prompts for this topic
      const prompts = (topic.prompts || []).map((prompt: any) => {
        const promptSentiment = prompt.sentiment || { positive: 0, negative: 0, neutral: 0 }
        const promptTotal = promptSentiment.positive + promptSentiment.negative + promptSentiment.neutral
        const promptSplit = promptTotal > 0 ? {
          positive: Math.round((promptSentiment.positive / promptTotal) * 100),
          negative: Math.round((promptSentiment.negative / promptTotal) * 100),
          neutral: Math.round((promptSentiment.neutral / promptTotal) * 100)
        } : { positive: 0, negative: 0, neutral: 0 }

        return {
          id: prompt._id || prompt.id,
          text: prompt.promptText || prompt.text || 'Unknown prompt',
          sentimentSplit: promptSplit
        }
      })

      return {
        id: topic._id || topic.id,
        topic: topic.topicName || topic.name || 'Unknown Topic',
        sentimentSplit,
        prompts
      }
    })
  }

  const processPersonaData = () => {
    if (!dashboardData?.personaMetrics) return []
    
    return dashboardData.personaMetrics.map((persona: any) => {
      const sentiment = persona.sentiment || { positive: 0, negative: 0, neutral: 0 }
      const total = sentiment.positive + sentiment.negative + sentiment.neutral
      const sentimentSplit = total > 0 ? {
        positive: Math.round((sentiment.positive / total) * 100),
        negative: Math.round((sentiment.negative / total) * 100),
        neutral: Math.round((sentiment.neutral / total) * 100)
      } : { positive: 0, negative: 0, neutral: 0 }

      // Get prompts for this persona
      const prompts = (persona.prompts || []).map((prompt: any) => {
        const promptSentiment = prompt.sentiment || { positive: 0, negative: 0, neutral: 0 }
        const promptTotal = promptSentiment.positive + promptSentiment.negative + promptSentiment.neutral
        const promptSplit = promptTotal > 0 ? {
          positive: Math.round((promptSentiment.positive / promptTotal) * 100),
          negative: Math.round((promptSentiment.negative / promptTotal) * 100),
          neutral: Math.round((promptSentiment.neutral / promptTotal) * 100)
        } : { positive: 0, negative: 0, neutral: 0 }

        return {
          id: prompt._id || prompt.id,
          text: prompt.promptText || prompt.text || 'Unknown prompt',
          sentimentSplit: promptSplit
        }
      })

      return {
        id: persona._id || persona.id,
        topic: persona.personaName || persona.name || 'Unknown Persona',
        sentimentSplit,
        prompts
      }
    })
  }

  const topicsData = processTopicData()
  const personasData = processPersonaData()

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

  const SentimentBar = ({ sentimentSplit }: { sentimentSplit: { positive: number; negative: number; neutral: number } }) => {
    const total = sentimentSplit.positive + sentimentSplit.negative + sentimentSplit.neutral
    const positiveWidth = (sentimentSplit.positive / total) * 100
    const negativeWidth = (sentimentSplit.negative / total) * 100
    const neutralWidth = (sentimentSplit.neutral / total) * 100

    return (
      <div className="relative flex h-6 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="bg-green-500 h-full flex items-center justify-center" 
          style={{ width: `${positiveWidth}%` }}
        >
          {sentimentSplit.positive > 10 && (
            <span className="text-xs font-medium text-white">
              {sentimentSplit.positive}%
            </span>
          )}
        </div>
        <div 
          className="bg-red-500 h-full flex items-center justify-center" 
          style={{ width: `${negativeWidth}%` }}
        >
          {sentimentSplit.negative > 10 && (
            <span className="text-xs font-medium text-white">
              {sentimentSplit.negative}%
            </span>
          )}
        </div>
        <div 
          className="bg-blue-500 h-full flex items-center justify-center" 
          style={{ width: `${neutralWidth}%` }}
        >
          {sentimentSplit.neutral > 10 && (
            <span className="text-xs font-medium text-white">
              {sentimentSplit.neutral}%
            </span>
          )}
        </div>
      </div>
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
            {sortData(getCurrentData()).map((item) => (
              <>
                {/* Topic Row */}
                <TableRow key={item.id} className="border-border/60 hover:bg-muted/30 transition-colors">
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
                      <SentimentBar sentimentSplit={item.sentimentSplit} />
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Prompts */}
                {expandedTopics.has(item.id) && item.prompts.map((prompt: any) => (
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
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </UnifiedCardContent>
    </UnifiedCard>
    </SkeletonWrapper>
  )
}

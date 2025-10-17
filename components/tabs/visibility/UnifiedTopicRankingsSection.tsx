import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface UnifiedTopicRankingsSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

function UnifiedTopicRankingsSection({ filterContext, dashboardData }: UnifiedTopicRankingsSectionProps) {
  // Transform dashboard data to topic rankings format
  const getTopicRankingsFromDashboard = () => {
    console.log('🔍 [TopicRankings] Dashboard data:', dashboardData?.metrics?.topicRankings)
    console.log('🔍 [TopicRankings] Topics data:', dashboardData?.topics)
    
    if (dashboardData?.metrics?.topicRankings) {
      console.log('🔍 [TopicRankings] First topic ranking:', dashboardData.metrics.topicRankings[0])
      if (dashboardData.metrics.topicRankings[0]) {
        console.log('🔍 [TopicRankings] First topic has rankings:', dashboardData.metrics.topicRankings[0].rankings)
      }
    }

    if (!dashboardData?.metrics?.topicRankings || dashboardData.metrics.topicRankings.length === 0) {
      console.log('⚠️ [TopicRankings] No topic ranking data available')
      return []
    }

    // ✅ Use the backend-provided topic rankings structure
    return dashboardData.metrics.topicRankings
      .filter((topicRanking: any) => topicRanking.rankings && topicRanking.rankings.length > 0)
      .map((topicRanking: any) => ({
        topic: topicRanking.topic,
        rankings: topicRanking.rankings
          .sort((a: any, b: any) => a.rank - b.rank) // ✅ Ensure proper ranking order
          .slice(0, 5) // Show top 5
          .map((competitor: any) => ({
            rank: competitor.rank,
            name: competitor.name,
            isOwner: competitor.isOwner || false,
            score: competitor.score || 0 // ✅ Include score for debugging
          }))
      }))
      .filter((topic: any) => topic.rankings.length > 0) // ✅ Only topics with actual rankings
  }

  const topicData = getTopicRankingsFromDashboard()
  const hasData = topicData.length > 0
  
  // ✅ Debug logging
  console.log('📊 [TopicRankings] Processed topic data:', topicData)
  console.log('📊 [TopicRankings] Has data:', hasData)
  
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  return (
    <SkeletonWrapper
      show={showSkeleton}
      isVisible={isVisible}
      skeleton={<UnifiedCardSkeleton type="table" tableColumns={3} tableRows={4} />}
    >
      <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Visibility Ranking by Topic</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your brand&apos;s visibility ranking across different topics
          </p>
        </div>
        
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Empty State */}
          {!hasData && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">No topic ranking data available</p>
                <p className="text-sm text-muted-foreground">
                  This table shows visibility rankings only for topics that have been analyzed. 
                  Select and analyze topics in the prompt designer to see rankings here.
                </p>
              </div>
            </div>
          )}

          {/* Topic Rankings Table */}
          {hasData && (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 items-center text-sm font-medium text-muted-foreground border-b border-border/60 pb-3">
              <div className="col-span-2">Topics</div>
              <div className="col-span-1 text-center">#1</div>
              <div className="col-span-1 text-center">#2</div>
              <div className="col-span-1 text-center">#3</div>
              <div className="col-span-1 text-center">#4</div>
              <div className="col-span-1 text-center">#5</div>
            </div>

            {/* Topic Rows */}
            {topicData.map((topic, index) => (
              <div key={topic.topic} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-border/30 last:border-b-0">
                {/* Topic Column */}
                <div className="col-span-2 flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                </div>

                {/* Ranking Columns */}
                {topic.rankings.slice(0, 5).map((ranking) => (
                  <div key={`${topic.topic}-${ranking.rank}`} className="col-span-1 flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-20 h-8 flex items-center justify-center rounded-full px-2 cursor-help">
                            <div className="flex items-center gap-1">
                              <img
                                src={getDynamicFaviconUrl(ranking.name)}
                                alt={ranking.name}
                                className="w-3 h-3 rounded-sm"
                                onError={handleFaviconError}
                              />
                              <span 
                                className="text-xs font-medium truncate" 
                                style={{color: ranking.isOwner ? '#2563EB' : 'inherit'}}
                              >
                                {ranking.name}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            <strong>{ranking.name}</strong><br/>
                            Visibility Score: {ranking.score}%<br/>
                            Rank: #{ranking.rank}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            ))}
          </div>
          )}
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
    </SkeletonWrapper>
  )
}

export { UnifiedTopicRankingsSection }

import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { truncateForDisplay, truncateForChart, truncateForRanking, truncateForTooltip } from '@/lib/textUtils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface UnifiedPersonaRankingsSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

function UnifiedPersonaRankingsSection({ filterContext, dashboardData }: UnifiedPersonaRankingsSectionProps) {
  // Transform dashboard data to persona rankings format
  const getPersonaRankingsFromDashboard = () => {
    console.log('🔍 [PersonaRankings] Dashboard data:', dashboardData?.metrics?.personaRankings)
    console.log('🔍 [PersonaRankings] Personas data:', dashboardData?.personas)
    console.log('🔍 [PersonaRankings] Full dashboard data:', dashboardData)

    if (!dashboardData?.metrics?.personaRankings || dashboardData.metrics.personaRankings.length === 0) {
      console.log('⚠️ [PersonaRankings] No persona ranking data available')
      return []
    }

    // ✅ Use the backend-provided persona rankings structure
    return dashboardData.metrics.personaRankings
      .filter((personaRanking: any) => personaRanking.rankings && personaRanking.rankings.length > 0)
      .map((personaRanking: any) => ({
        persona: personaRanking.persona,
        rankings: personaRanking.rankings
          .sort((a: any, b: any) => a.rank - b.rank) // ✅ Ensure proper ranking order
          .slice(0, 5) // Show top 5
          .map((competitor: any) => ({
            rank: competitor.rank,
            name: competitor.name,
            isOwner: competitor.isOwner || false,
            score: competitor.score || 0 // ✅ Include score for debugging
          }))
      }))
      .filter((persona: any) => persona.rankings.length > 0) // ✅ Only personas with actual rankings
  }

  const personaData = getPersonaRankingsFromDashboard()
  const hasData = personaData.length > 0
  
  // ✅ Debug logging
  console.log('📊 [PersonaRankings] Processed persona data:', personaData)
  console.log('📊 [PersonaRankings] Has data:', hasData)
  
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
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Visibility Ranking by User Personas</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your brand&apos;s visibility ranking across different user personas
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
                <p className="text-muted-foreground mb-2">No persona ranking data available</p>
                <p className="text-sm text-muted-foreground">
                  This table shows visibility rankings only for personas that have been analyzed. 
                  Select and analyze personas in the prompt designer to see rankings here.
                </p>
              </div>
            </div>
          )}

          {/* Persona Rankings Table */}
          {hasData && (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 items-center text-sm font-medium text-muted-foreground border-b border-border/60 pb-3">
              <div className="col-span-2">User Personas</div>
              <div className="col-span-1 text-center">#1</div>
              <div className="col-span-1 text-center">#2</div>
              <div className="col-span-1 text-center">#3</div>
              <div className="col-span-1 text-center">#4</div>
              <div className="col-span-1 text-center">#5</div>
            </div>

            {/* Persona Rows */}
            {personaData.map((persona, index) => (
              <div key={persona.persona} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-border/30 last:border-b-0">
                {/* Persona Column */}
                <div className="col-span-2 flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{persona.persona}</span>
                </div>

                {/* Ranking Columns */}
                {persona.rankings.slice(0, 5).map((ranking) => (
                  <div key={`${persona.persona}-${ranking.rank}`} className="col-span-1 flex justify-center">
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

export { UnifiedPersonaRankingsSection }


'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Settings, ChevronDown, Calendar as CalendarIcon, ArrowUp, ArrowDown, Expand, ExternalLink, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getDynamicFaviconUrl, handleFaviconError } from '../../../lib/faviconUtils'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'

interface CitationTypesDetailSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

// Platform colors mapping (favicons will be handled dynamically)
const platformColors: { [key: string]: string } = {
  'openai': '#10A37F',
  'claude': '#FF6B35',
  'perplexity': '#8B5CF6',
  'gemini': '#4285F4'
}

// Transform dashboard data to detailed citation types format
const getDetailedCitationData = (dashboardData: any) => {
  if (!dashboardData?.metrics?.competitorsByCitation || dashboardData.metrics.competitorsByCitation.length === 0) {
    console.log('⚠️ [CitationTypesDetailSection] No citation data available')
    return { brand: [], earned: [], social: [] }
  }

  console.log('✅ [CitationTypesDetailSection] Using real citation data:', dashboardData.metrics.competitorsByCitation)

  const competitors = dashboardData.metrics.competitorsByCitation
  const brandData: any[] = []
  const earnedData: any[] = []
  const socialData: any[] = []

  // Get platform-specific data from aggregated metrics
  const platformData = dashboardData.metrics?.platformMetrics || []
  
  competitors.forEach((competitor: any, index: number) => {
    const brandCitations = competitor.brandCitationsTotal || 0
    const earnedCitations = competitor.earnedCitationsTotal || 0
    const socialCitations = competitor.socialCitationsTotal || 0

    // Brand citations data
    if (brandCitations > 0) {
      const brandPlatforms = []
      const brandShares = []
      const brandRanks = []

      // ✅ Fix: Handle the raw platform data structure from database
      // Platform data now comes as raw database documents with scopeValue and brandMetrics
      platformData.forEach((platformDoc: any) => {
        const platformName = platformDoc.scopeValue
        
        // Get platform-specific citation data
        if (platformDoc.brandMetrics && platformDoc.brandMetrics.length > 0) {
          const brandMetric = platformDoc.brandMetrics.find((bm: any) => bm.brandName === competitor.name)
          if (brandMetric && brandMetric.brandCitationsTotal > 0) {
            brandPlatforms.push(platformName)
            brandShares.push({
              platform: platformName,
              percentage: Math.round((brandMetric.brandCitationsTotal / brandCitations) * 100 * 10) / 10
            })
            brandRanks.push({
              platform: platformName,
              rank: brandMetric.citationShareRank || 1
            })
          }
        }
      })

      brandData.push({
        name: competitor.name,
        type: 'Website',
        platforms: brandPlatforms,
        citationShares: brandShares,
        citationRanks: brandRanks,
        totalCitations: brandCitations,
        isOwner: index === 0,
        favicon: getDynamicFaviconUrl(competitor.name)
      })
    }

    // Earned citations data with platform-specific breakdown
    if (earnedCitations > 0) {
      const earnedPlatforms = []
      const earnedShares = []
      const earnedRanks = []

      // Process platform-specific earned citation data
      platformData.forEach((platformDoc: any) => {
        const platformName = platformDoc.scopeValue
        
        if (platformDoc.brandMetrics && platformDoc.brandMetrics.length > 0) {
          const brandMetric = platformDoc.brandMetrics.find((bm: any) => bm.brandName === competitor.name)
          if (brandMetric && brandMetric.earnedCitationsTotal > 0) {
            earnedPlatforms.push(platformName)
            earnedShares.push({
              platform: platformName,
              percentage: Math.round((brandMetric.earnedCitationsTotal / earnedCitations) * 100 * 10) / 10
            })
            earnedRanks.push({
              platform: platformName,
              rank: brandMetric.citationShareRank || 1
            })
          }
        }
      })

      earnedData.push({
        name: competitor.name,
        type: 'Blog',
        platforms: earnedPlatforms,
        citationShares: earnedShares,
        citationRanks: earnedRanks,
        totalCitations: earnedCitations,
        isOwner: index === 0,
        favicon: getDynamicFaviconUrl(competitor.name)
      })
    }

    // Social citations data with platform-specific breakdown
    if (socialCitations > 0) {
      const socialPlatforms = []
      const socialShares = []
      const socialRanks = []

      // Process platform-specific social citation data
      platformData.forEach((platformDoc: any) => {
        const platformName = platformDoc.scopeValue
        
        if (platformDoc.brandMetrics && platformDoc.brandMetrics.length > 0) {
          const brandMetric = platformDoc.brandMetrics.find((bm: any) => bm.brandName === competitor.name)
          if (brandMetric && brandMetric.socialCitationsTotal > 0) {
            socialPlatforms.push(platformName)
            socialShares.push({
              platform: platformName,
              percentage: Math.round((brandMetric.socialCitationsTotal / socialCitations) * 100 * 10) / 10
            })
            socialRanks.push({
              platform: platformName,
              rank: brandMetric.citationShareRank || 1
            })
          }
        }
      })

      socialData.push({
        name: competitor.name,
        type: 'Social',
        platforms: socialPlatforms,
        citationShares: socialShares,
        citationRanks: socialRanks,
        totalCitations: socialCitations,
        isOwner: index === 0,
        favicon: getDynamicFaviconUrl(competitor.name)
      })
    }
  })

  return { brand: brandData, earned: earnedData, social: socialData }
}

export function CitationTypesDetailSection({ filterContext, dashboardData }: CitationTypesDetailSectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    brand: true,
    earned: false,
    social: false
  })
  const [expandedCitationDetails, setExpandedCitationDetails] = useState<{ [key: string]: boolean }>({})
  const [citationDetails, setCitationDetails] = useState<{ [key: string]: any[] }>({})
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<any>(null)

  // Platform favicon mapping - using Google's favicon service
  const getPlatformFavicon = (platform: string) => {
    const faviconMap: { [key: string]: string } = {
      'OpenAI': 'https://www.google.com/s2/favicons?domain=openai.com&sz=32',
      'Claude': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
      'Perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
      'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'
    };
    return faviconMap[platform] || 'https://www.google.com/s2/favicons?domain=google.com&sz=32';
  };

  // Skeleton loading
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  // Get detailed citation data
  const citationData = getDetailedCitationData(dashboardData)

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleCitationDetails = async (brandName: string, type: string) => {
    // Fetch real citation details from the API
    try {
      console.log(`📊 [CITATION DETAILS] Fetching real citations for ${brandName} - ${type}`)
      
      const response = await fetch(`http://localhost:5000/api/dashboard/citations/${encodeURIComponent(brandName)}/${encodeURIComponent(type)}`)
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ [CITATION DETAILS] Found ${result.data.details.length} real citations`)
        setSelectedCitation({
          brandName,
          type,
          details: result.data.details
        })
        setIsSheetOpen(true)
      } else {
        console.error('❌ [CITATION DETAILS] Failed to fetch:', result.message)
        // Fallback to empty state
        setSelectedCitation({
          brandName,
          type,
          details: []
        })
        setIsSheetOpen(true)
      }
    } catch (error) {
      console.error('❌ [CITATION DETAILS] Error fetching real citations:', error)
      // Fallback to empty state
      setSelectedCitation({
        brandName,
        type,
        details: []
      })
      setIsSheetOpen(true)
    }
  }

  // Mock data generation function removed - now using real data from API

  // Mock URL generation function removed - now using real URLs from database

  // Mock context generation function removed - now using real contexts from database

  const getPlatformColor = (platform: string) => {
    return platformColors[platform] || '#6B7280'
  }

  const renderCitationRow = (item: any, index: number) => (
    <TableRow key={`${item.name}-${index}`} className="border-border/60 hover:bg-muted/30 transition-colors">
      <TableCell className="py-3 px-3">
        <div className="flex items-center gap-3">
          <img 
            src={item.favicon} 
            alt={item.name}
            className="w-4 h-4 rounded-sm"
            onError={handleFaviconError}
          />
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              {item.type}
            </span>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <div className="flex items-center gap-3">
          {item.platforms.map((platform: string, idx: number) => (
            <div key={idx} className="flex items-center gap-1">
              <img 
                src={getDynamicFaviconUrl(platform, 16)} 
                alt={platform}
                className="w-4 h-4"
                onError={handleFaviconError}
              />
              <span className="text-xs capitalize">{platform}</span>
            </div>
          ))}
          {item.platforms.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <div className="flex items-center gap-3">
          {item.citationShares.map((share: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1">
              <img 
                src={getDynamicFaviconUrl(share.platform, 16)} 
                alt={share.platform}
                className="w-4 h-4"
                onError={handleFaviconError}
              />
              <span className="text-xs font-medium">{share.percentage}%</span>
            </div>
          ))}
          {item.citationShares.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <div className="flex items-center gap-3">
          {item.citationRanks.map((rank: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1">
              <img 
                src={getDynamicFaviconUrl(rank.platform, 16)} 
                alt={rank.platform}
                className="w-4 h-4"
                onError={handleFaviconError}
              />
              <span className="text-xs font-medium">#{rank.rank}</span>
            </div>
          ))}
          {item.citationRanks.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs text-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/10"
          onClick={() => toggleCitationDetails(item.name, item.type)}
        >
          View
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </TableCell>
    </TableRow>
  )


  if (showSkeleton) {
    return (
      <SkeletonWrapper show={showSkeleton} isVisible={isVisible} skeleton={<UnifiedCardSkeleton type="table" tableColumns={5} />}>
        <UnifiedCardSkeleton type="table" tableColumns={5} />
      </SkeletonWrapper>
    )
  }

  return (
    <>
    <UnifiedCard className="h-full">
      <UnifiedCardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">All Citation Types</h2>
            <Badge variant="secondary" className="text-xs">
              {citationData.brand.length + citationData.earned.length + citationData.social.length} citation types
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {getDateLabel()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-3 font-semibold">Citation Type</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Platform(s)</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Citation Share</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Citation Rank</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Subjective Impression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Brand Section */}
              <TableRow className="border-b-2 border-border/60">
                <TableCell colSpan={5} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('brand')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.brand ? 'rotate-90' : ''}`} />
                      Brand
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
              
              {expandedSections.brand && citationData.brand.map((item, index) => renderCitationRow(item, index))}
              {expandedSections.brand && citationData.brand.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No brand citations found
                  </TableCell>
                </TableRow>
              )}

              {/* Earned Section */}
              <TableRow className="border-b-2 border-border/60">
                <TableCell colSpan={5} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('earned')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.earned ? 'rotate-90' : ''}`} />
                      Earned
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
              
              {expandedSections.earned && citationData.earned.map((item, index) => renderCitationRow(item, index))}
              {expandedSections.earned && citationData.earned.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No earned citations found
                  </TableCell>
                </TableRow>
              )}

              {/* Social Section */}
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('social')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.social ? 'rotate-90' : ''}`} />
                      Social
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
              
              {expandedSections.social && citationData.social.map((item, index) => renderCitationRow(item, index))}
              {expandedSections.social && citationData.social.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No social citations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </UnifiedCardContent>
    </UnifiedCard>

    {/* Citation Details Sheet */}
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent className="!w-[80vw] sm:!w-[75vw] lg:!w-[70vw] !max-w-none overflow-y-auto">
        <SheetHeader>
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Citation Details
              </SheetTitle>
              <SheetDescription>
                Detailed citations for: <span className="font-semibold">{selectedCitation?.brandName}</span>
                {selectedCitation?.type && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {selectedCitation.type}
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {selectedCitation && (() => {
          console.log('🔍 [DEBUG] Citation data structure:', selectedCitation);
          return (
          <div className="mt-4 space-y-3">
            {/* Citation overview - more compact */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm mb-1">Citation Overview</h4>
              <p className="text-xs text-muted-foreground">
                {selectedCitation.details.length} citation{selectedCitation.details.length !== 1 ? 's' : ''} found across {new Set(selectedCitation.details.flatMap((d: any) => d.platforms || [])).size} platform{new Set(selectedCitation.details.flatMap((d: any) => d.platforms || [])).size !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Citations list - grouped by URL */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Citations by URL</h4>
              {selectedCitation.details.map((citationGroup: any, index: number) => (
                <div key={citationGroup.url} className="p-3 bg-background/50 rounded-lg border border-border/40 hover:bg-background/80 transition-colors">
                  {/* URL and platforms in one compact header */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <a 
                        href={citationGroup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline truncate"
                        onClick={(e) => {
                          e.preventDefault()
                          window.open(citationGroup.url, '_blank')
                        }}
                      >
                        <span className="truncate">{citationGroup.url}</span>
                      </a>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {citationGroup.platforms && Array.isArray(citationGroup.platforms) ? 
                        citationGroup.platforms.map((platform: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1">
                            <img 
                              src={getPlatformFavicon(platform)} 
                              alt={platform}
                              className="w-3 h-3"
                              onError={handleFaviconError}
                            />
                            <span className="text-xs capitalize">{platform}</span>
                          </div>
                        )) : (
                          <span className="text-xs text-muted-foreground">Unknown</span>
                        )
                      }
                    </div>
                  </div>
                  
                  {/* Prompts - compact list */}
                  <div className="space-y-2">
                    {citationGroup.prompts && Array.isArray(citationGroup.prompts) ? 
                      citationGroup.prompts.map((prompt: any, promptIndex: number) => (
                      <div key={promptIndex} className="text-sm leading-relaxed pl-2 border-l-2 border-border/30">
                        {prompt.promptText}
                      </div>
                    )) : (
                      <div className="text-xs text-muted-foreground">No prompts found</div>
                    )}
                  </div>
                </div>
              ))}
              {selectedCitation.details.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No citation details available
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </SheetContent>
    </Sheet>
    </>
  )
}
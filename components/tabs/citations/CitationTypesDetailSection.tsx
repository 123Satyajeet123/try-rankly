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
    return { brand: [], earned: [], social: [] }
  }

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

    // Earned citations data (currently 0 for all brands)
    if (earnedCitations > 0) {
      earnedData.push({
        name: competitor.name,
        type: 'Blog',
        platforms: [],
        citationShares: [],
        citationRanks: [],
        totalCitations: earnedCitations,
        isOwner: index === 0,
        favicon: getDynamicFaviconUrl(competitor.name)
      })
    }

    // Social citations data (currently 0 for all brands)
    if (socialCitations > 0) {
      socialData.push({
        name: competitor.name,
        type: 'Social',
        platforms: [],
        citationShares: [],
        citationRanks: [],
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
          <div>
            <div className="font-medium text-foreground">{item.name}</div>
            <div className="text-xs text-muted-foreground">({item.type})</div>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <div className="flex items-center gap-2">
          {item.platforms.map((platform: string, idx: number) => {
            const platformColor = getPlatformColor(platform)
            return (
              <div key={idx} className="flex items-center gap-1">
                <img 
                  src={getDynamicFaviconUrl(platform, 16)} 
                  alt={platform}
                  className="w-4 h-4 rounded-sm"
                  onError={handleFaviconError}
                  style={{ border: `1px solid ${platformColor}` }}
                />
                <span className="text-xs capitalize">{platform}</span>
              </div>
            )
          })}
          {item.platforms.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <div className="space-y-1">
          {item.citationShares.map((share: any, idx: number) => {
            const platformColor = getPlatformColor(share.platform)
            return (
              <div key={idx} className="flex items-center gap-1">
                <img 
                  src={getDynamicFaviconUrl(share.platform, 16)} 
                  alt={share.platform}
                  className="w-4 h-4 rounded-sm"
                  onError={handleFaviconError}
                  style={{ border: `1px solid ${platformColor}` }}
                />
                <span className="text-xs font-medium">{share.percentage}%</span>
              </div>
            )
          })}
          {item.citationShares.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <div className="space-y-1">
          {item.citationRanks.map((rank: any, idx: number) => {
            const platformColor = getPlatformColor(rank.platform)
            return (
              <div key={idx} className="flex items-center gap-1">
                <img 
                  src={getDynamicFaviconUrl(rank.platform, 16)} 
                  alt={rank.platform}
                  className="w-4 h-4 rounded-sm"
                  onError={handleFaviconError}
                  style={{ border: `1px solid ${platformColor}` }}
                />
                <span className="text-xs font-medium">#{rank.rank}</span>
              </div>
            )
          })}
          {item.citationRanks.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3">
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          <ExternalLink className="w-3 h-3 mr-1" />
          View
        </Button>
      </TableCell>
    </TableRow>
  )

  if (showSkeleton) {
    return (
      <SkeletonWrapper show={showSkeleton} isVisible={isVisible}>
        <UnifiedCardSkeleton type="table" tableColumns={5} />
      </SkeletonWrapper>
    )
  }

  return (
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
                <TableHead className="py-3 px-3 font-semibold">Platform(s)</TableHead>
                <TableHead className="py-3 px-3 font-semibold">Citation Share</TableHead>
                <TableHead className="py-3 px-3 font-semibold">Citation Rank</TableHead>
                <TableHead className="py-3 px-3 font-semibold">Subjective Impression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Brand Section */}
              <TableRow className="border-b-2 border-border/60">
                <TableCell colSpan={5} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('brand')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.brand ? 'rotate-90' : ''}`} />
                      Brand
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {citationData.brand.length} items
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
                    className="w-full justify-between p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('earned')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.earned ? 'rotate-90' : ''}`} />
                      Earned
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {citationData.earned.length} items
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
                    className="w-full justify-between p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('social')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.social ? 'rotate-90' : ''}`} />
                      Social
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {citationData.social.length} items
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
  )
}
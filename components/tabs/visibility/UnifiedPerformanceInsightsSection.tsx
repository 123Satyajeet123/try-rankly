'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUp, 
  ArrowDown, 
  Info,
  Expand,
  ExternalLink,
  Target,
  Zap,
  Shield
} from 'lucide-react'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { truncateForDisplay, truncateForChart, truncateForRanking, truncateForTooltip } from '@/lib/textUtils'
import apiService from '@/services/api'

interface UnifiedPerformanceInsightsSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
  tabType?: string // Add tabType prop to identify which tab this is for
}

export function UnifiedPerformanceInsightsSection({ filterContext, dashboardData, tabType = 'visibility' }: UnifiedPerformanceInsightsSectionProps) {
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)
  
  // State for insights data
  const [insightsData, setInsightsData] = useState<{
    whatsWorking: any[]
    needsAttention: any[]
  }>({
    whatsWorking: [],
    needsAttention: []
  })
  const [isLoading, setIsLoading] = useState(true)

  // ✅ Use AI-powered Performance Insights from dashboard data (integrated in main flow)
  const getInsightsFromDashboard = () => {
    console.log('🔍 [PerformanceInsights] Getting AI insights from dashboard data...')
    
    // Check if AI insights are available in dashboard data
    if (dashboardData?.aiInsights?.all && dashboardData.aiInsights.all.length > 0) {
      console.log('✅ [PerformanceInsights] AI insights found in dashboard data:', dashboardData.aiInsights.all.length, 'insights')
      
      // Transform backend insights to frontend format
      const transformedInsights = dashboardData.aiInsights.all.map((insight: any) => ({
        id: insight.insightId || insight.id,
        insight: insight.title || insight.description,
        metric: insight.primaryMetric,
        impact: insight.impact?.charAt(0).toUpperCase() + insight.impact?.slice(1) || 'Medium',
        trend: insight.trend,
        value: insight.changePercent ? `${insight.changePercent > 0 ? '+' : ''}${insight.changePercent}%` : 'N/A',
        recommendation: insight.recommendation,
        category: insight.category === 'whats_working' ? 'whats_working' : 'needs_attention',
        icon: getIconFromType(insight.type || 'performance')
      }))

      return {
        whatsWorking: dashboardData.aiInsights.whatsWorking || [],
        needsAttention: dashboardData.aiInsights.needsAttention || []
      }
    }

    console.log('⚠️ [PerformanceInsights] No AI insights in dashboard data, falling back to manual generation')
    return generateInsightsFromMetrics()
  }

  // Helper function to map insight types to icons
  const getIconFromType = (type: string) => {
    switch (type) {
      case 'performance':
        return 'TrendingUp'
      case 'comparison':
        return 'Target'
      case 'trend':
        return 'Zap'
      case 'opportunity':
        return 'CheckCircle'
      case 'warning':
        return 'AlertTriangle'
      default:
        return 'Info'
    }
  }

  // Fallback: Generate insights from metrics if AI insights not available
  const generateInsightsFromMetrics = () => {
    if (!dashboardData?.metrics || !dashboardData?.overall) {
      return {
        whatsWorking: [],
        needsAttention: []
      }
    }

    const insights = []
    const userBrand = dashboardData.overall?.brandMetrics?.[0] || {}
    const competitors = dashboardData.overall?.brandMetrics?.slice(1) || []
    const totalPrompts = dashboardData.overall?.totalPrompts || 0

    console.log('🔍 [PerformanceInsights] Generating fallback insights from metrics:', userBrand)

    // Quick insights based on key metrics
    if (userBrand.shareOfVoice >= 70) {
      insights.push({
        id: 'sov-dominant',
        insight: 'Dominant Share of Voice',
        metric: 'Share of Voice',
        impact: 'High',
        trend: 'up',
        value: `${userBrand.shareOfVoice}%`,
        recommendation: `Your brand dominates ${userBrand.shareOfVoice}% of all mentions. This strong presence helps establish market leadership.`,
        category: 'whats_working',
        icon: 'TrendingUp'
      })
    }

    if (userBrand.avgPosition <= 2) {
      insights.push({
        id: 'position-excellent',
        insight: 'Excellent Average Position',
        metric: 'Average Position',
        impact: 'High',
        trend: 'up',
        value: `#${userBrand.avgPosition}`,
        recommendation: `Your brand consistently appears in position ${userBrand.avgPosition}, indicating strong relevance and prominence in responses.`,
        category: 'whats_working',
        icon: 'Target'
      })
    }

    if (userBrand.citationShare === 0) {
      insights.push({
        id: 'citations-missing',
        insight: 'No Citations Generated',
        metric: 'Citation Share',
        impact: 'High',
        trend: 'down',
        value: '0%',
        recommendation: `Your brand has no citations yet. Focus on creating authoritative content and improving brand credibility to generate citations.`,
        category: 'needs_attention',
        icon: 'AlertTriangle'
      })
    }

    if (totalPrompts < 5) {
      insights.push({
        id: 'data-limited',
        insight: 'Limited Data for Analysis',
        metric: 'Data Volume',
        impact: 'Medium',
        trend: 'down',
        value: `${totalPrompts} prompts`,
        recommendation: `Only ${totalPrompts} prompts have been analyzed. Run more prompt tests to get more reliable insights and better competitive analysis.`,
        category: 'needs_attention',
        icon: 'AlertTriangle'
      })
    }

    return {
      whatsWorking: insights.filter(insight => insight.category === 'whats_working'),
      needsAttention: insights.filter(insight => insight.category === 'needs_attention')
    }
  }

  // Get insights data from dashboard and fetch tab-specific insights
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true)
      try {
        const urlAnalysisId = dashboardData?.currentUrlAnalysisId || dashboardData?.meta?.currentUrlAnalysisId
        // First try to get insights from dashboard data
        const dashboardInsights = getInsightsFromDashboard()
        if (dashboardInsights.whatsWorking.length > 0 || dashboardInsights.needsAttention.length > 0) {
          setInsightsData(dashboardInsights)
          console.log('✅ [PerformanceInsights] Insights loaded from dashboard:', dashboardInsights.whatsWorking.length, 'working,', dashboardInsights.needsAttention.length, 'attention')
        } else {
          // If no dashboard insights, try to get existing insights from database first
          console.log(`🔄 [PerformanceInsights] Fetching existing insights for ${tabType}...`)
          try {
            // First try to get existing insights from database
            const existingResponse = await apiService.getInsightsForTab(tabType, urlAnalysisId)
            if (existingResponse.success && existingResponse.data) {
              setInsightsData(existingResponse.data)
              console.log('✅ [PerformanceInsights] Existing insights loaded from database:', existingResponse.data.whatsWorking?.length || 0, 'working,', existingResponse.data.needsAttention?.length || 0, 'attention')
            } else {
              // If no existing insights, generate new ones
              console.log(`🔄 [PerformanceInsights] No existing insights found, generating new ones for ${tabType}...`)
              const response = await apiService.generateInsightsForTab(tabType, urlAnalysisId)
              if (response.success && response.data) {
                setInsightsData(response.data)
                console.log('✅ [PerformanceInsights] New insights generated:', response.data.whatsWorking?.length || 0, 'working,', response.data.needsAttention?.length || 0, 'attention')
              } else {
                throw new Error('Failed to generate new insights')
              }
            }
          } catch (apiError) {
            console.error('❌ [PerformanceInsights] Failed to fetch insights:', apiError)
            // Fallback to manual generation
            const fallbackData = generateInsightsFromMetrics()
            setInsightsData(fallbackData)
          }
        }
      } catch (error) {
        console.error('Error loading insights:', error)
        // Fallback to manual generation
        const fallbackData = generateInsightsFromMetrics()
        setInsightsData(fallbackData)
      } finally {
        setIsLoading(false)
      }
    }

    loadInsights()
  }, [dashboardData]) // Re-calculate when dashboard data changes

  const { whatsWorking, needsAttention } = insightsData
  const hasData = whatsWorking.length > 0 || needsAttention.length > 0

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3 text-green-500" />
      case 'down':
        return <ArrowDown className="w-3 h-3 text-red-500" />
      default:
        return <div className="w-3 h-3 text-gray-400">-</div>
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'CheckCircle':
        return <CheckCircle className="w-4 h-4" />
      case 'TrendingUp':
        return <TrendingUp className="w-4 h-4" />
      case 'Target':
        return <Target className="w-4 h-4" />
      case 'Zap':
        return <Zap className="w-4 h-4" />
      case 'Shield':
        return <Shield className="w-4 h-4" />
      case 'AlertTriangle':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  // Show loading state while fetching insights
  if (isLoading) {
    return (
      <SkeletonWrapper
        show={true}
        isVisible={isVisible}
        skeleton={<UnifiedCardSkeleton type="table" tableColumns={3} tableRows={4} />}
      >
        <UnifiedCard>
          <UnifiedCardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-muted-foreground">Loading performance insights...</p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </SkeletonWrapper>
    )
  }

  return (
    <SkeletonWrapper
      show={showSkeleton}
      isVisible={isVisible}
      skeleton={<UnifiedCardSkeleton type="table" tableColumns={3} tableRows={4} />}
    >
      <UnifiedCard>
      <UnifiedCardContent className="p-6">
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Performance Insights</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm leading-relaxed">
                    Performance Insights provides AI-generated actionable recommendations based on your metrics. It identifies what's working well and what needs attention to help optimize your brand visibility.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="body-text text-muted-foreground mt-1">
            Actionable insights derived from your visibility metrics to guide strategic decisions
          </p>
        </div>

        <Tabs defaultValue="whats-working" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whats-working" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              What's Working
            </TabsTrigger>
            <TabsTrigger value="needs-attention" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Needs Attention
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whats-working" className="space-y-4">
            {whatsWorking.length === 0 ? (
              <div className="flex items-center justify-center py-12 border rounded-lg">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">No positive insights identified</p>
                  <p className="text-sm text-muted-foreground">
                    All current metrics indicate areas that need attention. Check the "Needs Attention" tab for specific recommendations.
                  </p>
                </div>
              </div>
            ) : (
              <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3">Insight</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-24">Metric</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-20">Impact</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-20">Value</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whatsWorking.slice(0, 5).map((item, index) => (
                    <TableRow key={item.insightId || item.title || `whats-working-${index}`} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(item.icon || 'Info')}
                          {getTrendIcon(item.trend)}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="font-medium text-sm text-foreground">{item.insight}</div>
                          <div className="text-xs text-muted-foreground">{item.recommendation}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.metric}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getImpactColor(item.impact)}`}>
                          {item.impact}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-green-600">{item.value}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              View
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getCategoryIcon(item.icon || 'Info')}
                                {item.insight}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Metric Details</h4>
                                  <div className="text-sm text-muted-foreground">
                                    <div><strong>Metric:</strong> {item.metric}</div>
                                    <div><strong>Current Value:</strong> {item.value}</div>
                                    <div><strong>Impact Level:</strong> {item.impact}</div>
                                    <div><strong>Category:</strong> {item.category}</div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Recommendation</h4>
                                  <p className="text-sm text-muted-foreground">{item.recommendation}</p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expand Button */}
            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Expand className="w-4 h-4" />
                    View All Insights
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>All "What's Working" Insights</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Insight</TableHead>
                          <TableHead className="w-24">Metric</TableHead>
                          <TableHead className="w-20">Impact</TableHead>
                          <TableHead className="w-20">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {whatsWorking.map((item, index) => (
                          <TableRow key={item.insightId || item.title || `whats-working-full-${index}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(item.icon || 'Info')}
                                {getTrendIcon(item.trend)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{item.insight}</div>
                                <div className="text-xs text-muted-foreground">{item.recommendation}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{item.metric}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${getImpactColor(item.impact)}`}>
                                {item.impact}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium text-green-600">{item.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            </>
            )}
          </TabsContent>

          <TabsContent value="needs-attention" className="space-y-4">
            {needsAttention.length === 0 ? (
              <div className="flex items-center justify-center py-12 border rounded-lg">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">No issues detected</p>
                  <p className="text-sm text-muted-foreground">
                    All current metrics are performing well. Check the "What's Working" tab for positive insights.
                  </p>
                </div>
              </div>
            ) : (
              <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3">Insight</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-24">Metric</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-20">Impact</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-20">Value</TableHead>
                    <TableHead className="caption text-muted-foreground py-2 px-3 w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsAttention.slice(0, 5).map((item, index) => (
                    <TableRow key={item.insightId || item.title || `needs-attention-${index}`} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(item.icon || 'Info')}
                          {getTrendIcon(item.trend)}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="font-medium text-sm text-foreground">{item.insight}</div>
                          <div className="text-xs text-muted-foreground">{item.recommendation}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.metric}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getImpactColor(item.impact)}`}>
                          {item.impact}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-red-600">{item.value}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              View
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getCategoryIcon(item.icon || 'Info')}
                                {item.insight}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Metric Details</h4>
                                  <div className="text-sm text-muted-foreground">
                                    <div><strong>Metric:</strong> {item.metric}</div>
                                    <div><strong>Current Value:</strong> {item.value}</div>
                                    <div><strong>Impact Level:</strong> {item.impact}</div>
                                    <div><strong>Category:</strong> {item.category}</div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Action Required</h4>
                                  <p className="text-sm text-muted-foreground">{item.recommendation}</p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Expand Button */}
            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Expand className="w-4 h-4" />
                    View All Issues
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>All "Needs Attention" Issues</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Insight</TableHead>
                          <TableHead className="w-24">Metric</TableHead>
                          <TableHead className="w-20">Impact</TableHead>
                          <TableHead className="w-20">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {needsAttention.map((item, index) => (
                          <TableRow key={item.insightId || item.title || `needs-attention-full-${index}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(item.icon || 'Info')}
                                {getTrendIcon(item.trend)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{item.insight}</div>
                                <div className="text-xs text-muted-foreground">{item.recommendation}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{item.metric}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${getImpactColor(item.impact)}`}>
                                {item.impact}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium text-red-600">{item.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            </>
            )}
          </TabsContent>
        </Tabs>
      </UnifiedCardContent>
    </UnifiedCard>
    </SkeletonWrapper>
  )
}

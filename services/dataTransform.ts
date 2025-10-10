import { DashboardData, Competitor, Metric, TopicRanking, PersonaRanking, Platform, Topic, Persona, ChartDataPoint } from '@/types/dashboard'

// Backend data types (matching the backend models)
interface BackendBrandMetric {
  brandId: string
  brandName: string
  visibilityScore: number        // NOW AVAILABLE from backend
  visibilityRank: number          // NOW AVAILABLE from backend
  totalMentions: number
  mentionRank: number
  shareOfVoice: number
  shareOfVoiceRank: number
  avgPosition: number
  avgPositionRank: number
  depthOfMention: number
  depthRank: number
  citationShare: number
  citationShareRank: number
  brandCitationsTotal: number
  earnedCitationsTotal: number
  socialCitationsTotal: number
  totalCitations: number
  sentimentScore: number
  sentimentBreakdown: {
    positive: number
    neutral: number
    negative: number
    mixed: number
  }
  sentimentShare: number
  count1st: number
  count2nd: number
  count3rd: number
  totalAppearances: number
}

interface BackendAggregatedMetrics {
  _id: string
  userId: string
  urlAnalysisId: string
  scope: 'overall' | 'platform' | 'topic' | 'persona'
  scopeValue: string
  totalResponses: number
  totalBrands: number
  brandMetrics: BackendBrandMetric[]
  dateFrom: string
  dateTo: string
  lastCalculated: string
}

interface BackendInsight {
  insightId: string
  title: string
  description: string
  category: 'whats_working' | 'needs_attention'
  type: 'trend' | 'performance' | 'comparison' | 'opportunity' | 'warning'
  primaryMetric: string
  secondaryMetrics: string[]
  currentValue: number
  previousValue: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
  impact: 'high' | 'medium' | 'low'
  confidence: number
  recommendation: string
  actionableSteps: string[]
  timeframe: string
  scope: 'overall' | 'platform' | 'topic' | 'persona'
  scopeValue: string
  icon: string
  color: string
  generatedAt: string
}

interface BackendPerformanceInsights {
  _id: string
  userId: string
  urlAnalysisId: string
  generatedAt: string
  model: string
  insights: BackendInsight[]
  summary: {
    whatsWorkingCount: number
    needsAttentionCount: number
    highImpactCount: number
    topInsight: string
    overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  }
}

interface BackendCompetitor {
  _id: string
  userId: string
  urlAnalysisId: string
  name: string
  url: string
  reason?: string
  similarity?: number
  source: 'ai' | 'user'
  selected: boolean
  createdAt: string
  updatedAt: string
}

interface BackendTopic {
  _id: string
  userId: string
  urlAnalysisId: string
  name: string
  description: string
  keywords: string[]
  priority: 'High' | 'Medium' | 'Low'
  source: 'ai' | 'user'
  selected: boolean
  createdAt: string
  updatedAt: string
}

interface BackendPersona {
  _id: string
  userId: string
  urlAnalysisId: string
  type: string
  description: string
  painPoints: string[]
  goals: string[]
  relevance: 'High' | 'Medium' | 'Low'
  source: 'ai' | 'user'
  selected: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Transform backend brand metrics to frontend competitor format
 * Can be configured for different ranking types: visibility, depth, position, etc.
 */
export function transformBrandMetricsToCompetitors(
  brandMetrics: BackendBrandMetric[],
  rankingType: 'visibility' | 'depth' | 'position' | 'shareOfVoice' | 'citation' = 'visibility'
): Competitor[] {
  const competitors = brandMetrics.map((brand, index) => {
    // Select the appropriate rank based on ranking type
    let rank: number
    let score: number
    
    switch (rankingType) {
      case 'visibility':
        rank = brand.visibilityRank || index + 1
        score = brand.visibilityScore || 0
        break
      case 'depth':
        rank = brand.depthRank || index + 1
        score = brand.depthOfMention || 0
        break
      case 'position':
        rank = brand.avgPositionRank || index + 1
        score = brand.avgPosition || 0
        break
      case 'shareOfVoice':
        rank = brand.shareOfVoiceRank || index + 1
        score = brand.shareOfVoice || 0
        break
      case 'citation':
        rank = brand.citationShareRank || index + 1
        score = brand.citationShare || 0
        break
      default:
        rank = brand.visibilityRank || index + 1
        score = brand.visibilityScore || 0
    }
    
    return {
      id: brand.brandId || (brand as any)._id?.toString() || (brand as any).id?.toString(),
      name: brand.brandName,
      logo: `/logos/${brand.brandName.toLowerCase().replace(/\s+/g, '-')}.png`,
      score,
      rank,
      change: 0, // TODO: Calculate change from previous period
      trend: 'stable' as const,
      // ✅ Include sentiment data for sentiment analysis
      sentimentScore: brand.sentimentScore,
      sentimentBreakdown: brand.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 },
      // ✅ Include citation data for citation analysis
      citationShare: brand.citationShare,
      citationRank: brand.citationShareRank,
      brandCitationsTotal: brand.brandCitationsTotal,
      earnedCitationsTotal: brand.earnedCitationsTotal,
      socialCitationsTotal: brand.socialCitationsTotal,
      totalCitations: brand.totalCitations
    }
  })
  
  // Sort by rank
  competitors.sort((a, b) => a.rank - b.rank)
  
  console.log(`📊 [Competitors-${rankingType}] Rankings:`, competitors.map(c => ({ 
    name: c.name, 
    score: c.score, 
    rank: c.rank 
  })))
  
  return competitors
}

/**
 * Transform backend brand metrics to frontend metric format
 */
export function transformBrandMetricsToMetric(
  brandMetrics: BackendBrandMetric[],
  metricType: 'visibility' | 'shareOfVoice' | 'averagePosition' | 'depthOfMention' | 'citationShare' | 'sentiment',
  totalResponses?: number
): Metric {
  console.log(`🔍 [Transform] Processing ${metricType} for ${brandMetrics.length} brands:`, brandMetrics.map(b => ({ name: b.brandName, value: getMetricValue(b, metricType, totalResponses) })))
  
  const primaryBrand = brandMetrics[0] // Assuming first brand is the primary brand
  
  // Create chart data from actual brand metrics
  const chartData: ChartDataPoint[] = brandMetrics.slice(0, 5).map((brand, index) => ({
    name: brand.brandName,
    value: getMetricValue(brand, metricType, totalResponses),
    fill: index === 0 ? '#3b82f6' : '#e5e7eb' // Primary brand in blue, others in gray
  }))
  
  console.log(`📊 [ChartData] Using actual chart data from API:`, chartData.map(d => ({ name: d.name, value: d.value })))

  const metricValue = getMetricValue(primaryBrand, metricType, totalResponses)
  console.log(`📊 [Transform] ${metricType} value for ${primaryBrand.brandName}:`, metricValue)

  return {
    id: metricType,
    title: getMetricTitle(metricType),
    description: getMetricDescription(metricType),
    value: metricValue,
    unit: getMetricUnit(metricType),
    change: 0, // TODO: Calculate change from previous period
    trend: 'stable' as const, // TODO: Calculate trend from previous period
    data: chartData
  }
}

/**
 * Get metric value from brand data
 */
function getMetricValue(brand: BackendBrandMetric, metricType: string, totalResponses?: number): number {
  switch (metricType) {
    case 'visibility':
      // ✅ Use visibilityScore directly from backend (already calculated with correct formula)
      // Backend calculates: VisibilityScore(b) = (totalAppearances / totalPrompts) × 100
      if (brand.visibilityScore !== undefined && brand.visibilityScore !== null) {
        console.log(`✅ [MetricValue] ${brand.brandName} using backend visibilityScore:`, brand.visibilityScore)
        return brand.visibilityScore
      }
      // Fallback for old data (should not happen after recalculation)
      console.log(`⚠️ [MetricValue] ${brand.brandName} visibilityScore missing, using shareOfVoice as fallback`)
      return Math.min(brand.shareOfVoice, 100)
    case 'shareOfVoice':
      return brand.shareOfVoice
    case 'averagePosition':
      return brand.avgPosition
    case 'depthOfMention':
      return brand.depthOfMention
    case 'citationShare':
      return brand.citationShare
    case 'sentiment':
      return brand.sentimentShare
    default:
      return 0
  }
}

/**
 * Get metric title
 */
function getMetricTitle(metricType: string): string {
  switch (metricType) {
    case 'visibility':
      return 'Brand Mentions'
    case 'shareOfVoice':
      return 'Share of Voice'
    case 'averagePosition':
      return 'Average Position'
    case 'depthOfMention':
      return 'Depth of Mention'
    case 'citationShare':
      return 'Citation Share'
    case 'sentiment':
      return 'Positive Sentiment'
    default:
      return 'Unknown Metric'
  }
}

/**
 * Get metric description
 */
function getMetricDescription(metricType: string): string {
  switch (metricType) {
    case 'visibility':
      return 'Total number of brand mentions across all platforms'
    case 'shareOfVoice':
      return 'Percentage of mentions compared to competitors'
    case 'averagePosition':
      return 'Average ranking position in AI responses'
    case 'depthOfMention':
      return 'Weighted mention depth based on position in responses'
    case 'citationShare':
      return 'Percentage of responses that include citations'
    case 'sentiment':
      return 'Percentage of positive sentiment mentions'
    default:
      return 'Unknown metric description'
  }
}

/**
 * Get metric unit
 */
function getMetricUnit(metricType: string): string {
  switch (metricType) {
    case 'visibility':
      return ''
    case 'shareOfVoice':
      return '%'
    case 'averagePosition':
      return ''
    case 'depthOfMention':
      return '%'
    case 'citationShare':
      return '%'
    case 'sentiment':
      return '%'
    default:
      return ''
  }
}

/**
 * Transform backend topics to frontend topic format
 */
export function transformTopicsToTopicRankings(
  topics: BackendTopic[],
  aggregatedMetrics: BackendAggregatedMetrics[]
): TopicRanking[] {
  return topics.map(topic => {
    // Find metrics for this topic
    const topicMetrics = aggregatedMetrics.find(metric => 
      metric.scope === 'topic' && metric.scopeValue === topic.name
    )
    
    // ✅ Use visibility rankings for topic rankings (most relevant metric)
    const competitors = topicMetrics?.brandMetrics
      ? transformBrandMetricsToCompetitors(topicMetrics.brandMetrics, 'visibility')
      : []

    return {
      id: topic._id,
      topic: topic.name,
      competitors
    }
  })
}

/**
 * Transform backend personas to frontend persona ranking format
 */
export function transformPersonasToPersonaRankings(
  personas: BackendPersona[],
  aggregatedMetrics: BackendAggregatedMetrics[]
): PersonaRanking[] {
  return personas.map(persona => {
    // Find metrics for this persona
    const personaMetrics = aggregatedMetrics.find(metric => 
      metric.scope === 'persona' && metric.scopeValue === persona.type
    )
    
    // ✅ Use visibility rankings for persona rankings (most relevant metric)
    const competitors = personaMetrics?.brandMetrics
      ? transformBrandMetricsToCompetitors(personaMetrics.brandMetrics, 'visibility')
      : []

    return {
      id: persona._id,
      persona: persona.type,
      competitors
    }
  })
}

/**
 * Transform backend competitors to frontend platform format
 */
export function transformCompetitorsToPlatforms(competitors: BackendCompetitor[]): Platform[] {
  return competitors.map(competitor => ({
    id: competitor._id,
    name: competitor.name,
    enabled: competitor.selected
  }))
}

/**
 * Transform backend topics to frontend topic format
 */
export function transformTopicsToTopics(topics: BackendTopic[]): Topic[] {
  return topics.map(topic => ({
    id: topic._id,
    name: topic.name,
    enabled: topic.selected
  }))
}

/**
 * Transform backend personas to frontend persona format
 */
export function transformPersonasToPersonas(personas: BackendPersona[]): Persona[] {
  return personas.map(persona => ({
    id: persona._id,
    name: persona.type,
    enabled: persona.selected
  }))
}

/**
 * Create complete competitor list including selected competitors with 0 metrics if not mentioned
 */
function createCompleteCompetitorList(
  detectedBrands: BackendBrandMetric[], 
  selectedCompetitors: BackendCompetitor[], 
  totalResponses?: number
): BackendBrandMetric[] {
  console.log('🔍 [CompleteCompetitors] Creating complete competitor list...')
  console.log('  Detected brands:', detectedBrands.map(b => b.brandName))
  console.log('  Selected competitors:', selectedCompetitors.filter(c => c.selected).map(c => c.name))
  
  const completeList: BackendBrandMetric[] = []
  
  // Add detected brands first (these have actual metrics)
  detectedBrands.forEach(brand => {
    completeList.push(brand)
  })
  
  // Add selected competitors that weren't detected (with 0 metrics)
  const detectedNames = detectedBrands.map(b => b.brandName.toLowerCase())
  const selectedNames = selectedCompetitors.filter(c => c.selected).map(c => c.name.toLowerCase())
  
  selectedNames.forEach(competitorName => {
    if (!detectedNames.includes(competitorName.toLowerCase())) {
      // Create a brand metric entry with 0 values for competitors not mentioned
      const zeroMetricBrand: BackendBrandMetric = {
        brandId: competitorName.replace(/\s+/g, '').toLowerCase(),
        brandName: selectedCompetitors.find(c => c.name.toLowerCase() === competitorName)?.name || competitorName,
        totalMentions: 0,
        mentionRank: completeList.length + 1,
        shareOfVoice: 0,
        shareOfVoiceRank: completeList.length + 1,
        avgPosition: 0,
        avgPositionRank: completeList.length + 1,
        depthOfMention: 0,
        depthRank: completeList.length + 1,
        citationShare: 0,
        citationShareRank: completeList.length + 1,
        brandCitationsTotal: 0,
        earnedCitationsTotal: 0,
        socialCitationsTotal: 0,
        totalCitations: 0,
        sentimentScore: 0,
        sentimentBreakdown: {
          positive: 0,
          neutral: 0,
          negative: 0,
          mixed: 0
        },
        sentimentShare: 0,
        count1st: 0,
        count2nd: 0,
        count3rd: 0,
        rank1st: completeList.length + 1,
        rank2nd: completeList.length + 1,
        rank3rd: completeList.length + 1,
        totalAppearances: 0
      }
      
      completeList.push(zeroMetricBrand)
      console.log(`  Added zero-metric competitor: ${zeroMetricBrand.brandName}`)
    }
  })
  
  console.log(`📊 [CompleteCompetitors] Final list:`, completeList.map(b => ({ 
    name: b.brandName, 
    mentions: b.totalMentions, 
    shareOfVoice: b.shareOfVoice 
  })))
  
  return completeList
}

/**
 * Transform backend aggregated metrics to frontend dashboard data
 */
export function transformAggregatedMetricsToDashboardData(
  overallMetrics: BackendAggregatedMetrics | null,
  platformMetrics: BackendAggregatedMetrics[],
  topicMetrics: BackendAggregatedMetrics[],
  personaMetrics: BackendAggregatedMetrics[],
  competitors: BackendCompetitor[],
  topics: BackendTopic[],
  personas: BackendPersona[]
): DashboardData {
  console.log('🔄 [dataTransform] Input parameters:')
  console.log('  - overallMetrics:', overallMetrics ? 'present' : 'null')
  console.log('  - platformMetrics:', platformMetrics?.length || 0, 'items')
  console.log('  - platformMetrics data:', platformMetrics)
  
  const brandMetrics = overallMetrics?.brandMetrics || []

  // Create a complete competitor list including selected competitors with 0 metrics if not mentioned
  const allCompetitors = createCompleteCompetitorList(brandMetrics, competitors, overallMetrics?.totalResponses)

  console.log('🔄 [dataTransform] Platform metrics being added:', platformMetrics?.length || 0, 'items')
  
  return {
    metrics: {
      visibilityScore: transformBrandMetricsToMetric(allCompetitors, 'visibility', overallMetrics?.totalResponses),
      shareOfVoice: transformBrandMetricsToMetric(allCompetitors, 'shareOfVoice'),
      averagePosition: transformBrandMetricsToMetric(allCompetitors, 'averagePosition'),
      depthOfMention: transformBrandMetricsToMetric(allCompetitors, 'depthOfMention'),
      sentiment: transformBrandMetricsToMetric(allCompetitors, 'sentiment'),
      citationShare: transformBrandMetricsToMetric(allCompetitors, 'citationShare'),
      topicRankings: transformTopicsToTopicRankings(topics, topicMetrics),
      personaRankings: transformPersonasToPersonaRankings(personas, personaMetrics),
      // ✅ Provide rankings for each metric type
      competitors: transformBrandMetricsToCompetitors(allCompetitors, 'visibility'),
      competitorsByDepth: transformBrandMetricsToCompetitors(allCompetitors, 'depth'),
      competitorsByPosition: transformBrandMetricsToCompetitors(allCompetitors, 'position'),
      competitorsBySov: transformBrandMetricsToCompetitors(allCompetitors, 'shareOfVoice'),
      competitorsByCitation: transformBrandMetricsToCompetitors(allCompetitors, 'citation'),
      // ✅ Add platform-specific metrics for detailed citation analysis
      platformMetrics: platformMetrics
    },
    filters: {
      platforms: transformCompetitorsToPlatforms(competitors),
      topics: transformTopicsToTopics(topics),
      personas: transformPersonasToPersonas(personas)
    },
    lastUpdated: new Date(overallMetrics.lastCalculated)
  }
}

/**
 * Transform backend insights to frontend format
 */
export function transformInsightsToFrontend(insights: BackendPerformanceInsights) {
  return {
    id: insights._id,
    generatedAt: new Date(insights.generatedAt),
    model: insights.model,
    insights: insights.insights.map(insight => ({
      id: insight.insightId,
      title: insight.title,
      description: insight.description,
      category: insight.category,
      type: insight.type,
      primaryMetric: insight.primaryMetric,
      secondaryMetrics: insight.secondaryMetrics,
      currentValue: insight.currentValue,
      previousValue: insight.previousValue,
      changePercent: insight.changePercent,
      trend: insight.trend,
      impact: insight.impact,
      confidence: insight.confidence,
      recommendation: insight.recommendation,
      actionableSteps: insight.actionableSteps,
      timeframe: insight.timeframe,
      scope: insight.scope,
      scopeValue: insight.scopeValue,
      icon: insight.icon,
      color: insight.color,
      generatedAt: new Date(insight.generatedAt)
    })),
    summary: insights.summary
  }
}

/**
 * Get default logo path for a brand name
 */
export function getBrandLogoPath(brandName: string): string {
  const normalizedName = brandName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  
  return `/logos/${normalizedName}.png`
}

/**
 * Calculate trend from current and previous values
 */
export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous === 0) return 'stable'
  
  const change = ((current - previous) / previous) * 100
  
  if (change > 5) return 'up'
  if (change < -5) return 'down'
  return 'stable'
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return parseFloat(((current - previous) / previous) * 100).toFixed(2)
}

/**
 * Transform backend data to filter options
 */
export function transformFilters(data: any) {
  // Get unique platforms from metrics data
  const platforms = Array.from(new Set(
    data.metrics?.platformMetrics?.map((m: any) => m.scopeValue) || []
  )).filter((platform: string) => platform && typeof platform === 'string')
   .map((platform: string) => ({
    id: platform,
    name: platform.charAt(0).toUpperCase() + platform.slice(1).replace(/-/g, ' '),
    enabled: true
  }))

  // Get unique topics from metrics data
  const topics = Array.from(new Set(
    data.metrics?.topicMetrics?.map((m: any) => m.scopeValue) || []
  )).filter((topic: string) => topic && typeof topic === 'string')
   .map((topic: string) => ({
    id: topic,
    name: topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, ' '),
    enabled: true
  }))

  // Get unique personas from metrics data
  const personas = Array.from(new Set(
    data.metrics?.personaMetrics?.map((m: any) => m.scopeValue) || []
  )).filter((persona: string) => persona && typeof persona === 'string')
   .map((persona: string) => ({
    id: persona,
    name: persona.charAt(0).toUpperCase() + persona.slice(1).replace(/-/g, ' '),
    enabled: true
  }))

  return {
    platforms,
    topics,
    personas,
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date()
    }
  }
}

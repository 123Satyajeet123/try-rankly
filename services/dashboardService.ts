import apiService from './api'
import { 
  transformAggregatedMetricsToDashboardData,
  transformInsightsToFrontend,
  transformBrandMetricsToMetric,
  transformTopicsToTopicRankings,
  transformBrandMetricsToCompetitors,
  transformFilters,
  filterAndAggregateMetrics
} from './dataTransform'
import { DashboardData } from '@/types/dashboard'

interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
  urlAnalysisId?: string
  platforms?: string[]
  topics?: string[]
  personas?: string[]
  selectedAnalysisId?: string | null
}

interface DashboardServiceResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

class DashboardService {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Clear all cached data
   */
  clearCache(): void {
    console.log('🧹 [DashboardService] Clearing all cached data')
    this.cache.clear()
  }

  /**
   * Clear cache for specific analysis
   */
  clearCacheForAnalysis(analysisId: string): void {
    const cacheKey = `dashboard-${analysisId}`
    console.log('🧹 [DashboardService] Clearing cache for analysis:', analysisId)
    this.cache.delete(cacheKey)
  }

  /**
   * Clear prompts cache for specific analysis
   */
  clearPromptsCacheForAnalysis(analysisId: string): void {
    const cacheKey = `prompts-${analysisId}`
    console.log('🧹 [DashboardService] Clearing prompts cache for analysis:', analysisId)
    this.cache.delete(cacheKey)
  }

  /**
   * Trigger insights generation for all tabs in background
   */
  private async triggerInsightsGeneration(analysisId?: string): Promise<void> {
    try {
      console.log('🧠 [DashboardService] Triggering insights generation for all tabs...')
      
      // Define all tab types that need insights
      const tabTypes = ['visibility', 'prompts', 'sentiment', 'citations']
      
      // Generate insights for each tab in parallel (non-blocking)
      const insightsPromises = tabTypes.map(async (tabType) => {
        try {
          console.log(`🧠 [DashboardService] Generating insights for ${tabType} tab...`)
          await apiService.generateInsightsForTab(tabType, analysisId)
          console.log(`✅ [DashboardService] ${tabType} insights generated successfully`)
        } catch (error) {
          console.error(`❌ [DashboardService] Failed to generate ${tabType} insights:`, error)
          // Don't throw - we want other tabs to continue processing
        }
      })
      
      // Wait for all insights to complete (but don't block dashboard loading)
      Promise.allSettled(insightsPromises).then(() => {
        console.log('✅ [DashboardService] All insights generation completed')
      })
      
    } catch (error) {
      console.error('❌ [DashboardService] Error triggering insights generation:', error)
      // Don't throw - insights generation failure shouldn't break dashboard
    }
  }

  /**
   * Get cached data or fetch fresh data
   */
  private async getCachedData<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>
  ): Promise<DashboardServiceResponse<T>> {
    const cached = this.cache.get(cacheKey)
    const now = Date.now()

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log('💾 [DashboardService] Using cached data for key:', cacheKey)
      return { data: cached.data, error: null, loading: false }
    }

    console.log('🔄 [DashboardService] Fetching fresh data for key:', cacheKey)

    try {
      const data = await fetchFunction()
      this.cache.set(cacheKey, { data, timestamp: now })
      return { data, error: null, loading: false }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }
    }
  }

  /**
   * Get complete dashboard data with all metrics
   */
  async getDashboardData(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<DashboardData>> {
    // Create cache key based only on analysis ID, not filter selections
    const analysisId = filters.selectedAnalysisId || filters.urlAnalysisId
    const cacheKey = `dashboard-${analysisId || 'default'}`
    console.log('🔑 [DashboardService] Cache key:', cacheKey)
    console.log('🔑 [DashboardService] Analysis ID for cache key:', analysisId)
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching dashboard data with filters:', filters)
      
      // Check if we have a token
      const token = localStorage.getItem('authToken')
      console.log('🔑 [DashboardService] Auth token present:', !!token)
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.')
      }

      // ✅ Use new /api/dashboard/all endpoint (includes AI insights)
      console.log('🔄 [DashboardService] Calling /api/dashboard/all with filters:', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        urlAnalysisId: filters.selectedAnalysisId || filters.urlAnalysisId
      })
      console.log('🔍 [DashboardService] Full filters object:', filters)
      
      const dashboardResponse = await apiService.getDashboardAll({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        urlAnalysisId: filters.selectedAnalysisId || filters.urlAnalysisId
      }).catch(e => {
        console.error('❌ [DashboardService] Failed to fetch dashboard/all:', e)
        return { success: false, data: null }
      })
      
      console.log('📊 [DashboardService] Dashboard response:', {
        success: dashboardResponse.success,
        hasData: !!dashboardResponse.data,
        topicRankings: dashboardResponse.data?.metrics?.topicRankings?.length || 0,
        personaRankings: dashboardResponse.data?.metrics?.personaRankings?.length || 0
      })

      // If dashboard/all fails, fallback to individual endpoints
      if (!dashboardResponse.success || !dashboardResponse.data) {
        console.log('⚠️ [DashboardService] dashboard/all failed, falling back to individual endpoints')
        
        const [
          overallMetrics,
          platformMetrics,
          topicMetrics,
          personaMetrics,
          competitors,
          topics,
          personas
        ] = await Promise.all([
          apiService.getAggregatedMetrics({ ...filters, scope: 'overall' }).catch(e => ({ success: false, data: null })),
          apiService.getAggregatedMetrics({ ...filters, scope: 'platform' }).catch(e => ({ success: false, data: [] })),
          apiService.getAggregatedMetrics({ ...filters, scope: 'topic' }).catch(e => ({ success: false, data: [] })),
          apiService.getAggregatedMetrics({ ...filters, scope: 'persona' }).catch(e => ({ success: false, data: [] })),
          apiService.getCompetitors(filters.selectedAnalysisId || filters.urlAnalysisId).catch(e => ({ success: false, data: [] })),
          apiService.getTopics(filters.selectedAnalysisId || filters.urlAnalysisId).catch(e => ({ success: false, data: [] })),
          apiService.getPersonas(filters.selectedAnalysisId || filters.urlAnalysisId).catch(e => ({ success: false, data: [] }))
        ])
      
        // Process fallback data (existing code continues below)
        return this.processFallbackData(overallMetrics, platformMetrics, topicMetrics, personaMetrics, competitors, topics, personas, filters)
      }

      // ✅ Process dashboard/all response (includes aiInsights)
      console.log('✅ [DashboardService] Using dashboard/all response with AI insights')
      const dashData = dashboardResponse.data
      
      // Fetch competitors, topics, personas separately (still needed for filtering)
      const [competitors, topics, personas] = await Promise.all([
        apiService.getCompetitors(filters.selectedAnalysisId || filters.urlAnalysisId).catch(e => ({ success: false, data: [] })),
        apiService.getTopics(filters.selectedAnalysisId || filters.urlAnalysisId).catch(e => ({ success: false, data: [] })),
        apiService.getPersonas(filters.selectedAnalysisId || filters.urlAnalysisId).catch(e => ({ success: false, data: [] }))
      ])

      // Extract data from response
      const overallMetrics = { success: true, data: dashData.overall || null }
      // ✅ Fix: Use raw platform metrics for citation analysis
      const platformMetrics = { success: true, data: dashData.platformMetrics || [] }
      const topicMetrics = { success: true, data: dashData.topics || [] }
      const personaMetrics = { success: true, data: dashData.personas || [] }
      const aiInsights = dashData.aiInsights || null  // ✅ NEW: AI insights from backend
      
      // ✅ NEW: Extract formatted rankings from backend
      const formattedTopicRankings = dashData.metrics?.topicRankings || []
      const formattedPersonaRankings = dashData.metrics?.personaRankings || []
      
      console.log('📊 [DashboardService] Backend topic rankings:', formattedTopicRankings.length, 'items')
      console.log('📊 [DashboardService] Backend persona rankings:', formattedPersonaRankings.length, 'items')
      console.log('📊 [DashboardService] Backend topics data:', dashData.topics?.length || 0, 'items')
      console.log('📊 [DashboardService] Backend personas data:', dashData.personas?.length || 0, 'items')

      // Debug API responses
      console.log('📊 [DashboardService] API Responses:')
      console.log('  Overall Metrics:', overallMetrics.success ? '✅' : '❌', overallMetrics.data ? 'Has data' : 'No data')
      console.log('  Platform Metrics:', platformMetrics.success ? '✅' : '❌', platformMetrics.data?.length || 0, 'items')
      console.log('  Topic Metrics:', topicMetrics.success ? '✅' : '❌', topicMetrics.data?.length || 0, 'items')
      console.log('  Persona Metrics:', personaMetrics.success ? '✅' : '❌', personaMetrics.data?.length || 0, 'items')
      console.log('  Competitors:', competitors.success ? '✅' : '❌', competitors.data?.length || 0, 'items')
      console.log('  Topics:', topics.success ? '✅' : '❌', topics.data?.length || 0, 'items')
      console.log('  Personas:', personas.success ? '✅' : '❌', personas.data?.length || 0, 'items')

      // Check if we have any data
      if (!overallMetrics.data && !competitors.data?.length) {
        console.log('⚠️ [DashboardService] No data available yet')
        throw new Error('No data available. Please complete the onboarding flow first.')
      }

      // Check if we have the required data structure
      if (overallMetrics.data && !overallMetrics.data.brandMetrics) {
        console.log('⚠️ [DashboardService] Overall metrics missing brandMetrics')
        throw new Error('Metrics data is incomplete. Please run the complete onboarding flow again.')
      }

      // ✅ NEW: Apply topic/persona filters if provided
      let filteredOverallMetrics = overallMetrics.data

      if (filters.topics || filters.personas) {
        const selectedTopics = filters.topics || ['All Topics']
        const selectedPersonas = filters.personas || ['All Personas']

        console.log('🔍 [DashboardService] Applying filters:', { 
          selectedTopics, 
          selectedPersonas,
          topicMetricsAvailable: topicMetrics.data?.length || 0,
          personaMetricsAvailable: personaMetrics.data?.length || 0
        })

        filteredOverallMetrics = filterAndAggregateMetrics(
          overallMetrics.data,
          topicMetrics.data || [],
          personaMetrics.data || [],
          selectedTopics,
          selectedPersonas
        )

        console.log('✅ [DashboardService] Metrics filtered and aggregated:', {
          totalTests: filteredOverallMetrics.totalTests,
          brandCount: filteredOverallMetrics.brandMetrics?.length || 0
        })
      }

      // Transform to frontend format using filtered data
      const dashboardData = transformAggregatedMetricsToDashboardData(
        filteredOverallMetrics,  // ✅ Use filtered data instead of raw overall
        platformMetrics.data || [],
        topicMetrics.data || [],
        personaMetrics.data || [],
        competitors.data || [],
        topics.data || [],
        personas.data || []
      )
      
      // ✅ Override with backend-formatted rankings if available
      if (formattedTopicRankings.length > 0) {
        (dashboardData.metrics as any).topicRankings = formattedTopicRankings
      }
      if (formattedPersonaRankings.length > 0) {
        (dashboardData.metrics as any).personaRankings = formattedPersonaRankings
      }

      // ✅ Add AI insights to dashboard data
      if (aiInsights) {
        dashboardData.aiInsights = aiInsights
        console.log('✅ [DashboardService] AI insights included:', 
          aiInsights.whatsWorking?.length || 0, 'working,',
          aiInsights.needsAttention?.length || 0, 'attention')
      } else {
        console.log('⚠️ [DashboardService] No AI insights available')
      }
      
      // 🧠 Always trigger insights generation for all tabs in background
      // This ensures each tab has fresh, tab-specific insights
      this.triggerInsightsGeneration(filters.selectedAnalysisId || filters.urlAnalysisId)

      // Add filter options to dashboard data
      const filterOptions = transformFilters({
        metrics: {
          platformMetrics: platformMetrics.data,
          topicMetrics: topicMetrics.data,
          personaMetrics: personaMetrics.data
        }
      })
      
      dashboardData.filters = filterOptions

      console.log('✅ [DashboardService] Dashboard data transformed successfully')
      return dashboardData
    })
  }

  /**
   * Process fallback data when dashboard/all endpoint fails
   */
  private processFallbackData(
    overallMetrics: any,
    platformMetrics: any,
    topicMetrics: any,
    personaMetrics: any,
    competitors: any,
    topics: any,
    personas: any,
    filters: DashboardFilters = {}
  ) {
    // Check if we have any data
    if (!overallMetrics.data && !competitors.data?.length) {
      console.log('⚠️ [DashboardService] No data available yet')
      throw new Error('No data available. Please complete the onboarding flow first.')
    }

    // Check if we have the required data structure
    if (overallMetrics.data && !overallMetrics.data.brandMetrics) {
      console.log('⚠️ [DashboardService] Overall metrics missing brandMetrics')
      throw new Error('Metrics data is incomplete. Please run the complete onboarding flow again.')
    }

    // ✅ NEW: Apply topic/persona filters if provided
    let filteredOverallMetrics = overallMetrics.data

    if (filters.topics || filters.personas) {
      const selectedTopics = filters.topics || ['All Topics']
      const selectedPersonas = filters.personas || ['All Personas']

      console.log('🔍 [DashboardService] [Fallback] Applying filters:', { selectedTopics, selectedPersonas })

      filteredOverallMetrics = filterAndAggregateMetrics(
        overallMetrics.data,
        topicMetrics.data || [],
        personaMetrics.data || [],
        selectedTopics,
        selectedPersonas
      )

      console.log('✅ [DashboardService] [Fallback] Metrics filtered')
    }

    // Transform to frontend format
    const dashboardData = transformAggregatedMetricsToDashboardData(
      filteredOverallMetrics,  // ✅ Use filtered data
      platformMetrics.data || [],
      topicMetrics.data || [],
      personaMetrics.data || [],
      competitors.data || [],
      topics.data || [],
      personas.data || []
    )
    
    // ✅ Note: Fallback doesn't have backend-formatted rankings, so we use transformed data

    // Add filter options to dashboard data
    const filterOptions = transformFilters({
      metrics: {
        platformMetrics: platformMetrics.data,
        topicMetrics: topicMetrics.data,
        personaMetrics: personaMetrics.data
      }
    })
    
    dashboardData.filters = filterOptions

    console.log('✅ [DashboardService] Fallback dashboard data transformed successfully')
    return dashboardData
  }

  /**
   * Get visibility metrics specifically
   */
  async getVisibilityMetrics(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `visibility-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching visibility metrics')

      const [overallMetrics, topicMetrics] = await Promise.all([
        apiService.getAggregatedMetrics({ ...filters, scope: 'overall' }),
        apiService.getAggregatedMetrics({ ...filters, scope: 'topic' })
      ])

      const brandMetrics = overallMetrics.data.brandMetrics || []
      const topics = await apiService.getTopics(filters.urlAnalysisId)

      return {
        visibilityScore: transformBrandMetricsToMetric(brandMetrics, 'visibility'),
        shareOfVoice: transformBrandMetricsToMetric(brandMetrics, 'shareOfVoice'),
        averagePosition: transformBrandMetricsToMetric(brandMetrics, 'averagePosition'),
        depthOfMention: transformBrandMetricsToMetric(brandMetrics, 'depthOfMention'),
        topicRankings: transformTopicsToTopicRankings(topics.data, topicMetrics.data),
        competitors: transformBrandMetricsToCompetitors(brandMetrics)
      }
    })
  }

  /**
   * Get sentiment metrics
   */
  async getSentimentMetrics(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `sentiment-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching sentiment metrics')

      const overallMetrics = await apiService.getAggregatedMetrics({ ...filters, scope: 'overall' })
      const brandMetrics = overallMetrics.data.brandMetrics || []

      return {
        sentimentScore: transformBrandMetricsToMetric(brandMetrics, 'sentiment'),
        sentimentBreakdown: brandMetrics.map(brand => ({
          brandName: brand.brandName,
          sentimentScore: brand.sentimentScore,
          sentimentShare: brand.sentimentShare,
          sentimentBreakdown: brand.sentimentBreakdown
        }))
      }
    })
  }

  /**
   * Get citation metrics
   */
  async getCitationMetrics(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `citations-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching citation metrics')

      const overallMetrics = await apiService.getAggregatedMetrics({ ...filters, scope: 'overall' })
      const brandMetrics = overallMetrics.data.brandMetrics || []

      return {
        citationShare: transformBrandMetricsToMetric(brandMetrics, 'citationShare'),
        citationTypes: brandMetrics.map(brand => ({
          brandName: brand.brandName,
          brandCitations: brand.brandCitationsTotal,
          earnedCitations: brand.earnedCitationsTotal,
          socialCitations: brand.socialCitationsTotal,
          totalCitations: brand.totalCitations
        }))
      }
    })
  }

  /**
   * Get prompts data
   */
  async getPromptsData(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `prompts-${JSON.stringify(filters)}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching prompts data')

      const [prompts, allTests] = await Promise.all([
        apiService.getPrompts(filters),
        apiService.getAllTests(filters)
      ])

      return {
        prompts: prompts.data,
        tests: allTests.data,
        summary: {
          totalPrompts: prompts.data.length,
          totalTests: allTests.data.length,
          completedTests: allTests.data.filter((test: any) => test.status === 'completed').length
        }
      }
    })
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights(urlAnalysisId?: string): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `insights-${urlAnalysisId || 'latest'}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching performance insights')

      try {
        const insights = await apiService.getLatestInsights(urlAnalysisId)
        return transformInsightsToFrontend(insights.data)
      } catch (error) {
        // If no insights found, try to generate them
        if (error instanceof Error && error.message.includes('No insights found')) {
          console.log('🔄 [DashboardService] No insights found, generating new ones...')
          const generatedInsights = await apiService.generateInsights(urlAnalysisId)
          return transformInsightsToFrontend(generatedInsights.data)
        }
        throw error
      }
    })
  }

  /**
   * Get filters data (platforms, topics, personas)
   */
  async getFiltersData(urlAnalysisId?: string): Promise<DashboardServiceResponse<any>> {
    const cacheKey = `filters-${urlAnalysisId || 'all'}`
    
    return this.getCachedData(cacheKey, async () => {
      console.log('🔄 [DashboardService] Fetching filters data')

      const [competitors, topics, personas] = await Promise.all([
        apiService.getCompetitors(urlAnalysisId),
        apiService.getTopics(urlAnalysisId),
        apiService.getPersonas(urlAnalysisId)
      ])

      return {
        platforms: [
          { id: 'openai', name: 'OpenAI', enabled: true },
          { id: 'gemini', name: 'Gemini', enabled: true },
          { id: 'claude', name: 'Claude', enabled: true },
          { id: 'perplexity', name: 'Perplexity', enabled: true }
        ],
        topics: topics.data.map((topic: any) => ({
          id: topic._id,
          name: topic.name,
          enabled: topic.selected
        })),
        personas: personas.data.map((persona: any) => ({
          id: persona._id,
          name: persona.type,
          enabled: persona.selected
        })),
        competitors: competitors.data.map((competitor: any) => ({
          id: competitor._id,
          name: competitor.name,
          enabled: competitor.selected
        }))
      }
    })
  }

  /**
   * Update filter selections
   */
  async updateFilterSelections(
    type: 'topics' | 'personas' | 'competitors',
    selections: string[]
  ): Promise<DashboardServiceResponse<any>> {
    try {
      console.log(`🔄 [DashboardService] Updating ${type} selections:`, selections)

      const updatePromises = selections.map(async (id) => {
        switch (type) {
          case 'topics':
            return apiService.updateTopic(id, { selected: true })
          case 'personas':
            return apiService.updatePersona(id, { selected: true })
          case 'competitors':
            return apiService.updateCompetitor(id, { selected: true })
        }
      })

      await Promise.all(updatePromises)
      
      // Clear relevant cache entries
      this.clearCacheByPattern(`${type}-`)
      
      return { data: { success: true }, error: null, loading: false }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to update selections',
        loading: false
      }
    }
  }

  /**
   * Generate new insights
   */
  async generateNewInsights(urlAnalysisId?: string): Promise<DashboardServiceResponse<any>> {
    try {
      console.log('🔄 [DashboardService] Generating new insights...')

      const insights = await apiService.generateInsights(urlAnalysisId)
      const transformedInsights = transformInsightsToFrontend(insights.data)
      
      // Clear insights cache
      this.clearCacheByPattern('insights-')
      
      return { data: transformedInsights, error: null, loading: false }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to generate insights',
        loading: false
      }
    }
  }

  /**
   * Clear cache by pattern
   */
  private clearCacheByPattern(pattern: string) {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern))
    keysToDelete.forEach(key => this.cache.delete(key))
  }


  /**
   * Get prompts dashboard data with caching
   */
  async getPromptsDashboardData(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<any>> {
    const analysisId = filters.selectedAnalysisId || filters.urlAnalysisId
    const cacheKey = `prompts-${analysisId || 'default'}`
    
    console.log('📊 [DashboardService] Getting prompts dashboard data for analysis:', analysisId)
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('✅ [DashboardService] Using cached prompts data')
      return {
        data: cached.data,
        error: null,
        loading: false
      }
    }

    try {
      console.log('🔄 [DashboardService] Fetching fresh prompts data from API')
      const response = await apiService.getPromptsDashboard(analysisId || undefined)
      
      if (response.success && response.data) {
        // Cache the data
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        })
        
        console.log('✅ [DashboardService] Prompts data cached successfully')
        return {
          data: response.data,
          error: null,
          loading: false
        }
      } else {
        throw new Error('Failed to fetch prompts dashboard data')
      }
    } catch (error) {
      console.error('❌ [DashboardService] Error fetching prompts data:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch prompts data',
        loading: false
      }
    }
  }

  /**
   * Clear cache for prompts data
   */
  clearPromptsCacheForAnalysis(analysisId: string): void {
    const cacheKey = `prompts-${analysisId}`
    console.log('🧹 [DashboardService] Clearing prompts cache for analysis:', analysisId)
    this.cache.delete(cacheKey)
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    }
  }
}

export default new DashboardService()

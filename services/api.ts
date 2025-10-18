const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

class ApiService {
  token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
    }
  }

  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    return headers
  }

  async request(endpoint: string, options: RequestInit = {}) {
    // Add cache-busting parameter to ensure fresh data
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${API_BASE_URL}${endpoint}${separator}_t=${Date.now()}`
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options,
    }

    console.log(`🌐 [API] ${options.method || 'GET'} ${endpoint}`)
    console.log(`📍 [API] Full URL: ${url}`)

    if (options.body) {
      console.log(`📦 [API] Request body:`, JSON.parse(options.body as string))
    }

    try {
      const startTime = Date.now()
      const response = await fetch(url, config)
      const duration = Date.now() - startTime

      console.log(`✅ [API] Response received in ${duration}ms (status: ${response.status})`)

      const data = await response.json()

      if (!response.ok) {
        // Check if this is an expected error that shouldn't be logged as red error
        const isExpectedError =
          response.status === 404 ||
          response.status === 401 || // Unauthorized (invalid token)
          data.message?.includes('No metrics') ||
          data.message?.includes('not found') ||
          data.message?.includes('Please run prompt tests first') ||
          data.message?.includes('Invalid token') ||
          data.message?.includes('Token expired') ||
          data.message?.includes('Unauthorized')

        if (isExpectedError) {
          // Don't log error for expected scenarios (no data, invalid token, etc.)
          console.log(`ℹ️ [API] Expected response (${response.status}): ${data.message || 'Not found'}`)
        } else {
          // Log actual errors
          console.error(`❌ [API] Request failed:`, data.message || 'Unknown error')
        }

        throw new Error(data.message || 'API request failed')
      }

      console.log(`📦 [API] Response data:`, data)
      return data
    } catch (error) {
      // Only log if it's not an expected error
      if (error instanceof Error &&
          !error.message.includes('No metrics') &&
          !error.message.includes('not found') &&
          !error.message.includes('Invalid token') &&
          !error.message.includes('Unauthorized')) {
        console.error('❌ [API ERROR]:', error)
      }
      throw error
    }
  }

  // Generic GET method
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' })
  }

  // Auth endpoints
  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  async verifyEmail(token: string) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  async refreshToken(refreshToken: string) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  // Onboarding endpoints
  async getOnboardingData() {
    return this.request('/onboarding')
  }

  async updateOnboardingStep(stepNumber: number, data: any) {
    return this.request(`/onboarding/step/${stepNumber}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateOnboardingBulk(data: any) {
    return this.request('/onboarding/bulk', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async resetOnboarding() {
    return this.request('/onboarding/reset', {
      method: 'POST',
    })
  }

  // Website analysis endpoint
  async analyzeWebsite(url: string) {
    return this.request('/onboarding/analyze-website', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  }

  // Get latest analysis results
  async getLatestAnalysis() {
    return this.request('/onboarding/latest-analysis')
  }

  // Check if user has done URL analysis
  async hasAnalysis() {
    return this.request('/onboarding/has-analysis')
  }

  // Generate prompts based on selected topics and personas
  async generatePrompts() {
    return this.request('/onboarding/generate-prompts', {
      method: 'POST',
    })
  }

  // Update selections for competitors, topics, and personas
  async updateSelections(competitors: string[], topics: string[], personas: string[]) {
    return this.request('/onboarding/update-selections', {
      method: 'POST',
      body: JSON.stringify({
        competitors,
        topics,
        personas
      }),
    })
  }

  // Test prompts with multi-LLM
  async testPrompts() {
    return this.request('/prompts/test', {
      method: 'POST',
    })
  }

  // Calculate metrics from test results
  async calculateMetrics() {
    return this.request('/metrics/calculate', {
      method: 'POST',
    })
  }

  // Legacy alias for backward compatibility (deprecated - use getDashboardAll instead)
  async getDashboardMetrics() {
    console.warn('⚠️ getDashboardMetrics() is deprecated. Use getDashboardAll() instead.')
    return this.getDashboardAll()
  }

  async getPromptTests(promptId: string) {
    return this.request(`/prompts/${promptId}/tests`)
  }

  async getAllTests(options: Record<string, any> = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/prompts/tests/all${params ? `?${params}` : ''}`)
  }

  // Get all prompts
  async getPrompts(options: Record<string, any> = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/prompts${params ? `?${params}` : ''}`)
  }

  // Analytics endpoints
  async getAnalyticsSummary(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/summary${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsVisibility(dateFrom?: string, dateTo?: string, urlAnalysisId?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    if (urlAnalysisId) params.append('urlAnalysisId', urlAnalysisId)
    return this.request(`/analytics/visibility${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsPrompts(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/prompts${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsSentiment(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/sentiment${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsCitations(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/citations${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsCompetitors(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/competitors${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // New analytics endpoints for dashboard integration
  async getAnalyticsFilters() {
    return this.request('/analytics/filters')
  }

  // Deprecated - Use getDashboardAll() instead
  async getAnalyticsDashboard(options: {
    dateFrom?: string
    dateTo?: string
    platforms?: string[]
    topics?: string[]
    personas?: string[]
    comparisonDateFrom?: string
    comparisonDateTo?: string
  } = {}) {
    console.warn('⚠️ getAnalyticsDashboard() is deprecated. Use getDashboardAll() instead.')
    return this.getDashboardAll(options)
  }

  // Metrics endpoints (deprecated - use getDashboardAll instead)
  async getMetricsDashboard(dateFrom?: string, dateTo?: string) {
    console.warn('⚠️ getMetricsDashboard() is deprecated. Use getDashboardAll() instead.')
    return this.getDashboardAll({ dateFrom, dateTo })
  }

  // URL Analysis endpoints
  async getUrlAnalyses() {
    return this.request('/url-analysis/list')
  }

  async getUrlAnalysis(id: string) {
    return this.request(`/url-analysis/${id}`)
  }

  async getUrlMetrics(id: string) {
    return this.request(`/url-analysis/${id}/metrics`)
  }

  // Performance Insights endpoints
  async generateInsights(urlAnalysisId?: string) {
    return this.request('/insights/generate', {
      method: 'POST',
      body: JSON.stringify({ urlAnalysisId }),
    })
  }

  async getLatestInsights(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/insights/latest${params}`)
  }

  async getInsightsHistory(urlAnalysisId?: string, limit?: number) {
    const params = new URLSearchParams()
    if (urlAnalysisId) params.append('urlAnalysisId', urlAnalysisId)
    if (limit) params.append('limit', limit.toString())
    return this.request(`/insights/history${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getInsight(insightId: string) {
    return this.request(`/insights/${insightId}`)
  }

  // Dashboard Metrics endpoints (new aggregated metrics)
  async getAggregatedMetrics(options: {
    dateFrom?: string
    dateTo?: string
    urlAnalysisId?: string
    scope?: 'overall' | 'platform' | 'topic' | 'persona'
  } = {}) {
    const params = new URLSearchParams()
    if (options.dateFrom) params.append('dateFrom', options.dateFrom)
    if (options.dateTo) params.append('dateTo', options.dateTo)
    if (options.urlAnalysisId) params.append('urlAnalysisId', options.urlAnalysisId)
    if (options.scope) params.append('scope', options.scope)
    
    return this.request(`/metrics/aggregated${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // ✅ NEW: Get all dashboard data in one call (includes AI insights)
  async getDashboardAll(options: {
    dateFrom?: string
    dateTo?: string
    urlAnalysisId?: string
  } = {}) {
    const params = new URLSearchParams()
    if (options.dateFrom) params.append('dateFrom', options.dateFrom)
    if (options.dateTo) params.append('dateTo', options.dateTo)
    if (options.urlAnalysisId) params.append('urlAnalysisId', options.urlAnalysisId)
    
    return this.request(`/dashboard/all${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Competitors endpoints
  async getCompetitors(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/competitors${params}`)
  }

  async updateCompetitor(id: string, data: any) {
    return this.request(`/competitors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createCompetitor(data: any) {
    return this.request('/competitors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteCompetitor(id: string) {
    return this.request(`/competitors/${id}`, {
      method: 'DELETE',
    })
  }

  // Topics endpoints
  async getTopics(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/topics${params}`)
  }

  async updateTopic(id: string, data: any) {
    return this.request(`/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createTopic(data: any) {
    return this.request('/topics', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTopic(id: string) {
    return this.request(`/topics/${id}`, {
      method: 'DELETE',
    })
  }

  // Personas endpoints
  async getPersonas(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/personas${params}`)
  }

  async updatePersona(id: string, data: any) {
    return this.request(`/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createPersona(data: any) {
    return this.request('/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePersona(id: string) {
    return this.request(`/personas/${id}`, {
      method: 'DELETE',
    })
  }

  // Clusters endpoints
  async getClusters(options: {
    dateFrom?: string
    dateTo?: string
    urlAnalysisId?: string
  } = {}) {
    const params = new URLSearchParams()
    if (options.dateFrom) params.append('dateFrom', options.dateFrom)
    if (options.dateTo) params.append('dateTo', options.dateTo)
    if (options.urlAnalysisId) params.append('urlAnalysisId', options.urlAnalysisId)
    
    return this.request(`/clusters${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Analysis endpoints
  async getAnalyses() {
    return this.request('/metrics/analyses')
  }

  // Prompts Dashboard endpoint - Get topics/personas with their prompts and metrics
  async getPromptsDashboard(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/prompts/dashboard${params}`)
  }

  async getPromptDetails(promptId: string) {
    return this.request(`/prompts/details/${promptId}`)
  }

  // Subjective Metrics endpoints
  async evaluateSubjectiveMetrics(promptId: string, brandName: string) {
    return this.request('/subjective-metrics/evaluate', {
      method: 'POST',
      body: JSON.stringify({ promptId, brandName }),
    })
  }

  async getSubjectiveMetrics(promptId: string, brandName?: string) {
    const params = brandName ? `?brandName=${encodeURIComponent(brandName)}` : ''
    try {
      return await this.request(`/subjective-metrics/${promptId}${params}`)
    } catch (error) {
      // If it's a "no metrics found" error, return success with no data instead of throwing
      const errorMessage = error.message || ''
      if (errorMessage.includes('No metrics found') || 
          errorMessage.includes('not found') || 
          errorMessage.includes('404')) {
        return {
          success: true,
          data: null,
          message: 'No metrics found'
        }
      }
      // Re-throw other errors
      throw error
    }
  }

  async getBatchSubjectiveMetrics(promptIds: string[], brandName: string) {
    return this.request('/subjective-metrics/batch', {
      method: 'POST',
      body: JSON.stringify({ promptIds, brandName }),
    })
  }

  // Sentiment Breakdown endpoints - uses new sentiment/breakdown endpoint
  async getPromptSentimentBreakdown(urlAnalysisId?: string, sortBy?: string) {
    const params = new URLSearchParams()
    if (urlAnalysisId) params.append('urlAnalysisId', urlAnalysisId)
    if (sortBy) params.append('sortBy', sortBy)
    
    // Use the new sentiment/breakdown endpoint
    return this.request(`/sentiment/breakdown${params.toString() ? `?${params.toString()}` : ''}`)
  }
}

export default new ApiService()
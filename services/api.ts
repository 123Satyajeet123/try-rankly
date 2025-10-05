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
    const url = `${API_BASE_URL}${endpoint}`
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
      console.log(`📦 [API] Response data:`, data)

      if (!response.ok) {
        console.error(`❌ [API] Request failed:`, data.message || 'Unknown error')
        throw new Error(data.message || 'API request failed')
      }

      return data
    } catch (error) {
      console.error('❌ [API ERROR]:', error)
      throw error
    }
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

  // Generate prompts based on selected topics and personas
  async generatePrompts() {
    return this.request('/prompts/generate', {
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

  // Prompt Testing endpoints
  async testPrompts() {
    return this.request('/prompts/test', {
      method: 'POST',
    })
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
}

export default new ApiService()

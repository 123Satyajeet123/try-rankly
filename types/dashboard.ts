// Dashboard TypeScript interfaces

export interface Competitor {
  id: string
  name: string
  logo: string
  score: number
  rank: number
  change: number // percentage change
  trend: 'up' | 'down' | 'stable'
}

export interface Metric {
  id: string
  title: string
  description: string
  value: number
  unit: string
  change: number
  trend: 'up' | 'down' | 'stable'
  data: ChartDataPoint[]
}

export interface ChartDataPoint {
  name: string
  value: number
  fill?: string
  [key: string]: any // Allow additional properties for recharts compatibility
}

export interface TopicRanking {
  id: string
  topic: string
  competitors: Competitor[]
}

export interface Platform {
  id: string
  name: string
  enabled: boolean
}

export interface Topic {
  id: string
  name: string
  enabled: boolean
}

export interface Persona {
  id: string
  name: string
  enabled: boolean
}

export interface FilterState {
  dateRange: {
    from: Date
    to: Date
  }
  platforms: string[]
  topics: string[]
  personas: string[]
}

export interface VisibilityMetrics {
  visibilityScore: Metric
  shareOfVoice: Metric
  averagePosition: Metric
  topicRankings: TopicRanking[]
  competitors: Competitor[]
}

export interface DashboardData {
  metrics: VisibilityMetrics
  filters: {
    platforms: Platform[]
    topics: Topic[]
    personas: Persona[]
  }
  lastUpdated: Date
}

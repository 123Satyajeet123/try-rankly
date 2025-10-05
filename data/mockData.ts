import { DashboardData, Competitor, Metric, TopicRanking, Platform, Topic, Persona } from '@/types/dashboard'

// Mock competitors data
export const mockCompetitors: Competitor[] = [
  {
    id: '1',
    name: 'Fibr',
    logo: '/logos/fibr.png',
    score: 12.5,
    rank: 1,
    change: 2.3,
    trend: 'up'
  },
  {
    id: '2',
    name: 'Unbounce',
    logo: '/logos/unbounce.png',
    score: 8.7,
    rank: 2,
    change: -1.2,
    trend: 'down'
  },
  {
    id: '3',
    name: 'Instapage',
    logo: '/logos/instapage.png',
    score: 6.9,
    rank: 3,
    change: 0.5,
    trend: 'up'
  },
  {
    id: '4',
    name: 'Leadpages',
    logo: '/logos/leadpages.png',
    score: 4.2,
    rank: 4,
    change: 0.0,
    trend: 'stable'
  },
  {
    id: '5',
    name: 'ConvertKit',
    logo: '/logos/convertkit.png',
    score: 3.8,
    rank: 5,
    change: -0.8,
    trend: 'down'
  }
]

// Mock visibility score data
export const visibilityScoreData: Metric = {
  id: 'visibility-score',
  title: 'Visibility Score',
  description: 'How often Fibr appears in AI-generated answers',
  value: 12.5,
  unit: '%',
  change: 2.3,
  trend: 'up',
  data: [
    { name: 'Fibr', value: 12.5, fill: '#3b82f6' },
    { name: 'Unbounce', value: 8.7, fill: '#e5e7eb' },
    { name: 'Instapage', value: 6.9, fill: '#e5e7eb' },
    { name: 'Leadpages', value: 4.2, fill: '#e5e7eb' },
    { name: 'ConvertKit', value: 3.8, fill: '#e5e7eb' }
  ]
}

// Mock share of voice data
export const shareOfVoiceData: Metric = {
  id: 'share-of-voice',
  title: 'Share of Voice',
  description: 'Percentage of mentions across all platforms',
  value: 28.4,
  unit: '%',
  change: 4.7,
  trend: 'up',
  data: [
    { name: 'Fibr', value: 28.4, fill: '#3b82f6' },
    { name: 'Unbounce', value: 22.1, fill: '#f59e0b' },
    { name: 'Instapage', value: 18.3, fill: '#ef4444' },
    { name: 'Leadpages', value: 16.2, fill: '#10b981' },
    { name: 'ConvertKit', value: 15.0, fill: '#8b5cf6' }
  ]
}

// Mock average position data
export const averagePositionData: Metric = {
  id: 'average-position',
  title: 'Average Position',
  description: 'Average ranking position in search results',
  value: 2.8,
  unit: '',
  change: -0.3,
  trend: 'up', // Lower position number is better
  data: [
    { name: 'Fibr', value: 2.8, fill: '#3b82f6' },
    { name: 'Unbounce', value: 3.2, fill: '#e5e7eb' },
    { name: 'Instapage', value: 3.8, fill: '#e5e7eb' },
    { name: 'Leadpages', value: 4.1, fill: '#e5e7eb' },
    { name: 'ConvertKit', value: 4.5, fill: '#e5e7eb' }
  ]
}

// Mock topic rankings
export const mockTopicRankings: TopicRanking[] = [
  {
    id: '1',
    topic: 'Landing Page Optimization',
    competitors: [
      { ...mockCompetitors[0], score: 15.2, rank: 1 },
      { ...mockCompetitors[1], score: 12.8, rank: 2 },
      { ...mockCompetitors[2], score: 9.4, rank: 3 },
      { ...mockCompetitors[3], score: 6.7, rank: 4 },
      { ...mockCompetitors[4], score: 4.1, rank: 5 }
    ]
  },
  {
    id: '2',
    topic: 'A/B Testing',
    competitors: [
      { ...mockCompetitors[0], score: 18.7, rank: 1 },
      { ...mockCompetitors[2], score: 14.2, rank: 2 },
      { ...mockCompetitors[1], score: 11.3, rank: 3 },
      { ...mockCompetitors[3], score: 8.9, rank: 4 },
      { ...mockCompetitors[4], score: 5.2, rank: 5 }
    ]
  },
  {
    id: '3',
    topic: 'Conversion Rate Optimization',
    competitors: [
      { ...mockCompetitors[0], score: 22.1, rank: 1 },
      { ...mockCompetitors[1], score: 16.8, rank: 2 },
      { ...mockCompetitors[2], score: 13.5, rank: 3 },
      { ...mockCompetitors[3], score: 9.7, rank: 4 },
      { ...mockCompetitors[4], score: 7.3, rank: 5 }
    ]
  },
  {
    id: '4',
    topic: 'Lead Generation',
    competitors: [
      { ...mockCompetitors[1], score: 19.4, rank: 1 },
      { ...mockCompetitors[0], score: 17.2, rank: 2 },
      { ...mockCompetitors[3], score: 14.6, rank: 3 },
      { ...mockCompetitors[2], score: 11.8, rank: 4 },
      { ...mockCompetitors[4], score: 8.9, rank: 5 }
    ]
  }
]

// Mock platforms
export const mockPlatforms: Platform[] = [
  { id: 'chatgpt', name: 'ChatGPT', enabled: true },
  { id: 'perplexity', name: 'Perplexity', enabled: true },
  { id: 'gemini', name: 'Gemini', enabled: false },
  { id: 'claude', name: 'Claude', enabled: true },
  { id: 'copilot', name: 'Copilot', enabled: false }
]

// Mock topics
export const mockTopics: Topic[] = [
  { id: 'landing-pages', name: 'Landing Page Optimization', enabled: true },
  { id: 'ab-testing', name: 'A/B Testing', enabled: true },
  { id: 'cro', name: 'Conversion Rate Optimization', enabled: false },
  { id: 'lead-gen', name: 'Lead Generation', enabled: true },
  { id: 'analytics', name: 'Analytics & Tracking', enabled: false }
]

// Mock personas
export const mockPersonas: Persona[] = [
  { id: 'marketer', name: 'Digital Marketer', enabled: true },
  { id: 'developer', name: 'Web Developer', enabled: false },
  { id: 'founder', name: 'Startup Founder', enabled: true },
  { id: 'agency', name: 'Agency Owner', enabled: false },
  { id: 'ecommerce', name: 'E-commerce Manager', enabled: true }
]

// Complete mock dashboard data
export const mockDashboardData: DashboardData = {
  metrics: {
    visibilityScore: visibilityScoreData,
    shareOfVoice: shareOfVoiceData,
    averagePosition: averagePositionData,
    topicRankings: mockTopicRankings,
    competitors: mockCompetitors
  },
  filters: {
    platforms: mockPlatforms,
    topics: mockTopics,
    personas: mockPersonas
  },
  lastUpdated: new Date('2024-01-15T10:30:00Z')
}

// Export individual data sets for flexibility
export {
  visibilityScoreData as visibilityData,
  shareOfVoiceData as shareData,
  averagePositionData as positionData,
  mockTopicRankings as topicRankings,
  mockPlatforms as platforms,
  mockTopics as topics,
  mockPersonas as personas
}

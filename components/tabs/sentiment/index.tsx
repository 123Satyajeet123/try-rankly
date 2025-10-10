// Sentiment Tab Components
export { SentimentAnalysisSection } from './SentimentAnalysisSection'
export { SentimentTopicsTable } from './SentimentTopicsTable'
export { UnifiedSentimentSection } from './UnifiedSentimentSection'
export { SentimentBreakdownSection } from './SentimentBreakdownSection'
export { UnifiedPerformanceInsightsSection } from '../visibility/UnifiedPerformanceInsightsSection'

// Sentiment Tab Main Component
import { UnifiedSentimentSection } from './UnifiedSentimentSection'
import { SentimentBreakdownSection } from './SentimentBreakdownSection'
import { UnifiedPerformanceInsightsSection } from '../visibility/UnifiedPerformanceInsightsSection'

interface SentimentTabProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

export function SentimentTab({ filterContext, dashboardData }: SentimentTabProps) {
  return (
    <div className="space-y-6">
      <UnifiedSentimentSection filterContext={filterContext} dashboardData={dashboardData} />
      
      {/* Sentiment Breakdown Section */}
      <SentimentBreakdownSection filterContext={filterContext} dashboardData={dashboardData} />
      
      {/* Performance Insights Section */}
      <UnifiedPerformanceInsightsSection filterContext={filterContext} dashboardData={dashboardData} />
    </div>
  )
}

// Sentiment Tab Components
export { UnifiedSentimentSection } from './UnifiedSentimentSection'
export { SentimentBreakdownSection } from './SentimentBreakdownSection'

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

// Export SentimentTab as default export
export { SentimentTab }

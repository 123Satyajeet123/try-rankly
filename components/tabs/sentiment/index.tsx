// Sentiment Tab Components
export { SentimentAnalysisSection } from './SentimentAnalysisSection'
export { SentimentTopicsTable } from './SentimentTopicsTable'

// Sentiment Tab Main Component
import { SentimentAnalysisSection } from './SentimentAnalysisSection'
import { SentimentTopicsTable } from './SentimentTopicsTable'

export function SentimentTab() {
  return (
    <div className="px-4 py-6 space-y-8">
      <SentimentAnalysisSection />
      <SentimentTopicsTable />
    </div>
  )
}

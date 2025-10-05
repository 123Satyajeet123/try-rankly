// Visibility Tab Components
export { UnifiedVisibilitySection } from './UnifiedVisibilitySection'
export { UnifiedWordCountSection } from './UnifiedWordCountSection'
export { UnifiedDepthOfMentionSection } from './UnifiedDepthOfMentionSection'
export { UnifiedAveragePositionSection } from './UnifiedAveragePositionSection'
export { UnifiedTopicRankingsSection } from './UnifiedTopicRankingsSection'
export { UnifiedPersonaRankingsSection } from './UnifiedPersonaRankingsSection'
export { ShareOfVoiceCard } from './ShareOfVoiceCard'
export { UnifiedPositionSection } from './UnifiedPositionSection'

// Visibility Tab Main Component
import { UnifiedVisibilitySection } from './UnifiedVisibilitySection'
import { UnifiedWordCountSection } from './UnifiedWordCountSection'
import { UnifiedDepthOfMentionSection } from './UnifiedDepthOfMentionSection'
import { UnifiedAveragePositionSection } from './UnifiedAveragePositionSection'
import { UnifiedTopicRankingsSection } from './UnifiedTopicRankingsSection'
import { UnifiedPersonaRankingsSection } from './UnifiedPersonaRankingsSection'
import { ShareOfVoiceCard } from './ShareOfVoiceCard'
import { UnifiedPositionSection } from './UnifiedPositionSection'

export function VisibilityTab() {
  return (
    <div className="space-y-6">
      {/* Unified Visibility Score Section */}
      <UnifiedVisibilitySection />

      {/* Unified Word Count Section */}
      <UnifiedWordCountSection />

      {/* Unified Depth of Mention Section */}
      <UnifiedDepthOfMentionSection />

      {/* Share of Voice Section - Full Width */}
      <ShareOfVoiceCard />

      {/* Unified Position Section */}
      <UnifiedPositionSection />

      {/* Unified Average Position Section */}
      <UnifiedAveragePositionSection />

      {/* Unified Topic Rankings Section */}
      <UnifiedTopicRankingsSection />

      {/* Unified Persona Rankings Section */}
      <UnifiedPersonaRankingsSection />
    </div>
  )
}

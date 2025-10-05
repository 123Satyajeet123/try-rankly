// Prompts Tab Components
export { PromptsSection } from './PromptsSection'
export { PromptBuilderModal } from './PromptBuilderModal'
export { PromptDesignerPage } from './PromptDesignerPage'

// Prompts Tab Main Component
import { PromptsSection } from './PromptsSection'

interface PromptsTabProps {
  onToggleFullScreen?: (isFullScreen: boolean) => void
}

export function PromptsTab({ onToggleFullScreen }: PromptsTabProps) {
  return (
    <div className="space-y-6">
      <PromptsSection onToggleFullScreen={onToggleFullScreen} />
    </div>
  )
}

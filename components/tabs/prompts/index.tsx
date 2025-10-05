// Prompts Tab Components
export { PromptsSection } from './PromptsSection'
export { PromptBuilderModal } from './PromptBuilderModal'
export { PromptDesignerPage } from './PromptDesignerPage'

// Prompts Tab Main Component
import { PromptsSection } from './PromptsSection'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { Card, CardContent } from '@/components/ui/card'

interface PromptsTabProps {
  onToggleFullScreen?: (isFullScreen: boolean) => void
}

export function PromptsTab({ onToggleFullScreen }: PromptsTabProps) {
  const { data } = useAnalytics()

  // Loading state
  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <div
                className="animate-spin rounded-full border-4 border-transparent"
                style={{
                  width: '48px',
                  height: '48px',
                  borderTopColor: 'hsl(var(--primary))',
                  borderRightColor: 'hsl(var(--primary))',
                  borderWidth: '4px'
                }}
              />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Loading prompts...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fetching your generated prompts and LLM responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (data.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">
                Error Loading Prompts
              </h3>
              <p className="text-sm text-muted-foreground">
                {data.error}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No data state
  if (!data.prompts || !data.prompts.prompts || data.prompts.prompts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Prompts Available
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete the onboarding process to generate and test prompts.
              </p>
              <a
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-foreground text-background h-10 px-4 py-2 hover:bg-foreground/90"
              >
                Start Analysis
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PromptsSection onToggleFullScreen={onToggleFullScreen} />
    </div>
  )
}

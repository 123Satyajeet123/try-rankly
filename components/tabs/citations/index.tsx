// Citations Tab Components
export { CitationShareSection } from './CitationShareSection'
export { CitationTypesSection } from './CitationTypesSection'
export { CitationTypesDetailSection } from './CitationTypesDetailSection'

// Citations Tab Main Component
import { CitationShareSection } from './CitationShareSection'
import { CitationTypesSection } from './CitationTypesSection'
import { CitationTypesDetailSection } from './CitationTypesDetailSection'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { Card, CardContent } from '@/components/ui/card'

export function CitationsTab() {
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
                  Loading citation data...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing citations from LLM responses
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
                Error Loading Citation Data
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
  if (!data.citations) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Citation Data Available
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete the onboarding process to analyze citations.
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
    <div className="px-4 py-6 space-y-8">
      <CitationShareSection />
      <CitationTypesSection />
      <CitationTypesDetailSection />
    </div>
  )
}

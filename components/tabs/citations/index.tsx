// Citations Tab Components
export { CitationShareSection } from './CitationShareSection'
export { CitationTypesSection } from './CitationTypesSection'
export { CitationTypesDetailSection } from './CitationTypesDetailSection'

// Citations Tab Main Component
import { CitationShareSection } from './CitationShareSection'
import { CitationTypesSection } from './CitationTypesSection'
import { CitationTypesDetailSection } from './CitationTypesDetailSection'

export function CitationsTab() {
  return (
    <div className="px-4 py-6 space-y-8">
      <CitationShareSection />
      <CitationTypesSection />
      <CitationTypesDetailSection />
    </div>
  )
}

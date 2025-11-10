export type ActionableReason =
  | 'low_llm_traffic_with_citations'
  | 'low_llm_traffic'
  | 'mapping_required'
  | 'missing_citation'
  | 'unknown'

export interface ActionableTrafficMetrics {
  sessions: number
  sqs?: number
  conversionRate?: number
  bounceRate?: number
  timeOnPage?: number
}

export interface ActionableCitationDetail {
  platform: string
  url: string
  promptId?: string
  promptText?: string
  citationType?: string
  firstSeenAt?: string
  lastSeenAt?: string
}

export interface ActionableCitationSummary {
  platforms: string[]
  totalCitations: number
  details: ActionableCitationDetail[]
}

export interface ActionableUrlMapping {
  sourceUrl: string
  targetUrl: string
  note?: string
}

export interface ActionablePageContentCandidate {
  url: string
  label?: string
}

export interface ActionablePageContentMetadata {
  title: string | null
  description: string | null
  keywords: string | null
  contentBlocks: ActionableContentBlock[] | null
  headings: {
    h1?: string[]
    h2?: string[]
    h3?: string[]
  } | null
  paragraphCount: number
  contactInfo: {
    emails?: string[]
    phones?: string[]
    addresses?: string[]
  } | null
  businessInfo: {
    companyName?: string
    tagline?: string
    services?: string[]
  } | null
  socialLinks: string[] | null
}

export interface ActionablePageContentWarning {
  url: string
  source?: string
  message?: string
}

export interface ActionableContentBlock {
  type: string
  text: string
  listType?: 'ordered' | 'unordered' | null
}

export interface ActionablePageContentResponse {
  markdown: string
  resolvedUrl: string | null
  requestedUrl: string | null
  attemptedUrls: ActionablePageContentCandidate[]
  metadata: ActionablePageContentMetadata
  scrapedAt: string
  warnings?: ActionablePageContentWarning[]
}

export interface ActionablePageContentRequest {
  url?: string
  normalizedUrl?: string
  mapping?: ActionableUrlMapping | null
  mappingTargetUrl?: string
  sourceUrls?: string[]
}

export interface ActionableRegenerateContentRequest {
  originalContent: string
  model?: string
  metadata?: ActionablePageContentMetadata | null
  context?: Record<string, unknown>
  pageUrl?: string
  persona?: string
  objective?: string
}

export interface RegenerationSummary {
  summary: string
  core_value_proposition?: string[]
  structural_outline?: Array<{ section: string; purpose: string; coverage_score?: string }>
  search_intent_hypotheses?: string[]
  content_gaps?: string[]
  risk_flags?: string[]
}

export interface RegenerationIntent {
  initial_intent?: {
    statement?: string
    supporting_queries?: string[]
    confidence?: string
  }
  reflection?: {
    who?: Array<{ role: string; motivation?: string; knowledge_level?: string }>
    what?: Array<{ role: string; needs?: string[]; critical_facts?: string[] }>
    why?: Array<{ role: string; mismatch?: string; impact?: string }>
    how?: {
      generalization_strategy?: string
      content_principles?: string[]
    }
  }
  refined_intent?: {
    intent_statement?: string
    micro_moments?: string[]
    success_criteria?: string[]
    alignment_notes?: string[]
  }
}

export interface RegenerationPlan {
  optimization_objectives?: Array<{
    objective: string
    intent_link?: string
    evidence?: string
  }>
  step_plan?: Array<{
    step: number
    focus_area: string
    action: string
    reasoning?: string
    success_signal?: string
  }>
  tone_and_voice?: {
    voice?: string
    reading_level?: string
    style_guidelines?: string[]
  }
  metadata_directives?: {
    title?: string
    description?: string
    schema?: string[]
  }
}

export interface RegenerationRewriteMeta {
  highlights?: string[]
  cta_recommendations?: string[]
  metadata?: {
    title?: string
    description?: string
    faq?: Array<{ question: string; answer: string }>
  }
}

export interface ActionableRegenerateContentResponse {
  model: string
  content: string
  summary: RegenerationSummary
  intent: RegenerationIntent
  plan: RegenerationPlan
  rewriteMeta?: RegenerationRewriteMeta
  usage?: {
    totalTokens: number
    perStage: {
      summarization: number
      intent: number
      plan: number
      rewrite: number
    }
  }
}

export interface ActionablePageRow {
  id: string
  title?: string
  url: string
  normalizedUrl: string
  hostname: string
  sourceUrls?: string[]
  traffic: ActionableTrafficMetrics
  citations: ActionableCitationSummary
  platformSessions?: Record<string, number>
  contentGroup?: string
  llmJourney?: string
  provider?: string
  recommendedAction: 'create-content' | 'regenerate-content'
  actionableReason: ActionableReason
  hasMappingWarning?: boolean
  mapping?: ActionableUrlMapping
}



# Complete Onboarding to Dashboard Flow

## 🎬 The Complete Journey

### Phase 1: Onboarding (Data Collection & Processing)

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Website Analysis                                       │
│  📍 /onboarding/website                                         │
├─────────────────────────────────────────────────────────────────┤
│  User Input: https://stripe.com                                │
│  ↓                                                              │
│  POST /api/analysis/analyze                                    │
│  ↓                                                              │
│  ✅ Saves to DB:                                               │
│     • UrlAnalysis (brand context)                              │
│     • 6 Competitors                                            │
│     • 8 Topics                                                 │
│     • 4 Personas                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Step 2-4: User Selections                                      │
│  📍 /onboarding/competitors, /topics, /personas                │
├─────────────────────────────────────────────────────────────────┤
│  User selects:                                                 │
│     ✓ 3 competitors (PayPal, Authorize.net, GoCardless)       │
│     ✓ 2 topics (Revenue Automation, Global Payments)          │
│     ✓ 2 personas (Startup Founder, Platform Operator)         │
│  ↓                                                              │
│  PUT /api/competitors/:id (set selected=true)                 │
│  PUT /api/topics/:id (set selected=true)                      │
│  PUT /api/personas/:id (set selected=true)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Step 5: LLM Platform Selection & Execution 🚀                 │
│  📍 /onboarding/llm-platforms                                  │
├─────────────────────────────────────────────────────────────────┤
│  User selects: GPT-4, Gemini, Claude, Perplexity              │
│  ↓                                                              │
│  🔄 Button: "Generate Prompts"                                 │
│  ↓                                                              │
│  POST /api/prompts/generate                                    │
│  ↓                                                              │
│  ✅ Generates 20 prompts (2 topics × 2 personas × 5 prompts)   │
│  ✅ Saves Prompt documents to DB                               │
│  ────────────────────────────────────────────────────────────  │
│  🔄 Status: "Testing with LLMs..."                            │
│  ↓                                                              │
│  POST /api/prompts/test                                        │
│  ↓                                                              │
│  ✅ Tests 20 prompts × 4 platforms = 80 tests                  │
│  ✅ Saves 80 PromptTest results with:                          │
│     • Brand mentions & positions                               │
│     • Citations (brand, earned, social)                        │
│     • Sentiment analysis                                       │
│     • Depth of mention (sentence-level)                        │
│  ────────────────────────────────────────────────────────────  │
│  🔄 Status: "Calculating metrics..." ⭐ CRITICAL               │
│  ↓                                                              │
│  POST /api/metrics/calculate                                   │
│  ↓                                                              │
│  ✅ Aggregates 80 test results into metrics:                   │
│     • 1 Overall aggregation                                    │
│     • 4 Platform aggregations (GPT, Gemini, Claude, Perplexity)│
│     • 2 Topic aggregations                                     │
│     • 2 Persona aggregations                                   │
│  ✅ Saves 9 AggregatedMetrics documents                        │
│  ────────────────────────────────────────────────────────────  │
│  🔄 Status: "Generating insights..." ⭐ NEW                    │
│  ↓                                                              │
│  POST /api/insights/generate                                   │
│  ↓                                                              │
│  ✅ LLM analyzes metrics and generates:                        │
│     • "What's Working" insights                                │
│     • "Needs Attention" insights                               │
│     • Recommendations & action steps                           │
│  ✅ Saves PerformanceInsights document                         │
│  ────────────────────────────────────────────────────────────  │
│  🎉 Status: "See Results"                                      │
│  ↓                                                              │
│  User clicks → Redirects to /dashboard                         │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Dashboard (Data Display)

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard Load                                                 │
│  📍 /dashboard                                                  │
├─────────────────────────────────────────────────────────────────┤
│  useEffect runs → dashboardService.getDashboardData()          │
│  ↓                                                              │
│  Parallel API calls (7 requests):                              │
│  ────────────────────────────────────────────────────────────  │
│  1. GET /api/metrics/aggregated?scope=overall                  │
│     → Returns: Overall brand metrics, citations, sentiment     │
│  ────────────────────────────────────────────────────────────  │
│  2. GET /api/metrics/aggregated?scope=platform                 │
│     → Returns: Array of 4 platform-specific metrics            │
│  ────────────────────────────────────────────────────────────  │
│  3. GET /api/metrics/aggregated?scope=topic                    │
│     → Returns: Array of 2 topic-specific metrics               │
│  ────────────────────────────────────────────────────────────  │
│  4. GET /api/metrics/aggregated?scope=persona                  │
│     → Returns: Array of 2 persona-specific metrics             │
│  ────────────────────────────────────────────────────────────  │
│  5. GET /api/competitors                                       │
│     → Returns: Array of 6 competitors (3 selected)             │
│  ────────────────────────────────────────────────────────────  │
│  6. GET /api/topics                                            │
│     → Returns: Array of 8 topics (2 selected)                  │
│  ────────────────────────────────────────────────────────────  │
│  7. GET /api/personas                                          │
│     → Returns: Array of 4 personas (2 selected)                │
│  ────────────────────────────────────────────────────────────  │
│  ↓                                                              │
│  transformAggregatedMetricsToDashboardData()                   │
│  ↓                                                              │
│  ✅ DashboardData object created with:                         │
│     • metrics (visibility, sentiment, citations)               │
│     • topicRankings                                            │
│     • competitors                                              │
│     • filters (platforms, topics, personas)                    │
│  ────────────────────────────────────────────────────────────  │
│  📊 Renders 4 Tabs:                                            │
│     ✅ Visibility Tab                                          │
│        • Share of Voice                                        │
│        • Depth of Mention                                      │
│        • Average Position                                      │
│        • Topic Rankings                                        │
│     ✅ Prompts Tab                                             │
│        • Prompt Performance                                    │
│        • Performance Insights                                  │
│     ✅ Sentiment Tab                                           │
│        • Sentiment Score                                       │
│        • Sentiment Breakdown                                   │
│     ✅ Citations Tab                                           │
│        • Citation Share                                        │
│        • Citation Types (brand, earned, social)                │
└─────────────────────────────────────────────────────────────────┘
```

## 🔑 Key Success Factors

### ✅ What Makes It Work Now

1. **Complete Flow Execution During Onboarding**
   - Previously: Only steps 1-4 ran, no metrics calculated
   - Now: Steps 1-6 run, including metrics & insights ✅

2. **Correct API Method Names**
   - Previously: `calculateAllMetrics()` (didn't exist)
   - Now: `calculateMetrics()` ✅

3. **Proper Error Handling**
   - Previously: Failed silently or crashed
   - Now: Graceful fallbacks with helpful messages ✅

4. **MongoDB Field Handling**
   - Previously: Confused about `_id` vs `id`
   - Now: Handles both correctly ✅

5. **Data Availability Check**
   - Previously: Assumed data exists
   - Now: Checks and shows helpful message if missing ✅

## 📈 Data Storage Hierarchy

```
User (JWT Token)
  └─> UrlAnalysis
       ├─> Competitors (6 total, 3 selected)
       ├─> Topics (8 total, 2 selected)
       ├─> Personas (4 total, 2 selected)
       ├─> Prompts (20 generated)
       │    └─> PromptTests (80 results: 20 × 4 platforms)
       │         └─> AggregatedMetrics (9 documents)
       │              ├─> 1 Overall
       │              ├─> 4 Platform-level
       │              ├─> 2 Topic-level
       │              └─> 2 Persona-level
       └─> PerformanceInsights (1 document)
            ├─> What's Working insights
            └─> Needs Attention insights
```

## 🎯 User Experience Flow

1. **Sign Up/Sign In** → Get JWT token
2. **Enter Website URL** → AI analyzes site
3. **Review & Select** → Choose competitors, topics, personas
4. **Generate & Test** → AI creates prompts, tests with LLMs
5. **Calculate Metrics** → Backend aggregates all results ⭐
6. **Generate Insights** → AI analyzes metrics ⭐
7. **See Results** → Dashboard displays everything beautifully! 🎉

## 🚨 What Happens If User Skips Onboarding?

```typescript
// Dashboard checks for data
if (!overallMetrics.data && !competitors.data?.length) {
  // Shows friendly message:
  return (
    <div>
      <h2>No data available. Please complete the onboarding flow first.</h2>
      <button>Start Onboarding</button>
    </div>
  )
}
```

---

**The key insight**: Metrics MUST be calculated during onboarding, not when dashboard loads. The dashboard is a **read-only view** of pre-calculated data! 🎯




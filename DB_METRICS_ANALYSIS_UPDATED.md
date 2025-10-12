# Database Metrics Analysis - Rankly MongoDB

## Database Overview
**Database:** `rankly`
**Total Collections:** 9
**Last Updated:** October 11, 2025

---

## 🚀 Complete Onboarding & Data Pipeline Flow

### Onboarding Process Overview
The Rankly onboarding guides users through a comprehensive 8-step process that generates all necessary data for the analytics dashboard.

### **Step-by-Step Flow:**

```
1. /onboarding/signup
   └─ User registration with Google OAuth
   └─ Creates user account in MongoDB

2. /onboarding/signin
   └─ Authentication & JWT token generation
   └─ Sets up authenticated session

3. /onboarding/website
   └─ API: POST /api/onboarding/analyze-website
   └─ AI Analysis: OpenAI GPT-4o analyzes website URL
   └─ Generates:
      • Brand context (company name, description, industry)
      • Competitors (4-6 AI-detected competitors with URLs)
      • Topics (4-6 relevant discussion topics)
      • Personas (4-6 user personas)
   └─ Stores: urlanalyses collection

4. /onboarding/competitors
   └─ User selects up to 4 competitors
   └─ Stores selections in OnboardingContext (frontend)
   └─ Saves to: competitors collection

5. /onboarding/topics
   └─ User selects up to 2 topics
   └─ Stores selections in OnboardingContext (frontend)
   └─ Saves to: topics collection

6. /onboarding/personas
   └─ User selects up to 2 personas
   └─ Stores selections in OnboardingContext (frontend)
   └─ Saves to: personas collection

7. /onboarding/llm-platforms
   └─ API: POST /api/onboarding/update-selections
      • Saves all selections to database

   └─ API: POST /api/onboarding/generate-prompts
      • Formula: Topics (2) × Personas (2) × QueryTypes (2) = ~8 prompts
      • Stores: prompts collection

   └─ API: POST /api/prompts/test
      • Tests all prompts on 4 LLM platforms:
        - OpenAI (ChatGPT-4)
        - Google Gemini
        - Anthropic Claude
        - Perplexity AI
      • Total tests: ~8 prompts × 4 platforms = 32 tests
      • Stores: prompttests collection (with full response analysis)

   └─ API: POST /api/metrics/calculate
      • Aggregates metrics across all scopes:
        - overall (1 document)
        - platform (4 documents - one per LLM)
        - topic (2 documents)
        - persona (2 documents)
      • Calculates visibility, sentiment, citations for each brand
      • Stores: aggregatedmetrics collection
      • **Auto-generates AI insights** using OpenAI GPT-4o
      • Stores: performanceinsights collection

8. /onboarding/results
   └─ Displays completion status
   └─ Redirects to /dashboard

9. /dashboard
   └─ Main analytics dashboard (4 tabs)
   └─ API: GET /api/dashboard/all (loads all data + AI insights)
```

### **Key Backend Services:**

1. **Website Analysis Service** (`services/websiteAnalysisService.js`)
   - Uses OpenAI GPT-4o to analyze brand website
   - Extracts brand context, competitors, topics, personas
   - Stores results in `urlanalyses` collection

2. **Prompt Generation Service** (`services/promptGenerationService.js`)
   - Generates prompts using Topics × Personas × QueryTypes formula
   - Creates varied query types (Navigational, Commercial Investigation, etc.)
   - Stores in `prompts` collection

3. **Multi-LLM Testing Service** (`services/promptTestingService.js`)
   - Tests prompts on 4 LLM platforms in parallel
   - Extracts brand mentions, citations, sentiment from responses
   - Performs sentence-level analysis for depth calculation
   - Stores detailed results in `prompttests` collection

4. **Metrics Aggregation Service** (`services/metricsAggregationService.js`)
   - Aggregates data across multiple scopes (overall, platform, topic, persona)
   - Calculates visibility scores, rankings, sentiment, citations
   - Uses exponential decay for depth of mention calculation
   - Stores aggregated data in `aggregatedmetrics` collection

5. **AI Insights Generation Service** (`services/insightsGenerationService.js`)
   - **Auto-triggered** after metrics aggregation
   - Uses OpenAI GPT-4o to analyze metrics and generate insights
   - Categorizes insights: "what's working" vs "needs attention"
   - Provides actionable recommendations
   - Stores in `performanceinsights` collection

### **Data Flow Diagram:**

```
User Input (Website URL, Selections)
    ↓
Website Analysis (OpenAI GPT-4o)
    ↓
User Selections (Competitors, Topics, Personas)
    ↓
Prompt Generation (Topics × Personas × QueryTypes)
    ↓
Multi-LLM Testing (OpenAI, Gemini, Claude, Perplexity)
    ↓
Raw Test Results (prompttests collection)
    ↓
Metrics Aggregation (overall, platform, topic, persona)
    ↓
Aggregated Metrics (aggregatedmetrics collection)
    ↓
AI Insights Generation (OpenAI GPT-4o) ← AUTO-TRIGGERED
    ↓
Performance Insights (performanceinsights collection)
    ↓
Dashboard Display (/api/dashboard/all)
```

---

## 📊 Collections Summary

### 1. **aggregatedmetrics** (14 documents) ⬆️ UPDATED
Main collection for dashboard metrics, organized by scope.

**Current Document Breakdown:**
- `overall` (1 document) - All data aggregated across platforms, topics, personas
- `platform` (4 documents) - Per platform: openai, gemini, claude, perplexity
- `topic` (varies) - Per selected topic
- `persona` (varies) - Per selected persona

**Document Structure:**
```javascript
{
  _id: ObjectId,
  scope: "overall" | "platform" | "topic" | "persona",
  scopeValue: String, // e.g., "all", "openai", "Family Manager"
  userId: String,

  // Aggregation metadata
  totalBrands: Number,
  totalPrompts: Number,
  totalResponses: Number,
  dateFrom: Date,
  dateTo: Date,
  lastCalculated: Date,
  promptTestIds: [String],
  urlAnalysisId: null,

  // Brand-level metrics array
  brandMetrics: [
    {
      brandId: String,
      brandName: String,

      // ✅ Visibility Metrics
      visibilityScore: Number,      // ✅ NOW STORED (0-100%)
      visibilityRank: Number,        // ✅ NOW STORED
      totalMentions: Number,
      mentionRank: Number,
      shareOfVoice: Number,          // Percentage
      shareOfVoiceRank: Number,
      avgPosition: Number,           // Average position in response
      avgPositionRank: Number,
      depthOfMention: Number,        // Position-weighted word percentage
      depthRank: Number,

      // Position Distribution
      count1st: Number,              // # of 1st position appearances
      count2nd: Number,
      count3rd: Number,
      rank1st: Number,
      rank2nd: Number,
      rank3rd: Number,
      totalAppearances: Number,      // Unique prompts where brand appears

      // Citation Metrics
      citationShare: Number,         // Percentage
      citationShareRank: Number,
      brandCitationsTotal: Number,
      earnedCitationsTotal: Number,
      socialCitationsTotal: Number,
      totalCitations: Number,

      // Sentiment Metrics
      sentimentScore: Number,        // -1 to 1 scale
      sentimentShare: Number,        // Percentage with positive sentiment
      sentimentBreakdown: {
        positive: Number,            // Count of positive responses
        neutral: Number,
        negative: Number,
        mixed: Number
      }
    }
  ]
}
```

**✅ Verified Schema Fields (MongoDB Confirmed):**
- All visibility metrics present including `visibilityScore` and `visibilityRank`
- All citation metrics storing real data
- All sentiment metrics with breakdown
- Position distribution metrics

---

### 2. **prompttests** (24 documents) ⬆️ UPDATED
Individual prompt test results from LLM platforms.

**Current State:**
- 24 test results across 4 LLM platforms
- Each test includes full response analysis
- Sentence-level brand mention tracking
- Citation extraction and classification
- Sentiment analysis with drivers

**Document Structure:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  urlAnalysisId: ObjectId,
  promptId: ObjectId,
  topicId: ObjectId,
  personaId: ObjectId,

  // Test Configuration
  promptText: String,
  queryType: String,  // "Navigational", "Commercial Investigation", etc.
  llmProvider: String, // "openai", "gemini", "claude", "perplexity"
  llmModel: String,

  // Response Data
  rawResponse: String,
  responseTime: Number,    // milliseconds
  tokensUsed: Number,
  cost: Number,

  // Scorecard (aggregated from brandMetrics)
  scorecard: {
    brandMentioned: Boolean,
    brandPosition: Number | null,
    brandMentionCount: Number,
    citationPresent: Boolean,
    citationType: String,  // "none", "brand", "earned", "social"
    brandCitations: Number,
    earnedCitations: Number,
    socialCitations: Number,
    totalCitations: Number,
    sentiment: String,     // "positive", "neutral", "negative", "mixed"
    sentimentScore: Number,
    competitorsMentioned: [String]
  },

  // Detailed Brand Analysis
  brandMetrics: [
    {
      brandName: String,
      mentioned: Boolean,
      firstPosition: Number,
      mentionCount: Number,

      // Sentence-level analysis
      sentences: [
        {
          text: String,
          position: Number,  // Position in response
          wordCount: Number,
          _id: ObjectId
        }
      ],

      totalWordCount: Number,

      // Citations
      citationMetrics: {
        brandCitations: Number,
        earnedCitations: Number,
        socialCitations: Number,
        totalCitations: Number
      },

      // Sentiment
      sentiment: String,
      sentimentScore: Number,
      sentimentDrivers: [
        {
          text: String,
          sentiment: String,
          keywords: [String],
          _id: ObjectId
        }
      ],

      citations: [
        {
          url: String,
          type: String,  // "direct_link", "reference", "mention"
          context: String,
          _id: ObjectId
        }
      ]
    }
  ],

  // Response metadata
  responseMetadata: {
    totalSentences: Number,
    totalWords: Number,
    totalBrandsDetected: Number
  },

  // Status
  status: String,
  scoredAt: Date,
  testedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3. **prompts** Collection
Stores user-created prompts generated during onboarding.

**Fields:**
- promptId
- userId
- text (the actual prompt text)
- topicId
- personaId
- status (active/inactive)
- queryType

---

### 4. **topics** Collection
Topic definitions/categories from onboarding.

**Fields:**
- topicId
- name (e.g., "Lifestyle Benefits and Merchant Partnerships")
- userId
- description
- selected (Boolean - user selection status)

---

### 5. **personas** Collection
User persona definitions from onboarding.

**Fields:**
- personaId
- type (e.g., "Family Manager")
- userId
- description
- selected (Boolean - user selection status)

---

### 6. **competitors** Collection
Competitor brand definitions from onboarding.

**Fields:**
- brandId
- brandName
- url
- userId
- selected (Boolean - user selection status)
- metadata

---

### 7. **users** Collection
User accounts and authentication.

**Fields:**
- email
- name
- googleId (for OAuth)
- createdAt
- updatedAt

---

### 8. **urlanalyses** Collection
URL analysis results from website analysis step.

**Fields:**
- url
- domain
- userId
- brandContext (AI-extracted company info)
- competitors (AI-detected competitors)
- topics (AI-suggested topics)
- personas (AI-suggested personas)
- analysisDate
- status

---

### 9. **performanceinsights** Collection (7 documents) ⬆️ UPDATED
**Status:** ✅ **ACTIVE - AI-Powered Insights Fully Integrated**

**Auto-Generated:** After every metrics aggregation
**AI Model:** OpenAI GPT-4o
**Integration:** Fully integrated into `/api/dashboard/all` endpoint
**Current State:** 7 insights documents actively storing AI-generated recommendations

**Document Structure:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  urlAnalysisId: ObjectId | null,
  model: String,  // "gpt-4o"
  promptVersion: String,  // Version of prompt used for generation

  // Metrics snapshot at time of generation
  metricsSnapshot: {
    totalTests: Number,
    totalBrands: Number,
    totalPrompts: Number,
    dateRange: {
      from: Date,
      to: Date
    },
    platforms: [String],
    topics: [String],
    personas: [String]
  },

  // AI-generated insights array
  insights: [
    {
      insightId: String,
      title: String,
      description: String,
      category: 'whats_working' | 'needs_attention',
      type: 'trend' | 'performance' | 'comparison' | 'opportunity' | 'warning',

      // Associated metrics
      primaryMetric: String,  // e.g., "Share of Voice", "Avg Position"
      secondaryMetrics: [String],

      // Quantitative data
      currentValue: Number,
      previousValue: Number,
      changePercent: Number,
      trend: 'up' | 'down' | 'stable',

      // Impact assessment
      impact: 'high' | 'medium' | 'low',
      confidence: Number,  // 0-1 scale

      // AI recommendations
      recommendation: String,
      actionableSteps: [String],

      // Context
      timeframe: String,
      scope: String,
      scopeValue: String,
      icon: String,
      color: String,
      generatedAt: Date,

      // Data source tracking
      dataSource: {
        metricType: String,
        aggregationLevel: String,
        testCount: Number,
        dateRange: {
          from: Date,
          to: Date
        }
      }
    }
  ],

  // Summary statistics
  summary: {
    whatsWorkingCount: Number,
    needsAttentionCount: Number,
    highImpactCount: Number,
    topInsight: String,
    overallSentiment: String
  },

  status: String,  // "generated"
  generatedAt: Date
}
```

**Example Insights Generated:**
1. **"Dominant Share of Voice"** (What's Working)
   - 85.71% share of voice
   - High impact
   - Recommendation: Capitalize on leading position

2. **"High Average Position"** (What's Working)
   - Average position: 1
   - Strong visibility in brand mentions
   - Recommendation: Maintain effective marketing strategies

3. **"Low Sentiment Score"** (Needs Attention)
   - Sentiment score: 0.09
   - Medium impact
   - Recommendation: Improve customer sentiment

4. **"Increased Depth of Mention"** (What's Working)
   - Depth score: 7.41%
   - Detailed discussions
   - Recommendation: Promote in-depth content

---

## 📡 Backend API Endpoints

### **Primary Dashboard Endpoint (Recommended)**

#### `GET /api/dashboard/all` ✅ **ACTIVE & INTEGRATED**
**Purpose:** Get all dashboard data in a single request (includes AI insights)

**Query Parameters:**
- `dateFrom` (optional) - Filter by date range start
- `dateTo` (optional) - Filter by date range end

**Response Structure:**
```javascript
{
  success: true,
  data: {
    // Core metrics by scope
    overall: AggregatedMetrics,           // scope: 'overall'
    platforms: AggregatedMetrics[],       // scope: 'platform' (4 items)
    topics: AggregatedMetrics[],          // scope: 'topic'
    personas: AggregatedMetrics[],        // scope: 'persona'

    // Formatted data for frontend components
    visibility: {...},
    depthOfMention: {...},
    averagePosition: {...},
    topicRankings: [...],
    personaRankings: [...],
    performanceInsights: {...},

    // ✅ AI-Powered Performance Insights
    aiInsights: {
      whatsWorking: Insight[],
      needsAttention: Insight[],
      all: Insight[],
      summary: {
        whatsWorkingCount: Number,
        needsAttentionCount: Number,
        highImpactCount: Number,
        topInsight: String,
        overallSentiment: String
      },
      metadata: {
        id: ObjectId,
        generatedAt: Date,
        model: String,
        totalTests: Number
      }
    },

    // Raw platform data for citation analysis
    platformMetrics: AggregatedMetrics[],

    lastUpdated: Date
  }
}
```

**Frontend Usage:**
```typescript
// services/dashboardService.ts
const dashboardResponse = await apiService.getDashboardAll({
  dateFrom: filters.dateFrom,
  dateTo: filters.dateTo
})

// Response includes both metrics AND AI insights
const { overall, platforms, topics, personas, aiInsights } = dashboardResponse.data
```

---

### **Onboarding API Endpoints**

```
POST /api/onboarding/analyze-website
  Body: { url: String }
  Response: { competitors, topics, personas, brandContext }

POST /api/onboarding/update-selections
  Body: { competitors: [String], topics: [String], personas: [String] }
  Response: { success: Boolean }

POST /api/onboarding/generate-prompts
  Response: { prompts: [...], totalPrompts: Number }

POST /api/prompts/test
  Response: { tests: [...], totalTests: Number }

POST /api/metrics/calculate
  Response: {
    totalCalculations: Number,
    scopes: ['overall', 'platform', 'topic', 'persona'],
    insightsGenerated: Boolean  // ✅ Auto-generates AI insights
  }
```

---

### **Alternative Metrics Endpoints (Fallback)**

```
GET /api/metrics/aggregated?scope={scope}
  Returns: Single or array of AggregatedMetrics

GET /api/metrics/overall
  Returns: Overall aggregated metrics

GET /api/metrics/platform/:platform
  Returns: Platform-specific metrics

GET /api/metrics/topic/:topic
  Returns: Topic-specific metrics

GET /api/metrics/persona/:persona
  Returns: Persona-specific metrics

GET /api/metrics/analyses
  Returns: List of all URL analyses for user
```

---

### **AI Insights API Endpoints** ✅ **NEW**

```
POST /api/insights/generate
  Body: { urlAnalysisId?: String }
  Response: { insights: [...], summary: {...}, metadata: {...} }
  Note: Auto-called after metrics calculation

GET /api/insights/latest
  Query: { urlAnalysisId?: String }
  Response: { insights: {...}, summary: {...}, metadata: {...} }

GET /api/insights/history
  Query: { urlAnalysisId?: String, limit?: Number }
  Response: { history: [...] }

GET /api/insights/:insightId
  Response: { insight: {...}, context: {...} }
```

---

### **Entity Management Endpoints**

```
GET  /api/competitors
POST /api/competitors
PUT  /api/competitors/:id
DELETE /api/competitors/:id

GET  /api/topics
POST /api/topics
PUT  /api/topics/:id
DELETE /api/topics/:id

GET  /api/personas
POST /api/personas
PUT  /api/personas/:id
DELETE /api/personas/:id
```

---

## 🎨 Frontend Integration

### **Dashboard Service** (`services/dashboardService.ts`)

**Primary Method:**
```typescript
async getDashboardData(filters: DashboardFilters = {}): Promise<DashboardServiceResponse<DashboardData>>
```

**Features:**
- Calls `/api/dashboard/all` as primary endpoint
- Fallback to individual endpoints if primary fails
- 5-minute cache duration
- Automatic data transformation via `dataTransform.ts`
- Includes AI insights in response

**Usage:**
```typescript
const response = await dashboardService.getDashboardData({
  platforms: ['openai', 'gemini'],
  topics: ['topicId1'],
  personas: ['personaId1'],
  selectedAnalysisId: 'analysisId'
})

// Response includes:
// - response.data.overall
// - response.data.platforms
// - response.data.topics
// - response.data.personas
// - response.data.aiInsights ✅
```

---

### **Data Transformation** (`services/dataTransform.ts`)

**Key Functions:**

1. **`transformAggregatedMetricsToDashboardData()`**
   - Transforms raw MongoDB data to frontend format
   - Creates competitor rankings for each metric type
   - Extracts topic and persona rankings
   - Builds filter options

2. **`transformBrandMetricsToCompetitors(type)`**
   - Creates competitor rankings by metric type:
     - `'competitors'` - Visibility rankings (default)
     - `'competitorsByDepth'` - Depth of mention rankings
     - `'competitorsByPosition'` - Average position rankings
     - `'competitorsBySov'` - Share of voice rankings
     - `'competitorsByCitation'` - Citation share rankings

3. **`transformTopicsToTopicRankings()`**
   - Transforms topic metrics to rankings format
   - Includes all competitors per topic

4. **`transformFilters()`**
   - Builds filter options for UI from metrics data

**Example Usage:**
```typescript
// In dashboardService.ts
const dashboardData = transformAggregatedMetricsToDashboardData(
  overallMetrics.data,
  platformMetrics.data || [],
  topicMetrics.data || [],
  personaMetrics.data || [],
  competitors.data || [],
  topics.data || [],
  personas.data || []
)

// Returns transformed data with:
// - metrics.competitors (visibility rankings)
// - metrics.competitorsByDepth
// - metrics.competitorsBySov
// - metrics.competitorsByCitation
// - metrics.topicRankings
// - metrics.personaRankings
```

---

### **Dashboard Tabs** (`components/tabs/`)

#### **1. VisibilityTab** (`tabs/VisibilityTab.tsx`)
**Components:**
- `UnifiedVisibilitySection` - Visibility score rankings and charts
- `UnifiedDepthOfMentionSection` - Depth of mention analysis
- `UnifiedAveragePositionSection` - Average position rankings
- `UnifiedTopicRankingsSection` - Topic performance
- `UnifiedPersonaRankingsSection` - Persona performance

**Data Sources:**
```typescript
dashboardData.metrics.competitors           // Visibility rankings
dashboardData.metrics.competitorsByDepth    // Depth rankings
dashboardData.metrics.competitorsByPosition // Position rankings
dashboardData.metrics.topicRankings         // Topic data
dashboardData.metrics.personaRankings       // Persona data
```

#### **2. SentimentTab** (`tabs/SentimentTab.tsx`)
**Components:**
- `UnifiedSentimentSection` - Overall sentiment with breakdown
- `SentimentBreakdownSection` - Topic/Persona sentiment analysis

**Data Sources:**
```typescript
dashboardData.metrics.competitors[0].sentimentScore
dashboardData.metrics.competitors[0].sentimentBreakdown
dashboardData.metrics.topicRankings  // For topic sentiment
dashboardData.metrics.personaRankings  // For persona sentiment
```

#### **3. CitationsTab** (`tabs/CitationsTab.tsx`)
**Components:**
- `CitationShareSection` - Citation share rankings and charts
- `CitationTypesSection` - Brand/Earned/Social citation breakdown

**Data Sources:**
```typescript
dashboardData.metrics.competitorsByCitation  // Citation rankings
// Each competitor includes:
// - citationShare
// - brandCitationsTotal
// - earnedCitationsTotal
// - socialCitationsTotal
// - totalCitations
```

**✅ Real Citation Data (October 11, 2025):**
- HDFC Bank: 14 brand citations (100% citation share)
- Citations extracted from markdown links and bare URLs
- Brand-citation matching uses flexible core brand name logic
- Citation types: Brand (direct_link), Earned (reference), Social (mention)

#### **4. PromptsTab** (`tabs/PromptsTab.tsx`)
**Components:**
- Prompt builder interface
- Test results display

---

## 🎯 Available Metrics Breakdown

### ✅ Visibility Metrics (AVAILABLE & VERIFIED)
All in `aggregatedmetrics.brandMetrics`:
- ✅ `visibilityScore` - % of prompts where brand appears - **BACKEND CALCULATED & STORED**
- ✅ `visibilityRank` - Rank by visibility score - **BACKEND CALCULATED & STORED**
- ✅ `totalMentions` - How many times brand is mentioned
- ✅ `mentionRank` - Rank among competitors
- ✅ `shareOfVoice` - Percentage of total mentions
- ✅ `avgPosition` - Average position in responses (1 = first)
- ✅ `depthOfMention` - Position-weighted word percentage
- ✅ `count1st`, `count2nd`, `count3rd` - Position distribution
- ✅ `totalAppearances` - Unique prompts where brand appears

### ✅ Citation Metrics (AVAILABLE & INTEGRATED)
- ✅ `citationShare` - Percentage of citations - **FRONTEND INTEGRATED**
- ✅ `citationShareRank` - Rank by citation share - **FRONTEND INTEGRATED**
- ✅ `brandCitationsTotal` - Brand website citations - **FRONTEND INTEGRATED**
- ✅ `earnedCitationsTotal` - Third-party citations - **FRONTEND INTEGRATED**
- ✅ `socialCitationsTotal` - Social media citations - **FRONTEND INTEGRATED**
- ✅ `totalCitations` - All citations combined - **FRONTEND INTEGRATED**

**Integration Status:** ✅ **COMPLETE**
- Citation data flows: Database → API → `dataTransform.ts` → Frontend
- Components use real data from `competitorsByCitation`
- Dynamic scaling implemented (no hardcoded values)

**Current Data (Verified from MongoDB):**
```javascript
{
  "brandName": "HDFC Bank Freedom Credit Card",
  "citationShare": 100,
  "citationShareRank": 1,
  "brandCitationsTotal": 14,  // ✅ Real citations detected
  "earnedCitationsTotal": 0,
  "socialCitationsTotal": 0,
  "totalCitations": 14
}
```

### ✅ Sentiment Metrics (AVAILABLE & INTEGRATED)
- ✅ `sentimentScore` - Numeric score (-1 to 1) - **FRONTEND INTEGRATED**
- ✅ `sentimentShare` - % with positive sentiment
- ✅ `sentimentBreakdown.positive` - Count of positive mentions - **FRONTEND INTEGRATED**
- ✅ `sentimentBreakdown.neutral` - Count of neutral mentions - **FRONTEND INTEGRATED**
- ✅ `sentimentBreakdown.negative` - Count of negative mentions - **FRONTEND INTEGRATED**
- ✅ `sentimentBreakdown.mixed` - Count of mixed sentiment - **FRONTEND INTEGRATED**

**Integration Status:** ✅ **COMPLETE**
- Components: `UnifiedSentimentSection`, `SentimentBreakdownSection`
- Uses real data from MongoDB via `transformBrandMetricsToCompetitors()`

### ✅ Platform Metrics (AVAILABLE)
Separate `aggregatedmetrics` documents for:
- ✅ OpenAI (ChatGPT)
- ✅ Google Gemini
- ✅ Anthropic Claude
- ✅ Perplexity

Each platform has full brandMetrics array with all metrics.

### ✅ Topic Metrics (AVAILABLE)
- ✅ Topic-scoped aggregatedmetrics documents
- ✅ Same structure as overall metrics
- ✅ Available in dashboard via `topicRankings`

### ✅ Persona Metrics (AVAILABLE)
- ✅ Persona-scoped aggregatedmetrics documents
- ✅ Same structure as overall metrics
- ✅ Available in dashboard via `personaRankings`

### ✅ AI Performance Insights (AVAILABLE & INTEGRATED) ⬆️ NEW
- ✅ Auto-generated after metrics calculation
- ✅ Categorized: "what's working" vs "needs attention"
- ✅ Includes actionable recommendations
- ✅ Impact assessment (high/medium/low)
- ✅ Integrated in `/api/dashboard/all` response
- ✅ 7 insights documents currently stored

---

## 📐 Metric Calculation Formulas

### **Official Formulas - Quick Reference**

| Metric | Official Formula | Ranking |
|--------|------------------|---------|
| **Visibility Score** | `(# of prompts where brand appears / Total prompts) × 100` | Higher = Better (Rank 1) |
| **Share of Voice** | `(Total mentions of brand / Total mentions all brands) × 100` | Higher = Better (Rank 1) |
| **Average Position** | `Σ(positions) / # of prompts where brand appears` | **Lower = Better** (Rank 1) |
| **Depth of Mention** | `Σ[words × exp(−pos/total)] / total words × 100` | Higher = Better (Rank 1) |
| **Citation Share** | `(Brand citations / Total citations all brands) × 100` | Higher = Better (Rank 1) |
| **Sentiment Score** | `Σ(sentiment scores) / total responses` | Higher = Better (-1 to +1 scale) |

### **1. Visibility Score**
```javascript
// Backend: services/metricsAggregationService.js
const visibilityScore = (totalAppearances / totalPrompts) * 100

// Where:
// - totalAppearances = unique prompts where brand is mentioned
// - totalPrompts = total number of prompts tested
```

**Example:**
- Brand appears in 1 out of 2 prompts
- Visibility Score = (1 / 2) × 100 = **50%**

### **2. Share of Voice**
```javascript
const shareOfVoice = (brandMentions / totalMentionsAllBrands) * 100
```

**Example:**
- HDFC Bank: 12 mentions
- All brands total: 14 mentions
- Share of Voice = (12 / 14) × 100 = **85.71%**

### **3. Average Position**
```javascript
const avgPosition = Σ(first positions) / # of prompts with brand
```

**Important:** Lower is better (1 = first position)

### **4. Depth of Mention** (Position-Weighted)
```javascript
// Uses exponential decay - earlier mentions weighted more
let weightedWordCount = 0
sentences.forEach(sent => {
  const normalizedPosition = sent.position / totalSentences
  const decay = Math.exp(-normalizedPosition)
  weightedWordCount += sent.wordCount * decay
})
depthOfMention = (weightedWordCount / totalWordsAllResponses) * 100
```

**Why Exponential Decay?**
- First sentence: ~90.5% weight
- Mid response: ~60.6% weight
- Last sentence: ~36.8% weight
- **Earlier mentions are more prominent**

### **5. Citation Share**
```javascript
citationShare = (brandCitations / totalAllCitations) * 100
```

### **6. Sentiment Score**
```javascript
sentimentScore = Σ(individual scores) / totalResponses
// Range: -1.0 (very negative) to +1.0 (very positive)
```

---

## 📊 Current Database State (October 11, 2025)

### **Collection Statistics:**
- **Prompt Tests:** 24 test results ⬆️ (updated from 8)
- **Aggregated Metrics:** 14 documents ⬆️ (updated from 7)
  - 1 overall
  - 4 platform (openai, gemini, claude, perplexity)
  - Multiple topics
  - Multiple personas
- **Performance Insights:** 7 documents ✅ **ACTIVE**
- **User Brand:** HDFC Bank Freedom Credit Card
- **Competitors:** 2 (Chase Freedom Flex, Discover it Cash Back)

### **Example Data (From MongoDB):**

**Overall Metrics:**
```javascript
{
  scope: "overall",
  totalPrompts: 2,
  totalBrands: 3,
  brandMetrics: [
    {
      brandName: "HDFC Bank Freedom Credit Card",
      visibilityScore: 50,              // ✅ 1 out of 2 prompts
      visibilityRank: 1,
      totalMentions: 12,
      shareOfVoice: 85.71,
      avgPosition: 1,
      depthOfMention: 7.4101,
      citationShare: 100,               // ✅ 14 citations detected
      brandCitationsTotal: 14,
      totalCitations: 14,
      sentimentScore: 0.09,
      sentimentBreakdown: {
        positive: 1,
        neutral: 3,
        negative: 0,
        mixed: 0
      }
    },
    {
      brandName: "Chase Freedom Flex",
      visibilityScore: 50,
      shareOfVoice: 7.14,
      citationShare: 0,
      // ...
    },
    {
      brandName: "Discover it Cash Back",
      visibilityScore: 50,
      shareOfVoice: 7.14,
      citationShare: 0,
      // ...
    }
  ]
}
```

---

## 🔄 Data Quality & Status

### **✅ Excellent Coverage:**
- Core visibility metrics (mentions, position, share of voice)
- Sentiment analysis (scores and breakdown)
- Citation tracking (brand/earned/social)
- Platform-level segmentation
- AI-powered insights generation

### **⚠️ Areas for Enhancement:**
- Historical trend data (currently single snapshot)
- Individual citation URL details
- Traffic analytics (separate feature)
- Multi-analysis comparison

---

## 🚀 Recommendations for Future Development

### **High Priority:**
1. ✅ **Historical Tracking** - Store metric snapshots over time for trend analysis
2. ✅ **Citation URL Details** - Store individual citation URLs and metadata
3. ✅ **Multi-Analysis Comparison** - Compare performance across different URL analyses

### **Medium Priority:**
4. ✅ **Prompt-Level Aggregation** - `/api/analytics/prompts` endpoint
5. ✅ **Platform-Specific Insights** - AI insights per LLM platform
6. ✅ **Custom Date Range Filtering** - More flexible date filtering

### **Low Priority:**
7. ✅ **Export Functionality** - CSV/PDF export of metrics
8. ✅ **Traffic Analytics** - Separate analytics infrastructure for website traffic
9. ✅ **Competitive Benchmarking** - Industry benchmark comparisons

---

**Generated:** October 11, 2025
**Database:** rankly (MongoDB)
**Analysis Tool:** MongoDB MCP Server + Manual Code Review
**Version:** 4.0 - Complete system documentation with onboarding flow
**Verified:** All schemas, APIs, and data flows confirmed via MongoDB queries and code analysis

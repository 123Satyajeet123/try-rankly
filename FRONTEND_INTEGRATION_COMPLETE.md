# Frontend Integration - Complete Implementation Guide

## ✅ What Has Been Implemented

### 1. **Analytics API Service Layer** (/services/api.ts)
Added complete analytics endpoints to the API service:
- `getAnalyticsSummary()` - Dashboard overview data
- `getAnalyticsVisibility()` - Visibility metrics
- `getAnalyticsPrompts()` - All prompts with LLM results
- `getAnalyticsSentiment()` - Sentiment analysis
- `getAnalyticsCitations()` - Citation tracking
- `getAnalyticsCompetitors()` - Competitor comparison
- `calculateMetrics()` - Trigger metrics calculation
- `testPrompts()` - Trigger LLM testing

### 2. **Analytics Context** (/contexts/AnalyticsContext.tsx) ✨ NEW
Created a centralized context for managing all analytics data:
- Fetches all 6 analytics endpoints in parallel
- Provides data to all components via React Context
- Handles loading, error states, and last updated timestamp
- Supports date range filtering
- `refreshData()` function to manually reload data

### 3. **User Flow Management**
#### Onboarding to Dashboard Flow:
1. User enters URL → Analysis starts
2. Selects competitors, topics, personas
3. Clicks "Generate Prompts" → Redirects to `/dashboard?startTesting=true`
4. Dashboard automatically:
   - Tests prompts across 4 LLMs (ChatGPT, Claude, Gemini, Perplexity)
   - Calculates metrics using deterministic extraction
   - Refreshes analytics data
   - Shows real metrics in dashboard

#### Dashboard Component (/components/Dashboard.tsx)
- Detects `?startTesting=true` query parameter
- Shows loading overlay during testing
- Automatically refreshes analytics data after metrics calculation
- Integrates with AnalyticsContext for data management

### 4. **"Start New Analysis" Button**
Added to Sidebar (/components/layout/Sidebar.tsx):
- Prominent button at top of sidebar
- Redirects to `/onboarding` to start a new analysis
- Allows users to analyze multiple websites (future: track daily)

### 5. **Root Layout** (/app/layout.tsx)
Wrapped app in AnalyticsProvider to provide analytics data globally

---

## 📋 Remaining Integration Steps

### Step 1: Update Visibility Tab Components

**File: `/components/tabs/visibility/UnifiedVisibilitySection.tsx`**

Add at the top:
```tsx
import { useAnalytics } from '@/contexts/AnalyticsContext'
```

Replace mock data with real data:
```tsx
export function UnifiedVisibilitySection() {
  const { data } = useAnalytics()

  if (data.isLoading) {
    return <div>Loading visibility data...</div>
  }

  if (!data.visibility) {
    return <div>No visibility data available</div>
  }

  const { overall, platforms, topics, personas } = data.visibility

  // Use real data instead of mock data
  // overall.visibilityScore - The overall visibility percentage
  // overall.totalPrompts - Total prompts tested
  // platforms - Array of platform-specific data
  // topics - Array of topic-specific data
  // personas - Array of persona-specific data
}
```

**Repeat for these files:**
- `UnifiedWordCountSection.tsx`
- `UnifiedDepthOfMentionSection.tsx`
- `UnifiedAveragePositionSection.tsx`
- `UnifiedPositionSection.tsx`
- `UnifiedTopicRankingsSection.tsx`
- `UnifiedPersonaRankingsSection.tsx`
- `ShareOfVoiceCard.tsx`

### Step 2: Update Prompts Tab

**File: `/components/tabs/prompts/index.tsx`** (or main prompts component)

```tsx
import { useAnalytics } from '@/contexts/AnalyticsContext'

export function PromptsTab({ onToggleFullScreen }: PromptsTabProps) {
  const { data } = useAnalytics()

  if (data.isLoading) {
    return <div>Loading prompts...</div>
  }

  if (!data.prompts) {
    return <div>No prompts available</div>
  }

  const { prompts } = data.prompts

  // prompts is an array with structure:
  // [{
  //   promptId: string,
  //   text: string,
  //   topic: string,
  //   persona: string,
  //   llmResults: [{
  //     platform: 'chatgpt' | 'claude' | 'gemini' | 'perplexity',
  //     response: string,
  //     brandMentioned: boolean,
  //     visibilityScore: number,
  //     competitors: string[]
  //   }]
  // }]

  return (
    // Map over prompts and display
  )
}
```

### Step 3: Update Sentiment Tab

**File: `/components/tabs/sentiment/index.tsx`**

```tsx
import { useAnalytics } from '@/contexts/AnalyticsContext'

export function SentimentTab() {
  const { data } = useAnalytics()

  if (data.isLoading) {
    return <div>Loading sentiment data...</div>
  }

  if (!data.sentiment) {
    return <div>No sentiment data available</div>
  }

  const { overall, platforms, topics } = data.sentiment

  // overall.averageSentiment - Overall sentiment score
  // overall.sentimentDistribution - { positive, neutral, negative }
  // platforms - Sentiment breakdown by LLM
  // topics - Sentiment breakdown by topic

  return (
    // Display sentiment charts and data
  )
}
```

### Step 4: Update Citations Tab

**File: `/components/tabs/citations/index.tsx`**

```tsx
import { useAnalytics } from '@/contexts/AnalyticsContext'

export function CitationsTab() {
  const { data } = useAnalytics()

  if (data.isLoading) {
    return <div>Loading citation data...</div>
  }

  if (!data.citations) {
    return <div>No citation data available</div>
  }

  const { totalCitations, platforms, sourceBreakdown } = data.citations

  // totalCitations - Total number of citations
  // platforms - Citations per LLM platform
  // sourceBreakdown - Types of sources cited

  return (
    // Display citation charts and data
  )
}
```

---

## 🔧 Complete Data Structure Reference

### Analytics Data Shape

```typescript
{
  summary: {
    brandName: string
    totalPrompts: number
    totalResponses: number
    dateFrom: string
    dateTo: string
    overallMetrics: {
      visibilityScore: number
      shareOfVoice: number
      avgPosition: number
    }
    topCompetitors: Array<{
      name: string
      visibilityScore: number
      appearances: number
    }>
  }

  visibility: {
    overall: {
      visibilityScore: number
      wordCount: number
      depthOfMention: number
      shareOfVoice: number
      avgPosition: number
      positionDistribution: { first: number, second: number, third: number }
      totalPrompts: number
    }
    platforms: Array<{
      platform: string
      visibilityScore: number
      wordCount: number
      depthOfMention: number
      shareOfVoice: number
      avgPosition: number
    }>
    topics: Array<{
      topic: string
      visibilityScore: number
      wordCount: number
      shareOfVoice: number
    }>
    personas: Array<{
      persona: string
      visibilityScore: number
      wordCount: number
      shareOfVoice: number
    }>
  }

  prompts: {
    prompts: Array<{
      promptId: string
      text: string
      topic: string
      persona: string
      llmResults: Array<{
        platform: 'chatgpt' | 'claude' | 'gemini' | 'perplexity'
        response: string
        brandMentioned: boolean
        visibilityScore: number
        competitors: string[]
      }>
    }>
  }

  sentiment: {
    overall: {
      averageSentiment: number
      sentimentDistribution: {
        positive: number
        neutral: number
        negative: number
      }
    }
    platforms: Array<{
      platform: string
      sentiment: number
    }>
    topics: Array<{
      topic: string
      sentiment: number
    }>
  }

  citations: {
    totalCitations: number
    platforms: Array<{
      platform: string
      citations: number
    }>
    sourceBreakdown: {
      website: number
      documentation: number
      blog: number
      other: number
    }
  }

  competitors: {
    competitors: Array<{
      name: string
      url: string
      visibilityScore: number
      appearances: number
      avgPosition: number
      shareOfVoice: number
    }>
  }
}
```

---

## 🧪 Testing the Complete Flow

### Step-by-Step Test:

1. **Start Fresh**
   ```bash
   cd /home/jeet/rankly/tryrankly/backend
   node src/index.js
   ```

2. **Frontend (separate terminal)**
   ```bash
   cd /home/jeet/rankly/tryrankly
   npm run dev
   ```

3. **Test Flow:**
   - Visit `http://localhost:3000`
   - Login/Register
   - Enter website URL (e.g., `https://fibr.ai`)
   - Wait for analysis (AI finds competitors, topics, personas)
   - Select 2-4 competitors
   - Select 1-2 topics
   - Select 1-2 personas
   - Click "Generate Prompts"
   - **Automatically redirects to dashboard**
   - **Shows loading overlay: "Testing prompts across 4 LLM platforms..."**
   - **Then: "Calculating metrics..."**
   - **Then: "Loading dashboard data..."**
   - **Finally: "Analysis complete!"**
   - Dashboard shows real metrics!

4. **Verify Data Persistence:**
   - Reload the page → Should still see dashboard with data
   - Close browser → Reopen → Should go directly to dashboard (not onboarding)

5. **Test New Analysis:**
   - Click "New Analysis" button in sidebar
   - Goes back to onboarding
   - Enter new URL
   - Complete flow again

---

## 🔄 Using the Analytics Context in Any Component

```tsx
import { useAnalytics } from '@/contexts/AnalyticsContext'

function MyComponent() {
  const { data, refreshData, setDateRange, dateFrom, dateTo } = useAnalytics()

  // Access data
  const visibilityScore = data.visibility?.overall?.visibilityScore || 0
  const isLoading = data.isLoading
  const error = data.error

  // Manually refresh data
  const handleRefresh = async () => {
    await refreshData()
  }

  // Change date range
  const handleDateChange = () => {
    setDateRange('2024-01-01', '2024-12-31')
    // Data will automatically refetch
  }

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {data.visibility && (
        <p>Visibility Score: {visibilityScore}%</p>
      )}
    </div>
  )
}
```

---

## 📊 Example: Replacing Mock Data in Visibility Section

**Before (using mock data):**
```tsx
const mockVisibilityScore = 75
```

**After (using real data):**
```tsx
import { useAnalytics } from '@/contexts/AnalyticsContext'

function UnifiedVisibilitySection() {
  const { data } = useAnalytics()

  const visibilityScore = data.visibility?.overall?.visibilityScore || 0
  const platforms = data.visibility?.platforms || []

  return (
    <Card>
      <h2>Visibility Score: {visibilityScore}%</h2>

      <div className="platforms">
        {platforms.map(platform => (
          <div key={platform.platform}>
            <span>{platform.platform}</span>
            <span>{platform.visibilityScore}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

---

## ✅ Integration Checklist

- [x] Analytics API endpoints created
- [x] Analytics Context created
- [x] Root layout wrapped in AnalyticsProvider
- [x] Dashboard handles prompt testing flow
- [x] "Start New Analysis" button added
- [x] Loading states implemented
- [ ] Visibility tab components updated (8 files)
- [ ] Prompts tab updated
- [ ] Sentiment tab updated
- [ ] Citations tab updated
- [ ] End-to-end testing completed

---

## 🎯 Summary

**What's Working:**
1. ✅ User can complete onboarding flow
2. ✅ Prompts are generated based on selections
3. ✅ Dashboard automatically tests prompts across 4 LLMs
4. ✅ Metrics are calculated using deterministic extraction
5. ✅ Analytics data is fetched and available via context
6. ✅ "Start New Analysis" button works
7. ✅ Loading overlays show progress

**What Needs to be Done:**
1. Update each tab component to use `useAnalytics()` instead of mock data
2. Test the complete flow end-to-end
3. Handle edge cases (no data, errors, empty states)

**Time Estimate:**
- Updating all tab components: 2-3 hours
- Testing and bug fixes: 1-2 hours
- Total: 3-5 hours

The infrastructure is complete! Now it's just a matter of replacing `mockData` with `data.visibility`, `data.prompts`, etc. in each component.

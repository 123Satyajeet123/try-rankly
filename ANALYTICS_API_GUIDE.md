# Analytics API Guide for Frontend Integration

## Overview

All analytics endpoints are now fully functional and ready for frontend integration. This guide shows you exactly how to connect each dashboard tab to its corresponding API endpoint.

---

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${authToken}`
}
```

---

## API Endpoints

### 1. `/api/analytics/summary` - Dashboard Overview
**Purpose**: High-level metrics for dashboard home page

**Response**:
```json
{
  "success": true,
  "data": {
    "hasData": true,
    "totalPrompts": 2,
    "totalTests": 8,
    "totalBrands": 31,
    "userBrand": {
      "name": "Fibr",
      "visibilityScore": 24.5,
      "visibilityRank": 5,
      "shareOfVoice": 15.2,
      "avgPosition": 2.8,
      "appearances": 12
    },
    "topCompetitors": [
      {
        "name": "Unbounce",
        "visibilityScore": 42.3,
        "rank": 1
      }
    ],
    "lastUpdated": "2025-10-05T12:00:00Z"
  }
}
```

**Frontend Usage**:
```typescript
// Dashboard home page summary cards
const { data } = await fetch('/api/analytics/summary');
const { userBrand, topCompetitors } = data.data;

// Display cards
<Card title="Your Visibility">
  <div>{userBrand.visibilityScore}%</div>
  <Badge>Rank #{userBrand.visibilityRank}</Badge>
</Card>
```

---

### 2. `/api/analytics/visibility` - Visibility Tab
**Purpose**: Complete visibility metrics for all tabs (Visibility, Word Count, Depth, etc.)

**Response**:
```json
{
  "success": true,
  "data": {
    "overall": {
      "visibilityScore": {
        "brands": [
          {
            "name": "DataFlow",
            "score": 59.4,
            "rank": 1,
            "change": 2
          }
        ],
        "chartData": [
          {
            "name": "DataFlow",
            "value": 59.4,
            "fill": "#3B82F6"
          }
        ]
      },
      "wordCount": { ... },
      "depthOfMention": { ... },
      "shareOfVoice": { ... },
      "avgPosition": { ... },
      "positionDistribution": {
        "brands": [
          {
            "name": "DataFlow",
            "1st": 15,
            "2nd": 8,
            "3rd": 5
          }
        ]
      }
    },
    "platforms": [
      {
        "name": "chatgpt",
        "visibilityScore": { ... },
        "brandMetrics": [...]
      }
    ],
    "topics": [
      {
        "name": "Landing Page Optimization",
        "rankings": {
          "topic": "Landing Page Optimization",
          "brands": [
            {
              "name": "Fibr",
              "score": 24.5,
              "rank": 1
            }
          ]
        }
      }
    ],
    "personas": [...],
    "lastUpdated": "2025-10-05T12:00:00Z"
  }
}
```

**Frontend Usage**:
```typescript
// Visibility Tab Component
const { data } = await fetch('/api/analytics/visibility');
const { overall, platforms, topics } = data.data;

// Visibility Score Chart
<BarChart data={overall.visibilityScore.chartData} />

// Share of Voice Donut Chart
<DonutChart data={overall.shareOfVoice.chartData} />

// Position Distribution Stacked Bar
<StackedBarChart data={overall.positionDistribution.brands} />

// Platform Breakdown
{platforms.map(platform => (
  <PlatformCard
    name={platform.name}
    data={platform.visibilityScore}
  />
))}

// Topic Rankings Table
<TopicRankingsTable topics={topics} />
```

---

### 3. `/api/analytics/prompts` - Prompts Tab
**Purpose**: All prompts with their test results across LLMs

**Response**:
```json
{
  "success": true,
  "data": {
    "prompts": [
      {
        "id": "prompt123",
        "text": "What are the best landing page builders?",
        "title": "Landing Page Tools",
        "queryType": "Commercial Investigation",
        "topic": "Landing Page Optimization",
        "persona": "Marketing Manager",
        "status": "active",
        "llmResults": {
          "chatgpt": {
            "response": "Full response text...",
            "visibilityScore": 45,
            "brandMentioned": true,
            "brandPosition": 2,
            "competitorsMentioned": ["Unbounce", "Instapage"],
            "responseTime": 1234,
            "testedAt": "2025-10-05T12:00:00Z"
          },
          "claude": { ... },
          "gemini": { ... },
          "perplexity": { ... }
        },
        "totalTests": 4,
        "avgVisibility": 38.5,
        "createdAt": "2025-10-05T10:00:00Z"
      }
    ],
    "summary": {
      "total": 50,
      "tested": 48,
      "avgVisibility": 42.3
    }
  }
}
```

**Frontend Usage**:
```typescript
// Prompts Tab
const { data } = await fetch('/api/analytics/prompts');
const { prompts } = data.data;

// Prompts Table
<PromptsTable>
  {prompts.map(prompt => (
    <PromptRow
      key={prompt.id}
      prompt={prompt}
      llmResults={prompt.llmResults}
      avgVisibility={prompt.avgVisibility}
    />
  ))}
</PromptsTable>

// LLM Comparison for a Prompt
<LLMComparison>
  {Object.entries(prompt.llmResults).map(([llm, result]) => (
    <LLMCard
      llm={llm}
      score={result.visibilityScore}
      brandMentioned={result.brandMentioned}
      response={result.response}
    />
  ))}
</LLMComparison>
```

---

### 4. `/api/analytics/sentiment` - Sentiment Tab
**Purpose**: Sentiment analysis of brand mentions

**Response**:
```json
{
  "success": true,
  "data": {
    "overall": {
      "positive": 15,
      "neutral": 28,
      "negative": 7
    },
    "byTopic": [
      {
        "topic": "Landing Page Optimization",
        "positive": 8,
        "neutral": 12,
        "negative": 2,
        "total": 22,
        "positiveRate": "36.4",
        "neutralRate": "54.5",
        "negativeRate": "9.1"
      }
    ]
  }
}
```

**Frontend Usage**:
```typescript
// Sentiment Tab
const { data } = await fetch('/api/analytics/sentiment');
const { overall, byTopic } = data.data;

// Overall Sentiment Donut
<DonutChart
  data={[
    { name: 'Positive', value: overall.positive, fill: '#10B981' },
    { name: 'Neutral', value: overall.neutral, fill: '#6B7280' },
    { name: 'Negative', value: overall.negative, fill: '#EF4444' }
  ]}
/>

// Sentiment by Topic Table
<SentimentTopicsTable topics={byTopic} />
```

---

### 5. `/api/analytics/citations` - Citations Tab
**Purpose**: Track citations and references to brand in LLM responses

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 12,
    "byType": {
      "direct_link": 5,
      "reference": 4,
      "mention": 3,
      "none": 38
    },
    "byPlatform": {
      "chatgpt": {
        "total": 12,
        "withCitation": 6,
        "citationRate": "50.0"
      },
      "claude": { ... },
      "gemini": { ... },
      "perplexity": { ... }
    }
  }
}
```

**Frontend Usage**:
```typescript
// Citations Tab
const { data } = await fetch('/api/analytics/citations');
const { total, byType, byPlatform } = data.data;

// Citation Types Breakdown
<BarChart
  data={[
    { name: 'Direct Link', value: byType.direct_link },
    { name: 'Reference', value: byType.reference },
    { name: 'Mention', value: byType.mention }
  ]}
/>

// Citation Rate by Platform
<PlatformCitationCards>
  {Object.entries(byPlatform).map(([platform, stats]) => (
    <Card key={platform}>
      <h3>{platform}</h3>
      <div>{stats.citationRate}% citation rate</div>
      <small>{stats.withCitation}/{stats.total} responses</small>
    </Card>
  ))}
</PlatformCitationCards>
```

---

### 6. `/api/analytics/competitors` - Competitor Analysis
**Purpose**: Detailed competitor comparison

**Response**:
```json
{
  "success": true,
  "data": {
    "brands": [
      {
        "rank": 1,
        "name": "Unbounce",
        "visibilityScore": 42.3,
        "shareOfVoice": 28.5,
        "avgPosition": 1.8,
        "appearances": 38,
        "totalPrompts": 50,
        "mentionRate": "76.0"
      }
    ],
    "totalBrands": 15,
    "totalPrompts": 50
  }
}
```

**Frontend Usage**:
```typescript
// Competitor Analysis Tab
const { data } = await fetch('/api/analytics/competitors');
const { brands } = data.data;

// Competitive Landscape Table
<CompetitorTable>
  {brands.map(brand => (
    <CompetitorRow
      key={brand.name}
      rank={brand.rank}
      name={brand.name}
      visibilityScore={brand.visibilityScore}
      shareOfVoice={brand.shareOfVoice}
      mentionRate={brand.mentionRate}
    />
  ))}
</CompetitorTable>

// Visual Comparison Chart
<CompetitorComparisonChart brands={brands.slice(0, 10)} />
```

---

## Complete Integration Example

Here's a complete example of integrating the Visibility tab:

```typescript
// components/tabs/visibility/index.tsx
'use client'

import { useState, useEffect } from 'react'
import { fetchVisibilityAnalytics } from '@/services/api'

export function VisibilityTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchVisibilityAnalytics()
        setData(response.data)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load visibility data:', error)
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!data) return <div>No data available</div>

  const { overall, platforms, topics } = data

  return (
    <div className="space-y-6">
      {/* Visibility Score Section */}
      <UnifiedVisibilitySection
        data={overall.visibilityScore}
      />

      {/* Word Count Section */}
      <UnifiedWordCountSection
        data={overall.wordCount}
      />

      {/* Share of Voice Section */}
      <ShareOfVoiceCard
        data={overall.shareOfVoice}
      />

      {/* Position Distribution */}
      <UnifiedPositionSection
        data={overall.positionDistribution}
      />

      {/* Topic Rankings */}
      <UnifiedTopicRankingsSection
        topics={topics}
      />

      {/* Platform Breakdown */}
      <PlatformBreakdown
        platforms={platforms}
      />
    </div>
  )
}
```

**API Service** (`services/api.ts`):

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

async function fetchWithAuth(endpoint: string) {
  const token = localStorage.getItem('authToken')

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

// Analytics API calls
export const fetchVisibilityAnalytics = () => fetchWithAuth('/analytics/visibility')
export const fetchPromptsAnalytics = () => fetchWithAuth('/analytics/prompts')
export const fetchSentimentAnalytics = () => fetchWithAuth('/analytics/sentiment')
export const fetchCitationsAnalytics = () => fetchWithAuth('/analytics/citations')
export const fetchCompetitorsAnalytics = () => fetchWithAuth('/analytics/competitors')
export const fetchSummaryAnalytics = () => fetchWithAuth('/analytics/summary')
```

---

## Data Flow Diagram

```
Frontend Dashboard
       ↓
  API Service Layer (services/api.ts)
       ↓
  Analytics API (/api/analytics/*)
       ↓
  AggregatedMetrics & PromptTest Collections
       ↓
  Formatted JSON Response
       ↓
  Dashboard Components
```

---

## Quick Start Checklist

- [ ] Copy `services/api.ts` to your frontend project
- [ ] Add `NEXT_PUBLIC_API_URL=http://localhost:5000/api` to `.env.local`
- [ ] Update each dashboard tab component to use real API calls
- [ ] Remove mock data imports
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test with real backend data

---

## Testing the APIs

Run the test suite to verify all endpoints:

```bash
cd backend
node tests/test-analytics-endpoints.js
```

Expected output: **6/6 endpoints passing (100%)**

---

## Next Steps

1. **Frontend Integration**: Start with the Summary endpoint for the dashboard home page
2. **Real-time Updates**: Add WebSocket support for live metrics updates
3. **Caching**: Implement frontend caching to reduce API calls
4. **Filters**: Add date range and platform filters to all endpoints
5. **Export**: Add CSV/PDF export functionality

---

## Support

All endpoints are documented in:
- **Technical Details**: `/backend/METRICS_SYSTEM.md`
- **Integration Guide**: This file
- **Test Results**: `/TEST_RESULTS.md`
- **Implementation Summary**: `/IMPLEMENTATION_SUMMARY.md`

For questions or issues, refer to the test scripts in `/backend/tests/`

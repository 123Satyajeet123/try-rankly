# Metrics System Integration Guide

## Quick Start

### 1. Test Your Prompts

After completing onboarding and generating prompts, test them across all LLMs:

```bash
POST /api/prompts/test
Authorization: Bearer <your-token>
```

This will:
- Test up to 2 prompts (configurable) across 4 LLMs
- Extract deterministic metrics from each response
- Store results in the database

**Response**:
```json
{
  "success": true,
  "message": "Testing completed: 8 total tests",
  "data": {
    "totalTests": 8,
    "completedTests": 8,
    "failedTests": 0,
    "summary": {
      "averageVisibilityScore": 45,
      "brandMentionRate": 75,
      "bestPerformingLLM": "claude"
    }
  }
}
```

---

### 2. Calculate Aggregated Metrics

After testing, calculate metrics across all dimensions:

```bash
POST /api/metrics/calculate
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "dateFrom": "2025-10-01",
  "dateTo": "2025-10-31"
}
```

This will calculate:
- Overall metrics (all prompts, all platforms)
- Platform-level metrics (per LLM)
- Topic-level metrics
- Persona-level metrics

**Response**:
```json
{
  "success": true,
  "message": "Calculated 12 metric sets",
  "data": {
    "overall": { ... },
    "platforms": [
      { "scope": "platform", "scopeValue": "chatgpt", ... },
      { "scope": "platform", "scopeValue": "claude", ... }
    ],
    "topics": [ ... ],
    "personas": [ ... ],
    "totalCalculations": 12
  }
}
```

---

### 3. Fetch Dashboard Data

Get all metrics formatted for the dashboard:

```bash
GET /api/metrics/dashboard
Authorization: Bearer <your-token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "overall": {
      "scope": "overall",
      "summary": {
        "totalPrompts": 50,
        "totalBrands": 5,
        "userBrand": {
          "name": "Fibr",
          "visibilityScore": 24.5,
          "visibilityRank": 5,
          "shareOfVoice": 15.2,
          "avgPosition": 2.8
        }
      },
      "brandMetrics": [
        {
          "brandName": "Fibr",
          "visibilityScore": 24.5,
          "visibilityRank": 5,
          "wordCount": 18.3,
          "wordCountRank": 4,
          "shareOfVoice": 15.2,
          "shareOfVoiceRank": 3,
          "avgPosition": 2.8,
          "avgPositionRank": 3,
          "count1st": 5,
          "count2nd": 8,
          "count3rd": 10
        },
        {
          "brandName": "DataFlow",
          "visibilityScore": 59.4,
          "visibilityRank": 1,
          ...
        }
      ]
    },
    "platforms": [ ... ],
    "topics": [ ... ],
    "personas": [ ... ],
    "lastUpdated": "2025-10-05T10:30:00Z"
  }
}
```

---

## Frontend Integration

### Connect Dashboard Components

Update your dashboard components to use real API data instead of mock data.

#### Example: UnifiedVisibilitySection

```typescript
// Before (using mock data)
const chartData = [
  { name: 'DataFlow', score: 59.4, color: '#3B82F6' },
  { name: 'CloudSync', score: 42.4, color: '#EF4444' },
  ...
]

// After (using real API data)
import { useEffect, useState } from 'react'
import { fetchDashboardMetrics } from '@/services/api'

function UnifiedVisibilitySection() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await fetchDashboardMetrics()
        setMetrics(data.overall)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load metrics:', error)
        setLoading(false)
      }
    }
    loadMetrics()
  }, [])

  if (loading) return <div>Loading metrics...</div>

  // Transform API data for chart
  const chartData = metrics.brandMetrics.map(brand => ({
    name: brand.brandName,
    score: brand.visibilityScore,
    color: getColorForBrand(brand.brandName) // Your color logic
  }))

  // Rest of your component...
}
```

---

### API Service

Create a service file for API calls:

```typescript
// services/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken')

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

export async function testPrompts() {
  return fetchWithAuth('/prompts/test', { method: 'POST' })
}

export async function calculateMetrics(dateRange?: { dateFrom: string, dateTo: string }) {
  return fetchWithAuth('/metrics/calculate', {
    method: 'POST',
    body: JSON.stringify(dateRange || {})
  })
}

export async function fetchDashboardMetrics() {
  return fetchWithAuth('/metrics/dashboard')
}

export async function fetchOverallMetrics() {
  return fetchWithAuth('/metrics/overall')
}

export async function fetchPlatformMetrics(platform: string) {
  return fetchWithAuth(`/metrics/platform/${platform}`)
}

export async function fetchTopicMetrics(topic: string) {
  return fetchWithAuth(`/metrics/topic/${encodeURIComponent(topic)}`)
}

export async function fetchPersonaMetrics(persona: string) {
  return fetchWithAuth(`/metrics/persona/${encodeURIComponent(persona)}`)
}
```

---

### Update Onboarding Flow

Add a step after prompt generation to run tests and calculate metrics:

```typescript
// pages/onboarding/page.tsx or components/Onboarding.tsx

async function completeOnboarding() {
  try {
    // Step 1: Generate prompts (existing)
    await generatePrompts()

    // Step 2: Test prompts (NEW)
    setStatus('Testing prompts across LLMs...')
    const testResults = await testPrompts()

    // Step 3: Calculate metrics (NEW)
    setStatus('Calculating metrics...')
    await calculateMetrics()

    // Step 4: Redirect to dashboard
    setStatus('Complete! Redirecting to dashboard...')
    router.push('/dashboard')

  } catch (error) {
    setError(error.message)
  }
}
```

---

## Data Mapping

Map the API response to your dashboard components:

### Visibility Score Chart

```typescript
// API Response → Chart Data
const visibilityChartData = metrics.overall.brandMetrics.map(brand => ({
  name: brand.brandName,
  value: brand.visibilityScore,
  rank: brand.visibilityRank,
  fill: brand.brandName === userBrand ? '#3B82F6' : '#E5E7EB'
}))
```

### Share of Voice Donut Chart

```typescript
const shareOfVoiceData = metrics.overall.brandMetrics.map(brand => ({
  name: brand.brandName,
  value: brand.shareOfVoice,
  fill: getColorForBrand(brand.brandName)
}))
```

### Average Position Bar Chart

```typescript
const avgPositionData = metrics.overall.brandMetrics
  .filter(brand => brand.avgPosition > 0)
  .map(brand => ({
    name: brand.brandName,
    value: brand.avgPosition,
    rank: brand.avgPositionRank
  }))
```

### Position Distribution (1st, 2nd, 3rd)

```typescript
const positionDistribution = metrics.overall.brandMetrics.map(brand => ({
  name: brand.brandName,
  '1st': brand.count1st,
  '2nd': brand.count2nd,
  '3rd': brand.count3rd
}))
```

### Topic Rankings Table

```typescript
const topicRankings = metrics.topics.map(topicMetric => ({
  topic: topicMetric.scopeValue,
  brands: topicMetric.brandMetrics.map(brand => ({
    name: brand.brandName,
    score: brand.visibilityScore,
    rank: brand.visibilityRank
  }))
}))
```

---

## Environment Variables

Add to your `.env` files:

### Backend `.env`

```env
# Existing
MONGODB_URI=mongodb://localhost:27017/rankly
JWT_SECRET=your-secret-key
OPENROUTER_API_KEY=your-openrouter-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# NEW: Metrics settings
METRICS_CALCULATION_INTERVAL=3600000  # 1 hour in ms
METRICS_RETENTION_DAYS=90              # Keep metrics for 90 days
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Testing the Flow

### Full End-to-End Test

1. **Complete onboarding**:
   ```bash
   # Analyze website
   POST /api/onboarding/analyze

   # Select competitors
   POST /api/competitors

   # Select topics
   POST /api/topics

   # Select personas
   POST /api/personas

   # Generate prompts
   POST /api/prompts/generate
   ```

2. **Test prompts**:
   ```bash
   POST /api/prompts/test
   ```

3. **Calculate metrics**:
   ```bash
   POST /api/metrics/calculate
   ```

4. **View dashboard**:
   ```bash
   GET /api/metrics/dashboard
   ```

---

## Troubleshooting

### No metrics found

**Error**: `"No metrics found. Please run calculations first."`

**Solution**: Run `POST /api/metrics/calculate` first

---

### Missing brand context

**Error**: Brand name shows as "Unknown"

**Solution**: Ensure URL analysis has been completed and brand context is extracted

---

### Calculation takes too long

**Issue**: Metrics calculation timeout

**Solutions**:
- Reduce date range
- Process in smaller batches
- Increase server timeout limits

---

## Next Steps

1. **Update all dashboard components** to use real API data
2. **Add loading states** for better UX
3. **Implement error handling** for failed API calls
4. **Add refresh functionality** to recalculate metrics on demand
5. **Show calculation progress** during long operations
6. **Cache metrics** on the frontend to reduce API calls
7. **Add filters** for date range, platforms, topics, personas

---

## Performance Optimization

### Caching

Cache metrics on the frontend:
```typescript
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

let metricsCache = null
let cacheTimestamp = 0

export async function fetchDashboardMetrics(force = false) {
  const now = Date.now()

  if (!force && metricsCache && (now - cacheTimestamp < CACHE_DURATION)) {
    return metricsCache
  }

  const data = await fetchWithAuth('/metrics/dashboard')
  metricsCache = data
  cacheTimestamp = now

  return data
}
```

### Pagination

For large datasets, paginate results:
```bash
GET /api/metrics/dashboard?limit=50&offset=0
```

---

## Support

For issues or questions:
- Backend docs: `/backend/METRICS_SYSTEM.md`
- API reference: `/backend/API.md`
- Frontend integration: This guide

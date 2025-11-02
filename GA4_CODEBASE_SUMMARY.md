# GA4 Agent Analytics Codebase Summary

## Architecture Overview

### Data Flow
```
GA4 API (Google Analytics)
    ↓
Backend API Routes (/backend/src/routes/ga4.js)
    ↓
GA4 API Client (/backend/src/utils/ga4ApiClient.js)
    ↓
GA4 Data Transformer (/backend/src/utils/ga4DataTransformer.js)
    ↓
Frontend Service Layer (/services/ga4Api.ts)
    ↓
Frontend Components (/components/agent-analytics/)
```

## Key Files and Their Roles

### Backend

#### 1. `/backend/src/routes/ga4.js`
**Purpose**: API route handlers for all GA4 endpoints

**Key Endpoints**:
- `GET /api/ga4/platform-split` - Traffic split (LLMs vs others)
- `GET /api/ga4/llm-platforms` - Individual LLM platform breakdown
- `GET /api/ga4/pages` - Page-level LLM traffic
- `GET /api/ga4/geo` - Geographic distribution
- `GET /api/ga4/devices` - Device breakdown
- `GET /api/ga4/conversion-events` - Available conversion events
- `POST /api/ga4/clear-cache` - Clear cached data

**Flow**:
1. Validates session/connection via middleware
2. Constructs GA4 API query with dimensions/metrics
3. Calls `runReport()` from `ga4ApiClient.js`
4. Transforms response using functions from `ga4DataTransformer.js`
5. Returns transformed data to frontend

**Key Logic**:
- Date range handling (relative dates like "7daysAgo")
- Conversion event metric name conversion (`conversions` vs `keyEvents:eventName`)
- Comparison period calculation for period-over-period analysis
- Default URI fetching for page URL construction

---

#### 2. `/backend/src/utils/ga4ApiClient.js`
**Purpose**: Direct interface to GA4 API

**Functions**:
- `fetchAccountSummaries(accessToken)` - Get GA4 accounts/properties
- `runReport(accessToken, propertyId, reportConfig)` - Execute GA4 Data API query

**Key Details**:
- Uses `analyticsdata.googleapis.com/v1beta` endpoint
- Handles authentication via Bearer token
- Returns raw GA4 API response structure

---

#### 3. `/backend/src/utils/ga4DataTransformer.js`
**Purpose**: Transform raw GA4 API responses into frontend-ready format

**Key Transformation Functions**:

##### `transformToPlatformSplit(ga4Response, comparisonResponse)`
- Groups traffic by platform (LLMs, organic, direct, etc.)
- Detects LLM platforms using regex patterns
- Aggregates LLMs into single "LLMs" category
- Calculates weighted averages for rates
- Computes percentages and comparison changes

**LLM Detection Patterns**:
```javascript
const LLM_PATTERNS = {
  'ChatGPT': /(chatgpt|openai\.com|chat\.openai)/i,
  'Claude': /(claude|anthropic)/i,
  'Gemini': /(gemini|bard|google\s*ai)/i,
  'Perplexity': /perplexity/i,
  // ... more patterns
}
```

**Weighted Average Calculation**:
- Engagement Rate: `sum(rate * sessions) / sum(sessions)`
- Bounce Rate: Same formula
- Session Duration: Same formula

##### `transformToLLMPlatforms(ga4Response, comparisonResponse)`
- Filters to only LLM platforms
- Groups by individual LLM (ChatGPT, Claude, Gemini, etc.)
- Calculates metrics per platform
- Computes percentages relative to total LLM sessions

##### `transformPagesData(ga4Response, defaultUri)`
- Groups by pagePath (aggregates multiple sources)
- Calculates Session Quality Score (SQS)
- Detects platform breakdown per page
- Constructs full URLs using defaultUri
- Determines content groups and page types

**SQS Formula**:
```javascript
SQS = (Engagement Rate * 0.4) + 
      ((100 - Bounce Rate) * 0.3) + 
      (Math.min(Duration/60, 5) * 10 * 0.2) + 
      (Math.min(Pages/Session, 5) * 20 * 0.1)
```

##### `transformGeoData(ga4Response)`
- Groups by country
- Calculates percentages and conversion rates
- Filters to LLM traffic only

##### `transformDeviceData(ga4Response)`
- Aggregates by device, OS, and browser
- Calculates separate breakdowns for each
- Filters to LLM traffic only

##### `calculateComparisonDates(startDate, endDate)`
- Calculates previous period for comparison
- Handles relative dates ("7daysAgo", "today", etc.)
- Returns comparison date range

---

### Frontend

#### 1. `/services/ga4Api.ts`
**Purpose**: Frontend service layer for GA4 API calls

**Functions**:
- `checkGA4Connection()` - Check if GA4 is connected
- `getPlatformSplit(startDate, endDate)` - Fetch platform split data
- `getLLMPlatforms(startDate, endDate)` - Fetch LLM platforms
- `getPages(startDate, endDate, limit, dateRange, conversionEvent)` - Fetch pages
- `getGeo(startDate, endDate)` - Fetch geo data
- `getDevices(startDate, endDate)` - Fetch device data
- `getConversionEvents()` - Fetch available conversion events
- `clearGA4Cache()` - Clear cache

**Key Details**:
- Uses `fetchWithCredentials()` for authenticated requests
- Returns typed responses (`GA4ApiResponse<T>`)
- Handles date range formatting

---

#### 2. `/components/tabs/agent-analytics/GA4AgentAnalyticsTab.tsx`
**Purpose**: Main container component for Agent Analytics

**Responsibilities**:
- Manages active tab state
- Fetches data based on active tab
- Handles date range changes
- Passes data to child tab components

**Data Flow**:
1. Checks GA4 connection on mount
2. Fetches data when tab/date range changes
3. Passes data to appropriate tab component (PlatformsTab, PagesTab, etc.)

---

#### 3. Tab Components

##### `/components/agent-analytics/platforms/PlatformsTab.tsx`
- Displays platform split and LLM platform performance
- Contains 4 sections:
  - `UnifiedPlatformSplitSection` - Traffic split chart/table
  - `UnifiedTrafficPerformanceSection` - All platforms performance
  - `UnifiedPlatformsSplitSection` - LLM platforms breakdown
  - `UnifiedLLMPlatformPerformanceSection` - LLM platforms performance table

##### `/components/agent-analytics/pages/PagesTab.tsx`
- Shows page-level LLM traffic metrics
- Displays table with:
  - Page title/URL
  - Sessions
  - Platform breakdown (with favicons)
  - Session Quality Score
  - Conversion rate
  - Bounce rate
  - Time on page
- Supports conversion event filtering

##### `/components/agent-analytics/geo-device/GeoTab.tsx`
- Shows geographic distribution
- Displays countries with sessions, percentages, conversion rates

##### `/components/agent-analytics/geo-device/DeviceTab.tsx`
- Shows device breakdown
- Displays device, OS, and browser statistics

##### `/components/agent-analytics/journey/JourneyTab.tsx`
- Shows user journey data (uses pages data)

---

## Data Structures

### GA4 API Response Structure
```typescript
{
  rows: Array<{
    dimensionValues: Array<{ value: string }>
    metricValues: Array<{ value: string }>  // Values are strings but numeric
  }>
  rowCount: number
  metricHeaders: Array<{ name: string }>
  dimensionHeaders: Array<{ name: string }>
}
```

### Transformed Data Structures

#### Platform Split Response
```typescript
{
  platformSplit: Array<{ name: string, value: number, color: string }>
  rankings: Array<{ rank: number, name: string, sessions: number, percentage: string, change: number }>
  totalSessions: number
  summary: {
    totalSessions: number
    topPlatform: string
    topPlatformShare: number
    totalChange: number
    llmBreakdown: Array<{ platform: string, sessions: number }>
  }
  performanceData: Array<PlatformPerformance>
}
```

#### LLM Platforms Response
```typescript
{
  platforms: Array<{
    name: string
    sessions: number
    percentage: number
    engagementRate: number  // Percentage (0-100)
    conversions: number
    bounceRate: number      // Percentage (0-100)
    avgSessionDuration: number  // Seconds
    pagesPerSession: number
    newUsers: number
    returningUsers: number
    conversionRate: number  // Percentage
    change: number          // Percentage change
    absoluteChange: number
    trend: 'up' | 'down' | 'neutral'
  }>
  summary: {
    totalLLMSessions: number
    totalLLMConversions: number
    avgEngagementRate: number
  }
  performanceData: Array<LLMPlatformPerformance>
}
```

#### Pages Response
```typescript
{
  pages: Array<{
    title: string
    url: string
    sessions: number
    sqs: number              // Session Quality Score (0-100)
    contentGroup: string
    conversionRate: number   // Percentage
    bounce: number           // Percentage
    pageType: string
    timeOnPage: number       // Seconds
    llmJourney: 'Entry' | 'Middle' | 'Exit'
    provider: string
    platformSessions: { [platform: string]: number }
  }>
  summary: {
    totalSessions: number
    totalPages: number
    avgSQS: number
  }
}
```

---

## Key Concepts

### LLM Detection Logic
LLM platforms are detected using regex patterns on:
1. **pageReferrer** (highest priority) - Most accurate
2. **sessionSource** (fallback)
3. **sessionMedium** - Used for standard platform detection

**Detection Order**:
1. Check referrer for LLM patterns
2. If no match, check source for LLM patterns
3. If no match, use standard platform detection (organic, direct, etc.)

### Weighted Averages
All rate-based metrics use weighted averages, not simple averages:
- **Formula**: `sum(rate * sessions) / sum(sessions)`
- **Why**: Accounts for different session volumes per row

### Comparison Periods
Period-over-period analysis:
- Calculates previous period of same length
- Compares current vs previous period
- Shows percentage change and absolute change

### Date Range Handling
- Supports relative dates: "7daysAgo", "today", "yesterday"
- Supports absolute dates: "YYYY-MM-DD"
- Converts between formats as needed

### Conversion Events
- Built-in: `conversions`
- Custom events: `keyEvents:eventName`
- Falls back to `conversions` if custom event not available

---

## Common Data Flow Patterns

### Fetching Data for a Tab
1. User changes tab or date range
2. `GA4AgentAnalyticsTab` calls appropriate service function
3. Service function makes HTTP request to backend
4. Backend route handler:
   - Validates session
   - Constructs GA4 query
   - Calls GA4 API
   - Transforms response
   - Returns to frontend
5. Frontend receives data and passes to tab component
6. Tab component renders data

### Data Transformation Pipeline
1. **Raw GA4 Response** → `ga4Response.rows[]`
2. **Aggregation** → Group by dimension values
3. **LLM Detection** → Identify LLM platforms
4. **Metric Calculation** → Weighted averages, percentages
5. **Formatting** → Round to appropriate decimals
6. **Structuring** → Format for frontend consumption

---

## Important Notes

### Metrics Format in GA4
- **Engagement Rate**: Decimal (0-1), multiply by 100 for percentage
- **Bounce Rate**: Decimal (0-1), multiply by 100 for percentage
- **Session Duration**: Seconds (not milliseconds)
- **Conversions**: Integer count

### Data Freshness
- GA4 data can be delayed by 24-48 hours
- "Today" may not include all of today's data
- Backend uses "yesterday" as end date for more complete data

### Caching
- Cache is currently disabled for agent analytics (always fetches fresh)
- Cache would be in MongoDB via `GA4DataSnapshot` model

### Error Handling
- API errors are caught and returned as `{ success: false, error: string }`
- Frontend displays error messages to user
- Fallbacks are used for missing data (e.g., defaultUri)

---

## Testing and Verification

### Manual Testing
1. Use GA4 web interface to create matching reports
2. Compare totals and breakdowns
3. Verify LLM detection accuracy
4. Check cross-tab consistency

### Automated Testing
- Use verification script: `backend/scripts/verify-ga4-data-consistency.js`
- Tests all endpoints
- Validates calculations
- Checks cross-tab consistency

---

## Potential Issues to Watch

1. **LLM Detection**: Regex patterns may miss some platforms
2. **Weighted Averages**: Incorrect if using simple average instead
3. **Percentage Calculations**: Must use correct total (all sessions vs LLM sessions)
4. **URL Construction**: Requires defaultUri to be correct
5. **Conversion Events**: Metric name format must be correct
6. **Date Range**: Relative dates may cause confusion

---

## Quick Reference

### Backend Route → Transformer → Frontend Component

| Route | Transformer | Frontend Component |
|-------|------------|-------------------|
| `/platform-split` | `transformToPlatformSplit` | `UnifiedPlatformSplitSection` |
| `/llm-platforms` | `transformToLLMPlatforms` | `UnifiedLLMPlatformPerformanceSection` |
| `/pages` | `transformPagesData` | `PagesTab` |
| `/geo` | `transformGeoData` | `GeoTab` |
| `/devices` | `transformDeviceData` | `DeviceTab` |

### Key Metrics Mapping

| GA4 Metric | Transform | Frontend Display |
|-----------|-----------|-----------------|
| `engagementRate` (0-1) | `* 100` | Percentage (0-100) |
| `bounceRate` (0-1) | `* 100` | Percentage (0-100) |
| `averageSessionDuration` (sec) | As-is | Seconds |
| `conversions` | As-is | Count |
| `sessions` | As-is | Count |

---

This summary should help you understand the codebase structure and data flow for verifying GA4 data accuracy and consistency.





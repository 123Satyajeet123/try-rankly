# Agent Analytics Codebase Overview

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Frontend Structure (try-rankly)](#frontend-structure-try-rankly)
3. [Backend Structure](#backend-structure)
4. [Platform Tab Implementation](#platform-tab-implementation)
5. [Data Flow](#data-flow)
6. [Key Components](#key-components)

---

## Architecture Overview

The Agent Analytics feature is a GA4 (Google Analytics 4) integration that tracks LLM (Large Language Model) traffic sources. The platform tab was ported from `traffic-analytics` and is working perfectly.

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, React, Tailwind CSS
- **Backend**: Express.js, MongoDB (for storing GA4 connections)
- **GA4 Integration**: Google Analytics Admin API, GA4 Reporting API

---

## Frontend Structure (try-rankly)

### Main Entry Point
- **`app/agent-analytics/page.tsx`**: Main page component that orchestrates everything
  - Manages tab state (platform, pages, journey, geo-device)
  - Handles authentication/connection status
  - Manages date range selection
  - Handles sync/refresh functionality

### Core Tab Component
- **`components/tabs/agent-analytics/GA4AgentAnalyticsTab.tsx`**: Main tab container
  - Checks GA4 connection status
  - Fetches data based on active tab
  - Renders appropriate tab content (PlatformsTab, PagesTab, etc.)
  - Handles data loading states

### Platform Tab Components (Copied from traffic-analytics)
Location: `components/agent-analytics/platforms/`

**Main Component:**
- **`PlatformsTab.tsx`**: Root component that renders all platform sections
  - Uses Unified components for each section
  - Handles empty/loading states
  - Receives `realLLMData` and `realPlatformData` props

**Unified Section Components:**
1. **`UnifiedPlatformSplitSection.tsx`**: Traffic Split visualization
   - Shows percentage share of traffic sources (Organic, Direct, Referral, LLMs, etc.)
   - Displays rankings and trend charts
   - Uses PlatformTrendChart for visualization

2. **`UnifiedTrafficPerformanceSection.tsx`**: Traffic Performance metrics
   - Shows session quality scores
   - Engagement metrics
   - Conversion rates
   - Bounce rates

3. **`UnifiedPlatformsSplitSection.tsx`**: LLM Platforms Split
   - Shows breakdown of LLM platforms (ChatGPT, Claude, Gemini, Perplexity)
   - Displays percentage and session counts per LLM
   - Uses LLMPlatformTrendChart

4. **`UnifiedLLMPlatformPerformanceSection.tsx`**: LLM Performance metrics
   - Detailed performance metrics for each LLM platform
   - Session quality scores per LLM

### API Service Layer
- **`services/ga4Api.ts`**: Frontend API client
  - Wraps all backend API calls
  - Handles authentication cookies
  - Provides typed interfaces for API responses
  - Key functions:
    - `checkGA4Connection()`: Check if user is connected
    - `getLLMPlatforms(startDate, endDate)`: Fetch LLM platform data
    - `getPlatformSplit(startDate, endDate)`: Fetch platform split data
    - `getPages()`, `getGeo()`, `getDevices()`: Other data endpoints

---

## Backend Structure

### API Routes
Location: `backend/src/routes/`

**GA4 Routes (`ga4.js`):**
- `GET /api/ga4/connection-status`: Check connection status
- `GET /api/ga4/accounts-properties`: Fetch GA4 accounts and properties
- `POST /api/ga4/save-property`: Save selected GA4 property
- `GET /api/ga4/platform-split`: Get platform split data (Organic, Direct, LLMs, etc.)
- `GET /api/ga4/llm-platforms`: Get LLM platform breakdown (ChatGPT, Claude, etc.)
- `GET /api/ga4/pages`: Get page analytics
- `GET /api/ga4/geo`: Get geographic data
- `GET /api/ga4/devices`: Get device breakdown
- `POST /api/ga4/clear-cache`: Clear cached data

**GA4 Auth Routes (`ga4Auth.js`):**
- `GET /api/auth/ga4`: Initiate OAuth flow
- `GET /api/auth/ga4/callback`: Handle OAuth callback

### Data Transformation
Location: `backend/src/utils/ga4DataTransformer.js`

**Key Functions:**
- `detectPlatform(source, medium, referrer)`: Detects traffic source platform
  - Checks for LLM patterns in referrer/source
  - Falls back to standard platform detection (organic, direct, referral, etc.)
- `transformToPlatformSplit(ga4Response, comparisonResponse)`: Transforms GA4 data to platform split format
  - Aggregates by platform (Organic, Direct, LLMs, etc.)
  - Calculates percentages and comparisons
  - Returns: `{ platformSplit, rankings, performanceData, totalSessions, summary }`
- `transformToLLMPlatforms(ga4Response, comparisonResponse)`: Transforms GA4 data to LLM platforms format
  - Detects LLM platforms (ChatGPT, Claude, Gemini, Perplexity)
  - Aggregates LLM-specific metrics
  - Returns: `{ platforms, summary, performanceData }`

**LLM Detection Patterns:**
```javascript
const LLM_PATTERNS = {
  'ChatGPT': /(chatgpt|openai\.com|chat\.openai)/i,
  'Claude': /(claude|anthropic)/i,
  'Gemini': /(gemini|bard|google\s*ai)/i,
  'Perplexity': /perplexity/i,
  // ... more patterns
}
```

### Middleware
- **`ga4SessionMiddleware`**: Validates GA4 session cookie
- **`ga4ConnectionMiddleware`**: Validates user has connected GA4 property

### Models
- **`GAConnection`**: MongoDB model storing GA4 OAuth tokens and property info
- **`GA4DataSnapshot`**: Stores cached GA4 data snapshots

### Caching
- **`ga4CacheService.js`**: Caches GA4 API responses
  - Reduces API calls to Google Analytics
  - Cache key: `userId_propertyId_endpoint_startDate_endDate`

---

## Platform Tab Implementation

### How It Works (Copied from traffic-analytics)

The platform tab was successfully ported from `traffic-analytics` and uses the same Unified components.

#### Component Hierarchy:
```
GA4AgentAnalyticsTab
  └── PlatformsTab (when activeTab === 'platform')
       ├── UnifiedPlatformSplitSection
       │    └── Shows: Traffic Split (Organic, Direct, LLMs, etc.)
       ├── UnifiedTrafficPerformanceSection
       │    └── Shows: Performance metrics per traffic source
       ├── UnifiedPlatformsSplitSection
       │    └── Shows: LLM Platforms Split (ChatGPT, Claude, etc.)
       └── UnifiedLLMPlatformPerformanceSection
            └── Shows: Performance metrics per LLM platform
```

#### Data Flow:
1. User selects date range (7 days, 30 days, etc.)
2. `GA4AgentAnalyticsTab` calls `getPlatformSplit()` and `getLLMPlatforms()`
3. Backend fetches from GA4 API (or cache)
4. Backend transforms data using `ga4DataTransformer.js`
5. Frontend receives structured data:
   ```javascript
   {
     success: true,
     data: {
       platformSplit: [...],      // For UnifiedPlatformSplitSection
       rankings: [...],           // For rankings display
       performanceData: [...],     // For UnifiedTrafficPerformanceSection
       platforms: [...],          // For UnifiedPlatformsSplitSection
       totalSessions: 12345,
       summary: {...}
     }
   }
   ```
6. `PlatformsTab` passes data to Unified components
7. Unified components render visualizations

#### Key Differences from traffic-analytics:
- Uses `/api/ga4/*` endpoints instead of Next.js API routes
- Data fetching happens in `GA4AgentAnalyticsTab` instead of page component
- Same Unified components are reused

---

## Data Flow

### Authentication Flow
1. User clicks "Connect GA4" → `initiateGA4OAuth()`
2. Redirects to `/api/auth/ga4` → Google OAuth consent screen
3. Google redirects to `/api/auth/ga4/callback`
4. Backend stores tokens in MongoDB (`GAConnection` model)
5. Sets session cookie
6. Frontend checks connection status → `checkGA4Connection()`

### Data Fetching Flow
1. User selects date range (e.g., "7 days")
2. `GA4AgentAnalyticsTab` calls `fetchGA4Data()`
3. For platform tab:
   - Calls `getPlatformSplit(startDate, endDate)`
   - Calls `getLLMPlatforms(startDate, endDate)`
4. Backend:
   - Checks cache first (`ga4CacheService`)
   - If not cached, calls GA4 Reporting API
   - Transforms data (`ga4DataTransformer.js`)
   - Caches result
   - Returns structured JSON
5. Frontend receives data and sets state:
   - `setRealPlatformData(platformSplitData)`
   - `setRealLLMData(llmPlatformsData)`
6. `PlatformsTab` renders with data

### Cache Flow
- Cache key format: `userId_propertyId_endpoint_startDate_endDate`
- Cache expires after 1 hour (configurable)
- Cache is cleared when user clicks "Sync Now"

---

## Key Components

### Frontend Components

#### 1. `GA4AgentAnalyticsTab`
- **Purpose**: Main container for agent analytics
- **Responsibilities**:
  - Manage connection status
  - Fetch data based on active tab
  - Handle loading states
  - Render tab content

#### 2. `PlatformsTab`
- **Purpose**: Render platform analytics sections
- **Props**:
  - `realLLMData`: LLM platforms data
  - `realPlatformData`: Platform split data
  - `dateRange`: Selected date range string
  - `isLoading`: Loading state

#### 3. Unified Components
All Unified components follow the same pattern:
- Receive `realLLMData` or `realPlatformData` props
- Extract data from `data.*` structure
- Transform data for visualization
- Handle loading/empty states
- Render charts and tables

### Backend Components

#### 1. `ga4DataTransformer.js`
- **Purpose**: Transform raw GA4 API responses to structured format
- **Key Functions**:
  - `detectPlatform()`: Detect traffic source
  - `transformToPlatformSplit()`: Transform to platform split format
  - `transformToLLMPlatforms()`: Transform to LLM platforms format

#### 2. `ga4ApiClient.js`
- **Purpose**: Wrapper for GA4 API calls
- **Key Functions**:
  - `runReport()`: Execute GA4 Reporting API queries
  - `fetchAccountSummaries()`: Fetch GA4 accounts

#### 3. `ga4CacheService.js`
- **Purpose**: Cache GA4 API responses
- **Features**:
  - Redis-like caching (using MongoDB)
  - Automatic expiration
  - Cache invalidation

---

## API Response Structure

### Platform Split Response
```javascript
{
  success: true,
  data: {
    platformSplit: [
      { name: 'Organic', value: 45.2, sessions: 1234, change: 2.3 },
      { name: 'Direct', value: 30.1, sessions: 823, change: -1.2 },
      { name: 'LLMs', value: 15.5, sessions: 423, change: 5.1 },
      // ...
    ],
    rankings: [
      { rank: 1, name: 'Organic', sessions: 1234, percentage: '45.2%' },
      // ...
    ],
    performanceData: [
      {
        name: 'Organic',
        sessions: 1234,
        percentage: 45.2,
        engagementRate: 65.3,
        conversionRate: 2.5,
        bounceRate: 35.2,
        avgSessionDuration: 180,
        pagesPerSession: 3.2,
        // ...
      },
      // ...
    ],
    totalSessions: 2730,
    summary: {
      totalSessions: 2730,
      llmSessions: 423,
      llmPercentage: 15.5,
      // ...
    }
  }
}
```

### LLM Platforms Response
```javascript
{
  success: true,
  data: {
    platforms: [
      {
        name: 'ChatGPT',
        sessions: 234,
        percentage: 12.5,
        engagementRate: 68.2,
        conversionRate: 3.1,
        // ...
      },
      {
        name: 'Claude',
        sessions: 156,
        percentage: 8.3,
        // ...
      },
      // ...
    ],
    summary: {
      totalLLMSessions: 423,
      topPlatform: 'ChatGPT',
      // ...
    },
    performanceData: [
      // Similar to platform performance data
    ]
  }
}
```

---

## File Structure Summary

```
try-rankly/
├── app/
│   └── agent-analytics/
│       └── page.tsx                    # Main page
├── components/
│   ├── tabs/
│   │   └── agent-analytics/
│   │       ├── GA4AgentAnalyticsTab.tsx  # Main tab component
│   │       └── SetupOptionsSection.tsx    # Setup screen
│   └── agent-analytics/
│       └── platforms/
│           ├── PlatformsTab.tsx          # Platform tab (from traffic-analytics)
│           ├── UnifiedPlatformSplitSection.tsx
│           ├── UnifiedTrafficPerformanceSection.tsx
│           ├── UnifiedPlatformsSplitSection.tsx
│           └── UnifiedLLMPlatformPerformanceSection.tsx
├── services/
│   └── ga4Api.ts                        # Frontend API client
└── backend/
    └── src/
        ├── routes/
        │   ├── ga4.js                   # GA4 data endpoints
        │   └── ga4Auth.js               # GA4 OAuth endpoints
        ├── utils/
        │   ├── ga4ApiClient.js          # GA4 API wrapper
        │   └── ga4DataTransformer.js    # Data transformation
        ├── services/
        │   └── ga4CacheService.js       # Caching service
        └── models/
            └── GAConnection.js          # MongoDB model
```

---

## Key Takeaways

1. **Platform Tab is Working**: Successfully ported from `traffic-analytics` and uses the same Unified components
2. **Separation of Concerns**: Frontend handles UI, backend handles GA4 API calls and data transformation
3. **Caching**: Implemented to reduce GA4 API calls and improve performance
4. **Data Structure**: Backend transforms raw GA4 data into structured format expected by frontend
5. **LLM Detection**: Uses pattern matching on referrer/source to detect LLM platforms
6. **Unified Components**: Reusable components that work with both platform split and LLM platform data

---

## Next Steps / Potential Improvements

1. **Error Handling**: Add better error handling for GA4 API failures
2. **Real-time Updates**: Consider WebSocket for real-time data updates
3. **More Metrics**: Add more GA4 metrics (conversions, events, etc.)
4. **Export Functionality**: Add CSV/PDF export for analytics data
5. **Custom Date Ranges**: Allow users to select custom date ranges


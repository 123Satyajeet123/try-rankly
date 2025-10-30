# Agent Analytics Architecture Overview

## Table of Contents
1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Frontend Structure](#frontend-structure)
4. [Backend Structure](#backend-structure)
5. [Data Flow](#data-flow)
6. [Platform Tab (Working Reference)](#platform-tab-working-reference)
7. [Key Components](#key-components)
8. [API Endpoints](#api-endpoints)
9. [Data Transformation](#data-transformation)

## Overview

The Agent Analytics feature is a GA4-powered analytics dashboard that tracks LLM (Large Language Model) traffic to websites. It analyzes traffic from platforms like ChatGPT, Claude, Gemini, Perplexity, etc., and provides insights on:

- **Platform Performance**: Which LLM platforms drive the most traffic
- **Page Analytics**: Which pages receive LLM traffic and their performance
- **Journey Analysis**: Visual flow from LLM platforms to specific pages
- **Geo & Device Data**: Geographic and device breakdowns

The **Platform Tab** has been successfully ported from `traffic-analytics` and serves as a working reference implementation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  app/agent-analytics/page.tsx                        │ │
│  │  - Main page component                               │ │
│  │  - Manages tab state, date range, sync              │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  GA4AgentAnalyticsTab.tsx                            │ │
│  │  - Tab router and data fetcher                       │ │
│  │  - Manages connection status                         │ │
│  │  - Fetches data based on active tab                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                  │
│        ┌─────────────────┼─────────────────┐               │
│        │                 │                 │               │
│        ▼                 ▼                 ▼               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │Platforms │    │  Pages   │    │ Journey  │          │
│  │   Tab    │    │   Tab    │    │   Tab    │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│        │                 │                 │               │
│        └─────────────────┼─────────────────┘               │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  services/ga4Api.ts                                  │ │
│  │  - API client functions                              │ │
│  │  - Handles all backend communication                │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Requests
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  routes/ga4.js                                        │ │
│  │  - /api/ga4/platform-split                           │ │
│  │  - /api/ga4/llm-platforms                           │ │
│  │  - /api/ga4/pages                                    │ │
│  │  - /api/ga4/geo, /api/ga4/devices                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  utils/ga4ApiClient.js                                │ │
│  │  - runReport()                                        │ │
│  │  - Direct GA4 API calls                              │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  utils/ga4DataTransformer.js                         │ │
│  │  - transformToPlatformSplit()                        │ │
│  │  - transformToLLMPlatforms()                        │ │
│  │  - transformPagesData()                               │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          ▼                                  │
│                ┌──────────────────┐                        │
│                │  Google GA4 API  │                        │
│                └──────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Structure

### Main Entry Point
- **`app/agent-analytics/page.tsx`**: Main page component
  - Manages UI state (tabs, date range, sync status)
  - Renders Sidebar, TopNav, and GA4AgentAnalyticsTab
  - Handles sync now button and settings modal

### Tab Router
- **`components/tabs/agent-analytics/GA4AgentAnalyticsTab.tsx`**: Core tab component
  - Checks GA4 connection status
  - Fetches data based on active tab (platform, pages, journey, geo-device)
  - Routes to appropriate tab component
  - Manages loading states

### Tab Components

#### 1. Platform Tab (✅ Working - Ported from traffic-analytics)
- **`components/agent-analytics/platforms/PlatformsTab.tsx`**: Main platform tab
  - Composes 4 sections:
    - `UnifiedPlatformSplitSection`: Traffic split visualization
    - `UnifiedTrafficPerformanceSection`: Performance metrics
    - `UnifiedPlatformsSplitSection`: LLM platform breakdown
    - `UnifiedLLMPlatformPerformanceSection`: LLM performance table

#### 2. Pages Tab
- **`components/agent-analytics/pages/PagesTab.tsx`**: Page analytics
  - Shows page-level LLM traffic metrics
  - Supports conversion event filtering
  - Displays session quality scores, bounce rates, etc.

#### 3. Journey Tab
- **`components/agent-analytics/journey/JourneyTab.tsx`**: Sankey diagram
  - Visual flow from LLM platforms → Page categories
  - Uses Google Charts Sankey visualization
  - Classifies pages into categories (/tools, /blog, /docs, etc.)

#### 4. Geo & Device Tabs
- **`components/agent-analytics/geo-device/GeoTab.tsx`**: Geographic data
- **`components/agent-analytics/geo-device/DeviceTab.tsx`**: Device breakdown

### API Service Layer
- **`services/ga4Api.ts`**: Frontend API client
  - Functions: `getLLMPlatforms()`, `getPlatformSplit()`, `getPages()`, etc.
  - Handles authentication via cookies
  - Base URL: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'`

## Backend Structure

### Routes
- **`backend/src/routes/ga4.js`**: Main GA4 routes
  - `GET /api/ga4/platform-split`: Platform traffic split
  - `GET /api/ga4/llm-platforms`: LLM platform details
  - `GET /api/ga4/pages`: Page analytics
  - `GET /api/ga4/geo`: Geographic data
  - `GET /api/ga4/devices`: Device data
  - `GET /api/ga4/conversion-events`: Available conversion events

- **`backend/src/routes/ga4Auth.js`**: OAuth flow
  - `GET /api/auth/ga4`: Initiate OAuth
  - `GET /api/auth/ga4/callback`: Handle callback

### Middleware
- **`backend/src/middleware/ga4Session.js`**: Parses GA4 session cookie
- **`backend/src/middleware/ga4Connection.js`**: Validates GA4 connection

### Services & Utils
- **`backend/src/utils/ga4ApiClient.js`**: GA4 API client
  - `runReport()`: Executes GA4 Data API queries
  - `fetchAccountSummaries()`: Gets accounts/properties

- **`backend/src/utils/ga4DataTransformer.js`**: Data transformation
  - `transformToPlatformSplit()`: Transforms GA4 response to platform split format
  - `transformToLLMPlatforms()`: Transforms to LLM platform format
  - `transformPagesData()`: Transforms page data
  - LLM detection via regex patterns (ChatGPT, Claude, Gemini, etc.)

### Models
- **`backend/src/models/GAConnection.js`**: MongoDB model for GA4 connections
  - Stores: userId, accessToken, refreshToken, propertyId, etc.

## Data Flow

### Platform Tab Flow (Working Reference)

1. **User Interaction**
   ```
   User selects "Platform" tab → GA4AgentAnalyticsTab receives activeTab='platform'
   ```

2. **Data Fetching**
   ```typescript
   // GA4AgentAnalyticsTab.tsx:85-153
   if (activeTab === 'platform') {
     const [platformSplitResponse, llmPlatformsResponse] = await Promise.all([
       getPlatformSplit(startDate, endDate),  // → /api/ga4/platform-split
       getLLMPlatforms(startDate, endDate)     // → /api/ga4/llm-platforms
     ])
   }
   ```

3. **Backend Processing**
   ```javascript
   // routes/ga4.js:395-507
   router.get('/platform-split', ...)
   - Runs GA4 report with dimensions: sessionSource, sessionMedium, pageReferrer
   - Fetches comparison period data
   - Calls transformToPlatformSplit() with current + comparison data
   ```

4. **Data Transformation**
   ```javascript
   // utils/ga4DataTransformer.js:132-427
   transformToPlatformSplit(ga4Response, comparisonResponse)
   - Detects LLM platforms from referrer/source/medium
   - Groups into: LLM Traffic, Direct, Organic, Paid, etc.
   - Calculates percentages, trends, rankings
   - Returns: { platformSplit, rankings, performanceData, totalSessions, summary }
   ```

5. **Frontend Rendering**
   ```typescript
   // GA4AgentAnalyticsTab.tsx:124-152
   setRealPlatformData(platformSplitData)  // For traffic split sections
   setRealLLMData(llmPlatformsData)         // For LLM platform sections
   
   // PlatformsTab.tsx:32-46
   <UnifiedPlatformSplitSection realLLMData={realPlatformData} />
   <UnifiedTrafficPerformanceSection realPlatformData={realPlatformData} />
   <UnifiedPlatformsSplitSection realLLMData={realLLMData} />
   <UnifiedLLMPlatformPerformanceSection realLLMData={realLLMData} />
   ```

## Platform Tab (Working Reference)

The Platform Tab is the **reference implementation** successfully ported from `traffic-analytics`. It demonstrates:

### ✅ What Works
1. **Data Fetching**: Parallel API calls for platform split and LLM platforms
2. **Data Transformation**: Backend transforms GA4 responses into frontend-friendly format
3. **Component Composition**: Four unified sections working together
4. **Loading States**: Skeleton loaders during data fetch
5. **Error Handling**: Graceful fallbacks when data is missing

### Architecture Pattern
```
GA4AgentAnalyticsTab (fetches data)
    ↓
PlatformsTab (composes sections)
    ↓
UnifiedPlatformSplitSection (renders data)
UnifiedTrafficPerformanceSection (renders data)
UnifiedPlatformsSplitSection (renders data)
UnifiedLLMPlatformPerformanceSection (renders data)
```

### Key Files (Platform Tab)
- **Frontend**:
  - `components/agent-analytics/platforms/PlatformsTab.tsx`
  - `components/agent-analytics/platforms/UnifiedPlatformSplitSection.tsx`
  - `components/agent-analytics/platforms/UnifiedTrafficPerformanceSection.tsx`
  - `components/agent-analytics/platforms/UnifiedPlatformsSplitSection.tsx`
  - `components/agent-analytics/platforms/UnifiedLLMPlatformPerformanceSection.tsx`

- **Backend**:
  - `backend/src/routes/ga4.js` (platform-split, llm-platforms endpoints)
  - `backend/src/utils/ga4DataTransformer.js` (transformToPlatformSplit, transformToLLMPlatforms)

### Data Structure (Platform Tab)

**Platform Split Response** (`/api/ga4/platform-split`):
```json
{
  "success": true,
  "data": {
    "platformSplit": [
      { "platform": "LLM Traffic", "sessions": 1000, "percentage": 25 },
      { "platform": "Direct", "sessions": 2000, "percentage": 50 }
    ],
    "rankings": [...],
    "performanceData": [...],
    "totalSessions": 4000,
    "summary": {
      "llmBreakdown": [
        { "platform": "ChatGPT", "sessions": 500 },
        { "platform": "Gemini", "sessions": 300 }
      ]
    }
  }
}
```

**LLM Platforms Response** (`/api/ga4/llm-platforms`):
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "platform": "ChatGPT",
        "sessions": "500",
        "users": "400",
        "pageViews": "1200",
        "engagementRate": 0.75,
        "bounceRate": 0.25
      }
    ],
    "summary": {...},
    "performanceData": [...]
  }
}
```

## Key Components

### GA4AgentAnalyticsTab
- **Purpose**: Main tab router and data fetcher
- **Key Functions**:
  - `checkConnectionStatus()`: Verifies GA4 connection
  - `fetchGA4Data()`: Fetches data based on active tab
  - `renderTabContent()`: Routes to appropriate tab component

### PlatformsTab
- **Purpose**: Renders platform analytics
- **Props**: `realLLMData`, `realPlatformData`, `dateRange`, `isLoading`
- **Composition**: Four unified sections

### JourneyTab
- **Purpose**: Sankey diagram visualization
- **Key Features**:
  - Page classification (`classifyPage()` function)
  - Google Charts Sankey integration
  - Platform → Page category flow

### PagesTab
- **Purpose**: Page-level analytics
- **Features**:
  - Conversion event filtering
  - Session quality scores
  - Platform breakdown per page

## API Endpoints

### Connection & Auth
- `GET /api/auth/ga4` - Initiate OAuth
- `GET /api/auth/ga4/callback` - OAuth callback
- `GET /api/ga4/connection-status` - Check connection
- `POST /api/ga4/disconnect` - Disconnect GA4

### Property Management
- `GET /api/ga4/accounts-properties` - List accounts/properties
- `POST /api/ga4/save-property` - Save selected property

### Data Endpoints
- `GET /api/ga4/platform-split` - Platform traffic split
- `GET /api/ga4/llm-platforms` - LLM platform details
- `GET /api/ga4/pages` - Page analytics
- `GET /api/ga4/geo` - Geographic data
- `GET /api/ga4/devices` - Device breakdown
- `GET /api/ga4/conversion-events` - Conversion events

### Cache Management
- `POST /api/ga4/clear-cache` - Clear cached data

## Data Transformation

### LLM Detection
The backend uses regex patterns to detect LLM platforms:

```javascript
const LLM_PATTERNS = {
  'ChatGPT': /(chatgpt|openai\.com|chat\.openai)/i,
  'Claude': /(claude|anthropic)/i,
  'Gemini': /(gemini|bard|google\s*ai)/i,
  'Perplexity': /perplexity/i,
  // ... more patterns
}
```

Detection priority:
1. **pageReferrer** (most accurate)
2. **sessionSource**
3. **sessionMedium**

### Transformation Functions

**`transformToPlatformSplit()`**:
- Groups traffic into: LLM Traffic, Direct, Organic, Paid, Referral, etc.
- Calculates percentages and trends
- Generates rankings and performance data

**`transformToLLMPlatforms()`**:
- Extracts individual LLM platforms
- Calculates engagement metrics
- Adds comparison period data

**`transformPagesData()`**:
- Groups pages by URL
- Calculates session quality scores
- Identifies content groups
- Maps platform sessions to pages

## Development Notes

### Platform Tab as Reference
When implementing or debugging other tabs, use the Platform Tab as a reference:

1. **Data Fetching Pattern**: Parallel API calls in `fetchGA4Data()`
2. **State Management**: Separate state for each data type (`realLLMData`, `realPlatformData`)
3. **Loading States**: Skeleton components during fetch
4. **Component Structure**: Unified sections with consistent props

### Common Patterns

**Data Fetching**:
```typescript
const [platformSplitResponse, llmPlatformsResponse] = await Promise.all([
  getPlatformSplit(startDate, endDate),
  getLLMPlatforms(startDate, endDate)
])
```

**State Updates**:
```typescript
setRealPlatformData({
  data: {
    platformSplit: platformSplitResponse.data?.platformSplit || [],
    // ... other fields
  }
})
```

**Component Rendering**:
```typescript
<UnifiedSection 
  realLLMData={realPlatformData} 
  dateRange={selectedDateRange} 
  isLoading={isLoadingData} 
/>
```

### Debugging Tips

1. **Check Console Logs**: Components log detailed data structures
2. **Verify API Responses**: Check network tab for API responses
3. **Validate Data Structure**: Ensure backend returns expected format
4. **Test Connection**: Verify GA4 connection status before fetching

## Summary

The Agent Analytics feature is a well-structured GA4 integration with:

- ✅ **Platform Tab**: Working reference implementation
- 🔄 **Other Tabs**: Follow same patterns as Platform Tab
- 📊 **Data Flow**: Frontend → Backend → GA4 API → Transform → Frontend
- 🎨 **Component Architecture**: Modular, reusable sections
- 🔐 **Authentication**: Cookie-based GA4 OAuth flow

Use the Platform Tab as the reference for understanding how the system works and for implementing similar functionality in other tabs.



# GA4 Agent Analytics Data Verification Plan

## Overview
This document outlines how to verify that GA4 API data is correctly displayed in the Agent Analytics tab and maintains consistency across all tabs.

## Understanding GA4 API Response Structure

### GA4 API Response Format
```json
{
  "rows": [
    {
      "dimensionValues": [
        { "value": "chatgpt.com" },  // Dimension 1: sessionSource/pageReferrer
        { "value": "organic" }        // Dimension 2: sessionMedium
      ],
      "metricValues": [
        { "value": "1234" },          // Metric 1: sessions (string, but numeric)
        { "value": "0.65" },          // Metric 2: engagementRate (decimal 0-1)
        { "value": "45" }             // Metric 3: conversions
      ]
    }
  ],
  "rowCount": 100,
  "metricHeaders": [
    { "name": "sessions" },
    { "name": "engagementRate" },
    { "name": "conversions" }
  ],
  "dimensionHeaders": [
    { "name": "sessionSource" },
    { "name": "sessionMedium" }
  ]
}
```

### Key Points:
- **Metrics are returned as strings** but represent numeric values
- **Engagement rate and bounce rate** are decimals (0-1), need to multiply by 100 for percentage
- **Session duration** is in seconds
- **Date format**: YYYYMMDD for date dimensions

## Backend API Endpoints

### 1. Platform Split (`/api/ga4/platform-split`)
**Purpose**: Shows traffic split between LLMs and other sources (organic, direct, etc.)

**GA4 Query**:
- Dimensions: `sessionSource`, `sessionMedium`, `pageReferrer`
- Metrics: `sessions`, `engagementRate`, `conversions`, `bounceRate`, `averageSessionDuration`, `screenPageViewsPerSession`, `newUsers`, `totalUsers`

**Transformation** (`transformToPlatformSplit`):
- Detects LLM platforms from referrer/source using regex patterns
- Aggregates LLMs into single "LLMs" category
- Calculates weighted averages for rates (engagement, bounce, duration)
- Calculates percentages based on total sessions

**Frontend Display**: `UnifiedPlatformSplitSection.tsx`

**Verification Checklist**:
- [ ] Total sessions from platform-split matches GA4 total sessions
- [ ] LLM sessions sum matches sum of individual LLM platforms
- [ ] Percentages add up to 100%
- [ ] Engagement rate is displayed as percentage (0-100), not decimal
- [ ] Bounce rate is displayed as percentage (0-100), not decimal
- [ ] Weighted averages are calculated correctly (rate * sessions, then divide by total sessions)

---

### 2. LLM Platforms (`/api/ga4/llm-platforms`)
**Purpose**: Shows individual LLM platform breakdown (ChatGPT, Claude, Gemini, etc.)

**GA4 Query**:
- Dimensions: `sessionSource`, `sessionMedium`, `pageReferrer` (same as platform-split)
- Metrics: Same as platform-split
- **Note**: Backend filters to only LLM platforms

**Transformation** (`transformToLLMPlatforms`):
- Only processes rows where LLM is detected
- Groups by individual LLM platform (ChatGPT, Claude, Gemini, etc.)
- Calculates weighted averages and percentages

**Frontend Display**: `UnifiedLLMPlatformPerformanceSection.tsx`

**Verification Checklist**:
- [ ] Total LLM sessions matches sum of individual platforms
- [ ] Individual platform sessions match platform-split LLM breakdown
- [ ] Percentages are relative to total LLM sessions (not total sessions)
- [ ] Platform detection correctly identifies platforms from referrer/source
- [ ] Metrics (engagement, bounce, conversion) are weighted averages

---

### 3. Pages (`/api/ga4/pages`)
**Purpose**: Shows page-level LLM traffic performance

**GA4 Query**:
- Dimensions: `pagePath`, `pageTitle`, `sessionSource`, `sessionMedium`
- Metrics: `sessions`, `engagementRate`, `conversions` (or custom conversion event), `bounceRate`, `averageSessionDuration`, `screenPageViewsPerSession`, `newUsers`, `totalUsers`
- Filter: Only LLM traffic (sessionSource matches LLM patterns)

**Transformation** (`transformPagesData`):
- Groups by pagePath (aggregates multiple sources per page)
- Calculates Session Quality Score (SQS)
- Detects platform breakdown per page
- Constructs full URLs using property defaultUri

**Frontend Display**: `PagesTab.tsx`

**Verification Checklist**:
- [ ] Total page sessions match total LLM sessions from platform-split
- [ ] Page URLs are correctly constructed with defaultUri
- [ ] Conversion rates are calculated correctly (conversions / sessions * 100)
- [ ] SQS calculation: (Engagement Rate * 0.4) + ((100 - Bounce Rate) * 0.3) + (Duration/60 * 10 * 0.2) + (Pages/Session * 20 * 0.1)
- [ ] Platform sessions per page match total sessions for that page
- [ ] Content group detection works correctly

---

### 4. Geographic Data (`/api/ga4/geo`)
**Purpose**: Shows geographic distribution of LLM traffic

**GA4 Query**:
- Dimensions: `country`
- Metrics: `sessions`, `conversions`, `bounceRate`, `averageSessionDuration`, `engagementRate`, `newUsers`, `totalUsers`
- Filter: Only LLM traffic (pageReferrer matches LLM patterns)

**Transformation** (`transformGeoData`):
- Groups by country
- Calculates percentages based on total sessions
- Formats metrics (bounce rate and engagement rate as percentages)

**Frontend Display**: `GeoTab.tsx`

**Verification Checklist**:
- [ ] Total geo sessions match total LLM sessions
- [ ] Country percentages add up to 100%
- [ ] Conversion rates are calculated correctly
- [ ] Only LLM traffic is included (filtered correctly)

---

### 5. Device Data (`/api/ga4/devices`)
**Purpose**: Shows device breakdown of LLM traffic

**GA4 Query**:
- Dimensions: `deviceCategory`, `operatingSystem`, `browser`
- Metrics: `sessions`, `conversions`, `bounceRate`, `averageSessionDuration`, `engagementRate`, `newUsers`, `totalUsers`
- Filter: Only LLM traffic (pageReferrer matches LLM patterns)

**Transformation** (`transformDeviceData`):
- Aggregates by device, OS, and browser separately
- Calculates percentages and conversion rates

**Frontend Display**: `DeviceTab.tsx`

**Verification Checklist**:
- [ ] Total device sessions match total LLM sessions
- [ ] Device/OS/Browser percentages add up to 100% for each category
- [ ] Metrics are calculated correctly

---

## Cross-Tab Consistency Checks

### Session Count Consistency
All tabs showing session data should match:
- **Platform Split**: Total sessions (all sources)
- **LLM Platforms**: Total LLM sessions = sum of individual platforms
- **Pages**: Sum of all page sessions = total LLM sessions
- **Geo**: Total geo sessions = total LLM sessions
- **Device**: Total device sessions = total LLM sessions

**Formula**: `Platform Split LLMs = LLM Platforms Total = Pages Total = Geo Total = Device Total`

### Metric Consistency
- **Engagement Rate**: Should be consistent when aggregating same data
- **Bounce Rate**: Should be consistent when aggregating same data
- **Conversion Rate**: Conversions / Sessions (should match across tabs for same time period)
- **Average Session Duration**: Weighted average should be consistent

### Date Range Consistency
- All tabs use the same date range
- Comparison periods are calculated consistently
- Date formatting is consistent (YYYY-MM-DD)

---

## Verification Steps

### Step 1: Enable Debug Logging
Add console logs to track data at each stage:
1. **Backend**: Log raw GA4 API responses
2. **Backend**: Log transformed data
3. **Frontend**: Log received data
4. **Frontend**: Log displayed values

### Step 2: Manual GA4 Verification
1. Open GA4 web interface
2. Create custom report matching your API query
3. Compare totals:
   - Total sessions
   - LLM sessions (filter by referrer/source)
   - Individual platform sessions
   - Page sessions (filtered by LLM)

### Step 3: Cross-Tab Comparison
Create a verification table:

| Metric | Platform Split | LLM Platforms | Pages | Geo | Device | GA4 Web |
|--------|---------------|---------------|-------|-----|--------|---------|
| Total Sessions | | | | | | |
| LLM Sessions | | | | | | |
| ChatGPT Sessions | | | | | | |
| Engagement Rate | | | | | | |

### Step 4: Edge Case Testing
- [ ] Empty data (no LLM traffic)
- [ ] Single platform (only ChatGPT)
- [ ] Large date ranges (90+ days)
- [ ] Small date ranges (1 day)
- [ ] Custom conversion events
- [ ] Missing defaultUri for pages

---

## Common Issues to Check

### 1. LLM Detection
**Issue**: Platforms not detected correctly
**Check**: 
- Regex patterns in `ga4DataTransformer.js` (LLM_PATTERNS)
- Verify referrer/source values in raw GA4 data
- Check case sensitivity

### 2. Weighted Averages
**Issue**: Incorrect weighted averages for rates
**Check**:
- Engagement rate: `sum(rate * sessions) / sum(sessions)` not `sum(rate) / count`
- Bounce rate: Same formula
- Session duration: Same formula

### 3. Percentage Calculations
**Issue**: Percentages don't add up to 100%
**Check**:
- Platform split percentages are relative to total sessions
- LLM platform percentages are relative to total LLM sessions
- Geo/Device percentages are relative to their respective totals

### 4. URL Construction
**Issue**: Page URLs are incorrect
**Check**:
- defaultUri is fetched and stored correctly
- URL construction logic in `transformPagesData`
- Handle paths with/without leading slash

### 5. Conversion Events
**Issue**: Conversion rates are zero or incorrect
**Check**:
- Conversion event metric name is correct (`conversions` or `keyEvents:eventName`)
- Fallback to `conversions` when custom event not available
- Conversion rate calculation: `conversions / sessions * 100`

---

## Tools for Verification

### 1. Browser DevTools
- Network tab: Inspect API responses
- Console: Check logged data
- React DevTools: Inspect component props

### 2. Backend Logs
- Check `console.log` outputs in backend
- Verify transformation logic
- Check error handling

### 3. GA4 Query Explorer
- Test GA4 API queries manually
- Verify response structure
- Compare with your API calls

### 4. MongoDB Compass (if using cache)
- Inspect cached data
- Verify data structure
- Check timestamps

---

## Quick Verification Script

Create a test endpoint or script that:
1. Fetches data from all GA4 endpoints
2. Calculates totals and percentages
3. Compares cross-tab consistency
4. Outputs a verification report

Example:
```javascript
// Backend: /api/ga4/verify-consistency
async function verifyConsistency() {
  const platformSplit = await getPlatformSplit(...)
  const llmPlatforms = await getLLMPlatforms(...)
  const pages = await getPages(...)
  const geo = await getGeo(...)
  const devices = await getDevices(...)
  
  const results = {
    platformSplitTotal: platformSplit.totalSessions,
    llmPlatformsTotal: llmPlatforms.summary.totalLLMSessions,
    pagesTotal: pages.summary.totalSessions,
    geoTotal: geo.totalSessions,
    deviceTotal: devices.totalSessions,
    consistency: {
      llmSessionsMatch: Math.abs(llmPlatformsTotal - pagesTotal) < 1,
      geoMatches: Math.abs(geoTotal - pagesTotal) < 1,
      // ... more checks
    }
  }
  
  return results
}
```

---

## Next Steps

1. **Run manual verification** for each endpoint
2. **Create verification script** for automated testing
3. **Fix any inconsistencies** found
4. **Document any GA4 API limitations** (sampling, data freshness, etc.)
5. **Set up periodic verification** (weekly/monthly checks)

---

## Additional Resources

- GA4 Data API Documentation: https://developers.google.com/analytics/devguides/reporting/data/v1
- GA4 Query Builder: https://ga-dev-tools.web.app/ga4/query-explorer/
- Your Backend Routes: `/backend/src/routes/ga4.js`
- Your Transformers: `/backend/src/utils/ga4DataTransformer.js`
- Frontend Components: `/components/agent-analytics/`



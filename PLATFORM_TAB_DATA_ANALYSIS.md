# Platform Tab Data Analysis

## Overview
The Platform tab displays traffic analytics across 4 main sections. This document explains what each section shows and how data is calculated.

---

## Section 1: Traffic Split (UnifiedPlatformSplitSection)

### Purpose
Shows percentage distribution of traffic across all traffic sources (Organic, Direct, Referral, LLMs, Social, Email, Paid, Other).

### Data Source
- **Props**: `realLLMData` (but receives `realPlatformData` from PlatformsTab)
- **Expected Data**: 
  ```typescript
  {
    data: {
      platformSplit: Array<{name, value, color}>,  // For charts (percentage values)
      rankings: Array<{rank, name, sessions, percentage}>,  // For table (with sessions)
      totalSessions: number
    }
  }
  ```

### Displayed Metrics

#### 1. Total Sessions (Line 181)
- **Calculation**: `rankings.reduce((sum, r) => sum + r.sessions, 0)`
- **Display**: Large number at top left
- **Issue**: Currently summing `rankings.sessions` but rankings might have strings not numbers

#### 2. Chart Display
- **Chart Types**: Trend / Donut / Bar
- **Data Used**: `platformSplitData` (array with `{name, value, color}`)
- **Values**: `value` field contains percentage (0-100)

#### 3. Platform Rankings Table (Lines 410-510)
- **Platform Name**: Shows with favicon
- **Sessions**: From `ranking.sessions`
- **Share**: From `ranking.percentage` (string format like "47.00%")
- **Trend Indicators**: Random (mock data for now)
  - `trend = index % 2 === 0 ? 'up' : 'down'`
  - `absoluteChange = (index * 2 + 5) % 25 + 3`
  - `percentageChange = (index * 1.5 + 2) % 8 + 1`

### Issues Found
1. **Sessions Type**: Backend returns `sessions` as number, but frontend might be getting strings
2. **Mock Trends**: Trend indicators are random/mock, not real comparison data
3. **Missing `change` field**: Rankings calculation references `ranking.change` which doesn't exist in backend
4. **Total Sessions Calculation**: Line 117 sums `ranking.sessions`, but this might not match totalSessions from backend

---

## Section 2: Traffic Performance (UnifiedTrafficPerformanceSection)

### Purpose
Shows comprehensive performance metrics for all traffic sources in a detailed table.

### Data Source
- **Props**: `realPlatformData`
- **Expected Data**: 
  ```typescript
  {
    data: {
      performanceData: Array<{
        name, sessions, percentage, engagementRate, conversionRate,
        bounceRate, avgSessionDuration, pagesPerSession, newUsers,
        returningUsers, goalCompletions, conversionRate
      }>
    }
  }
  ```

### Displayed Metrics

#### 1. Session Quality Score (SQS) - Lines 52-60
- **Formula**: `(Engagement Rate * 0.4) + (Conversion Rate * 0.3) + (Pages per Session * 0.2) + (Session Duration / 60 * 0.1)`
- **Weight**: 
  - Engagement Rate: 40%
  - Conversion Rate: 30%
  - Pages per Session: 20%
  - Session Duration: 10%
- **Backend**: Backend doesn't calculate this - it's calculated in frontend
- **Display**: With color indicator (green ≥70, yellow ≥50, red <50)

#### 2. Engagement Score - Lines 62-65
- **Formula**: `Math.min(platform.engagementRate || 0, 100)`
- **Source**: Direct from backend `engagementRate` field
- **Backend**: Returns as percentage (multiplied by 100)

#### 3. Other Metrics (from backend):
- **Sessions**: `platform.sessions` (number)
- **Share**: `platform.percentage` (number, 0-100)
- **Conversion Rate**: `platform.conversionRate` (percentage, backend calculates as `(conversions / sessions) * 100`)
- **Bounce Rate**: `platform.bounceRate` (percentage, backend returns as `avgBounceRate * 100`)
- **Avg Session Duration**: `platform.avgSessionDuration` (seconds)
- **Pages per Session**: `platform.pagesPerSession` (number)
- **New Users**: `platform.newUsers` (number)
- **Returning Users**: `platform.returningUsers` (calculated as `totalUsers - newUsers`)

### Backend Calculations (Lines 131-156 in ga4DataTransformer.js)
```javascript
avgEngagementRate = data.count > 0 ? data.engagementRate / data.count : 0
avgBounceRate = data.count > 0 ? data.bounceRate / data.count : 0
avgSessionDuration = data.count > 0 ? data.avgSessionDuration / data.count : 0
avgPagesPerSession = data.count > 0 ? data.pagesPerSession / data.count : 0
returningUsers = data.totalUsers - data.newUsers
conversionRate = data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0
```

### Issues Found
1. **No Percentage Calculation**: Backend doesn't calculate `percentage` field for LLM platforms section
2. **Duration Format**: Backend returns seconds, frontend formats as "MM:SS"
3. **Mock Trends**: Table shows random trend indicators (lines 314-318)

---

## Section 3: Platforms Split (UnifiedPlatformsSplitSection)

### Purpose
Shows percentage distribution of traffic across LLM platforms specifically (ChatGPT, Claude, Gemini, Perplexity, etc.).

### Data Source
- **Props**: `realLLMData`
- **Expected Data**:
  ```typescript
  {
    data: {
      platforms: Array<{name, sessions, engagementRate, ...}>,
      performanceData: Array<{...}>,
      summary: {totalLLMSessions, totalLLMConversions, avgEngagementRate}
    }
  }
  ```

### Displayed Metrics

#### 1. Total LLM Sessions (Line 51)
- **Calculation**: `llmPlatformsData.reduce((sum, p) => sum + p.sessions, 0)`
- **Frontend Calculated**: Calculated from platforms array

#### 2. Platform Split Data (Lines 55-61)
- **Frontend Calculation**: 
  ```typescript
  platformSplitData = llmPlatformsData.map(platform => ({
    name: platform.name || platform.platform,
    value: totalLLMSessions > 0 ? (platform.sessions / totalLLMSessions) * 100 : 0,
    sessions: platform.sessions,
    color: colors[index % colors.length]
  }))
  ```
- **Issue**: Frontend recalculates percentages, but backend should provide them

#### 3. Rankings (Lines 64-71)
- **Frontend Calculation**:
  ```typescript
  rankings = llmPlatformsData.map((platform, index) => ({
    rank: index + 1,
    name: platform.name || platform.platform,
    sessions: platform.sessions,
    percentage: totalLLMSessions > 0 ? ((platform.sessions / totalLLMSessions) * 100).toFixed(1) + '%' : '0.0%'
  }))
  ```
- **Issue**: Frontend recalculates percentages

### Issues Found
1. **Percentage Not from Backend**: Backend doesn't provide `percentage` field for LLM platforms
2. **Redundant Calculation**: Frontend calculates percentages instead of using backend data
3. **Missing `change` field**: Rankings don't have trend data

---

## Section 4: LLM Platform Performance (UnifiedLLMPlatformPerformanceSection)

### Purpose
Shows comprehensive performance metrics for LLM platforms specifically.

### Data Source
- **Props**: `realLLMData`
- **Expected Data**:
  ```typescript
  {
    data: {
      llmPerformanceData: Array<{
        name, sessions, engagementRate, conversions, bounceRate,
        avgSessionDuration, pagesPerSession, newUsers, returningUsers,
        conversionRate
      }>
    }
  }
  ```

### Displayed Metrics

Same as Traffic Performance section, but for LLM platforms only:
- **SQS**: Calculated same way (frontend)
- **Engagement Score**: From backend
- **Sessions**: From backend
- **Share**: From `platform.percentage` - BUT THIS IS MISSING!
- **Conversion Rate**: From backend
- **Bounce Rate**: From backend
- **Avg Session Duration**: From backend
- **Pages per Session**: From backend
- **New Users**: From backend

### Critical Issue
**Line 55**: `share: platform.percentage || 0` - but backend doesn't provide `percentage` field for LLM platforms!

---

## Summary of Issues

### Backend Issues

1. **Missing `percentage` field in LLM platforms**
   - File: `try-rankly/backend/src/utils/ga4DataTransformer.js`
   - Problem: `transformToLLMPlatforms` doesn't calculate percentage
   - Fix: Add percentage calculation similar to platform split

2. **Missing `change` field in rankings**
   - Both transformers don't provide trend/change data
   - Frontend components reference `ranking.change` which doesn't exist

3. **Data type consistency**
   - Some fields might be returned as strings instead of numbers
   - Need to ensure all numeric fields are numbers

### Frontend Issues

1. **Mock Trend Data**
   - All trend indicators are random/mock
   - Need real comparison data from backend

2. **Redundant Calculations**
   - UnifiedPlatformsSplitSection recalculates percentages from sessions
   - Should use backend-provided percentages

3. **Missing Share Calculation**
   - UnifiedLLMPlatformPerformanceSection expects `platform.percentage` but it doesn't exist
   - Needs to calculate or backend needs to provide

4. **Sessions Type Handling**
   - Components need to handle both string and number types

---

## Next Steps

1. Update backend to add `percentage` field to LLM platforms data
2. Add `change` field with trend data to rankings
3. Remove mock trend calculations in frontend
4. Use backend-provided percentages instead of recalculating
5. Add share calculation for LLM performance section
6. Ensure all numeric fields are numbers not strings


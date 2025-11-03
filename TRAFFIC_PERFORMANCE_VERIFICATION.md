# Traffic Performance Section - Variable Mapping & Verification

## Overview
This document maps frontend variables to backend API responses and verifies calculation logic for the Traffic Performance section.

---

## Frontend Component: `UnifiedTrafficPerformanceSection.tsx`

### Data Source
```typescript
const performanceDataRaw = realPlatformData?.data?.performanceData || []
```

**Props received**: `realPlatformData` from `GA4AgentAnalyticsTab` → comes from `getPlatformSplit()` API call

---

## Backend API Response Structure

### Endpoint: `/api/ga4/platform-split`
**Transformer**: `transformToPlatformSplit()` in `ga4DataTransformer.js`

### Response Structure (`performanceData` array):
```javascript
{
  name: "Direct",
  sessions: 1535,
  percentage: 47.41,
  engagementRate: 28.08,        // Already in percentage (0-100)
  conversions: 2,
  bounceRate: 71.92,             // Already in percentage (0-100)
  avgSessionDuration: 49,        // Seconds
  pagesPerSession: 1.47,
  newUsers: 1254,
  returningUsers: 281,
  goalCompletions: 2,
  conversionRate: 0.13,          // Already in percentage (0-100)
  // Comparison data
  shareChange: -2.08,            // Share percentage change
  sessionChange: 0.00,           // Session percentage change
  absoluteChange: 0,             // Absolute change in sessions
  trend: "neutral"               // "up" | "down" | "neutral"
}
```

---

## Variable Mapping & Calculations

### 1. Sessions Column

**Frontend Display**: Line 331
```typescript
{item.sessions.toLocaleString()}
```

**Backend Source**: `performanceData[].sessions`
- **Line 345**: `sessions: data.sessions`
- **Calculation**: Aggregated from GA4 rows by platform

**✅ Verification**: Should match sum from GA4 API

**Percentage Change Display**: Line 342
```typescript
{change.toFixed(2)}%
```

**⚠️ ISSUE FOUND**: Frontend tries to access `item.change` but backend provides `sessionChange`
- **Line 315**: `const change = Math.abs(item.change || 0)` ❌
- **Backend provides**: `sessionChange` (line 359)
- **Should be**: `const change = Math.abs(platform.sessionChange || 0)`

---

### 2. Share Column

**Frontend Display**: Line 351
```typescript
{item.share.toFixed(2)}%
```

**Frontend Mapping**: Line 32
```typescript
share: platform.percentage || 0
```

**Backend Source**: `performanceData[].percentage`
- **Line 346**: `percentage: (data.sessions / totalSessions * 100)`
- **Calculation**: `(platformSessions / totalSessions) * 100`

**✅ Verification**: All shares should add up to 100%

---

### 3. Session Quality Score (SQS)

**Frontend Display**: Line 359
```typescript
{item.sessionQualityScore.toFixed(2)}
```

**Frontend Calculation**: Lines 52-60
```typescript
function calculateSessionQualityScore(platform: any): number {
  const engagementRate = platform.engagementRate || 0
  const conversionRate = platform.conversionRate || 0
  const pagesPerSession = platform.pagesPerSession || 0
  const avgSessionDuration = platform.avgSessionDuration || 0
  
  return Math.round((
    (engagementRate * 0.4) + 
    (conversionRate * 0.3) + 
    (pagesPerSession * 0.2) + 
    (avgSessionDuration / 60 * 0.1)
  ) * 100) / 100
}
```

**⚠️ POTENTIAL ISSUE**: The formula uses `avgSessionDuration / 60` which converts seconds to minutes, but then multiplies by 0.1. This might not be the intended calculation.

**Expected Formula** (based on tooltip):
- Engagement Rate * 0.4
- Conversion Rate * 0.3
- Pages per Session * 0.2
- Session Duration (in minutes, capped at 5) * 10 * 0.1 = Session Duration * 1

**Current vs Expected**:
- Current: `avgSessionDuration / 60 * 0.1` = `duration_in_minutes * 0.1`
- Expected (from Pages): `Math.min(duration / 60, 5) * 10 * 0.1` = `Math.min(duration_in_minutes, 5) * 1`

**Recommendation**: Match the Pages tab formula:
```typescript
(Math.min(avgSessionDuration / 60, 5) * 10 * 0.1)
```

---

### 4. Engagement Score

**Frontend Display**: Line 371
```typescript
{item.engagementScore.toFixed(2)}%
```

**Frontend Calculation**: Lines 62-65
```typescript
function calculateEngagementScore(platform: any): number {
  return Math.min(platform.engagementRate || 0, 100)
}
```

**Backend Source**: `performanceData[].engagementRate`
- **Line 347**: `engagementRate: Math.round((avgEngagementRate * 100) * 100) / 100`
- **Calculation**: Weighted average from GA4, already in percentage (0-100)

**✅ Verification**: Should match GA4 engagement rate

---

### 5. Conversion Rate

**Frontend Display**: Line 378
```typescript
{item.conversionRate.toFixed(2)}%
```

**Frontend Mapping**: Line 35
```typescript
conversionRate: platform.conversionRate || 0
```

**Backend Source**: `performanceData[].conversionRate`
- **Line 356**: `conversionRate: conversionRate`
- **Line 322**: `conversionRate = (data.conversions / data.sessions) * 100`
- **Already in percentage**: 0-100

**✅ Verification**: `conversions / sessions * 100`

---

### 6. Bounce Rate

**Frontend Display**: Line 385
```typescript
{item.bounceRate.toFixed(2)}%
```

**Frontend Mapping**: Line 36
```typescript
bounceRate: platform.bounceRate || 0
```

**Backend Source**: `performanceData[].bounceRate`
- **Line 349**: `bounceRate: Math.round((avgBounceRate * 100) * 100) / 100`
- **Calculation**: Weighted average from GA4, already in percentage (0-100)

**✅ Verification**: Should match GA4 bounce rate

---

### 7. Average Session Duration

**Frontend Display**: Line 392
```typescript
{formatDuration(item.avgSessionDuration)}
```

**Frontend Formatting**: Lines 81-85
```typescript
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
```

**Backend Source**: `performanceData[].avgSessionDuration`
- **Line 350**: `avgSessionDuration: avgSessionDuration`
- **Line 319**: Weighted average in seconds
- **Format**: `MM:SS` (e.g., "0:49")

**✅ Verification**: Weighted average of session durations

---

### 8. Pages per Session

**Frontend Display**: Line 399
```typescript
{item.pagesPerSession.toFixed(2)}
```

**Frontend Mapping**: Line 38
```typescript
pagesPerSession: platform.pagesPerSession || 0
```

**Backend Source**: `performanceData[].pagesPerSession`
- **Line 351**: `pagesPerSession: avgPagesPerSession`
- **Line 320**: Weighted average

**✅ Verification**: Weighted average of pages per session

---

### 9. New Users

**Frontend Display**: Line 406
```typescript
{item.newUsers.toLocaleString()}
```

**Frontend Mapping**: Line 39
```typescript
newUsers: platform.newUsers || 0
```

**Backend Source**: `performanceData[].newUsers`
- **Line 352**: `newUsers: data.newUsers`
- **Calculation**: Sum from GA4 rows

**✅ Verification**: Sum of new users per platform

---

### 10. Total Sessions (Summary)

**Frontend Display**: Line 141
```typescript
{totalSessions.toLocaleString()}
```

**Frontend Calculation**: Line 49
```typescript
const totalSessions = performanceData.reduce((sum, item) => sum + item.sessions, 0)
```

**⚠️ ISSUE**: Frontend recalculates from `performanceData` instead of using backend `totalSessions`
- **Should use**: `realPlatformData?.data?.totalSessions`
- **Backend provides**: `totalSessions` in response

---

### 11. Avg Session Quality (Summary)

**Frontend Display**: Line 147
```typescript
{(performanceData.reduce((sum, item) => sum + item.sessionQualityScore, 0) / performanceData.length).toFixed(2)}
```

**Calculation**: Simple average of all platform SQS scores

**⚠️ ISSUE**: Should be weighted average by sessions, not simple average
- **Current**: `sum(SQS) / count(platforms)`
- **Should be**: `sum(SQS * sessions) / sum(sessions)`

---

## Issues Found

### 🔴 Critical Issues

1. **Sessions Percentage Change Missing**
   - Frontend tries to access `item.change` but it doesn't exist
   - Backend provides `sessionChange` but frontend doesn't map it
   - **Fix**: Add `sessionChange: platform.sessionChange || 0` to mapping

2. **Total Sessions Recalculated**
   - Frontend recalculates total instead of using backend value
   - **Fix**: Use `realPlatformData?.data?.totalSessions`

3. **Avg Session Quality Wrong Calculation**
   - Uses simple average instead of weighted average
   - **Fix**: Calculate weighted average by sessions

### ⚠️ Medium Issues

4. **Session Quality Score Formula Mismatch**
   - Doesn't match Pages tab formula
   - Missing cap on duration (max 5 minutes)
   - **Fix**: Match Pages tab formula

### ✅ Correct Calculations

- Share percentages: ✅ Correct
- Engagement rate: ✅ Correct (weighted average)
- Conversion rate: ✅ Correct
- Bounce rate: ✅ Correct (weighted average)
- Avg session duration: ✅ Correct (weighted average)
- Pages per session: ✅ Correct (weighted average)
- New users: ✅ Correct (sum)

---

## Required Fixes

### Fix 1: Map sessionChange to frontend

**Current** (Line 28-43):
```typescript
const performanceData = performanceDataRaw.map((platform: any, index: number) => ({
  // ... missing sessionChange
}))
```

**Should be**:
```typescript
const performanceData = performanceDataRaw.map((platform: any, index: number) => ({
  id: index,
  name: platform.name,
  sessions: platform.sessions || 0,
  share: platform.percentage || 0,
  sessionChange: platform.sessionChange || 0,  // Add this
  sessionQualityScore: calculateSessionQualityScore(platform),
  // ... rest
}))
```

**Update Sessions column** (Line 315):
```typescript
const change = Math.abs(item.sessionChange || 0)  // Use sessionChange instead of change
```

### Fix 2: Use backend totalSessions

**Current** (Line 49):
```typescript
const totalSessions = performanceData.reduce((sum, item) => sum + item.sessions, 0)
```

**Should be**:
```typescript
const totalSessions = realPlatformData?.data?.totalSessions || 
  performanceData.reduce((sum, item) => sum + item.sessions, 0)  // Fallback
```

### Fix 3: Fix Avg Session Quality calculation

**Current** (Line 147):
```typescript
{(performanceData.reduce((sum, item) => sum + item.sessionQualityScore, 0) / performanceData.length).toFixed(2)}
```

**Should be**:
```typescript
{(() => {
  const totalSessionsForAvg = performanceData.reduce((sum, item) => sum + item.sessions, 0)
  const weightedSQS = performanceData.reduce((sum, item) => 
    sum + (item.sessionQualityScore * item.sessions), 0)
  return totalSessionsForAvg > 0 
    ? (weightedSQS / totalSessionsForAvg).toFixed(2)
    : '0.00'
})()}
```

### Fix 4: Fix Session Quality Score formula

**Current** (Line 59):
```typescript
(avgSessionDuration / 60 * 0.1)
```

**Should be**:
```typescript
(Math.min(avgSessionDuration / 60, 5) * 10 * 0.1)
```

---

## Validation Checklist

- [ ] All platform sessions sum to total sessions
- [ ] All shares add up to 100%
- [ ] Session percentage changes display correctly
- [ ] SQS calculations match Pages tab formula
- [ ] Avg Session Quality is weighted by sessions
- [ ] All percentages are between 0-100%
- [ ] Duration format is MM:SS
- [ ] New users sum to total new users

---

## Expected Display Format

### Sessions Column
```
1,535 ↑ 0.00%
```
- Sessions value (formatted)
- Trend arrow (up/down)
- Session percentage change

### Summary Section
```
Total Sessions: 3,238
Avg Session Quality: 19.54  (weighted average)
```






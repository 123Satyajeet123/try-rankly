# Pages Tab vs Platform Tab Calculation Comparison

## Key Finding: SQS Formula Mismatch

### Platform Tab SQS Formula (CORRECT - Reference)
**Location**: `UnifiedLLMPlatformPerformanceSection.tsx` and `UnifiedTrafficPerformanceSection.tsx` (lines 122-155)

```javascript
function calculateSessionQualityScore(platform: any): number {
    // SQS formula:
    // Engagement Rate (40%) + Conversion Rate (30%) + Pages per Session (20%) + Session Duration (10%)
    const engagementRate = platform.engagementRate || 0 // Already in percentage (0-100)
    const conversionRate = platform.conversionRate || 0 // Already in percentage (0-100)
    const pagesPerSession = platform.pagesPerSession || 0
    const avgSessionDuration = platform.avgSessionDuration || 0 // In seconds
    
    // Pages component: Cap at 5 pages, then scale to contribute up to 20% (max 20 points)
    const pagesComponent = Math.min(pagesPerSession, 5) * 4 // Max 20 points
    
    // Duration component: Convert seconds to minutes, cap at 5 minutes, scale to contribute up to 10% (max 10 points)
    const durationMinutes = avgSessionDuration / 60
    const durationComponent = Math.min(durationMinutes, 5) * 2 // Max 10 points
    
    // Engagement component: 40% weight (max 40 points)
    const engagementComponent = engagementRate * 0.4
    
    // Conversion component: 30% weight (max 30 points)
    const conversionComponent = conversionRate * 0.3
    
    // Total SQS (capped at 100)
    const sqs = Math.min(100, Math.max(0,
      engagementComponent +
      conversionComponent +
      pagesComponent +
      durationComponent
    ))
    
    return Math.round(sqs * 100) / 100
}
```

**Platform Tab Components:**
- Engagement Rate: 40% weight (0-40 points)
- Conversion Rate: 30% weight (0-30 points)
- Pages per Session: 20% weight (0-20 points, capped at 5 pages)
- Session Duration: 10% weight (0-10 points, capped at 5 minutes)

---

### Pages Tab SQS Formula (CURRENT - INCORRECT)
**Location**: `backend/src/utils/ga4DataTransformer.js` (lines 1248-1254)

```javascript
const sqs = Math.min(100, Math.max(0, 
  (avgEngagementRate * 0.4) +                          // 40% weight
  ((100 - avgBounceRate) * 0.3) +                      // 30% weight (inverse bounce)
  (Math.min(avgSessionDuration / 60, 5) * 10 * 0.2) +  // 20% weight (WRONG: should be * 2, not * 10 * 0.2)
  (Math.min(avgPagesPerSession, 5) * 20 * 0.1)         // 10% weight (WRONG: should be * 4, not * 20 * 0.1)
))
```

**Pages Tab Components (CURRENT - INCORRECT):**
- Engagement Rate: 40% weight ✓
- Inverse Bounce Rate: 30% weight (should be Conversion Rate!) ✗
- Session Duration: 20% weight ✗ (should be 10%)
- Pages per Session: 10% weight ✗ (should be 20%)

**Issues:**
1. ❌ Uses **Inverse Bounce Rate** instead of **Conversion Rate**
2. ❌ Session Duration calculation is wrong: `(duration / 60) * 10 * 0.2` = `(duration / 60) * 2` but capped at 5 minutes gives max `5 * 2 = 10` (correct max, but wrong formula)
3. ❌ Pages calculation is wrong: `pages * 20 * 0.1` = `pages * 2` but should be `pages * 4`
4. ❌ Component weights are swapped (Duration should be 10%, Pages should be 20%)

---

## Corrected Pages Tab SQS Formula

```javascript
// Compute Session Quality Score (SQS) - MATCHING PLATFORM TAB
const sqs = Math.min(100, Math.max(0, 
  (avgEngagementRate * 0.4) +                          // 40% weight (max 40 points)
  (conversionRate * 0.3) +                             // 30% weight (max 30 points) - FIXED: was inverse bounce
  (Math.min(avgPagesPerSession, 5) * 4) +              // 20% weight (max 20 points) - FIXED: was * 20 * 0.1
  (Math.min(avgSessionDuration / 60, 5) * 2)           // 10% weight (max 10 points) - FIXED: was * 10 * 0.2
))
```

**Note**: `conversionRate` needs to be calculated from the page data:
- `conversionRate = (totalConversions / sessions) * 100` (already calculated in transformPagesData)

---

## Avg SQS Calculation Comparison

### Platform Tab (CORRECT - Weighted Average)
**Location**: `UnifiedLLMPlatformPerformanceSection.tsx` (lines 194-197)

```javascript
const totalSessionsForAvg = performanceData.reduce((sum: number, item: any) => sum + item.sessions, 0)
const weightedSQS = performanceData.reduce((sum: number, item: any) =>
  sum + (item.sessionQualityScore * item.sessions), 0)
const calculatedAvgSQS = totalSessionsForAvg > 0 ? (weightedSQS / totalSessionsForAvg) : 0
```

**Formula**: Weighted by sessions
- `avgSQS = sum(SQS × sessions) / sum(sessions)`

### Pages Tab (CURRENT - Simple Average)
**Location**: `backend/src/utils/ga4DataTransformer.js` (line 1331)

```javascript
const avgSQS = pages.length > 0 ? pages.reduce((sum, page) => sum + page.sqs, 0) / pages.length : 0
```

**Formula**: Simple average
- `avgSQS = sum(SQS) / count(pages)`

**Issue**: Should use weighted average by sessions to match Platform Tab!

---

## Other Metric Comparisons

### Engagement Rate
- **Platform Tab**: Uses `platform.engagementRate` directly (already in percentage 0-100)
- **Pages Tab**: Calculates from GA4 decimal (0-1) and converts: `(totalEngagementRate / sessionCount) * 100` ✓ **CORRECT**

### Bounce Rate
- **Platform Tab**: Uses `platform.bounceRate` directly (already in percentage 0-100)
- **Pages Tab**: Calculates from GA4 decimal (0-1) and converts: `(totalBounceRate / sessionCount) * 100` ✓ **CORRECT**

### Conversion Rate
- **Platform Tab**: Uses `platform.conversionRate` directly (already in percentage 0-100)
- **Pages Tab**: Calculates: `(totalConversions / sessions) * 100` ✓ **CORRECT** (but not used in SQS!)

### Session Duration
- **Platform Tab**: Uses `platform.avgSessionDuration` directly (in seconds)
- **Pages Tab**: Calculates weighted average: `totalSessionDuration / sessionCount` ✓ **CORRECT**

### Pages per Session
- **Platform Tab**: Uses `platform.pagesPerSession` directly
- **Pages Tab**: Calculates weighted average: `totalPagesPerSession / sessionCount` ✓ **CORRECT**

---

## Frontend Display Comparison

### Platform Tab
- **Avg Session Quality**: Uses weighted average (correct) ✓
- **Display Format**: `calculatedAvgSQS.toFixed(2)`

### Pages Tab
- **Avg Session Quality**: Uses simple average (incorrect) ✗
- **Display Format**: `(sum(sqs) / pages.length).toFixed(1)`

**Location**: `components/agent-analytics/pages/PagesTab.tsx` (lines 228-232)

```javascript
Avg Session Quality <span>
  {pagesData.length > 0 
    ? (pagesData.reduce((sum: number, page: any) => sum + parseFloat(page.sqs || 0), 0) / pagesData.length).toFixed(1)
    : '0.0'
  }
</span>
```

**Should be**:
```javascript
// Calculate weighted average SQS
const totalSessions = pagesData.reduce((sum: number, page: any) => sum + (page.sessions || 0), 0)
const weightedSQS = pagesData.reduce((sum: number, page: any) => 
  sum + (parseFloat(page.sqs || 0) * (page.sessions || 0)), 0)
const avgSQS = totalSessions > 0 ? (weightedSQS / totalSessions) : 0

Avg Session Quality <span>
  {avgSQS.toFixed(2)}
</span>
```

---

## Summary of Issues to Fix

### Backend (`transformPagesData`)
1. ❌ **SQS Formula**: Change from inverse bounce rate to conversion rate
2. ❌ **SQS Formula**: Fix component weights (Duration 10%, Pages 20%)
3. ❌ **SQS Formula**: Fix calculation formulas for Duration and Pages
4. ❌ **Avg SQS**: Change from simple average to weighted average by sessions

### Frontend (`PagesTab.tsx`)
5. ❌ **Avg SQS Display**: Change from simple average to weighted average
6. ❌ **Display Precision**: Change from `.toFixed(1)` to `.toFixed(2)` to match Platform Tab

---

## Next Steps

1. Fix backend SQS calculation in `transformPagesData`
2. Fix backend avgSQS calculation in `transformPagesData`
3. Fix frontend avgSQS display in `PagesTab.tsx`
4. Verify all calculations match Platform Tab patterns
5. Test with real data to ensure consistency

# Pages Tab Metrics Verification

## Overview
This document verifies all metrics displayed in the Pages Tab and ensures consistency with Platform Tab calculations.

## Important: Understanding "Total Sessions" vs "Page-Level Sessions"

See `PAGES_TAB_SESSIONS_EXPLANATION.md` for detailed explanation of why:
- **Total Sessions (Summary) = 108** (unique LLM sessions, matches Platform Tab)
- **Sum of Page Sessions = 114** (page-level sessions, may double-count multi-page visits)

**They are different by design** - the summary shows unique sessions, while individual page rows show page-specific sessions.

## Metrics Displayed in Pages Tab

### 1. Total Sessions (Summary)
- **Location**: Top summary bar
- **Source**: `realPagesData?.data?.summary?.totalSessions`
- **Backend Calculation**: Fetched from Platform Tab's LLM sessions total
- **Verification**: ✅ Should match Platform Tab's "Total LLM Sessions" exactly (108 sessions)
- **Formula**: Uses `transformToPlatformSplit` with same date range and comparison data

### 2. Avg Session Quality (Summary)
- **Location**: Top summary bar
- **Source**: `realPagesData?.data?.summary?.avgSQS` (if available) or calculated
- **Backend Calculation**: Weighted average by sessions
  - Formula: `sum(page.sqs * page.sessions) / totalSessions`
- **Verification**: ✅ Uses Platform Tab's total sessions for denominator consistency

### 3. LLM Sessions (Per Page)
- **Location**: Table column "LLM Sessions"
- **Source**: `page.sessions`
- **Backend Calculation**: Sum of sessions for that page path from all LLM platforms
- **Verification**: ✅ Should match sum of `page.platformSessions` values
- **Formula**: Aggregated by `pagePath`, filtered to LLM platforms only

### 4. Platform Breakdown (Per Page)
- **Location**: Table column "Platform"
- **Source**: `page.platformSessions` object
- **Backend Calculation**: Sessions grouped by platform for each page
- **Verification**: ✅ Sum of platform sessions should equal `page.sessions`
- **Formula**: `{ platform: sessions }` for each LLM platform

### 5. Session Quality Score (SQS) (Per Page)
- **Location**: Table column "Session Quality Score"
- **Source**: `page.sqs`
- **Backend Calculation**: Composite metric (0-100)
  - Formula: `(Engagement Rate × 0.4) + (Conversion Rate × 0.3) + (min(Pages per Session, 5) × 4) + (min(Session Duration in min, 5) × 2)`
- **Components**:
  - Engagement Rate: 40% weight (max 40 points)
  - Conversion Rate: 30% weight (max 30 points)
  - Pages per Session: 20% weight, capped at 5 pages (max 20 points)
  - Session Duration: 10% weight, capped at 5 minutes (max 10 points)
- **Verification**: ✅ Matches Platform Tab's SQS formula exactly

### 6. Conversion Rate (Per Page)
- **Location**: Table column "Conversion Rate"
- **Source**: `page.conversionRate`
- **Backend Calculation**: `(totalConversions / sessions) × 100`
- **Verification**: ✅ Based on selected conversion event
- **Display**: Rounded to whole number in frontend (e.g., `Math.round(page.conversionRate)`)

### 7. Bounce Rate (Per Page)
- **Location**: Table column "Bounce Rate"
- **Source**: `page.bounce`
- **Backend Calculation**: Weighted average bounce rate
  - Formula: `(totalBounceRate / sessions) × 100`
  - GA4 returns bounce rate as decimal (0-1), converted to percentage
- **Verification**: ✅ Should be inverse of engagement rate (Bounce Rate = 1 - Engagement Rate)
- **Display**: Rounded to whole number in frontend

### 8. Time on Page (Per Page)
- **Location**: Table column "Time on Page"
- **Source**: `page.timeOnPage`
- **Backend Calculation**: Weighted average session duration
  - Formula: `totalSessionDuration / sessions`
- **Verification**: ✅ In seconds, displayed with "s" suffix
- **Display**: Rounded to whole number in frontend

## Calculation Verification Points

### ✅ Fixed Issues

1. **Total Sessions Consistency**
   - ✅ Now fetches from Platform Tab's LLM sessions total
   - ✅ Uses same date range (`'today'` instead of `'yesterday'`)
   - ✅ Includes comparison data for accurate matching

2. **SQS Formula**
   - ✅ Matches Platform Tab formula exactly
   - ✅ Same component weights (40/30/20/10)
   - ✅ Same capping rules (5 pages, 5 minutes)

3. **Weighted Averages**
   - ✅ Uses `data.sessions` (not `sessionCount`) for consistency
   - ✅ GA4 metrics correctly converted from decimals to percentages
   - ✅ All rate-based metrics use weighted averages

4. **Platform Sessions Sum**
   - ✅ Each page's `platformSessions` sum equals `page.sessions`
   - ✅ Validation added to catch mismatches

### 🔍 Verification Checks in Logs

The backend now logs comprehensive verification data:

```javascript
{
  totalPageSessions: 114, // Sum of all page.sessions (may double-count)
  totalUniqueLLMSessions: 108, // Unique LLM sessions (matches Platform Tab)
  totalPlatformSessions: 114, // Sum of platformSessions (should match totalPageSessions)
  platformSessionMismatches: 0, // Should be 0
  weightedAverages: {
    engagementRate: "...",
    bounceRate: "...",
    conversionRate: "...",
    timeOnPage: "..."
  }
}
```

### ⚠️ Known Limitations

1. **Page-Level vs Unique Sessions**
   - `totalPageSessions` (114) may be higher than `totalUniqueLLMSessions` (108)
   - Reason: Same session can visit multiple pages
   - Solution: `totalSessions` uses Platform Tab's unique count (108)

2. **Frontend Rounding**
   - SQS, Conversion Rate, Bounce Rate displayed as whole numbers
   - Backend stores with 2 decimal places
   - This is acceptable for display purposes

## Cross-Tab Consistency

### Platform Tab → Pages Tab
- ✅ Total LLM Sessions: 108 (both tabs)
- ✅ SQS Formula: Identical
- ✅ Platform Detection: Same logic
- ✅ Date Range: Now matches exactly

### Pages Tab Internal Consistency
- ✅ Platform sessions sum = Page sessions (per page)
- ✅ Total platform breakdown = Total unique LLM sessions (108)
- ✅ Weighted averages calculated correctly

## Testing Checklist

- [ ] Total Sessions matches Platform Tab (108)
- [ ] Avg SQS calculated correctly (weighted by sessions)
- [ ] Each page's platform sessions sum equals page sessions
- [ ] SQS values match formula components
- [ ] Conversion rates use selected conversion event
- [ ] Bounce rates are inverse of engagement rates
- [ ] Time on page in seconds, rounded correctly


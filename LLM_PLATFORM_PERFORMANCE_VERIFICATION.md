# LLM Platform Performance Section - Data Verification & Variable Mapping

## Overview
This document maps frontend variables to backend API values, verifies calculations, and ensures data consistency in the LLM Platform Performance section.

## Frontend Component
**File:** `components/agent-analytics/platforms/UnifiedLLMPlatformPerformanceSection.tsx`

## Backend API
**Endpoint:** `/api/ga4/llm-platforms`
**Transformer:** `backend/src/utils/ga4DataTransformer.js` → `transformToLLMPlatforms()`

---

## 1. Data Flow

```
GA4 API → Backend Transformer → Frontend Component
```

### Backend Response Structure:
```javascript
{
  data: {
    platforms: [
      {
        name: "ChatGPT",
        sessions: 323,
        percentage: 61.17, // Percentage share
        engagementRate: 68.42,
        conversionRate: 0,
        bounceRate: 31.58,
        avgSessionDuration: 167.35, // Seconds
        pagesPerSession: 0.97,
        newUsers: 183,
        returningUsers: 68,
        // Comparison data
        change: -9.78, // Session percentage change
        absoluteChange: -35,
        shareChange: 2.5, // Share percentage point change
        trend: "down"
      },
      ...
    ],
    performanceData: [...], // Same as platforms array
    summary: {
      totalLLMSessions: 528,
      totalLLMConversions: 0,
      avgEngagementRate: 65.23
    }
  }
}
```

---

## 2. Frontend Variable Mapping

### 2.1 Total Sessions Display (Lines 159-163)

| Frontend Variable | Backend Source | Type | Description |
|------------------|----------------|------|-------------|
| `totalSessions` | Calculated from `performanceData.reduce()` | number | Sum of all platform sessions |

**Display:**
- Shows: `Total Sessions: {totalSessions}`

**✅ Status:** Correct - Calculated from performance data

---

### 2.2 Avg Session Quality Display (Lines 165-170)

| Frontend Variable | Backend Source | Type | Description |
|------------------|----------------|------|-------------|
| Avg Session Quality | Calculated as simple average | number | Average of all platform SQS scores |

**Current Calculation (Line 168):**
```typescript
(performanceData.reduce((sum, item) => sum + item.sessionQualityScore, 0) / performanceData.length).toFixed(2)
```

**❌ Issue:** This is a **simple average**, not a **weighted average by sessions**.

**✅ Should be:** Weighted average: `sum(SQS * sessions) / sum(sessions)`

---

### 2.3 Performance Data Table (Lines 52-67, 334-454)

| Frontend Variable | Backend Source | Type | Description |
|------------------|----------------|------|-------------|
| `performanceDataRaw` | `realLLMData?.data?.llmPerformanceData` | array | Raw performance data from backend |
| `item.name` | `platform.name` | string | Platform name |
| `item.sessions` | `platform.sessions` | number | Total sessions |
| `item.share` | `platform.percentage` | number | Percentage share (0-100) |
| `item.sessionQualityScore` | Calculated via `calculateSessionQualityScore()` | number | SQS score (0-100) |
| `item.engagementScore` | `platform.engagementRate` | number | Engagement rate (0-100%) |
| `item.conversionRate` | `platform.conversionRate` | number | Conversion rate (0-100%) |
| `item.bounceRate` | `platform.bounceRate` | number | Bounce rate (0-100%) |
| `item.avgSessionDuration` | `platform.avgSessionDuration` | number | Duration in seconds |
| `item.pagesPerSession` | `platform.pagesPerSession` | number | Pages per session |
| `item.newUsers` | `platform.newUsers` | number | Number of new users |

**❌ Missing Comparison Data:**
- `absoluteChange`: Not mapped from backend
- `shareChange`: Not mapped from backend
- `change`: Not mapped from backend
- `trend`: Not mapped from backend

---

### 2.4 Sessions Column (Lines 369-388)

**Current Display:**
- Shows: `{sessions}` with percentage change and trend arrow

**❌ Issue:** User requested to remove percentage change, show only absolute number (like Traffic Performance section)

---

## 3. Calculations Verification

### 3.1 Session Quality Score (SQS) Calculation (Lines 76-84)

**Current Formula:**
```typescript
return Math.round(((engagementRate * 0.4) + (conversionRate * 0.3) + (pagesPerSession * 0.2) + (avgSessionDuration / 60 * 0.1)) * 100) / 100
```

**❌ Issues:**
1. **Pages per Session:** Should be capped at 5 pages (max 20 points), then `min(pages, 5) * 4`
2. **Session Duration:** Should be capped at 5 minutes (max 10 points), then `min(durationMinutes, 5) * 2`
3. **Formula doesn't match Traffic Performance section**

**✅ Correct Formula (from Traffic Performance):**
```typescript
const pagesComponent = Math.min(pagesPerSession, 5) * 4 // Max 20 points
const durationMinutes = avgSessionDuration / 60
const durationComponent = Math.min(durationMinutes, 5) * 2 // Max 10 points
const engagementComponent = engagementRate * 0.4 // Max 40 points
const conversionComponent = conversionRate * 0.3 // Max 30 points
const sqs = engagementComponent + conversionComponent + pagesComponent + durationComponent
```

---

### 3.2 Avg Session Quality Calculation (Line 168)

**Current:**
```typescript
(performanceData.reduce((sum, item) => sum + item.sessionQualityScore, 0) / performanceData.length)
```

**❌ Issue:** Simple average (wrong)

**✅ Should be:** Weighted average by sessions:
```typescript
const totalSessionsForAvg = performanceData.reduce((sum, item) => sum + item.sessions, 0)
const weightedSQS = performanceData.reduce((sum, item) => sum + (item.sessionQualityScore * item.sessions), 0)
const calculatedAvgSQS = totalSessionsForAvg > 0 ? (weightedSQS / totalSessionsForAvg) : 0
```

---

## 4. Issues Found

### Issue 1: Sessions Column Shows Percentage Change
**Location:** Lines 369-388
**Problem:** Shows percentage change with trend arrow
**Fix:** Remove percentage change, show only absolute number

---

### Issue 2: SQS Calculation Incorrect
**Location:** Lines 76-84
**Problem:** Doesn't match Traffic Performance section formula
**Fix:** Update to use same formula with capping

---

### Issue 3: Avg Session Quality Uses Simple Average
**Location:** Line 168
**Problem:** Should be weighted average by sessions
**Fix:** Calculate weighted average

---

### Issue 4: Missing Comparison Data Mapping
**Location:** Lines 52-67
**Problem:** `absoluteChange`, `shareChange`, `change`, `trend` not mapped from backend
**Fix:** Add mapping for comparison data

---

### Issue 5: Tooltip Descriptions Need Updates
**Location:** Multiple tooltips throughout component
**Problem:** Need to match Traffic Performance section tooltips
**Fix:** Update all tooltips with accurate descriptions

---

## 5. Cross-Verification Checklist

### 5.1 Data Consistency
- [ ] Backend `platforms[]` matches `performanceData[]`
- [ ] Total sessions calculated correctly
- [ ] Percentages sum to 100%

### 5.2 Calculation Accuracy
- [ ] SQS formula matches Traffic Performance section
- [ ] Avg Session Quality uses weighted average
- [ ] All metrics calculated correctly

### 5.3 Display Consistency
- [ ] Sessions column shows only absolute number
- [ ] Font sizes match Traffic Performance section
- [ ] Tooltips are accurate

---

## 6. Files to Update

1. **Frontend Component:**
   - `components/agent-analytics/platforms/UnifiedLLMPlatformPerformanceSection.tsx`
   - Fix SQS calculation
   - Fix Avg Session Quality calculation
   - Remove percentage from Sessions column
   - Map comparison data
   - Update tooltips

2. **Backend (if needed):**
   - Verify `performanceData` includes all comparison fields
   - Ensure calculations are correct


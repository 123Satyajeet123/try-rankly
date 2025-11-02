# Traffic Split Section - Variable Mapping & Verification

## Overview
This document maps frontend variables to backend API responses and verifies calculation logic for the Traffic Split section.

---

## Frontend Component: `UnifiedPlatformSplitSection.tsx`

### Data Source
```typescript
const platformSplitData = realLLMData?.data?.platformSplit || []
const rankings = realLLMData?.data?.rankings || []
const totalSessions = realLLMData?.data?.totalSessions || 0
```

**Props received**: `realLLMData` from `GA4AgentAnalyticsTab` → comes from `getPlatformSplit()` API call

---

## Backend API Response Structure

### Endpoint: `/api/ga4/platform-split`
**Transformer**: `transformToPlatformSplit()` in `ga4DataTransformer.js`

### Response Structure:
```javascript
{
  success: true,
  data: {
    platformSplit: [
      { name: "Direct", value: 46.09, color: "#EF4444" },
      { name: "Organic", value: 34.92, color: "#10B981" },
      // ... more platforms
    ],
    rankings: [
      {
        rank: 1,
        name: "Direct",
        sessions: 1478,
        percentage: "46.09%",
        change: 2.28,           // Percentage change
        absoluteChange: 33,     // Absolute change in sessions
        trend: "up"             // "up" | "down" | "neutral"
      },
      // ... more rankings
    ],
    totalSessions: 3207,
    summary: {
      totalSessions: 3207,
      topPlatform: "Direct",
      topPlatformShare: 46.09,
      totalChange: 10.5,        // Overall change percentage
      llmBreakdown: [...]       // For debugging
    },
    performanceData: [...]      // Detailed platform metrics
  }
}
```

---

## Variable Mapping & Calculations

### 1. Total Sessions Display (`3,207`)

**Frontend Location**: Line 183 in `UnifiedPlatformSplitSection.tsx`
```typescript
{allSourcesTotalSessions.toLocaleString()}
```

**Frontend Calculation**: Line 118
```typescript
const allSourcesTotalSessions = rankings.reduce((sum: number, ranking: any) => 
  sum + (parseInt(ranking.sessions) || 0), 0
);
```

**Backend Source**: `totalSessions` from `transformToPlatformSplit()`
- **Line 257**: `const totalSessions = Array.from(platformMap.values()).reduce((sum, val) => sum + val.sessions, 0);`
- This is the sum of ALL platform sessions (Direct + Organic + Referral + LLMs + Other + Social + Email + Paid)

**✅ Verification**:
- Backend: `totalSessions` = sum of all platform sessions
- Frontend: `allSourcesTotalSessions` = sum of `rankings[].sessions`
- **These should match!** ✅

**⚠️ Potential Issue**:
- Frontend recalculates total from `rankings` array
- Should use `realLLMData.data.totalSessions` directly instead
- **Recommendation**: Use `totalSessions` from backend directly

---

### 2. Platform Rankings Table (Right Side)

**Data Source**: `rankings` array from backend

#### 2a. Platform Name
- **Frontend**: `ranking.name` (Line 451)
- **Backend**: Line 332, 379 - Platform name with first letter capitalized
- ✅ Correct mapping

#### 2b. Current Sessions (e.g., `1,478`)
- **Frontend**: `(parseInt(ranking.sessions) || 0).toLocaleString()` (Line 481)
- **Backend**: Line 380 - `sessions: item.sessions`
- **Calculation**: Line 336 - `sessions: data.sessions` (aggregated from GA4 rows)
- ✅ Correct - Shows actual session count

#### 2c. Change in Sessions (e.g., `+33`)
- **Frontend**: `{trend === 'up' ? '+' : '-'}{absoluteChange}` (Line 483)
- **Backend**: Line 383 - `absoluteChange: item.absoluteChange`
- **Calculation**: Line 330 - `absoluteChange = data.sessions - previousSessions`
- ✅ Correct - Shows absolute difference from previous period

#### 2d. Share Percentage (e.g., `46.09%`)
- **Frontend**: `parseFloat(ranking.percentage.replace('%', '')).toFixed(2) + '%'` (Line 494)
- **Backend**: Line 381 - `percentage: "${item.percentage.toFixed(2)}%"`
- **Calculation**: Line 337 - `percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions * 100) * 100) / 100 : 0`
- ✅ Correct - Percentage of total sessions

**⚠️ Note**: The calculation has double rounding:
- First: `(data.sessions / totalSessions * 100) * 100` - multiplies by 100 twice (might be intentional for precision)
- Then: `Math.round(...) / 100` - rounds to 2 decimals

**Formula**: `(platformSessions / totalSessions) * 100`

#### 2e. Change in Share Percentage (e.g., `+2.28%`)
- **Frontend**: `{percentageChange.toFixed(2)}%` (Line 506)
- **Frontend Source**: `const percentageChange = Math.abs(ranking.change || 0)` (Line 419)
- **Backend**: Line 382 - `change: item.change`
- **Calculation**: Line 327-329
  ```javascript
  const sessionChange = previousSessions > 0 
    ? ((data.sessions - previousSessions) / previousSessions) * 100 
    : 0;
  ```

**⚠️ IMPORTANT**: The backend calculates `change` as **session percentage change**, NOT **share percentage change**!

**Current Calculation**:
```javascript
change = ((currentSessions - previousSessions) / previousSessions) * 100
// Example: ((1478 - 1445) / 1445) * 100 = 2.28%
```

**Expected Calculation** (based on image showing share change):
```javascript
currentShare = (currentSessions / currentTotal) * 100
previousShare = (previousSessions / previousTotal) * 100
shareChange = ((currentShare - previousShare) / previousShare) * 100
// Or: ((currentShare - previousShare) / 100) * 100 = absolute share change
```

**Image shows**: `+2.28%` change in share, which is the difference between:
- Current share: 46.09%
- Previous share: 43.81% (approximately)
- Change: 46.09% - 43.81% = 2.28%

**🔴 ISSUE FOUND**: Backend calculates session percentage change, but frontend displays it as share percentage change. This is **incorrect**!

**Recommendation**: Backend should calculate share percentage change:
```javascript
const currentShare = totalSessions > 0 ? (data.sessions / totalSessions * 100) : 0;
const previousShare = comparisonTotalSessions > 0 
  ? (previousSessions / comparisonTotalSessions * 100) 
  : 0;
const shareChange = previousShare > 0 
  ? ((currentShare - previousShare) / previousShare) * 100 
  : (currentShare - previousShare); // If previous share is 0, use absolute change
```

#### 2f. Trend Indicator (Up/Down Arrow)
- **Frontend**: Line 498-502 - Uses `trend === 'up' ? <ModernTrendUp> : <ModernTrendDown>`
- **Backend**: Line 384 - `trend: item.trend`
- **Calculation**: Line 351 - `trend: sessionChange > 0 ? 'up' : sessionChange < 0 ? 'down' : 'neutral'`
- ✅ Correct logic, but should use share change instead of session change

---

### 3. Chart Data (Left Side)

#### 3a. Trend Chart (Default View)
- **Component**: `PlatformTrendChart` (Line 198)
- **Data Source**: Separate API call to `/api/ga4/llm-platform-trends`
- **Expected Format**: Array of objects with `{ date: "YYYY-MM-DD", Direct: number, Organic: number, ... }`
- ✅ Separate endpoint, correctly implemented

#### 3b. Donut Chart
- **Data Source**: `platformSplitData` (Line 293)
- **Fields Used**:
  - `value` - Percentage (Line 295)
  - `name` - Platform name (Line 296)
  - `color` - Platform color (Line 316)
- ✅ Correct mapping

#### 3c. Bar Chart
- **Data Source**: `platformSplitData` (Line 214)
- **Fields Used**: Same as donut chart
- ✅ Correct mapping

---

### 4. Platform Split Array Structure

**Frontend Expects**:
```typescript
platformSplitData: Array<{
  name: string,    // "Direct", "Organic", "LLMs", etc.
  value: number,   // Percentage (0-100)
  color: string    // Hex color code
}>
```

**Backend Provides**:
```javascript
platformSplit: [
  { name: "Direct", value: 46.09, color: "#EF4444" },
  // ...
]
```

**Backend Calculation** (Lines 370-374):
```javascript
const platformSplit = finalPlatformData.map(item => ({
  name: item.name,
  value: item.percentage,  // Already calculated as percentage
  color: platformColors[item.name.toLowerCase()] || '#6B7280'
}));
```

**✅ Mapping is correct!**

---

## Calculation Verification Checklist

### ✅ Correct Calculations

1. **Total Sessions**
   - Formula: `sum(all platform sessions)`
   - Backend: ✅ Correct (Line 257)
   - Frontend: ✅ Correct (recalculates from rankings)

2. **Platform Sessions**
   - Formula: `sum(sessions for platform from GA4 rows)`
   - Backend: ✅ Correct (Lines 236, aggregated from GA4)

3. **Platform Percentage**
   - Formula: `(platformSessions / totalSessions) * 100`
   - Backend: ✅ Correct (Line 337)
   - Note: Has double multiplication, verify if intentional

4. **Absolute Change**
   - Formula: `currentSessions - previousSessions`
   - Backend: ✅ Correct (Line 330)

### 🔴 Incorrect Calculations

1. **Share Percentage Change** (Line 327-329, 349)
   - **Current**: Calculates session percentage change
   - **Should be**: Share percentage change
   - **Impact**: Frontend shows wrong value in share change column

2. **Total Change Display** (Line 119-121)
   - Frontend has hardcoded `allSourcesTotalChange = 0`
   - Should use `summary.totalChange` from backend

---

## Required Backend Fixes

### Fix 1: Calculate Share Percentage Change

**Current Code** (Lines 324-329):
```javascript
const comparisonData = comparisonMap.get(platform);
const previousSessions = comparisonData?.sessions || 0;
const sessionChange = previousSessions > 0 
  ? ((data.sessions - previousSessions) / previousSessions) * 100 
  : 0;
const absoluteChange = data.sessions - previousSessions;
```

**Should Be**:
```javascript
const comparisonData = comparisonMap.get(platform);
const previousSessions = comparisonData?.sessions || 0;
const absoluteChange = data.sessions - previousSessions;

// Calculate share percentage change
const currentShare = totalSessions > 0 ? (data.sessions / totalSessions * 100) : 0;
const previousShare = comparisonTotalSessions > 0 
  ? (previousSessions / comparisonTotalSessions * 100) 
  : 0;

// Share change: difference in percentage points
const shareChange = currentShare - previousShare;

// Session change percentage (keep for reference)
const sessionChange = previousSessions > 0 
  ? ((data.sessions - previousSessions) / previousSessions) * 100 
  : 0;
```

**Update rankings** (Line 377-385):
```javascript
const rankings = finalPlatformData.map((item, index) => ({
  rank: index + 1,
  name: item.name,
  sessions: item.sessions,
  percentage: `${item.percentage.toFixed(2)}%`,
  change: item.shareChange,  // Use shareChange instead of change
  absoluteChange: item.absoluteChange,
  trend: item.shareChange > 0 ? 'up' : item.shareChange < 0 ? 'down' : 'neutral'
}));
```

**Update finalPlatformData** (Line 334-352):
```javascript
finalPlatformData.push({
  name: platformName,
  sessions: data.sessions,
  percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions * 100) * 100) / 100 : 0,
  // ... other fields ...
  shareChange: shareChange,  // Add this
  sessionChange: sessionChange,  // Keep for reference if needed
  absoluteChange: absoluteChange,
  trend: shareChange > 0 ? 'up' : shareChange < 0 ? 'down' : 'neutral'
});
```

### Fix 2: Remove Double Multiplication in Percentage

**Current Code** (Line 337):
```javascript
percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions * 100) * 100) / 100 : 0
```

**Should Be**:
```javascript
percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions * 100) * 100) / 100 : 0
// Actually, this is correct - multiplies by 100 to get percentage, then * 100 and / 100 for rounding
// But can be simplified to:
percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions) * 10000) / 100 : 0
```

---

## Frontend Fixes Needed

### Fix 1: Use Backend totalSessions Directly

**Current Code** (Line 118):
```typescript
const allSourcesTotalSessions = rankings.reduce((sum: number, ranking: any) => 
  sum + (parseInt(ranking.sessions) || 0), 0
);
```

**Should Be**:
```typescript
const allSourcesTotalSessions = totalSessions; // Use from backend directly
```

**Or better**: Rename `totalSessions` to avoid confusion:
```typescript
const displayedTotalSessions = realLLMData?.data?.totalSessions || 0;
```

### Fix 2: Use Backend Total Change

**Current Code** (Lines 119-121):
```typescript
const allSourcesTotalChange = 0;
const allSourcesTotalTrend = null;
```

**Should Be**:
```typescript
const allSourcesTotalChange = realLLMData?.data?.summary?.totalChange || 0;
const allSourcesTotalTrend = allSourcesTotalChange > 0 ? 'up' : 
                            allSourcesTotalChange < 0 ? 'down' : 'neutral';
```

---

## Verification Test Cases

### Test Case 1: Total Sessions Match
- **Check**: `totalSessions` from backend = sum of `rankings[].sessions`
- **Expected**: Should match exactly

### Test Case 2: Percentages Add Up
- **Check**: Sum of all `platformSplit[].value` = 100%
- **Expected**: Should be within 0.1% (allowing rounding)

### Test Case 3: Share Change Calculation
- **Example**:
  - Previous: Direct = 1445 sessions, Total = 3000 sessions → Share = 48.17%
  - Current: Direct = 1478 sessions, Total = 3207 sessions → Share = 46.09%
  - Share Change: 46.09% - 48.17% = **-2.08%** (negative!)
- **Current Behavior**: Would show +2.28% (session change)
- **Expected**: Should show -2.08% (share change)

### Test Case 4: Trend Indicators
- **Check**: Trend arrow matches sign of share change
- **Expected**: Up arrow for positive, down arrow for negative

---

## Summary of Issues Found

1. 🔴 **Critical**: Share percentage change is calculated incorrectly (uses session change instead)
2. ⚠️ **Medium**: Frontend recalculates total sessions instead of using backend value
3. ⚠️ **Low**: Total change display is hardcoded to 0

---

## Recommended Actions

1. **Fix backend** `transformToPlatformSplit()` to calculate share percentage change
2. **Update frontend** to use `totalSessions` directly from backend
3. **Update frontend** to display `summary.totalChange` for overall change
4. **Test** with real data to verify calculations match GA4 web interface
5. **Verify** cross-tab consistency (Platform Split totals should match other tabs)



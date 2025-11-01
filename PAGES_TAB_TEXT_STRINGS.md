# Pages Tab - Text Strings Reference

This document lists all text strings displayed in the Pages Tab and where they are defined in the code.

## Overview
All text strings in the Pages Tab are **hardcoded directly in the component** (`PagesTab.tsx`). There is no i18n/translations system currently in place.

---

## Text Strings by Section

### 1. Empty State (When No Data Available)
**Location:** `PagesTab.tsx` lines 235-237

```typescript
<h2 className="text-foreground">Page Performance</h2>
<p className="body-text text-muted-foreground mt-1">
  No real data available. Please connect to GA4 and sync data.
</p>
```

**Where it appears:** Displayed when `pages.length === 0` after loading is complete.

---

### 2. Main Header
**Location:** `PagesTab.tsx` lines 255-256

```typescript
<h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Page Performance</h2>
<p className="text-sm text-muted-foreground">LLM traffic metrics by page</p>
```

**Where it appears:** Top of the main card when data is available.

---

### 3. Conversion Event Selector
**Location:** `PagesTab.tsx` lines 261-272

```typescript
<span className="text-sm text-muted-foreground">Conversion Event:</span>
```

**Tooltip Text** (lines 266-270):
```typescript
<p className="text-sm">
  <strong>What does this filter do?</strong><br />
  By default, pages show overall "conversions". Select a specific conversion event (like "purchases" or "sign_up") to see pages filtered by that specific event. This helps you identify which pages drive specific actions.
</p>
```

**Select Placeholder** (line 276):
```typescript
<SelectValue placeholder="Select conversion event" />
```

**Where it appears:** Top right of the header section.

---

### 4. Summary Metrics
**Location:** `PagesTab.tsx` lines 298-342

#### Total Sessions (line 300)
```typescript
<span>Total Sessions</span>
```

**Tooltip Text** (lines 306-315):
```typescript
<p className="text-sm font-semibold">Total LLM Sessions</p>
<p className="text-sm">Total number of <strong>unique</strong> sessions from LLM providers</p>
<p className="text-xs text-muted-foreground mt-1">
  Each session is counted once, regardless of how many pages it visits. This matches the Platform Tab's "Total LLM Sessions" for consistency.
</p>
<div className="mt-2 pt-2 border-t border-border/50">
  <p className="text-xs font-semibold mb-1">Note:</p>
  <p className="text-xs text-muted-foreground">
    The sum of page-level sessions in the table below may be higher than this total if some sessions visited multiple pages.
  </p>
</div>
```

#### Avg Session Quality (line 329)
```typescript
Avg Session Quality
```

**Where it appears:** Summary bar next to Total Sessions.

---

### 5. Table Headers
**Location:** `PagesTab.tsx` lines 350-490

#### Page (line 352)
```typescript
<span className="text-xs font-medium text-muted-foreground">Page</span>
```

#### LLM Sessions (line 360)
```typescript
<span className="text-sm font-semibold">LLM Sessions (Page-Level)</span>
<span className="text-sm">Number of sessions from LLM providers to this specific page</span>
<p className="text-xs text-muted-foreground mt-1">
  This is a <strong>page-level count</strong>. If a session visits multiple pages, it will be counted once for each page it visits.
</p>
<div className="mt-2 pt-2 border-t border-border/50">
  <p className="text-xs font-semibold mb-1">Note:</p>
  <p className="text-xs text-muted-foreground">
    The sum of all page-level sessions may be higher than the "Total Sessions" shown in the summary, which counts each unique session only once.
  </p>
</div>
```

#### Platform (line 376)
```typescript
<span className="text-sm">LLM platforms driving traffic to this page</span>
<span className="text-xs text-muted-foreground mt-1">Shows platforms by session count with favicons</span>
```

#### Session Quality Score (line 394)
```typescript
<p className="text-sm font-semibold">Session Quality Score (SQS)</p>
<p className="text-sm">
  A composite metric (0-100) that evaluates session quality based on:
</p>
<ul className="text-xs space-y-1 ml-4 list-disc">
  <li><strong>Engagement Rate</strong> × 0.4 (40% weight, max 40 points)</li>
  <li><strong>Conversion Rate</strong> × 0.3 (30% weight, max 30 points)</li>
  <li><strong>Pages per Session</strong> × 4, capped at 5 pages (20% weight, max 20 points)</li>
  <li><strong>Session Duration</strong> (minutes) × 2, capped at 5 minutes (10% weight, max 10 points)</li>
</ul>
<p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
  <strong>Formula:</strong> SQS = (Engagement Rate × 0.4) + (Conversion Rate × 0.3) + (min(Pages, 5) × 4) + (min(Duration in min, 5) × 2)
</p>
<div className="mt-2 pt-2 border-t border-border/50">
  <p className="text-xs font-semibold mb-1">Quality Levels:</p>
  <ul className="text-xs space-y-0.5">
    <li>• <span className="text-green-500">●</span> <strong>Good:</strong> 70-100</li>
    <li>• <span className="text-yellow-500">●</span> <strong>Average:</strong> 50-69</li>
    <li>• <span className="text-red-500">●</span> <strong>Poor:</strong> 0-49</li>
  </ul>
</div>
```

#### Conversion Rate (line 450)
```typescript
<span className="text-sm font-semibold">Conversion Rate</span>
<span className="text-sm">Percentage of sessions that resulted in a conversion event</span>
<p className="text-xs text-muted-foreground mt-1">
  Calculated as: (Total Conversions / Total Sessions) × 100%
</p>
<p className="text-xs text-muted-foreground mt-1">
  The conversion event used can be selected from the dropdown above
</p>
<p className="text-xs text-muted-foreground mt-1">
  Higher values indicate better conversion performance
</p>
```

#### Bounce Rate (line 473)
```typescript
<span className="text-sm font-semibold">Bounce Rate</span>
<span className="text-sm">Percentage of sessions where the user left after viewing only one page</span>
<p className="text-xs text-muted-foreground mt-1">Calculated as: (Single-page Sessions / Total Sessions) × 100%</p>
<p className="text-xs text-muted-foreground mt-1">
  Lower values indicate users are engaging with multiple pages
</p>
<p className="text-xs text-muted-foreground mt-1">
  <strong>Note:</strong> Bounce Rate is the inverse of Engagement Rate
</p>
```

#### Time on Page (line 495)
```typescript
<span className="text-sm font-semibold">Time on Page</span>
<span className="text-sm">Average time spent per session on this page</span>
<p className="text-xs text-muted-foreground mt-1">Calculated as: Total Session Duration / Total Sessions</p>
<p className="text-xs text-muted-foreground mt-1">Displayed in seconds</p>
<p className="text-xs text-muted-foreground mt-1">Higher values indicate users are spending more time on this page</p>
```

---

## Summary

### Total Text Strings Count: ~25 unique strings

### Categories:
1. **Headers & Titles:** 3 strings
   - "Page Performance" (2 instances)
   - "LLM traffic metrics by page"

2. **Empty State:** 2 strings
   - "Page Performance"
   - "No real data available. Please connect to GA4 and sync data."

3. **Summary Metrics:** 2 labels + extensive tooltips
   - "Total Sessions"
   - "Avg Session Quality"

4. **Table Column Headers:** 6 headers + detailed tooltips
   - "Page"
   - "LLM Sessions"
   - "Platform"
   - "Session Quality Score"
   - "Conversion Rate"
   - "Bounce Rate"
   - "Time on Page"

5. **UI Elements:** 2 strings
   - "Conversion Event:"
   - "Select conversion event" (placeholder)

---

## Recommendations for Future

If internationalization (i18n) is needed in the future:

1. **Create a translations file:**
   ```typescript
   // lib/translations/pages.ts
   export const pagesText = {
     en: {
       header: {
         title: "Page Performance",
         subtitle: "LLM traffic metrics by page"
       },
       emptyState: {
         title: "Page Performance",
         message: "No real data available. Please connect to GA4 and sync data."
       },
       // ... etc
     }
   }
   ```

2. **Use a translation hook:**
   ```typescript
   const t = useTranslation('pages')
   <h2>{t('header.title')}</h2>
   ```

3. **Move all tooltip content to translations** as well for consistency.

---

## Current Implementation

**All text is hardcoded** in `PagesTab.tsx` and can be found directly in the component file. No external translation system is currently used.


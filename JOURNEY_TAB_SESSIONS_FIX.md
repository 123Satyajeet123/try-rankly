# Journey Tab Sessions Fix

## Issue
Journey Tab was showing **114 Total Sessions** while Pages Tab shows **108 Total Sessions** (or vice versa). The numbers were not matching.

## Root Cause
- **Pages Tab**: Uses `realPagesData?.data?.summary?.totalSessions` (unique sessions from backend - 108)
- **Journey Tab**: Was calculating sum of `platformSessions` across all pages (page-level - 114)

## Fix
Updated Journey Tab to use the **exact same calculation** as Pages Tab:

1. **First Priority**: Use `realJourneyData?.data?.summary?.totalSessions` from backend (unique sessions)
2. **Fallback**: Sum `page.sessions` (page-level) if summary is not available

## Result
- Journey Tab "Total Sessions" now matches Pages Tab "Total Sessions"
- Both use `summary.totalSessions` from backend (unique session count)
- Consistent across both tabs

## Calculation Logic (Both Tabs Now)

```typescript
// Pages Tab & Journey Tab (now identical)
{realPagesData?.data?.summary?.totalSessions ?? 
  pagesData.reduce((sum: number, page: any) => sum + (page.sessions || 0), 0)}
```

## Verification
The tooltip in Journey Tab now matches Pages Tab:
- "Total LLM Sessions"
- "Total number of **unique** sessions from LLM providers"
- "Each session is counted once, regardless of how many pages it visits"
- Note about page-level sum potentially being higher


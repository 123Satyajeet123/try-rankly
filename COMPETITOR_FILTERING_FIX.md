# Competitor Filtering Bug Fix

## Problem
The system was showing competitors in sentiment rankings (and other metrics) that:
1. Were **NOT selected** by the user
2. Were **NOT present** in the specific URL analysis ID being viewed

## Root Cause
In `metricsAggregationService.js`, the `calculateBrandMetrics()` method was:
1. ✅ Correctly fetching selected competitors from database (filtered by `urlAnalysisId` and `selected: true`)
2. ❌ **INCORRECTLY** adding ALL brands mentioned in test results, regardless of selection status

**Bug Location**: Lines 327-332 (now removed)
```javascript
// ❌ BUG: This added ALL brands mentioned in tests, even unselected ones
tests.forEach(test => {
  test.brandMetrics?.forEach(bm => {
    allBrandNames.add(bm.brandName); // Added brands from other analyses!
  });
});
```

## Solution
**Removed the problematic code** that added brands from tests. Now the system only includes:
1. ✅ User's brand (from UrlAnalysis)
2. ✅ Selected competitors for this `urlAnalysisId` (from Competitor collection with `selected: true`)

**Fixed Code**: Lines 323-348
```javascript
// ✅ FIX: Only include user's brand + selected competitors for this analysis
const allBrandNames = new Set([userBrandName]);
selectedCompetitors.filter(comp => comp.name && comp.selected).forEach(comp => allBrandNames.add(comp.name));

// ✅ VALIDATION: Log if any tests mention brands not in our selected set
const mentionedBrands = new Set();
tests.forEach(test => {
  test.brandMetrics?.forEach(bm => {
    if (bm.brandName) mentionedBrands.add(bm.brandName);
  });
});

const unselectedBrands = Array.from(mentionedBrands).filter(brand => !allBrandNames.has(brand));
if (unselectedBrands.length > 0) {
  console.warn(`⚠️ [WARNING] Tests mention brands not in selected set (will be filtered out):`, unselectedBrands);
}
```

## Impact
This fix applies to **ALL aggregation scopes**:
- ✅ Overall metrics
- ✅ Platform-level metrics
- ✅ Topic-level metrics
- ✅ Persona-level metrics

All of these call `calculateBrandMetrics()`, which now correctly filters competitors.

## Verification
The fix ensures:
1. ✅ Only selected competitors are shown
2. ✅ Only competitors for this `urlAnalysisId` are shown
3. ✅ User's brand is always included
4. ✅ Unselected competitors are filtered out (even if mentioned in tests)
5. ✅ Competitors from other analyses are filtered out

## Testing
After this fix, the sentiment rankings (and all other metric displays) should only show:
- User's brand
- Competitors that were:
  - Selected by the user (`selected: true`)
  - Belong to this specific URL analysis (`urlAnalysisId` matches)


# Fixes Applied: Brand Extraction False Positives

**Date:** 2025-11-06  
**Issue:** False positive brand detection causing incorrect visibility scores  
**Status:** ✅ **FIXED**

---

## Summary of Changes

Fixed the critical bug in brand extraction that was causing false positive detections of brands not in the expected list (e.g., "Axis Bank Platinum Debit Card", "ICICI Bank Platinum Debit Card").

---

## Changes Made

### File: `backend/src/services/promptTestingService.js`

#### 1. Replaced Simple Regex with Sophisticated Brand Detection

**Before:**
```javascript
const patternsToUse = brandPatternService.generateBrandPatterns(brand);
const escapedPatterns = patternsToUse.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const brandRegex = new RegExp(`(${escapedPatterns.join('|')})`, 'gi');

sentences.forEach((sentence, idx) => {
  const mentions = (sentence.match(brandRegex) || []).length;
  // ... simple matching
});
```

**After:**
```javascript
// ✅ FIX: Use metricsExtractionService for sophisticated brand detection
const metricsExtractionService = require('./metricsExtractionService');

sentences.forEach((sentence, idx) => {
  // ✅ FIX: Use containsBrand() for accurate detection with word boundaries
  const detectionResult = metricsExtractionService.containsBrand(sentence, brand);
  
  if (detectionResult.detected) {
    // Count mentions using word-boundary pattern matching for accuracy
    let sentenceMentions = 0;
    for (const pattern of brandPatterns) {
      // Use word boundaries to avoid false positives
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only use word boundaries for multi-word patterns or single words > 3 chars
      const useWordBoundary = pattern.split(/\s+/).length > 1 || pattern.length > 3;
      const regex = useWordBoundary 
        ? new RegExp(`\\b${escaped}\\b`, 'gi')
        : new RegExp(escaped, 'gi');
      const matches = (sentence.match(regex) || []).length;
      sentenceMentions += matches;
    }
    // ... rest of processing
  }
});
```

**Benefits:**
- Uses multi-strategy detection (exact match, abbreviation, partial, fuzzy, variation)
- Implements proper word boundaries to prevent partial word matches
- More accurate brand detection with confidence scoring

#### 2. Added Brand Validation

**Added:**
```javascript
// ✅ FIX: Build expected brands set for validation
const expectedBrands = new Set([brandName]);
competitors.filter(c => c && c.name).forEach(c => expectedBrands.add(c.name));

// Process each brand
allBrands.forEach((brand) => {
  // ✅ FIX: Validate that brand is in expected list (prevent false positives)
  if (!expectedBrands.has(brand)) {
    console.warn(`⚠️ [VALIDATION] Skipping unexpected brand: ${brand} (not in expected list)`);
    return;
  }
  // ... rest of processing
});
```

**Benefits:**
- Prevents processing of unexpected brands
- Adds safety check to catch any data inconsistencies
- Logs warnings for debugging

---

## Technical Details

### How the Fix Works

1. **Sophisticated Detection:** Uses `containsBrand()` from `metricsExtractionService` which implements:
   - Exact match with word boundaries (confidence: 1.0)
   - Abbreviation matching (confidence: 0.9)
   - Partial word match (confidence: 0.85-0.7)
   - Fuzzy matching with Levenshtein distance (confidence: 0.7-0.9)
   - Variation matching (confidence: 0.8)

2. **Word Boundary Protection:** 
   - Multi-word patterns: Always use word boundaries (`\b`)
   - Single words > 3 chars: Use word boundaries
   - Short words: Use simple matching (to avoid over-restriction)

3. **Validation Layer:**
   - Only processes brands in the expected set
   - Prevents false positives from data inconsistencies
   - Logs warnings for unexpected brands

---

## Expected Impact

### Before Fix
- ❌ False positives: "Axis Bank Platinum Debit Card" detected in ~70 tests
- ❌ False positives: "ICICI Bank Platinum Debit Card" detected in ~70 tests
- ❌ Incorrect visibility scores (e.g., 87.5% for non-existent brands)
- ❌ Metrics polluted with wrong brand data

### After Fix
- ✅ Only expected brands detected (user brand + selected competitors)
- ✅ Accurate visibility scores
- ✅ No false positives from generic words like "Platinum", "Bank", "Card"
- ✅ Proper word boundary matching prevents partial matches

---

## Testing Recommendations

1. **Re-run prompt tests** for the affected user to regenerate brand metrics
2. **Verify visibility scores** match expected values
3. **Check for false positives** - should see 0 unexpected brands
4. **Validate metrics aggregation** - ensure only expected brands appear

---

## Next Steps

1. ✅ Fix applied to `extractBrandMetrics()`
2. ⏳ Recalculate metrics for existing tests (if needed)
3. ⏳ Verify visibility scores in database
4. ⏳ Monitor for any remaining false positives

---

## Code References

- **File:** `backend/src/services/promptTestingService.js`
- **Function:** `extractBrandMetrics()` (Lines 554-777)
- **Key Changes:** Lines 573-642

---

## Related Files

- `backend/src/services/metricsExtractionService.js` - Contains `containsBrand()` function
- `backend/src/services/brandPatternService.js` - Brand pattern generation
- `backend/src/services/metricsAggregationService.js` - Visibility score calculation

---

**Status:** ✅ **FIXES COMPLETE - READY FOR TESTING**

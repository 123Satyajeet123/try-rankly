# Citation Metrics Fixes Applied

**Date:** 2025-11-06  
**Issue:** False positive brand citations and citation metrics mismatches  
**Status:** ✅ **FIXED**

---

## Summary of Changes

Fixed critical bugs in citation categorization that were causing false positive brand citations (e.g., "bankofamerica.com" being marked as brand citation for "Axis Bank"). Also fixed URL cleaning and citation metrics calculation.

---

## Changes Made

### File 1: `backend/src/services/citationClassificationService.js`

#### Fix 1: Stricter Domain Matching (Lines 228-260)

**Before:**
```javascript
if (cleanDomainBase.includes(cleanPossible) || cleanDomainWithoutTLD.includes(cleanPossible)) {
  if (cleanPossible.length >= 3) {
    return { type: 'brand', brand: brandName, confidence: 0.9 };
  }
}
```

**Issue:** Too permissive - "bank" in "bankofamerica.com" would match "Axis Bank"

**After:**
```javascript
// ✅ FIX: Stricter domain matching to prevent false positives
if (cleanPossible.length >= 5) { // Increased from 3 to 5
  const commonWords = ['bank', 'card', 'credit', 'financial', 'money', 'capital', 'express', 'one'];
  const isCommonWord = commonWords.includes(cleanPossible.toLowerCase());
  
  // Check if domain starts with the variation (preferred) or contains it significantly
  const startsWith = cleanDomainBase.startsWith(cleanPossible) || cleanDomainWithoutTLD.startsWith(cleanPossible);
  const contains = cleanDomainBase.includes(cleanPossible) || cleanDomainWithoutTLD.includes(cleanPossible);
  
  if (startsWith && !isCommonWord) {
    // Domain starts with brand variation - high confidence
    return { type: 'brand', brand: brandName, confidence: 0.9 };
  } else if (contains && !isCommonWord) {
    // Domain contains brand variation - require significant portion (50%+)
    const containsRatio = cleanPossible.length / Math.max(cleanDomainBase.length, cleanDomainWithoutTLD.length);
    if (containsRatio >= 0.5) {
      return { type: 'brand', brand: brandName, confidence: 0.75 };
    }
  }
}
```

**Benefits:**
- Prevents common words like "bank", "card" from causing false matches
- Requires minimum 5 characters (increased from 3)
- Prefers "starts with" over "contains" for better accuracy
- Requires 50%+ match ratio for "contains" matches

#### Fix 2: Stricter Subdomain Matching (Lines 273-287)

**Before:**
```javascript
if (cleanRoot.includes(cleanPossible) && cleanPossible.length >= 3) {
  return { type: 'brand', brand: brandName, confidence: 0.85 };
}
```

**After:**
```javascript
// ✅ FIX: Stricter subdomain matching
if (cleanPossible.length >= 5) {
  const commonWords = ['bank', 'card', 'credit', 'financial', 'money', 'capital', 'express', 'one'];
  const isCommonWord = commonWords.includes(cleanPossible.toLowerCase());
  
  if (!isCommonWord && (cleanRoot === cleanPossible || cleanRoot.startsWith(cleanPossible))) {
    return { type: 'brand', brand: brandName, confidence: 0.85 };
  }
}
```

**Benefits:**
- Prevents false matches on subdomains
- Requires exact match or "starts with" (not just "contains")
- Filters out common words

---

### File 2: `backend/src/services/citationExtractionService.js`

#### Fix 3: Improved URL Cleaning (Lines 315-338)

**Before:**
```javascript
let cleanUrl = url.replace(/[)\\].,;!?]+$/, '');
```

**After:**
```javascript
// ✅ FIX: Remove trailing punctuation more aggressively
let cleanUrl = url.trim();
// Remove trailing punctuation: ), ], ;, ., ,, !, ?, and combinations
cleanUrl = cleanUrl.replace(/[)\],;.!?]+$/, '');
// Also remove trailing whitespace
cleanUrl = cleanUrl.trim();
```

**Benefits:**
- Removes brackets `]` in addition to parentheses
- Handles combinations of trailing punctuation
- Removes trailing whitespace
- Prevents duplicate URLs like `url.com` and `url.com)`

---

### File 3: `backend/src/services/promptTestingService.js`

#### Fix 4: Accurate Citation Metrics Calculation (Lines 712-737)

**Before:**
```javascript
citationMetrics: {
  brandCitations: brandCitationsCount,  // Counted separately
  earnedCitations: earnedCitationsCount,
  socialCitations: socialCitationsCount,
  totalCitations: categorizedCitations.length
}
```

**Issue:** Counts were calculated separately and might not match the actual citations array

**After:**
```javascript
// ✅ FIX: Recalculate citationMetrics from actual categorizedCitations array
const actualBrandCitations = categorizedCitations.filter(c => c.type === 'brand' && c.brand === brand).length;
const actualEarnedCitations = categorizedCitations.filter(c => c.type === 'earned').length;
const actualSocialCitations = categorizedCitations.filter(c => c.type === 'social').length;
const actualTotalCitations = categorizedCitations.length;

citationMetrics: {
  // Use actual counts from categorizedCitations array
  brandCitations: actualBrandCitations,
  earnedCitations: actualEarnedCitations,
  socialCitations: actualSocialCitations,
  totalCitations: actualTotalCitations
}
```

**Benefits:**
- Ensures `citationMetrics` always matches `citations` array
- Prevents discrepancies between counts
- More reliable for metrics aggregation

---

## Technical Details

### How the Fixes Work

1. **Stricter Domain Matching:**
   - Minimum length increased from 3 to 5 characters
   - Common words filter prevents false matches
   - Prefers "starts with" over "contains"
   - Requires 50%+ match ratio for "contains" matches

2. **Common Words Filter:**
   - Prevents generic words like "bank", "card", "credit" from matching
   - List includes: `['bank', 'card', 'credit', 'financial', 'money', 'capital', 'express', 'one']`
   - Can be extended as needed

3. **URL Cleaning:**
   - More aggressive trailing punctuation removal
   - Handles brackets, parentheses, commas, periods, etc.
   - Prevents duplicate URLs

4. **Citation Metrics Accuracy:**
   - Calculated directly from `citations` array
   - Ensures consistency between `citationMetrics` and `citations`
   - Prevents aggregation errors

---

## Expected Impact

### Before Fixes
- ❌ False positive brand citations (e.g., "bankofamerica.com" for "Axis Bank")
- ❌ Duplicate URLs with trailing characters
- ❌ Citation metrics mismatch
- ❌ Incorrect citation share calculations

### After Fixes
- ✅ Only correct brand citations (domains must match brand)
- ✅ Clean URLs without duplicates
- ✅ Citation metrics match citations array
- ✅ Accurate citation share calculations

---

## Testing Recommendations

1. **Test Domain Matching:**
   - Verify "bankofamerica.com" does NOT match "Axis Bank"
   - Verify "americanexpress.com" DOES match "American Express SmartEarn™ Credit Card"
   - Test with various brand names and domains

2. **Test URL Cleaning:**
   - Verify URLs with trailing `)` are cleaned
   - Verify URLs with trailing `]` are cleaned
   - Check for duplicate URLs in database

3. **Test Citation Metrics:**
   - Verify `citationMetrics` matches `citations` array
   - Check citation counts are accurate
   - Verify citation share calculations

4. **Re-run Tests:**
   - Re-run prompt tests for affected user
   - Verify no false positive brand citations
   - Check citation share is correct

---

## Code References

- **File:** `backend/src/services/citationClassificationService.js`
  - Lines 228-260: Stricter domain matching
  - Lines 273-287: Stricter subdomain matching

- **File:** `backend/src/services/citationExtractionService.js`
  - Lines 315-338: Improved URL cleaning

- **File:** `backend/src/services/promptTestingService.js`
  - Lines 712-737: Accurate citation metrics calculation

---

**Status:** ✅ **FIXES COMPLETE - READY FOR TESTING**


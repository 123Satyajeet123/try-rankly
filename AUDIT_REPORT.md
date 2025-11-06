# System Audit Report: Brand & Competitor Extraction
**User ID:** 690c6a8846e7547328bd8408  
**URL Analysis ID:** 690c857fb1979e03f1b14579  
**Date:** 2025-11-06

## Executive Summary

**CRITICAL ISSUE FOUND:** The brand extraction system is detecting **false positive brands** that are NOT in the expected brand/competitor list. This is causing incorrect visibility score calculations.

---

## 1. Expected vs Detected Brands

### Expected Brand
- **User Brand:** `American Express SmartEarn™ Credit Card`

### Expected Competitors (Selected)
1. `Capital One Spark Cash Plus`
2. `Chase Ink Business Unlimited`
3. `itilite Corporate Card`
4. `Happay EPIC Card`

### Unexpected Brands Detected (FALSE POSITIVES)
The system is incorrectly detecting the following brands that are **NOT** in the expected list:

1. **Axis Bank Platinum Debit Card** - Detected in ~70+ tests
2. **ICICI Bank Platinum Debit Card** - Detected in ~70+ tests
3. **SBI Gold International Debit Card** - Detected in ~10+ tests
4. **IndusInd World Exclusive Debit Card** - Detected in ~15+ tests

---

## 2. Root Cause Analysis

### Issue 1: False Positive Brand Detection

**Problem:** The brand pattern matching is too broad and is matching generic words like:
- "Platinum" (from "Platinum Card" mentions in responses)
- "Bank" (from "Bank of America" mentions)
- "Card" (from various credit card mentions)

**Location:** `backend/src/services/promptTestingService.js` - `extractBrandMetrics()` function

**Code Flow:**
1. `extractBrandMetrics()` is called with `brandName` and `competitors` array
2. It creates `allBrands = [brandName, ...competitors.map(c => c.name)]`
3. For each brand, it generates patterns using `brandPatternService.generateBrandPatterns()`
4. The patterns are used in a regex: `new RegExp(\`(${escapedPatterns.join('|')})\`, 'gi')`
5. **ISSUE:** The regex matches ANY occurrence of the pattern words, even when they're part of other brand names

**Example False Match:**
- Response text mentions: "Bank of America Platinum Card"
- Pattern for "Axis Bank Platinum Debit Card" includes "Platinum"
- Regex matches "Platinum" in "Bank of America Platinum Card"
- **Result:** False positive detection of "Axis Bank Platinum Debit Card"

### Issue 2: Competitor List Source

**Question:** Where are the false positive brands coming from?

**Investigation Needed:**
1. Check what `competitors` array is passed to `extractBrandMetrics()`
2. Verify if unselected competitors are being included
3. Check if there's a bug where brands are being extracted from the response text itself

**Location to Check:** `backend/src/routes/onboarding.js` - `extractBrandContext()` function

---

## 3. Visibility Score Calculation Verification

### Formula
```
Visibility Score = (Tests where brand is mentioned / Total tests) × 100
```

### Current Status
- **Total Tests:** 80 prompt tests
- **Expected Brand Detection:** ✅ Detected (appears in multiple tests)
- **Expected Competitors:** ❓ Need to verify if they're being detected correctly
- **False Positives:** ❌ Causing incorrect visibility scores

### Impact
The false positive brands are inflating the visibility scores and creating incorrect metrics. For example:
- "Axis Bank Platinum Debit Card" appears in ~70 tests = ~87.5% visibility (WRONG)
- This should be 0% since it's not a valid brand/competitor

---

## 4. Recommended Fixes

### Fix 1: Improve Brand Pattern Matching
**File:** `backend/src/services/promptTestingService.js`

**Current Code (Line 587):**
```javascript
const brandRegex = new RegExp(`(${escapedPatterns.join('|')})`, 'gi');
```

**Issue:** This matches patterns anywhere in the text without word boundaries for multi-word patterns.

**Recommended Fix:**
1. Use word boundaries for better matching: `\b${pattern}\b`
2. Prioritize longer patterns over shorter ones
3. Use the `containsBrand()` function from `metricsExtractionService` instead of simple regex

### Fix 2: Validate Competitor List
**File:** `backend/src/services/promptTestingService.js` - `extractBrandMetrics()`

**Add validation:**
```javascript
// Only process brands that are in the expected list
const expectedBrands = new Set([brandName, ...competitors.map(c => c.name)]);
if (!expectedBrands.has(brand)) {
  console.warn(`⚠️ Skipping unexpected brand: ${brand}`);
  return; // Skip this brand
}
```

### Fix 3: Use Sophisticated Brand Detection
**File:** `backend/src/services/promptTestingService.js` - `extractBrandMetrics()`

**Replace simple regex matching with:**
```javascript
const metricsExtractionService = require('./metricsExtractionService');
const detectionResult = metricsExtractionService.containsBrand(sentence, brand);
if (detectionResult.detected) {
  // Process brand mention
}
```

This uses the sophisticated multi-strategy detection (exact match, abbreviation, partial, fuzzy, variation) which is more accurate.

---

## 5. Verification Steps

### Step 1: Verify Brand Context Extraction
- [ ] Check `extractBrandContext()` in `onboarding.js`
- [ ] Verify it returns correct `companyName` and `competitors` array
- [ ] Ensure only selected competitors are included

### Step 2: Verify Brand Pattern Generation
- [ ] Test `generateBrandPatterns()` with "American Express SmartEarn™ Credit Card"
- [ ] Verify patterns don't include generic words that cause false matches
- [ ] Check if "Platinum" is being excluded from patterns (it should be, per line 213)

### Step 3: Verify Brand Detection Logic
- [ ] Check if `extractBrandMetrics()` is using word boundaries correctly
- [ ] Verify it's not matching partial words
- [ ] Test with sample response text to see false positives

### Step 4: Recalculate Visibility Scores
- [ ] After fixes, recalculate visibility scores for all brands
- [ ] Verify only expected brands have non-zero visibility
- [ ] Compare with database values

---

## 6. Immediate Actions Required

1. **URGENT:** Fix false positive brand detection
2. **URGENT:** Verify competitor list source
3. **HIGH:** Recalculate visibility scores after fix
4. **MEDIUM:** Add validation to prevent unexpected brands
5. **LOW:** Add logging to track brand detection issues

---

## 7. Database Verification

### Expected Data
- **URL Analysis:** ✅ Found
- **Competitors:** ✅ 6 found, 4 selected
- **Prompt Tests:** ✅ 80 tests found
- **Aggregated Metrics:** ❌ Not found (may need to be recalculated)

### Next Steps
1. Run metrics aggregation after fixing brand detection
2. Verify aggregated metrics match calculated values
3. Check if visibility scores in database are correct

---

## 8. Code References

### Key Files
- `backend/src/services/promptTestingService.js` - Line 554-752 (extractBrandMetrics)
- `backend/src/services/brandPatternService.js` - Line 192-280 (generateBrandPatterns)
- `backend/src/services/metricsExtraction/brandDetection.js` - Line 173-267 (containsBrand)
- `backend/src/services/metricsAggregationService.js` - Line 539-545 (visibility score calculation)
- `backend/src/routes/onboarding.js` - Line 14-89 (extractBrandContext)

---

## Conclusion

The audit has identified a **critical bug** in brand extraction that is causing false positive detections. This directly impacts visibility score accuracy. Immediate action is required to fix the brand pattern matching logic and ensure only expected brands are detected.

**Status:** ❌ **ISSUES FOUND - FIXES REQUIRED**


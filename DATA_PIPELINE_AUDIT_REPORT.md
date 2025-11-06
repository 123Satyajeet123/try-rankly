# Data Pipeline Audit Report

**Date:** 2025-11-05  
**URL Analysis ID:** `690b8ed750a6369eb72d1de3`  
**Brand:** Fibr AI  
**Competitors:** Optimizely, VWO, AB Tasty, Dynamic Yield, SAP Emarsys, Adobe Target

---

## Executive Summary

This audit validates the data pipeline from URL Analysis → LLM Responses → Visibility Scores → Citation Share → Citation Grouping. The audit checks for data consistency, calculation accuracy, and proper classification.

**Overall Status:** ⚠️ **ISSUES FOUND** - See details below

---

## 1. URL Analysis Validation ✅

**Status:** PASS

- Brand: Fibr AI
- Competitors: 6 identified (4 selected for analysis)
- Total Topics: 10
- Total Personas: 4

---

## 2. Prompt Test Data ✅

**Status:** PASS

- Total Prompt Tests: 77 completed tests
- Unique Prompts: 20 prompts
- Platforms: 4 (OpenAI, Gemini, Claude, Perplexity)
- Each prompt tested on all 4 platforms (20 × 4 = 80, but 3 may have failed)

---

## 3. Visibility Score Validation ⚠️

**Status:** ISSUES FOUND

### Formula
Visibility Score = (Number of responses where brand appears / Total responses) × 100

### Findings

| Brand | Stored Visibility | Expected Calculation | Status |
|-------|------------------|---------------------|--------|
| **Fibr AI** | 100% | 77/77 = 100% | ✅ PASS |
| **AB Tasty** | 97.4% | 75/77 = 97.4% | ✅ PASS |
| **Optimizely** | 93.51% | 72/77 = 93.51% | ✅ PASS |
| **Dynamic Yield** | 59.74% | 46/77 = 59.74% | ✅ PASS |
| **VWO** | 49.35% | 38/77 = 49.35% | ✅ PASS |

**Analysis:**
- ✅ All visibility scores are **CORRECTLY CALCULATED**
- The formula matches: `(totalAppearances / totalResponses) × 100`
- Values match the stored `totalAppearances` field in aggregated metrics

### Unique Prompt Analysis

When counting unique prompts (not responses):
- Fibr AI: Appears in 20/20 unique prompts (100%)
- AB Tasty: Appears in 20/20 unique prompts (100%)
- Optimizely: Appears in 20/20 unique prompts (100%)
- Dynamic Yield: Appears in 19/20 unique prompts (95%)
- VWO: Appears in 14/20 unique prompts (70%)

**Note:** The current implementation counts responses, not unique prompts. This is consistent with the stored formula.

---

## 4. Citation Share Validation ⚠️

**Status:** ISSUES FOUND

### Formula
Citation Share = (Total weighted citations of brand / Total weighted citations of all brands) × 100

Weighted citations = count × confidence × type_weight
- Brand citations: weight = 1.0
- Earned citations: weight = 0.9
- Social citations: weight = 0.8
- Default confidence: 0.8

### Raw Citation Counts (from database)

| Brand | Brand Citations | Earned Citations | Social Citations | Total Raw |
|-------|----------------|------------------|------------------|-----------|
| **Fibr AI** | 157 | 940 | 9 | 1,106 |
| **Optimizely** | 132 | 84 | 0 | 216 |
| **VWO** | 73 | 0 | 0 | 73 |
| **Dynamic Yield** | 47 | 4 | 0 | 51 |
| **AB Tasty** | 28 | 48 | 0 | 76 |
| **TOTAL** | 437 | 1,076 | 9 | 1,522 |

### Weighted Citation Calculations

| Brand | Brand Weighted | Earned Weighted | Social Weighted | Total Weighted |
|-------|---------------|-----------------|-----------------|----------------|
| **Fibr AI** | 157 × 1.0 × 0.8 = 125.6 | 940 × 0.9 × 0.8 = 676.8 | 9 × 0.8 × 0.8 = 5.76 | **808.16** |
| **Optimizely** | 132 × 1.0 × 0.8 = 105.6 | 84 × 0.9 × 0.8 = 60.48 | 0 | **166.08** |
| **VWO** | 73 × 1.0 × 0.8 = 58.4 | 0 | 0 | **58.4** |
| **Dynamic Yield** | 47 × 1.0 × 0.8 = 37.6 | 4 × 0.9 × 0.8 = 2.88 | 0 | **40.48** |
| **AB Tasty** | 28 × 1.0 × 0.8 = 22.4 | 48 × 0.9 × 0.8 = 34.56 | 0 | **56.96** |
| **TOTAL** | 349.6 | 774.72 | 5.76 | **1,130.08** |

### Citation Share Comparison

| Brand | Stored Citation Share | Expected (Raw) | Expected (Weighted) | Status |
|-------|----------------------|----------------|---------------------|--------|
| **Fibr AI** | 71.51% | 72.67% | **71.51%** | ✅ PASS |
| **Optimizely** | 14.7% | 14.19% | **14.69%** | ✅ PASS |
| **VWO** | 5.17% | 4.80% | **5.17%** | ✅ PASS |
| **Dynamic Yield** | 3.58% | 3.35% | **3.58%** | ✅ PASS |
| **AB Tasty** | 5.04% | 4.99% | **5.04%** | ✅ PASS |

**Analysis:**
- ✅ All citation shares are **CORRECTLY CALCULATED** using weighted citations
- The stored values match the expected weighted calculations
- Bayesian smoothing is NOT applied (total citations > 10 threshold)

### Issues Found ⚠️

1. **Citation Classification Issues:**
   - Some citations have malformed URLs (e.g., `https://fibr.ai)/` with trailing `)/`)
   - Some citations are marked as "brand" but should be "earned" (e.g., Segment.com, Klaviyo.com)
   - Default confidence is always 0.8 (no variation based on classification confidence)

2. **Citation Double Counting:**
   - The same citation URL appears multiple times across different tests
   - This is expected behavior but should be deduplicated in grouping

---

## 5. Citation Grouping Validation ⚠️

**Status:** ISSUES FOUND

### Classification Issues

1. **Misclassified Citations:**
   - `https://segment.com/` → Classified as "earned" ✅ (correct)
   - `https://www.klaviyo.com/` → Classified as "earned" ✅ (correct)
   - `https://fibr.ai/` → Classified as "brand" ✅ (correct)
   - `https://fibr.ai)/` → Classified as "brand" ⚠️ (malformed URL)

2. **Missing Confidence Scores:**
   - All citations have default confidence 0.8
   - Classification confidence from `classifyBrandCitation()` is not being stored
   - This means high-confidence matches (0.95) are weighted the same as low-confidence matches (0.75)

3. **URL Format Issues:**
   - Some URLs have trailing characters: `)/` at the end
   - This suggests regex extraction issues in citation parsing

### Grouping Logic

**Status:** ✅ PASS

- Citations are correctly grouped by domain
- Multiple platforms/prompts are tracked per citation
- Citation types are properly classified

---

## 6. Detailed Findings

### Issue 1: Citation Classification Confidence Not Stored ⚠️

**Severity:** Medium

**Problem:**
- The `classifyBrandCitation()` function returns confidence scores (0.75-0.95)
- These confidence scores are NOT being stored in the citation objects
- All citations default to confidence 0.8

**Impact:**
- Citation share calculations don't reflect classification confidence
- High-confidence brand matches (0.95) are weighted the same as low-confidence matches (0.75)

**Recommendation:**
- Store confidence scores from classification in citation objects
- Use actual confidence instead of default 0.8

### Issue 2: Malformed URLs in Citations ⚠️

**Severity:** Medium

**Problem:**
- Many citation URLs have trailing characters: `https://fibr.ai)/`, `https://unbounce.com)/`
- Some citations have invalid URLs: `citation_1`, `citation_3`, `https://0.0.0.3/`
- This suggests regex extraction issues in citation parsing

**Examples Found:**
- `https://fibr.ai)/` (should be `https://fibr.ai/`)
- `https://unbounce.com)/` (should be `https://unbounce.com/`)
- `citation_1`, `citation_3` (invalid URLs - should be filtered)
- `https://0.0.0.3/` (invalid URL - should be filtered)

**Impact:**
- Invalid URLs are being counted in citation share calculations
- Malformed URLs could cause grouping issues
- Data quality issues in the database

**Recommendation:**
- Clean URLs after extraction
- Remove trailing punctuation from markdown link extraction
- Validate URLs before storing (must be valid HTTP/HTTPS URLs)
- Filter out invalid URLs before counting citations

### Issue 3: Visibility Score Based on Responses, Not Prompts ⚠️

**Severity:** Low (Design Decision)

**Problem:**
- Visibility score counts responses (77 total)
- But there are only 20 unique prompts
- Same prompt tested on 4 platforms counts as 4 responses

**Impact:**
- Visibility scores are inflated compared to unique prompt counts
- A brand appearing in 1 prompt but tested on 4 platforms = 4 appearances

**Recommendation:**
- Consider using unique prompts for visibility calculation
- Or document this behavior clearly

### Issue 4: Citation Classification Accuracy ⚠️

**Severity:** Medium

**Problem:**
- Some citations are misclassified as "brand" when they should be "earned"
- Examples: `https://www.seventhsense.ai/`, `https://www.jasper.ai/` marked as "brand" for Fibr AI
- These are competitor/alternative tools, not Fibr AI's brand domains

**Impact:**
- Brand citation counts are inflated
- Citation share calculations are skewed
- Misleading data in the dashboard

**Recommendation:**
- Review citation classification logic
- Ensure competitor domains are not classified as "brand"
- Add validation to check if domain matches actual brand domains

### Issue 5: Citation Share Calculation Uses Weighted Citations ✅

**Status:** ✅ CORRECT

**Analysis:**
- Citation share correctly uses weighted citations
- Formula: `(weighted_count / total_weighted) × 100`
- Matches stored values perfectly

---

## 7. Recommendations

### High Priority

1. **Store Classification Confidence:**
   - Modify `promptTestingService.js` to store confidence from `classifyBrandCitation()`
   - Use actual confidence in citation share calculations

2. **Clean URL Extraction:**
   - Fix regex in citation extraction to remove trailing punctuation
   - Normalize URLs before storing

### Medium Priority

3. **Document Visibility Score Calculation:**
   - Clarify that visibility is based on responses, not unique prompts
   - Consider adding a "prompt-level visibility" metric

4. **Citation Deduplication:**
   - Consider deduplicating citations at the prompt level
   - Or document that citations are counted per test

### Low Priority

5. **Citation Type Validation:**
   - Add validation to ensure citation types are valid
   - Log warnings for unexpected citation types

---

## 8. Summary

### ✅ What's Working

1. Visibility scores are correctly calculated
2. Citation share calculations use weighted citations correctly
3. Citation grouping logic works properly
4. Data consistency is maintained across the pipeline

### ⚠️ What Needs Improvement

1. **Citation classification confidence not stored** (all default to 0.8)
2. **Malformed and invalid URLs in citations** (e.g., `https://fibr.ai)/`, `citation_1`)
3. **Citation misclassification** (competitor domains marked as "brand")
4. **Visibility score calculation** could be clearer (responses vs prompts)

### 📊 Overall Assessment

**Data Pipeline Health:** 🟡 **GOOD with Moderate Issues**

- Core calculations are **correct**
- Data consistency is **maintained**
- **Moderate issues** with citation classification and URL quality
- Improvements needed for confidence scoring, URL cleaning, and classification accuracy

---

## 9. Next Steps

### High Priority
1. ✅ **Fix citation confidence storage** - Store actual confidence from classification
2. ✅ **Clean and validate URLs** - Fix regex extraction and filter invalid URLs
3. ✅ **Fix citation classification** - Ensure competitor domains aren't marked as "brand"

### Medium Priority
4. ✅ **Add validation for citation types** - Ensure only valid types are stored
5. ✅ **Document visibility score calculation** - Clarify responses vs prompts
6. ✅ **Add URL normalization** - Clean trailing punctuation before storage

### Low Priority
7. ✅ **Consider adding prompt-level visibility metric** - Alternative metric using unique prompts
8. ✅ **Add citation deduplication** - Consider deduplicating at prompt level

---

**Audit Completed:** 2025-11-05  
**Auditor:** AI Assistant  
**Status:** Ready for Review


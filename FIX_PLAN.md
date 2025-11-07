# Fix Plan for Data Pipeline Issues

Based on the audit findings, here's the systematic plan to fix all issues:

## Issue 1: Citation Confidence Storage ✅ (Already Working!)

**Status:** Actually already implemented! The code at line 1743 stores `classification.confidence`.

**Action:** Verify it's working correctly and ensure all code paths use it.

---

## Issue 2: Malformed and Invalid URLs ⚠️

**Location:** `backend/src/services/promptTestingService.js` - `categorizeCitation()` method

**Problems:**
- URLs with trailing punctuation: `https://fibr.ai)/`
- Invalid URLs: `citation_1`, `https://0.0.0.3/`
- URLs not being cleaned before storage

**Fix:**
1. Improve URL cleaning in `categorizeCitation()` 
2. Add URL validation before storing
3. Filter out invalid URLs early in the process

---

## Issue 3: Citation Misclassification ⚠️

**Location:** `backend/src/services/promptTestingService.js` - `classifyBrandCitation()` method

**Problems:**
- Competitor domains being marked as "brand" (e.g., seventhsense.ai for Fibr AI)
- Need to check if domain belongs to a competitor before marking as brand

**Fix:**
1. In `classifyBrandCitation()`, check if domain belongs to a competitor first
2. Only mark as "brand" if it's the actual brand's domain
3. Improve domain matching logic

---

## Issue 4: URL Normalization ⚠️

**Location:** Multiple places where URLs are extracted

**Fix:**
1. Create a centralized URL cleaning function
2. Use it consistently across all citation extraction points
3. Clean URLs before classification and storage

---

## Implementation Order

1. ✅ **Fix URL Cleaning & Validation** (Issue 2 & 4)
2. ✅ **Fix Citation Classification** (Issue 3)
3. ✅ **Verify Confidence Storage** (Issue 1)
4. ✅ **Add Validation** (Issue 5)

Let's start!



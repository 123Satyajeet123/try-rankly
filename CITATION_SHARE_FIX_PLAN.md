# Citation Share Variance Fix Plan

## Problem Analysis

Based on the two dashboard images showing extreme variance:
1. **Image 1**: American Express 28.08% vs competitors 26.11%, 18.88%, 18.12%, 8.80% (ranking #5)
2. **Image 2**: American Express 100.00% vs all competitors 0.00% (ranking #1)

### Root Causes Identified

1. **Simple Percentage Calculation** (`metricsCalculator.js:245`)
   - Current: `citationShare = (data.totalCitations / totalCitationsAllBrands) * 100`
   - Problem: No smoothing for small samples, wild swings with few citations
   - Impact: 0% → 100% variance with small sample sizes

2. **Basic Domain Matching** (`promptTestingService.js:953`)
   - Current: Simple string matching for brand domains
   - Problem: Misses variations (americanexpress.com vs amex.com, subdomains)
   - Impact: Incorrect citation counts → wrong citation share

3. **Binary Classification** (`promptTestingService.js:905`)
   - Current: Returns `{ type: 'brand'|'earned'|'social', brand, confidence }`
   - Problem: Confidence not used in aggregation, binary yes/no
   - Impact: Misclassified citations affect counts

4. **No Statistical Smoothing**
   - Current: Raw percentages without confidence intervals
   - Problem: Small sample sizes cause extreme variance
   - Impact: Unreliable results (28% vs 100%)

5. **Citation Extraction Inconsistency**
   - Different LLM providers extract citations differently
   - Some providers may have more citations than others
   - Impact: Platform-specific bias in citation counts

## Solution Plan

### Phase 1: Improve Citation Classification (High Priority)

**File**: `backend/src/services/promptTestingService.js`

**Changes**:
1. **Enhanced Domain Matching**:
   - Add abbreviation detection (amex.com → American Express)
   - Add subdomain handling (blog.americanexpress.com)
   - Add fuzzy matching for domain variations
   - Use confidence scoring (0-1) instead of binary

2. **Improved Brand Detection**:
   - Use same fuzzy matching from visibility score fix
   - Check multiple brand variations
   - Return confidence scores for classification

**Implementation**:
```javascript
classifyBrandCitation(domain, allBrands = []) {
  // Use enhanced brand detection from metricsExtractionService
  // Check abbreviations (amex → American Express)
  // Check subdomains (blog.americanexpress.com)
  // Return confidence scores
  return { 
    type: 'brand', 
    brand: brandName, 
    confidence: 0.95, // 0.75-0.95 based on match quality
    method: 'exact_domain' | 'subdomain' | 'abbreviation' | 'fuzzy'
  };
}
```

### Phase 2: Statistical Smoothing for Citation Share (High Priority)

**File**: `backend/src/services/metricsCalculator.js`

**Changes**:
1. **Bayesian Smoothing**:
   - Apply same smoothing logic as visibility score
   - Prior = equal distribution (1/n brands)
   - Reduces variance for small samples

2. **Confidence Intervals**:
   - Calculate 95% CI for citation share
   - Show ranges for reliability indication

3. **Minimum Sample Size**:
   - Require minimum citations before showing results
   - Show "Insufficient data" for small samples

**Implementation**:
```javascript
// Citation Share with smoothing
const rawCitationShare = totalCitationsAllBrands > 0
  ? (data.totalCitations / totalCitationsAllBrands) * 100
  : 0;

// Apply Bayesian smoothing for small samples
const MIN_CITATION_SAMPLE = 10; // Minimum total citations across all brands
if (totalCitationsAllBrands < MIN_CITATION_SAMPLE) {
  const priorWeight = (MIN_CITATION_SAMPLE - totalCitationsAllBrands) / MIN_CITATION_SAMPLE;
  const equalShare = 100 / brandNames.length; // Equal prior
  citationShare = rawCitationShare * (1 - priorWeight) + equalShare * priorWeight;
}
```

### Phase 3: Confidence-Weighted Citation Counting (Medium Priority)

**File**: `backend/src/services/metricsAggregationService.js`

**Changes**:
1. **Use Classification Confidence**:
   - Weight citations by classification confidence
   - Low confidence citations count less

2. **Type-Specific Weighting**:
   - Brand citations: 1.0 weight (high confidence)
   - Earned citations: 0.9 weight (medium confidence)
   - Social citations: 0.8 weight (lower confidence, more noise)

**Implementation**:
```javascript
// Weight citations by confidence
brandMetric.citations.forEach(c => {
  const confidence = c.confidence || 0.8; // Default confidence
  const typeWeight = c.type === 'brand' ? 1.0 : 
                     c.type === 'earned' ? 0.9 : 0.8;
  const weightedCount = confidence * typeWeight;
  
  if (c.type === 'brand') brandCount += weightedCount;
  else if (c.type === 'earned') earnedCount += weightedCount;
  else if (c.type === 'social') socialCount += weightedCount;
});
```

### Phase 4: Enhanced Domain Matching (Medium Priority)

**File**: `backend/src/services/promptTestingService.js`

**Changes**:
1. **Abbreviation Dictionary**:
   - Map common abbreviations to full brands
   - Amex → American Express
   - Citi → Citibank
   - BofA → Bank of America

2. **Subdomain Detection**:
   - Better handling of blog.*, www.*, app.* subdomains
   - Check if parent domain matches brand

3. **Fuzzy Domain Matching**:
   - Use Levenshtein distance for domain similarity
   - Handle typos and variations

### Phase 5: Variance Detection (Low Priority)

**File**: `backend/src/services/metricsCalculator.js`

**Changes**:
1. **Citation Variance Metrics**:
   - Calculate coefficient of variation for citation counts
   - Flag high variance scenarios

2. **Platform Normalization**:
   - Normalize citation counts by platform
   - Account for different citation extraction rates

## Implementation Priority

1. **Immediate (Week 1)**:
   - Phase 1: Improve citation classification (enhanced domain matching)
   - Phase 2: Add statistical smoothing (Bayesian smoothing, confidence intervals)

2. **Short-term (Week 2)**:
   - Phase 3: Confidence-weighted counting
   - Phase 4: Enhanced domain matching (abbreviations, subdomains)

3. **Long-term (Week 3)**:
   - Phase 5: Variance detection and platform normalization

## Performance Considerations

- **Domain Matching**: Cache domain variations to avoid repeated calculations
- **Citation Classification**: Early exit for exact matches
- **Smoothing**: Only apply for small samples (< 10 citations)
- **Backward Compatibility**: All new fields optional, core `citationShare` always present

## Expected Outcomes

After implementing these fixes:
- Citation share will be more stable across different analyses
- Large margins (>50 points) will be rare with sufficient samples
- Results will show confidence intervals indicating reliability
- Users will see "Insufficient data" warnings when citation counts are too low
- Better classification accuracy (fewer misclassified citations)

## Backward Compatibility

- Core `citationShare` field always present (same as visibility score fix)
- Optional enhanced fields: `citationShareConfidence`, `citationShareMin`, `citationShareMax`
- Existing code continues to work without changes
- Citation type classification improves but maintains same structure



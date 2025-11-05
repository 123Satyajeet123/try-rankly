# Citation Share Variance Fix - Implementation Summary

## Overview
Implemented comprehensive fixes to reduce citation share variance while maintaining backward compatibility and performance, following the same approach as the visibility score fix.

## Key Changes

### 1. Enhanced Citation Classification (`promptTestingService.js`)

**Phase 1: Improved Domain Matching**
- **Abbreviation Detection**: Added `getBrandAbbreviationsForDomain()` method
  - Maps abbreviations to full brand names (amex.com → American Express)
  - Includes common abbreviations: Amex, Citi, BofA, WF, etc.
  - Generates acronyms from first letters

- **Multi-Strategy Domain Matching**:
  - Strategy 1: Exact domain match (confidence: 0.95)
  - Strategy 2: Subdomain patterns (confidence: 0.85)
  - Strategy 3: Abbreviation-based domains (confidence: 0.9)
  - Strategy 4: Brand pattern matching (confidence: 0.75)

- **Confidence Scores**: All classifications now return confidence (0-1)
  - Higher confidence for exact matches
  - Lower confidence for fuzzy/pattern matches

### 2. Statistical Smoothing (`metricsCalculator.js` & `metricsAggregationService.js`)

**Phase 2: Bayesian Smoothing**
- **Small Sample Handling**: Applies smoothing for samples < 10 citations
- **Equal Prior Distribution**: Uses 1/n brands as prior (reduces variance)
- **Formula**: `smoothed = raw * (1 - weight) + equalShare * weight`
- **Confidence Intervals**: 95% CI calculated for all citation shares

**Implementation**:
```javascript
// In metricsCalculator.js
const MIN_CITATION_SAMPLE = 10;
if (totalCitationsAllBrands < MIN_CITATION_SAMPLE) {
  const priorWeight = (MIN_CITATION_SAMPLE - totalCitationsAllBrands) / MIN_CITATION_SAMPLE;
  const equalShare = 100 / brandNames.length;
  citationShare = rawCitationShare * (1 - priorWeight) + equalShare * priorWeight;
}
```

### 3. Confidence-Weighted Counting (`metricsAggregationService.js`)

**Phase 3: Weighted Aggregation**
- **Confidence Weighting**: Citations weighted by classification confidence
- **Type-Specific Weights**:
  - Brand citations: 1.0 (highest confidence)
  - Earned citations: 0.9 (medium confidence)
  - Social citations: 0.8 (lower confidence, more noise)
- **Formula**: `weightedCount = confidence * typeWeight`

**Implementation**:
```javascript
const confidence = c.confidence !== undefined ? c.confidence : 0.8; // Default for backward compat
const typeWeight = type === 'brand' ? 1.0 : type === 'earned' ? 0.9 : 0.8;
const weightedCount = confidence * typeWeight;
```

### 4. Enhanced Citation Storage (`promptTestingService.js`)

- **Confidence Preservation**: All citations now store confidence scores
- **Proper Classification**: Unassigned citations are properly classified before storage
- **Backward Compatible**: Default confidence (0.8) if not specified

## Performance Optimizations

1. **Early Exit Strategy**: Exact domain matches return immediately (no fuzzy matching needed)
2. **Caching Opportunity**: Domain variations can be cached (not implemented yet, but structure supports it)
3. **Minimal Overhead**: Smoothing only applied for small samples (< 10 citations)

## Backward Compatibility

### Return Value Structure
```javascript
// Core citationShare field (ALWAYS present)
{
  citationShare: number,  // Always present
  // ... other core metrics
}

// Optional enhanced fields (only if available)
{
  citationShareConfidence: number,  // Margin of error
  citationShareMin: number,         // Lower bound
  citationShareMax: number,         // Upper bound
  citationSampleSize: number        // Total citations across all brands
}
```

### Citation Object Structure
```javascript
// All citations now include confidence (optional for backward compat)
{
  url: string,
  type: 'brand' | 'earned' | 'social',
  brand: string | null,
  confidence: number,  // 0-1, default 0.8 if not specified
  context: string
}
```

## Expected Impact

1. **Variance Reduction**: 
   - Better domain matching → fewer misclassified citations
   - Statistical smoothing → reduced wild swings (28% → 100%)
   - Confidence weighting → more accurate aggregation

2. **Classification Accuracy**:
   - Abbreviation detection → amex.com correctly identified as American Express
   - Better subdomain handling → blog.americanexpress.com recognized
   - Confidence scores → low-confidence matches weighted less

3. **Stability**:
   - Small sample smoothing → prevents extreme values (0% → 100%)
   - Equal prior distribution → realistic estimates with few citations
   - Confidence intervals → show reliability of results

## Files Modified

1. `backend/src/services/promptTestingService.js`
   - Enhanced `classifyBrandCitation()` with abbreviation detection
   - Added `getBrandAbbreviationsForDomain()` method
   - Improved domain matching with multiple strategies
   - Enhanced citation storage with confidence preservation

2. `backend/src/services/metricsCalculator.js`
   - Added Bayesian smoothing for citation share
   - Added confidence intervals
   - Made all enhancements optional for backward compatibility

3. `backend/src/services/metricsAggregationService.js`
   - Added confidence-weighted citation counting
   - Applied smoothing in `assignRanks()` method
   - Enhanced citation aggregation with type-specific weights

## Testing Recommendations

1. **Verify Classification**: Test with abbreviations (amex.com, citi.com)
2. **Check Smoothing**: Test with small citation counts (< 10)
3. **Validate Compatibility**: Ensure existing dashboard code works
4. **Compare Variance**: Before/after variance should show improvement

## Expected Results

After implementing these fixes:
- Citation share will be more stable across different analyses
- Large margins (>50 points) will be rare with sufficient samples
- Results will show confidence intervals indicating reliability
- Abbreviation domains (amex.com) will be correctly identified
- Small samples will show realistic estimates instead of extremes

## Next Steps (Optional)

1. Add UI indicators for confidence intervals in citation share
2. Show variance warnings when sample size is too small
3. Add caching for domain variations to improve performance
4. Monitor classification accuracy in production



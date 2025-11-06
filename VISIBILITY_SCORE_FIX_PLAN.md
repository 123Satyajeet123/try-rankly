# Visibility Score Variance Fix Plan

## Problem Analysis

Based on the two dashboard images showing extreme variance:
1. **Image 1**: American Express 84.81% vs competitors 0.00% (extreme imbalance)
2. **Image 2**: American Express 62.50% vs competitors 95-97.50% (large margin of 32.5 points)

### Root Causes Identified

1. **Binary Visibility Scoring** (`promptTestingService.js:1723`)
   - Current: `visibilityScore = brandMentioned ? 100 : 0`
   - Problem: Binary scoring doesn't account for partial mentions or multiple brands
   - Impact: All-or-nothing results cause extreme swings

2. **Basic Brand Detection** (`metricsExtractionService.js:405`)
   - Current: Simple word boundary matching with limited fuzzy matching
   - Problem: Misses abbreviations (Amex), partial matches, common variations
   - Impact: False negatives (brand not detected when present)

3. **No Statistical Smoothing**
   - Current: Raw percentages without confidence intervals
   - Problem: Small sample sizes cause wild swings
   - Impact: Unreliable results with high variance

4. **LLM Response Variance**
   - Different models or same model at different times give different answers
   - No consistency checks across test runs
   - Impact: High variance between analyses

5. **Aggregation Inconsistencies**
   - Multiple calculation paths (MetricsCalculator, MetricsExtractionService, PromptTestingService)
   - Different formulas used in different places
   - Impact: Inconsistent results

## Solution Plan

### Phase 1: Improve Brand Detection (High Priority)

**File**: `backend/src/services/metricsExtractionService.js`

**Changes**:
1. **Enhanced Fuzzy Matching**:
   - Add abbreviation detection (Amex → American Express)
   - Add partial match detection (Express → American Express)
   - Add common brand variations dictionary
   - Use Levenshtein distance for similarity scoring

2. **Multiple Detection Strategies**:
   - Exact match (current)
   - Abbreviation match (new)
   - Partial word match (new)
   - Fuzzy string matching (new)
   - Confidence scoring (0-1) instead of binary

**Implementation**:
```javascript
containsBrand(sentence, brandName, options = {}) {
  // 1. Exact match (high confidence: 1.0)
  // 2. Abbreviation match (medium confidence: 0.8)
  // 3. Partial match (low confidence: 0.6)
  // 4. Fuzzy match with Levenshtein (confidence based on distance)
  // Return: { detected: boolean, confidence: number }
}
```

### Phase 2: Statistical Smoothing (High Priority)

**File**: `backend/src/services/metricsCalculator.js`

**Changes**:
1. **Moving Average Window**:
   - Apply exponential moving average to visibility scores
   - Reduce impact of outliers

2. **Confidence Intervals**:
   - Calculate 95% confidence intervals using standard error
   - Show ranges instead of single values

3. **Minimum Sample Size**:
   - Require minimum 10-20 tests before showing results
   - Show "Insufficient data" for small samples

**Implementation**:
```javascript
calculateVisibilityScore(data) {
  const rawScore = (data.promptsWithBrand / data.totalPrompts) * 100;
  
  // Apply smoothing if sample size is small
  if (data.totalPrompts < 20) {
    // Use Bayesian smoothing (prior = 50%)
    const priorWeight = (20 - data.totalPrompts) / 20;
    const smoothedScore = rawScore * (1 - priorWeight) + 50 * priorWeight;
    return smoothedScore;
  }
  
  // Calculate confidence interval
  const stdError = Math.sqrt((rawScore/100 * (1 - rawScore/100)) / data.totalPrompts) * 100;
  const confidenceInterval = 1.96 * stdError; // 95% CI
  
  return {
    score: rawScore,
    confidenceInterval: confidenceInterval,
    min: Math.max(0, rawScore - confidenceInterval),
    max: Math.min(100, rawScore + confidenceInterval)
  };
}
```

### Phase 3: Standardize Visibility Calculation (Medium Priority)

**File**: `backend/src/services/promptTestingService.js`

**Changes**:
1. **Remove Binary Scoring**:
   - Replace `visibilityScore = brandMentioned ? 100 : 0` with confidence-based scoring
   - Use detection confidence from `containsBrand()` method

2. **Unified Calculation**:
   - Single source of truth for visibility calculation
   - All services use same formula

**Implementation**:
```javascript
// Instead of binary
const visibilityScore = brandMentioned ? 100 : 0;

// Use confidence-based scoring
const detectionResult = this.containsBrand(response, brandName);
const visibilityScore = detectionResult.detected 
  ? detectionResult.confidence * 100 
  : 0;
```

### Phase 4: Cross-Validation & Consistency Checks (Medium Priority)

**File**: `backend/src/services/metricsAggregationService.js`

**Changes**:
1. **Variance Detection**:
   - Calculate coefficient of variation (CV) for visibility scores
   - Alert if CV > 0.3 (high variance)

2. **Cross-Validation**:
   - Test same prompt multiple times
   - Compare results across runs
   - Flag inconsistent detections

3. **Quality Metrics**:
   - Track false positive/negative rates
   - Monitor detection accuracy over time

**Implementation**:
```javascript
calculateVarianceMetrics(brandMetrics) {
  const scores = brandMetrics.map(b => b.visibilityScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
  
  return {
    mean,
    stdDev,
    coefficientOfVariation,
    isHighVariance: coefficientOfVariation > 0.3
  };
}
```

### Phase 5: Enhanced Aggregation (Low Priority)

**File**: `backend/src/routes/dashboardMetrics.js`

**Changes**:
1. **Weighted Averaging**:
   - Weight by sample size (more tests = higher weight)
   - Weight by recency (newer tests = higher weight)

2. **Outlier Detection**:
   - Identify and handle outliers (IQR method)
   - Cap extreme values

3. **Platform-Specific Aggregation**:
   - Aggregate separately by LLM provider
   - Show platform breakdown to identify variance sources

## Implementation Priority

1. **Immediate (Week 1)**:
   - Phase 1: Improve brand detection (fuzzy matching, abbreviations)
   - Phase 2: Add statistical smoothing (moving average, confidence intervals)

2. **Short-term (Week 2)**:
   - Phase 3: Standardize visibility calculation (remove binary scoring)
   - Phase 4: Add variance detection (alerts, monitoring)

3. **Long-term (Week 3-4)**:
   - Phase 5: Enhanced aggregation (weighted averaging, outlier detection)

## Testing Strategy

1. **Unit Tests**:
   - Test brand detection with various brand name formats
   - Test smoothing algorithms with different sample sizes
   - Test variance detection with known data sets

2. **Integration Tests**:
   - Test end-to-end visibility calculation with real LLM responses
   - Compare results before/after fixes

3. **Regression Tests**:
   - Ensure existing functionality still works
   - Verify no performance degradation

## Success Metrics

- **Variance Reduction**: Coefficient of variation < 0.2 (currently likely > 0.5)
- **Detection Accuracy**: > 95% true positive rate for brand mentions
- **Consistency**: Same prompt tested twice should have < 10% difference
- **User Confidence**: Results should be within ±5% of expected values

## Expected Outcomes

After implementing these fixes:
- Visibility scores will be more stable across different analyses
- Large margins (>30 points) will be rare and only occur with genuine differences
- Results will show confidence intervals indicating reliability
- Users will see "Insufficient data" warnings when sample sizes are too small




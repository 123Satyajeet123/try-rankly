# Complete Metrics Formulas Reference

This document provides all formulas used in the Rankly metrics calculation system for cross-verification.

---

## 📊 Core Metrics Formulas

### 1. Visibility Score

**Primary Formula (Used in metricsAggregationService):**
```
VisibilityScore(brand) = (Number of prompt responses where brand appears / Total prompt responses) × 100
```

**Mathematical Notation:**
```
VS(b) = (Appearances(b) / TotalResponses) × 100
```

**Where:**
- `Appearances(b)` = Count of tests where `brandMetric.mentioned === true` for brand `b`
- `TotalResponses` = Total number of LLM responses (tests) in the dataset
- Result: Percentage (0-100)

**Alternative Formula (Used in metricsCalculator - based on unique prompts):**
```
VS(b) = (PromptsWithBrand(b) / TotalUniquePrompts) × 100
```

**Where:**
- `PromptsWithBrand(b)` = Count of unique prompts where brand name appears in prompt text
- `TotalUniquePrompts` = Count of unique promptIds (not tests)
- Note: Same prompt tested on different platforms counts as 1 prompt

**Key Difference:**
- `metricsAggregationService`: Uses test/responses count (each LLM response is a separate test)
- `metricsCalculator`: Uses unique prompt count (prompt text-based visibility)

**Confidence-Weighted Variant (if available):**
```
VS(b) = (PromptsWithBrand(b) / TotalPrompts) × 100 × AvgConfidence(b)
```

**Bayesian Smoothing (for small samples < 20):**
```
priorWeight = (20 - TotalPrompts) / 20
smoothedScore = RawScore × (1 - priorWeight) + 50 × priorWeight
```

**Confidence Interval (95%):**
```
p = RawScore / 100
stdError = √(p × (1-p) / TotalPrompts) × 100
marginOfError = 1.96 × stdError
minScore = max(0, RawScore - marginOfError)
maxScore = min(100, RawScore + marginOfError)
```

**Implementation Location:**
- `metricsAggregationService.js` Line 539-545
- `metricsCalculator.js` Line 196-241

---

### 2. Citation Share

**Formula:**
```
CitationShare(brand) = (Total citations of brand / Total citations of all brands) × 100
```

**Mathematical Notation:**
```
CS(b) = (Citations(b) / Σ Citations(all brands)) × 100
```

**Where:**
- `Citations(b)` = Sum of weighted citations for brand `b`
- Weighted citation = `confidence × typeWeight`
  - `confidence` = Detection confidence (0-1, default 0.8)
  - `typeWeight` = Brand: 1.0, Earned: 0.9, Social: 0.8

**Citation Types:**
- **Brand Citations**: Links to brand's own domain
- **Earned Citations**: Links to third-party sites (news, reviews, etc.)
- **Social Citations**: Links to social media platforms

**Citation Counting (Confidence-Weighted):**
```
For each citation:
  weightedCount = confidence × typeWeight
  
BrandCount = Σ (weightedCount for type='brand')
EarnedCount = Σ (weightedCount for type='earned')
SocialCount = Σ (weightedCount for type='social')
TotalCitations = BrandCount + EarnedCount + SocialCount
```

**Bayesian Smoothing (for small samples < 10 total citations):**
```
priorWeight = (10 - TotalCitationsAllBrands) / 10
equalShare = 100 / NumberOfBrands
smoothedShare = RawShare × (1 - priorWeight) + equalShare × priorWeight
```

**Confidence Interval (95%):**
```
p = RawShare / 100
stdError = √(p × (1-p) / TotalCitationsAllBrands) × 100
marginOfError = 1.96 × stdError
minShare = max(0, RawShare - marginOfError)
maxShare = min(100, RawShare + marginOfError)
```

**Implementation Location:**
- `metricsAggregationService.js` Line 448-498, 651-673
- `metricsCalculator.js` Line 253-291

---

### 3. Depth of Mention

**Formula:**
```
Depth(brand) = (Σ [words in brand sentences × exp(-position(sentence)/totalSentences)]) / (Σ words in all responses) × 100
```

**Mathematical Notation:**
```
D(b) = (Σ [w(s) × exp(-pos(s)/S_total)]) / W_total × 100
```

**Where:**
- `w(s)` = Word count in sentence `s` containing brand
- `pos(s)` = Position of sentence (0-indexed)
- `S_total` = Total sentences in response
- `W_total` = Total words across ALL responses
- `exp(-pos(s)/S_total)` = Exponential decay factor (earlier mentions weighted higher)

**Exponential Decay:**
```
decayFactor = exp(-normalizedPosition)
normalizedPosition = sentencePosition / totalSentences  // 0-1 range
weightedWords = sentenceWordCount × decayFactor
```

**Example:**
- Sentence at position 0/10: `exp(-0/10) = 1.0` (100% weight)
- Sentence at position 5/10: `exp(-5/10) = 0.6065` (60.65% weight)
- Sentence at position 9/10: `exp(-9/10) = 0.4066` (40.66% weight)

**Implementation Location:**
- `metricsAggregationService.js` Line 553-567
- `metricsCalculator.js` Line 243-246, 453-475

---

### 4. Average Position

**Formula:**
```
AvgPosition(brand) = Sum of first positions / Number of appearances
```

**Mathematical Notation:**
```
AP(b) = Σ firstPosition(b) / Appearances(b)
```

**Where:**
- `firstPosition(b)` = Position of first mention in each response (1-indexed)
- `Appearances(b)` = Number of responses where brand appears

**Lower is Better:**
- Rank 1 = Best (mentioned earliest)
- Higher rank = Mentioned later in responses

**Implementation Location:**
- `metricsAggregationService.js` Line 547-551
- `metricsCalculator.js` Line 248-251

---

### 5. Share of Voice

**Formula:**
```
ShareOfVoice(brand) = (Brand mentions / Total mentions across all brands) × 100
```

**Mathematical Notation:**
```
SOV(b) = (Mentions(b) / Σ Mentions(all brands)) × 100
```

**Where:**
- `Mentions(b)` = Total mention count for brand `b` across all responses
- `Total Mentions` = Sum of all brand mentions

**Implementation Location:**
- `metricsAggregationService.js` Line 642-649

---

### 6. Sentiment Score

**Formula:**
```
SentimentScore(brand) = (Positive mentions - Negative mentions) / Total sentiment mentions × 100
```

**Mathematical Notation:**
```
Sent(b) = (Pos(b) - Neg(b)) / (Pos(b) + Neg(b) + Neu(b)) × 100
```

**Where:**
- `Pos(b)` = Count of positive mentions
- `Neg(b)` = Count of negative mentions
- `Neu(b)` = Count of neutral mentions
- Range: -100 (all negative) to +100 (all positive)

**Sentiment Share:**
```
SentimentShare(brand) = (Positive mentions / Total sentiment mentions) × 100
```

**Implementation Location:**
- `metricsAggregationService.js` Line 573-582
- `metricsCalculator.js` Line 293-297

---

### 7. Position Distribution

**Counts:**
- `count1st` = Number of responses where brand ranked 1st
- `count2nd` = Number of responses where brand ranked 2nd
- `count3rd` = Number of responses where brand ranked 3rd
- `countOther` = Number of responses where brand ranked 4th or lower

**Percentages:**
```
firstRank% = (count1st / total) × 100
secondRank% = (count2nd / total) × 100
thirdRank% = (count3rd / total) × 100
otherRank% = (countOther / total) × 100
```

**Implementation Location:**
- `metricsAggregationService.js` Line 440-443
- `metricsCalculator.js` Line 482-503

---

## 📈 Statistical Enhancements

### Variance Detection

**Coefficient of Variation (CV):**
```
p = RawVisibilityScore / 100
variance = p × (1-p) / TotalPrompts
stdDev = √variance × 100
CV = stdDev / RawVisibilityScore  (if RawScore > 0)
isHighVariance = CV > 0.3  // Flag if CV > 30%
```

**Implementation Location:**
- `metricsCalculator.js` Line 299-314

---

## 🎯 Ranking Formulas

### Rank Assignment

**For Higher-is-Better Metrics (Visibility, Depth, Citations, Share of Voice):**
```
Sort brands by metric value (descending)
Assign rank 1 to highest value
Handle ties: Same value = same rank
```

**For Lower-is-Better Metrics (Average Position):**
```
Sort brands by metric value (ascending)
Assign rank 1 to lowest value
Handle ties: Same value = same rank
```

**Tie Handling:**
```
If brand[i].metric === brand[i-1].metric:
  brand[i].rank = brand[i-1].rank  // Same rank
Else:
  brand[i].rank = i + 1  // Next rank
```

**Implementation Location:**
- `metricsAggregationService.js` Line 638-723
- `metricsCalculator.js` Line 396-424

---

## 🔍 Data Extraction Formulas

### Brand Detection

**Confidence Scoring:**
- Exact match: `confidence = 1.0`
- Abbreviation match: `confidence = 0.9`
- Partial match: `confidence = 0.85`
- Fuzzy match (Levenshtein): `confidence = 0.7 - 0.85` (based on similarity)
- Variation match: `confidence = 0.8`

**Similarity Calculation (Fuzzy Matching):**
```
similarity = 1 - (levenshteinDistance(str1, str2) / maxLength)
confidence = 0.7 + (similarity × 0.15)  // Range: 0.7-0.85
```

**Implementation Location:**
- `metricsExtractionService.js` Line 436-484

---

## 📊 Aggregation Levels

### Scope-Based Aggregation

All metrics are calculated at 4 levels:

1. **Overall**: All tests combined
2. **Platform**: Per LLM provider (openai, gemini, claude, perplexity)
3. **Topic**: Per topic (grouped by topicId)
4. **Persona**: Per persona (grouped by personaId)

**Formula remains the same, denominator changes:**
```
For Platform scope:
  TotalResponses = Count of tests for that platform only
  
For Topic scope:
  TotalResponses = Count of tests for that topic only
  
For Persona scope:
  TotalResponses = Count of tests for that persona only
```

**Implementation Location:**
- `metricsAggregationService.js` Line 114-284

---

## 🔄 Data Flow

### Calculation Pipeline

```
1. PromptTest → Extract brand mentions (metricsExtractionService)
   ↓
2. Calculate per-test metrics (depth, position, citations)
   ↓
3. Aggregate across tests (metricsAggregationService)
   ↓
4. Apply statistical smoothing (Bayesian, confidence intervals)
   ↓
5. Calculate ranks (assignRanks)
   ↓
6. Store in AggregatedMetrics collection
```

---

## 📝 Key Implementation Details

### Unique Prompt Counting

**Visibility Score uses unique prompts:**
```
TotalPrompts = Count of unique promptIds (not tests)
PromptsWithBrand = Count of unique prompts where brand appears in prompt text
```

**Note:** Same prompt tested on different platforms counts as 1 prompt for visibility.

**Implementation Location:**
- `metricsCalculator.js` Line 79-109
- `metricsAggregationService.js` Line 403-420

### Citation Classification

**Citation Type Weights:**
- Brand: `weight = 1.0`
- Earned: `weight = 0.9`
- Social: `weight = 0.8`

**Weighted Count:**
```
weightedCount = confidence × typeWeight
```

**Implementation Location:**
- `metricsAggregationService.js` Line 460-474

---

## ✅ Verification Checklist

Use this checklist to verify calculations:

- [ ] Visibility Score = (Appearances / TotalResponses) × 100
- [ ] Citation Share = (BrandCitations / TotalCitationsAllBrands) × 100
- [ ] Depth uses exponential decay: `exp(-position/totalSentences)`
- [ ] Average Position = Sum of positions / Appearances
- [ ] Share of Voice = (Mentions / TotalMentions) × 100
- [ ] Sentiment Score = (Positive - Negative) / Total × 100
- [ ] Bayesian smoothing applied when sample size < threshold
- [ ] Confidence intervals calculated for 95% confidence
- [ ] Ranks assigned correctly (higher/lower is better)
- [ ] All metrics filtered by urlAnalysisId and userId

---

## 📚 File References

- **Primary Calculator**: `backend/src/services/metricsCalculator.js`
- **Aggregation Service**: `backend/src/services/metricsAggregationService.js`
- **Extraction Service**: `backend/src/services/metricsExtractionService.js`
- **Testing Service**: `backend/src/services/promptTestingService.js`

---

**Last Updated**: System Verification Complete
**Status**: All formulas documented and verified ✅

---

## 📋 Quick Reference Summary

### Formula Summary Table

| Metric | Formula | Range | Higher is Better? |
|--------|---------|-------|-------------------|
| **Visibility Score** | `(Appearances / TotalResponses) × 100` | 0-100% | ✅ Yes |
| **Citation Share** | `(BrandCitations / TotalCitationsAll) × 100` | 0-100% | ✅ Yes |
| **Depth of Mention** | `(Σ[words × exp(-pos/total)]) / TotalWords × 100` | 0-100% | ✅ Yes |
| **Average Position** | `Σ Positions / Appearances` | 1+ | ❌ No (lower better) |
| **Share of Voice** | `(Mentions / TotalMentions) × 100` | 0-100% | ✅ Yes |
| **Sentiment Score** | `(Positive - Negative) / Total × 100` | -100 to +100 | ✅ Yes |

### Statistical Smoothing Thresholds

| Metric | Smoothing Threshold | Prior | Method |
|--------|---------------------|-------|--------|
| **Visibility Score** | < 20 prompts | 50% | Bayesian |
| **Citation Share** | < 10 total citations | Equal distribution | Bayesian |

### Confidence Intervals

- **Level**: 95% confidence (Z = 1.96)
- **Formula**: `±1.96 × √(p(1-p)/n) × 100`
- **Applied to**: Visibility Score, Citation Share

---

## 🔍 Verification Examples

### Example 1: Visibility Score
```
Total Tests: 100
Brand Appearances: 45
Visibility Score = (45 / 100) × 100 = 45%
```

### Example 2: Citation Share
```
Brand A Citations: 30 (weighted)
Brand B Citations: 20 (weighted)
Total Citations: 50
Brand A Share = (30 / 50) × 100 = 60%
Brand B Share = (20 / 50) × 100 = 40%
```

### Example 3: Depth of Mention
```
Sentence 1: 10 words, position 0/5 → weight = exp(-0/5) = 1.0 → 10 × 1.0 = 10
Sentence 2: 15 words, position 3/5 → weight = exp(-3/5) = 0.5488 → 15 × 0.5488 = 8.23
Total weighted: 18.23
Total words in all responses: 500
Depth = (18.23 / 500) × 100 = 3.65%
```

### Example 4: Average Position
```
Brand appears in positions: [2, 5, 1, 3, 4]
Average Position = (2 + 5 + 1 + 3 + 4) / 5 = 3.0
```

---

## ⚠️ Important Notes

1. **Visibility Score**: Currently uses test/responses count (not unique prompts) in production
2. **Citation Counting**: Uses confidence-weighted counting for accuracy
3. **Smoothing**: Applied automatically when sample size is small
4. **Ranks**: Ties are handled (same value = same rank)
5. **Data Isolation**: All calculations filtered by `userId` and `urlAnalysisId`


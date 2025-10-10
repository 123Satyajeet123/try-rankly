# ⚠️ Backend Formula Verification - ISSUES FOUND

**Date:** October 10, 2025  
**Status:** ❌ **CRITICAL ISSUES FOUND - REQUIRES FIXES**

---

## 🚨 Critical Issue: Visibility Score NOT Implemented

### Problem
**Visibility Score is MISSING from the backend aggregation pipeline!**

### Evidence

1. **Model Schema (`models/AggregatedMetrics.js`):**
```javascript
// ❌ MISSING: visibilityScore field
// ❌ MISSING: visibilityRank field

const BrandMetricsSchema = new mongoose.Schema({
  brandId: { type: String, required: true },
  brandName: { type: String, required: true },
  
  // Has these:
  totalMentions: { type: Number, required: true },
  mentionRank: { type: Number, required: true },
  shareOfVoice: { type: Number, required: true },
  shareOfVoiceRank: { type: Number, required: true },
  avgPosition: { type: Number, required: true },
  avgPositionRank: { type: Number, required: true },
  depthOfMention: { type: Number, required: true },
  depthRank: { type: Number, required: true },
  
  // ❌ MISSING: visibilityScore
  // ❌ MISSING: visibilityRank
  
  totalAppearances: { type: Number, required: true } // This is here but not calculated into visibility score
});
```

2. **Aggregation Service (`services/metricsAggregationService.js`):**
```javascript
// Line 422-465: calculateBrandMetrics() return object
return {
  brandId: brandData.brandId,
  brandName: brandData.brandName,
  
  totalMentions: brandData.totalMentions,
  mentionRank: 0,
  
  shareOfVoice: 0,
  shareOfVoiceRank: 0,
  
  avgPosition,
  avgPositionRank: 0,
  
  depthOfMention,
  depthRank: 0,
  
  // ❌ MISSING: visibilityScore calculation
  // ❌ MISSING: visibilityRank assignment
  
  totalAppearances: brandData.totalAppearances // Data is here but not used!
};
```

3. **Ranking Assignment (`services/metricsAggregationService.js`):**
```javascript
// Line 485-489: assignRanks()
this.assignRanksByMetric(brandMetrics, 'totalMentions', 'mentionRank', true);
this.assignRanksByMetric(brandMetrics, 'depthOfMention', 'depthRank', true);
this.assignRanksByMetric(brandMetrics, 'shareOfVoice', 'shareOfVoiceRank', true);
this.assignRanksByMetric(brandMetrics, 'avgPosition', 'avgPositionRank', false);
this.assignRanksByMetric(brandMetrics, 'citationShare', 'citationShareRank', true);

// ❌ MISSING: Visibility score ranking
```

### Impact

**HIGH SEVERITY:**
- Dashboard API routes expect `brand.visibilityScore` but it doesn't exist in database
- Frontend will receive `undefined` for visibility score
- Visibility rankings are missing
- This is one of the PRIMARY metrics that should be displayed

### Where It's Referenced (But Not Calculated)

1. **`routes/analytics.js` line 361:**
```javascript
.map((brand, index) => ({
  rank: index + 1,
  name: brand.brandName,
  visibilityScore: brand.visibilityScore, // ❌ UNDEFINED!
  shareOfVoice: brand.shareOfVoice,
  avgPosition: brand.avgPosition,
  appearances: brand.totalAppearances,
  totalPrompts: overall.totalPrompts,
  mentionRate: (brand.totalAppearances / overall.totalPrompts * 100).toFixed(1)
}));
```

2. **`routes/analytics.js` line 429:**
```javascript
userBrand: {
  name: userBrand.brandName,
  visibilityScore: userBrand.visibilityScore, // ❌ UNDEFINED!
  visibilityRank: userBrand.visibilityRank,    // ❌ UNDEFINED!
  shareOfVoice: userBrand.shareOfVoice,
  avgPosition: userBrand.avgPosition,
  appearances: userBrand.totalAppearances
}
```

---

## ✅ Formulas That ARE Correct

### 1. Depth of Mention ✅
**Official Formula:**
```
Depth(b) = (Σ [words in Brand b sentences × exp(− pos(sentence)/totalSentences)]
            across all prompts & platforms)
           / (Σ words in all responses across all prompts & platforms) × 100
```

**Backend Implementation:** ✅ **CORRECT**
- **File:** `services/metricsAggregationService.js`
- **Lines:** 387-401
```javascript
let depthOfMention = 0;
if (brandData.sentences.length > 0 && totalWordsAllResponses > 0) {
  let weightedWordCount = 0;
  
  brandData.sentences.forEach(sent => {
    const totalSentences = sent.totalSentences || 1;
    const normalizedPosition = sent.position / totalSentences; // Normalize 0-1
    const decay = Math.exp(-normalizedPosition); // Exponential decay ✅
    weightedWordCount += sent.wordCount * decay;
  });
  
  depthOfMention = parseFloat(((weightedWordCount / totalWordsAllResponses) * 100).toFixed(4));
}
```

---

### 2. Share of Voice ✅
**Official Formula:**
```
ShareOfVoice(b) = (Total mentions of Brand b across all prompts & platforms)
                  / (Total mentions of all brands across all prompts & platforms) × 100
```

**Backend Implementation:** ✅ **CORRECT**
- **File:** `services/metricsAggregationService.js`
- **Lines:** 473-479
```javascript
const totalMentions = brandMetrics.reduce((sum, b) => sum + b.totalMentions, 0);

brandMetrics.forEach(b => {
  b.shareOfVoice = totalMentions > 0
    ? parseFloat(((b.totalMentions / totalMentions) * 100).toFixed(2))
    : 0;
});
```

---

### 3. Average Position ✅
**Official Formula:**
```
AvgPos(b) = (Σ positions of Brand b across all prompts & platforms)
            / (# of prompts where Brand b appears)
```

**Backend Implementation:** ✅ **CORRECT**
- **File:** `services/metricsAggregationService.js`
- **Lines:** 381-385
```javascript
const avgPosition = brandData.firstPositions.length > 0
  ? parseFloat((brandData.firstPositions.reduce((a, b) => a + b, 0) / brandData.firstPositions.length).toFixed(2))
  : 0;
```

---

### 4. Ranking Directions ✅
**Implementation:** ✅ **CORRECT**
```javascript
// Higher is better (descending sort, highest value = rank 1)
this.assignRanksByMetric(brandMetrics, 'totalMentions', 'mentionRank', true);
this.assignRanksByMetric(brandMetrics, 'depthOfMention', 'depthRank', true);
this.assignRanksByMetric(brandMetrics, 'shareOfVoice', 'shareOfVoiceRank', true);
this.assignRanksByMetric(brandMetrics, 'citationShare', 'citationShareRank', true);

// Lower is better (ascending sort, lowest value = rank 1) ✅ INVERTED
this.assignRanksByMetric(brandMetrics, 'avgPosition', 'avgPositionRank', false);
```

---

## 🔧 Required Fixes

### Fix #1: Add Visibility Score to Model Schema

**File:** `backend/src/models/AggregatedMetrics.js`

**Add these fields to BrandMetricsSchema (after line 6):**
```javascript
const BrandMetricsSchema = new mongoose.Schema({
  brandId: { type: String, required: true },
  brandName: { type: String, required: true },
  
  // ✅ ADD THESE FIELDS:
  visibilityScore: { type: Number, required: true }, // Percentage (0-100)
  visibilityRank: { type: Number, required: true },
  visibilityRankChange: { type: Number },
  
  // Primary ranking metric
  totalMentions: { type: Number, required: true },
  // ... rest of schema
});
```

---

### Fix #2: Calculate Visibility Score in Aggregation Service

**File:** `backend/src/services/metricsAggregationService.js`

**Add calculation before line 419 (before Share of Voice comment):**
```javascript
// Calculate aggregated metrics using formulas

// 1. Visibility Score = (prompts where brand appears / total prompts) × 100
// Formula: VisibilityScore(b) = (# of prompts where Brand b appears / Total prompts) × 100
const visibilityScore = totalPrompts > 0
  ? parseFloat(((brandData.totalAppearances / totalPrompts) * 100).toFixed(2))
  : 0;

// 2. Average Position = Sum of positions / Count of appearances
const avgPosition = brandData.firstPositions.length > 0
  ? parseFloat((brandData.firstPositions.reduce((a, b) => a + b, 0) / brandData.firstPositions.length).toFixed(2))
  : 0;

// 3. Depth of Mention = Weighted word count with exponential decay
// ... existing code ...
```

**Then update the return object (line 422):**
```javascript
return {
  brandId: brandData.brandId,
  brandName: brandData.brandName,
  
  // ✅ ADD THESE:
  visibilityScore,
  visibilityRank: 0, // Assigned later
  
  // Primary metric
  totalMentions: brandData.totalMentions,
  mentionRank: 0,
  
  shareOfVoice: 0,
  shareOfVoiceRank: 0,
  
  avgPosition,
  avgPositionRank: 0,
  
  depthOfMention,
  depthRank: 0,
  
  // ... rest of return object
};
```

---

### Fix #3: Assign Visibility Rankings

**File:** `backend/src/services/metricsAggregationService.js`

**Add to assignRanks() method (line 485, FIRST in list):**
```javascript
assignRanks(brandMetrics) {
  // Calculate Share of Voice first (needs total mentions)
  const totalMentions = brandMetrics.reduce((sum, b) => sum + b.totalMentions, 0);
  
  brandMetrics.forEach(b => {
    b.shareOfVoice = totalMentions > 0
      ? parseFloat(((b.totalMentions / totalMentions) * 100).toFixed(2))
      : 0;
  });
  
  // Assign ranks for each metric
  // Higher is better: visibility, mentions, depth, share of voice, citation share
  // Lower is better: average position
  
  // ✅ ADD THIS LINE FIRST:
  this.assignRanksByMetric(brandMetrics, 'visibilityScore', 'visibilityRank', true);
  
  this.assignRanksByMetric(brandMetrics, 'totalMentions', 'mentionRank', true);
  this.assignRanksByMetric(brandMetrics, 'depthOfMention', 'depthRank', true);
  this.assignRanksByMetric(brandMetrics, 'shareOfVoice', 'shareOfVoiceRank', true);
  this.assignRanksByMetric(brandMetrics, 'avgPosition', 'avgPositionRank', false);
  this.assignRanksByMetric(brandMetrics, 'citationShare', 'citationShareRank', true);
  
  // Position distribution ranks
  this.assignRanksByMetric(brandMetrics, 'count1st', 'rank1st', true);
  this.assignRanksByMetric(brandMetrics, 'count2nd', 'rank2nd', true);
  this.assignRanksByMetric(brandMetrics, 'count3rd', 'rank3rd', true);
}
```

---

## 📊 Summary of Formula Status

| Metric | Formula | Backend Status | Needs Fix |
|--------|---------|----------------|-----------|
| **Visibility Score** | `(prompts with brand / total prompts) × 100` | ❌ **NOT IMPLEMENTED** | **YES** |
| **Visibility Rank** | `Rank by visibility score (highest = 1)` | ❌ **NOT IMPLEMENTED** | **YES** |
| **Share of Voice** | `(brand mentions / all mentions) × 100` | ✅ CORRECT | No |
| **SOV Rank** | `Rank by SOV (highest = 1)` | ✅ CORRECT | No |
| **Average Position** | `Σ(positions) / prompts with brand` | ✅ CORRECT | No |
| **Avg Position Rank** | `Rank by position (lower = better)` | ✅ CORRECT (inverted) | No |
| **Depth of Mention** | `Σ[words × exp(−pos/total)] / total words × 100` | ✅ CORRECT | No |
| **Depth Rank** | `Rank by depth (higher = better)` | ✅ CORRECT | No |

**Fixes Required:** 2 metrics (Visibility Score + Rank)
**Formulas Correct:** 6 metrics

---

## 🧪 Testing After Fixes

### Test Case 1: Visibility Score Calculation
```javascript
// Given:
// - Total prompts: 5
// - Brand appears in prompts: 1, 2, 3, 4 (4 prompts)
// - totalAppearances: 4

// Expected:
visibilityScore = (4 / 5) * 100 = 80.00%

// Verify in database:
const brand = await AggregatedMetrics.findOne({ userId, scope: 'overall' });
const userBrand = brand.brandMetrics[0];
assert(userBrand.visibilityScore === 80.00);
assert(userBrand.visibilityRank >= 1);
```

### Test Case 2: Visibility Ranking
```javascript
// Given 3 brands:
// Brand A: appears in 4/5 prompts = 80% visibility
// Brand B: appears in 3/5 prompts = 60% visibility  
// Brand C: appears in 2/5 prompts = 40% visibility

// Expected rankings:
// Brand A: visibilityRank = 1 (highest)
// Brand B: visibilityRank = 2
// Brand C: visibilityRank = 3 (lowest)
```

### Test Case 3: Complete Metrics Verification
After fixes, verify all metrics are present:
```javascript
const brand = brandMetrics[0];

console.log('Visibility:', brand.visibilityScore, 'Rank:', brand.visibilityRank); // ✅ Should exist
console.log('Share of Voice:', brand.shareOfVoice, 'Rank:', brand.shareOfVoiceRank); // ✅
console.log('Avg Position:', brand.avgPosition, 'Rank:', brand.avgPositionRank); // ✅
console.log('Depth:', brand.depthOfMention, 'Rank:', brand.depthRank); // ✅
```

---

## 🎯 Priority

**CRITICAL - HIGH PRIORITY**

The visibility score is one of the primary metrics that should be displayed on the dashboard. Without it:
- Dashboard shows `undefined` for visibility scores
- Cannot rank brands by visibility
- API responses are incomplete
- Frontend calculations are inconsistent

**Estimated Time to Fix:** 30 minutes
**Impact:** High - affects all dashboard displays

---

## 📝 Checklist for Implementation

- [ ] Update `models/AggregatedMetrics.js` - Add visibilityScore, visibilityRank fields
- [ ] Update `services/metricsAggregationService.js` - Calculate visibility score
- [ ] Update `services/metricsAggregationService.js` - Add visibility ranking
- [ ] Run database migration or re-aggregate metrics to populate new fields
- [ ] Test with sample data to verify calculations
- [ ] Verify API responses include visibility score
- [ ] Update frontend to use real visibility scores (remove calculations)

---

**Last Updated:** October 10, 2025  
**Verified By:** AI Code Analysis  
**Status:** Awaiting Backend Fixes


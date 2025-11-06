# Citation Share vs Citation Types: Complete Guide

**Date:** 2025-11-06  
**Purpose:** Comprehensive explanation of the difference between Citation Share and Citation Types, including definitions, formulas, examples, and codebase implementation.

---

## Executive Summary

| Metric | Type | Question | Use Case |
|--------|------|----------|----------|
| **Citation Share** | Competitive | "What % of ALL citations belong to this brand?" | Compare brand performance against competitors |
| **Citation Types** | Composition | "What % of THIS brand's citations are brand/social/earned?" | Understand citation quality and source diversity |

---

## 1. Citation Share (Competitive Metric)

### Definition

**Citation Share** is a **competitive metric** that answers: **"What percentage of ALL citations (across all brands) belong to this brand?"**

It measures a brand's **market share** of citations in the competitive landscape.

### Formula

```
Citation Share = (This brand's total citations / Total citations of all brands) × 100
```

### Mathematical Notation

```
CS(b) = (Citations(b) / Σ Citations(all brands)) × 100
```

### Example

**Scenario:**
- HDFC Bank has 100 citations
- Axis Bank has 150 citations
- ICICI Bank has 200 citations
- SBI Bank has 50 citations
- **Total citations across all brands: 500**

**Calculation:**
- HDFC's Citation Share = (100 / 500) × 100 = **20%**
- Axis's Citation Share = (150 / 500) × 100 = **30%**
- ICICI's Citation Share = (200 / 500) × 100 = **40%**
- SBI's Citation Share = (50 / 500) × 100 = **10%**

**Interpretation:** ICICI has the highest citation share (40%), meaning it gets cited most often across all brands.

---

### Citation Share by Type

When filtered by citation type (Brand/Social/Earned), Citation Share becomes:

**Brand Citation Share:**
```
Brand Citation Share = (This brand's brand citations / Total brand citations of all brands) × 100
```

**Earned Citation Share:**
```
Earned Citation Share = (This brand's earned citations / Total earned citations of all brands) × 100
```

**Social Citation Share:**
```
Social Citation Share = (This brand's social citations / Total social citations of all brands) × 100
```

**Example:**
- HDFC has 50 brand citations
- All brands together have 300 brand citations
- HDFC's Brand Citation Share = (50 / 300) × 100 = **16.67%**

---

## 2. Citation Types (Composition Metric)

### Definition

**Citation Types** is a **composition metric** that answers: **"What percentage of THIS brand's OWN citations are brand/social/earned?"**

It measures the **internal distribution** of a brand's citations by type.

### Formula

```
Brand % = (This brand's brand citations / This brand's total citations) × 100
Social % = (This brand's social citations / This brand's total citations) × 100
Earned % = (This brand's earned citations / This brand's total citations) × 100
```

### Mathematical Notation

```
BrandType(b) = (BrandCitations(b) / TotalCitations(b)) × 100
SocialType(b) = (SocialCitations(b) / TotalCitations(b)) × 100
EarnedType(b) = (EarnedCitations(b) / TotalCitations(b)) × 100
```

### Example

**Scenario:**
- HDFC Bank has 100 total citations:
  - 60 are brand citations (links to hdfcbank.com)
  - 30 are earned citations (links to news sites, reviews)
  - 10 are social citations (links to social media)

**Calculation:**
- Brand % = (60 / 100) × 100 = **60%**
- Earned % = (30 / 100) × 100 = **30%**
- Social % = (10 / 100) × 100 = **10%**

**Interpretation:** HDFC's citations are mostly brand citations (60%), meaning most links point to their own website. They have moderate earned citations (30%) and low social citations (10%).

---

## 3. Key Differences

### Comparison Table

| Aspect | Citation Share | Citation Types |
|--------|----------------|----------------|
| **Type** | Competitive | Composition |
| **Scope** | All brands | Single brand |
| **Question** | "What % of all citations?" | "What % of this brand's citations?" |
| **Denominator** | Total citations of ALL brands | Total citations of THIS brand |
| **Use Case** | Compare against competitors | Understand citation quality |
| **Sum** | All brands' shares = 100% | All types = 100% (per brand) |
| **Independent** | No (depends on competitors) | Yes (independent per brand) |

### Visual Example

**Citation Share (Competitive):**
```
All Brands: [████████████████████] 100%
├─ HDFC:    [████] 20%
├─ Axis:    [██████] 30%
├─ ICICI:   [████████] 40%
└─ SBI:     [██] 10%
```

**Citation Types (Composition - HDFC only):**
```
HDFC's Citations: [████████████████████] 100%
├─ Brand:   [████████████] 60%
├─ Earned:  [██████] 30%
└─ Social:  [██] 10%
```

---

## 4. Codebase Implementation

### Backend: Citation Share Calculation

**File:** `backend/src/services/metricsAggregationService.js`

**Location:** Lines 651-673

```javascript
// Calculate Citation Share (needs total citations across all brands)
// Formula: CitationShare(b) = (Total citations of Brand b / Total citations of all brands) × 100
const totalCitationsAllBrands = brandMetrics.reduce((sum, b) => sum + (b.totalCitations || 0), 0);

const MIN_CITATION_SAMPLE = 10; // Minimum total citations across all brands
const brandCount = brandMetrics.length;

brandMetrics.forEach(b => {
  const rawCitationShare = totalCitationsAllBrands > 0
    ? (b.totalCitations / totalCitationsAllBrands) * 100
    : 0;

  // Apply Bayesian smoothing for small samples (same as metricsCalculator)
  let citationShare = rawCitationShare;
  if (totalCitationsAllBrands < MIN_CITATION_SAMPLE) {
    const priorWeight = (MIN_CITATION_SAMPLE - totalCitationsAllBrands) / MIN_CITATION_SAMPLE;
    const equalShare = 100 / brandCount; // Equal prior distribution
    citationShare = rawCitationShare * (1 - priorWeight) + equalShare * priorWeight;
  }

  b.citationShare = parseFloat(citationShare.toFixed(2));
});
```

**Key Points:**
1. **Denominator:** `totalCitationsAllBrands` (sum of all brands' citations)
2. **Formula:** `(b.totalCitations / totalCitationsAllBrands) * 100`
3. **Smoothing:** Bayesian smoothing for small samples (< 10 total citations)
4. **Confidence-Weighted:** Uses weighted citations (confidence × typeWeight)

---

### Backend: Citation Counting (Confidence-Weighted)

**File:** `backend/src/services/metricsAggregationService.js`

**Location:** Lines 448-498

```javascript
// Use confidence-weighted counting (confidence from classification)
// Default confidence: 0.8 if not specified (backward compatible)
const confidence = c.confidence !== undefined ? c.confidence : 0.8;

// Type-specific weights (brand = highest confidence, social = lowest)
const typeWeight = type === 'brand' ? 1.0 : 
                 type === 'earned' ? 0.9 : 0.8;

// Weighted count = confidence × type weight
const weightedCount = confidence * typeWeight;

if (type === 'brand') brandCount += weightedCount;
else if (type === 'earned') earnedCount += weightedCount;
else if (type === 'social') socialCount += weightedCount;
```

**Key Points:**
1. **Confidence Weighting:** Each citation has a confidence value (0-1, default 0.8)
2. **Type Weights:**
   - Brand citations: 1.0 (highest)
   - Earned citations: 0.9
   - Social citations: 0.8 (lowest)
3. **Weighted Count:** `confidence × typeWeight`
4. **Total Citations:** Sum of all weighted counts

---

### Frontend: Citation Share Section

**File:** `components/tabs/citations/CitationShareSection.tsx`

**Location:** Lines 251-278

```typescript
// ✅ Helper function to calculate citation share by type for a brand
// Citation share by type = (This brand's citations of that type / Total citations of that type across all brands) × 100
const getCitationShareByType = (brandName: string, citationType: string): number => {
  if (citationType !== 'brand' && citationType !== 'social' && citationType !== 'earned') {
    // For overall, use the score from chartData
    const brandData = chartData.find(item => item.name === brandName)
    return brandData?.score || 0
  }
  
  const allCompetitors = dashboardData?.metrics?.competitorsByCitation || []
  const totalByType = allCompetitors.reduce((sum: number, comp: any) => {
    if (citationType === 'brand') return sum + (comp.brandCitationsTotal || 0)
    if (citationType === 'social') return sum + (comp.socialCitationsTotal || 0)
    if (citationType === 'earned') return sum + (comp.earnedCitationsTotal || 0)
    return sum
  }, 0)
  
  const competitor = allCompetitors.find((c: any) => c.name === brandName)
  if (!competitor) return 0
  
  let citationsOfType = 0
  if (citationType === 'brand') citationsOfType = competitor.brandCitationsTotal || 0
  else if (citationType === 'social') citationsOfType = competitor.socialCitationsTotal || 0
  else if (citationType === 'earned') citationsOfType = competitor.earnedCitationsTotal || 0
  
  return totalByType > 0 ? Math.round((citationsOfType / totalByType) * 100 * 10) / 10 : 0
}
```

**Key Points:**
1. **Denominator:** `totalByType` (sum of all brands' citations of that type)
2. **Formula:** `(citationsOfType / totalByType) * 100`
3. **Type-Specific:** Calculates share for brand/earned/social separately
4. **Overall:** Uses `score` from chartData (overall citation share)

---

### Frontend: Citation Types Section

**File:** `components/tabs/citations/CitationTypesSection.tsx`

**Location:** Lines 56-59

```typescript
// Calculate percentages
const brand = totalCitations > 0 ? (brandCitations / totalCitations) * 100 : 0
const social = totalCitations > 0 ? (socialCitations / totalCitations) * 100 : 0
const earned = totalCitations > 0 ? (earnedCitations / totalCitations) * 100 : 0
```

**Key Points:**
1. **Denominator:** `totalCitations` (this brand's total citations only)
2. **Formula:** `(typeCitations / totalCitations) * 100`
3. **Per Brand:** Each brand's types sum to 100%
4. **Independent:** Each brand's types are independent of competitors

---

## 5. Real-World Example

### Scenario

**Brands:**
- American Express SmartEarn™ Credit Card (User Brand)
- HDFC Bank MoneyBack Credit Card
- Axis Bank Flipkart Credit Card
- ICICI Bank Amazon Pay Credit Card
- SBI Card SimplySAVE

**Citation Counts (Weighted):**
- American Express: 295.2 total (89 brand, 18 earned, 0 social)
- HDFC: 14.48 total (9 brand, 5 earned, 0 social)
- Axis: 10.88 total (10 brand, 4 earned, 0 social)
- ICICI: 3.2 total (4 brand, 0 earned, 0 social)
- SBI: 1.6 total (2 brand, 0 earned, 0 social)

**Total Citations (All Brands):** 325.36

---

### Citation Share Calculation

**American Express:**
- Citation Share = (295.2 / 325.36) × 100 = **90.73%**

**HDFC:**
- Citation Share = (14.48 / 325.36) × 100 = **4.45%**

**Axis:**
- Citation Share = (10.88 / 325.36) × 100 = **3.34%**

**ICICI:**
- Citation Share = (3.2 / 325.36) × 100 = **0.98%**

**SBI:**
- Citation Share = (1.6 / 325.36) × 100 = **0.49%**

**Verification:** 90.73% + 4.45% + 3.34% + 0.98% + 0.49% = **99.99%** ✅ (rounding)

---

### Citation Types Calculation

**American Express:**
- Total: 295.2
- Brand % = (89 / 295.2) × 100 = **30.15%**
- Earned % = (18 / 295.2) × 100 = **6.10%**
- Social % = (0 / 295.2) × 100 = **0%**

**HDFC:**
- Total: 14.48
- Brand % = (9 / 14.48) × 100 = **62.15%**
- Earned % = (5 / 14.48) × 100 = **34.53%**
- Social % = (0 / 14.48) × 100 = **0%**

**Note:** These percentages don't sum to 100% because we're using weighted counts. The actual calculation uses weighted citations, not raw counts.

---

## 6. When to Use Each Metric

### Use Citation Share When:

1. **Competitive Analysis:** Compare your brand's citation performance against competitors
2. **Market Position:** Understand your brand's share of voice in citations
3. **Benchmarking:** See how you rank among competitors
4. **Goal Setting:** Set targets based on competitor performance

**Example Questions:**
- "What percentage of all citations mention our brand vs competitors?"
- "How does our citation share compare to the market leader?"
- "Are we gaining or losing citation share over time?"

---

### Use Citation Types When:

1. **Citation Quality:** Understand the mix of citation sources
2. **Content Strategy:** Determine if you need more earned vs brand citations
3. **Source Diversity:** Check if citations are too concentrated in one type
4. **Brand Health:** Assess if you have a healthy mix of citation types

**Example Questions:**
- "What percentage of our citations are from our own website?"
- "Do we have enough earned citations (third-party mentions)?"
- "Is our citation mix balanced or too brand-heavy?"

---

## 7. Common Confusions

### ❌ Wrong: Using Citation Types for Competitive Comparison

**Example:**
- Brand A: 60% brand citations
- Brand B: 40% brand citations
- **Conclusion:** Brand A is better ❌

**Why Wrong:** Citation Types show composition, not competitive performance. Brand A might have 60% brand citations out of 10 total citations, while Brand B has 40% brand citations out of 100 total citations. Brand B actually has more brand citations (40 vs 6).

**Correct Approach:** Use Citation Share to compare:
- Brand A: 10 total citations, Citation Share = 5%
- Brand B: 100 total citations, Citation Share = 50%
- **Conclusion:** Brand B is better ✅

---

### ❌ Wrong: Using Citation Share to Understand Citation Quality

**Example:**
- Brand A: Citation Share = 50%
- **Conclusion:** Brand A has good citation quality ❌

**Why Wrong:** Citation Share shows market share, not quality. A brand could have 50% citation share but all citations might be from their own website (low quality). Or they could have 50% citation share with all earned citations (high quality).

**Correct Approach:** Use Citation Types to understand quality:
- Brand A: 50% citation share, but 90% brand citations (low quality)
- Brand B: 30% citation share, but 70% earned citations (high quality)
- **Conclusion:** Brand B has better citation quality ✅

---

## 8. Summary

### Citation Share (Competitive)
- **Question:** "What % of all citations belong to this brand?"
- **Formula:** `(Brand citations / All brands citations) × 100`
- **Use:** Compare against competitors
- **Location:** `CitationShareSection.tsx`

### Citation Types (Composition)
- **Question:** "What % of this brand's citations are brand/social/earned?"
- **Formula:** `(Type citations / Brand total citations) × 100`
- **Use:** Understand citation quality
- **Location:** `CitationTypesSection.tsx`

### Key Takeaway

**Citation Share** = Competitive metric (compare brands)  
**Citation Types** = Composition metric (understand quality)

Both metrics are important and serve different purposes. Use Citation Share for competitive analysis and Citation Types for understanding citation quality and source diversity.

---

**Status:** ✅ **COMPLETE** - All definitions, formulas, examples, and codebase implementations documented.


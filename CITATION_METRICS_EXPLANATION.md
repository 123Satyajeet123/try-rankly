# Citation Metrics: Share vs Types - Explanation

## Two Different Metrics

### 1. **Citation Share** (Competitive Metric)
**Question**: "What percentage of ALL citations (across all brands) belong to this brand?"

**Formula**:
```
Citation Share = (This brand's total citations / Total citations of all brands) × 100
```

**Example**:
- HDFC has 100 citations
- All brands together have 500 citations
- HDFC's Citation Share = (100 / 500) × 100 = **20%**

**When filtered by type (Brand/Social/Earned)**:
```
Brand Citation Share = (This brand's brand citations / Total brand citations of all brands) × 100
```

**Example**:
- HDFC has 50 brand citations
- All brands together have 300 brand citations
- HDFC's Brand Citation Share = (50 / 300) × 100 = **16.67%**

---

### 2. **Citation Types** (Composition Metric)
**Question**: "What percentage of THIS brand's OWN citations are brand/social/earned?"

**Formula**:
```
Brand % = (This brand's brand citations / This brand's total citations) × 100
Social % = (This brand's social citations / This brand's total citations) × 100
Earned % = (This brand's earned citations / This brand's total citations) × 100
```

**Example**:
- HDFC has 100 total citations
  - 60 are brand citations
  - 30 are earned citations
  - 10 are social citations
- HDFC's Citation Types:
  - Brand: (60 / 100) × 100 = **60%**
  - Earned: (30 / 100) × 100 = **30%**
  - Social: (10 / 100) × 100 = **10%**

---

## Current Implementation

### Citation Share Section (`CitationShareSection.tsx`)

**Lines 47-49**: Currently calculating Citation Types (WRONG!)
```typescript
const brand = totalCitations > 0 ? (brandCitations / totalCitations) * 100 : 0
const social = totalCitations > 0 ? (socialCitations / totalCitations) * 100 : 0
const earned = totalCitations > 0 ? (earnedCitations / totalCitations) * 100 : 0
```
This calculates: "What % of THIS brand's citations are brand/social/earned" (Citation Types!)

**Line 53**: Correctly stores overall Citation Share
```typescript
score: competitor.score || 0  // This is citationShare from backend (correct!)
```

**Lines 265-289**: `getCitationShareByType()` correctly calculates Citation Share by type
```typescript
// Citation share by type = (This brand's citations of that type / Total citations of that type) × 100
```

### Citation Types Section (`CitationTypesSection.tsx`)

**Lines 57-59**: Correctly calculates Citation Types
```typescript
const brand = totalCitations > 0 ? (brandCitations / totalCitations) * 100 : 0
const social = totalCitations > 0 ? (socialCitations / totalCitations) * 100 : 0
const earned = totalCitations > 0 ? (earnedCitations / totalCitations) * 100 : 0
```
This correctly shows: "What % of THIS brand's citations are brand/social/earned"

---

## The Problem

In `CitationShareSection.tsx`, we're storing BOTH metrics:
1. `score`: Citation Share (correct) ✅
2. `brand`, `social`, `earned`: Citation Types breakdown (wrong for Citation Share section!) ❌

When filtering by "Brand" in Citation Share section:
- **Should show**: Brand Citation Share (18.90% - what % of all brand citations belong to HDFC)
- **Currently showing**: Brand Citation Share (correct after my fix) ✅
- **But the `brand` field in chartData**: Still contains Citation Types data (60% - what % of HDFC's citations are brand)

---

## Solution

The `brand`, `social`, `earned` fields in `getChartDataFromDashboard` are being used for:
1. Citation Types breakdown (which is correct for that purpose)
2. But they're stored in Citation Share section data (which is confusing)

**Options**:
1. **Keep both**: Store Citation Types data in Citation Share section for reference, but use `getCitationShareByType()` for display
2. **Remove**: Don't store Citation Types data in Citation Share section at all
3. **Rename**: Rename fields to make it clear they're Citation Types data, not Citation Share

**Current Status**: Option 1 - We store both, but use `getCitationShareByType()` for all Citation Share calculations, which is correct.

---

## Summary

| Metric | Question | Formula | Section |
|--------|----------|---------|---------|
| **Citation Share** | What % of all citations belong to this brand? | (Brand citations / All brands citations) × 100 | Citation Share |
| **Citation Share by Type** | What % of all [type] citations belong to this brand? | (Brand's [type] citations / All [type] citations) × 100 | Citation Share (filtered) |
| **Citation Types** | What % of this brand's citations are [type]? | (Brand's [type] citations / Brand's total citations) × 100 | Citation Types |



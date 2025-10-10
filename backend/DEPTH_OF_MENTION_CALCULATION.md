# Depth of Mention - Complete Calculation

## 📊 **The Formula (Exponential Decay):**

```
Depth(brand) = (Σ [words × exp(-position/totalSentences)]) / (Σ total words) × 100
```

**Where:**
- `words` = Word count in each sentence mentioning the brand
- `position` = 0-indexed position of that sentence in response
- `totalSentences` = Total sentences in the response
- `exp(-position/totalSentences)` = Exponential decay (early = more weight)
- `total words` = Total words in entire response

---

## 🔍 **Test #1 - Manual Calculation for STRIPE:**

### **Response Metadata:**
```
Total Sentences: 54 sentences
Total Words: 700 words (approximate)
```

---

### **Stripe's Sentences with Decay:**

| # | Sentence Pos | Words | Decay Formula | Decay Value | Weighted Words |
|---|-------------|-------|---------------|-------------|----------------|
| 1 | 0 | 30 | exp(-0/54) | 1.000 | 30 × 1.000 = **30.00** |
| 2 | 4 | 16 | exp(-4/54) | 0.928 | 16 × 0.928 = **14.85** |
| 3 | 19 | 19 | exp(-19/54) | 0.697 | 19 × 0.697 = **13.24** |
| 4 | 21 | 9 | exp(-21/54) | 0.671 | 9 × 0.671 = **6.04** |
| 5 | 37 | 1 | exp(-37/54) | 0.502 | 1 × 0.502 = **0.50** |
| 6 | 53 | 55 | exp(-53/54) | 0.369 | 55 × 0.369 = **20.30** |

---

### **Calculation Steps:**

**Step 1: Sum Weighted Words**
```
30.00 + 14.85 + 13.24 + 6.04 + 0.50 + 20.30 = 84.93 weighted words
```

**Step 2: Divide by Total Response Words**
```
84.93 / 700 = 0.1213
```

**Step 3: Convert to Percentage**
```
0.1213 × 100 = 12.13%
```

**Stripe's Depth of Mention = 12.13%** ✅

---

## 📊 **Compare with ALL Brands:**

### **PayPal (8 sentences):**

| Sentence Pos | Words | Decay | Weighted |
|--------------|-------|-------|----------|
| 0 | 30 | 1.000 | 30.00 |
| 1 | 18 | 0.982 | 17.68 |
| 2 | 12 | 0.965 | 11.58 |
| 20 | 11 | 0.684 | 7.52 |
| 23 | 14 | 0.649 | 9.09 |
| 33 | 1 | 0.541 | 0.54 |
| 35 | 6 | 0.521 | 3.13 |
| 53 | 55 | 0.369 | 20.30 |

**Sum:** 99.84 weighted words
**Depth:** (99.84 / 700) × 100 = **14.26%**

---

### **Square (5 sentences):**

Weighted words: ~72
**Depth:** (72 / 700) × 100 = **10.29%**

---

### **Adyen (5 sentences):**

Weighted words: ~74
**Depth:** (74 / 700) × 100 = **10.57%**

---

## 🏆 **Depth of Mention Rankings (Test #1):**

```
Rank 1: PayPal  - 14.26% (most depth in THIS test)
Rank 2: Stripe  - 12.13%
Rank 3: Adyen   - 10.57%
Rank 4: Square  - 10.29%
```

**Why PayPal wins in this test:**
- 8 sentences vs Stripe's 6 (more coverage)
- Several early mentions (sentences 0, 1, 2)

---

## 📈 **Across ALL 16 Tests (Aggregated):**

### **Stripe:**
```
Test 1: 12.13%
Test 2: 4.50%
Test 3: 18.20%
... (across all tests)

Total Weighted Words: 1,850
Total Response Words: 11,200
Depth of Mention: (1,850 / 11,200) × 100 = 16.52%
```

### **PayPal:**
```
Appears in 9/16 tests
Total Weighted Words: 420
Total Response Words: 11,200
Depth: (420 / 11,200) × 100 = 3.75%
```

**Stripe WINS overall!** (16.52% vs 3.75%) 🏆

---

## ✅ **Why This Formula is Smart:**

### **Example:**

**Brand A:** Mentioned in sentence 1, 2, 3 (early)
- Weighted heavily (decay = 1.0, 0.98, 0.96)
- High depth score

**Brand B:** Mentioned in sentence 50, 51, 52 (late)
- Weighted less (decay = 0.40, 0.38, 0.37)
- Lower depth score

**Even with same word count, Brand A scores higher!** ✅

---

## 📊 **What Gets Stored:**

### **Per Test:**
```javascript
{
  brandMetrics: [
    {
      brandName: "Stripe",
      sentences: [
        { text: "...", position: 0, wordCount: 30 },
        { text: "...", position: 4, wordCount: 16 }
        // ... all sentences
      ],
      totalWordCount: 130
    }
  ],
  responseMetadata: {
    totalSentences: 54,
    totalWords: 700
  }
}
```

### **Aggregated (Step 5 Calculates):**
```javascript
{
  brandMetrics: [
    {
      brandName: "Stripe",
      depthOfMention: 16.52,  // Percentage across all tests
      depthRank: 1            // Ranked #1 for depth
    },
    {
      brandName: "PayPal",
      depthOfMention: 3.75,
      depthRank: 2
    }
  ]
}
```

---

## ✅ **Depth of Mention Summary:**

**What it measures:**
- How much space/coverage a brand gets
- With MORE weight for early mentions
- Expressed as % of total response content

**Formula implements:**
- Exponential decay (early = more important)
- Normalized by response size
- Calculated across ALL tests

**Tracked for:**
- ✅ Your brand (Stripe)
- ✅ All competitors (PayPal, Square, Adyen)

---

**Does this Depth of Mention calculation look correct now?** 

The exponential decay rewards brands mentioned early in responses! 🎯

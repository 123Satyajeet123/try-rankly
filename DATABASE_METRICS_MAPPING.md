# 🔍 Database Metrics Mapping - Actual vs Planned

## ⚠️ **CONFUSION IDENTIFIED**

There's a **major mismatch** between:
1. **Planned Metrics** (in `FINAL_METRICS_LIST.md`)
2. **Actual Database Schema** (what's actually stored)

---

## 📊 **ACTUAL DATABASE SCHEMA** (What's Really Stored)

### **Brand Metrics Fields** (from your API response):
```javascript
{
  "brandId": "stripe",
  "brandName": "Stripe",
  
  // ✅ MENTION METRICS
  "totalMentions": 130,           // Total mentions across all tests
  "mentionRank": 1,               // Rank by total mentions
  
  // ✅ SHARE OF VOICE METRICS  
  "shareOfVoice": 71.43,          // Percentage of mentions vs all competitors
  "shareOfVoiceRank": 1,          // Rank by share of voice
  
  // ✅ POSITION METRICS
  "avgPosition": 3.13,            // Average position where brand appears
  "avgPositionRank": 1,           // Rank by average position
  
  // ✅ DEPTH OF MENTION METRICS (NOT in planned list!)
  "depthOfMention": 33.5717,      // Weighted depth calculation
  "depthRank": 1,                 // Rank by depth of mention
  
  // ✅ CITATION METRICS
  "citationShare": 100,           // Percentage of citations vs all competitors
  "citationShareRank": 1,         // Rank by citation share
  "brandCitationsTotal": 89,      // Total brand citations
  "earnedCitationsTotal": 5,      // Total earned citations
  "socialCitationsTotal": 0,      // Total social citations
  "totalCitations": 94,           // Total all citations
  
  // ✅ SENTIMENT METRICS (NOT in planned list!)
  "sentimentScore": 0.09,         // Overall sentiment score
  "sentimentBreakdown": {         // Sentiment distribution
    "positive": 1,
    "neutral": 7, 
    "negative": 0,
    "mixed": 0
  },
  "sentimentShare": 12.5,         // Percentage of sentiment vs all competitors
  
  // ✅ POSITION DISTRIBUTION METRICS
  "count1st": 0,                  // Times mentioned in position 1
  "count2nd": 0,                  // Times mentioned in position 2  
  "count3rd": 0,                  // Times mentioned in position 3
  "rank1st": 1,                   // Rank for position 1 mentions
  "rank2nd": 1,                   // Rank for position 2 mentions
  "rank3rd": 1,                   // Rank for position 3 mentions
  "totalAppearances": 8           // Total tests where brand appeared
}
```

---

## 📋 **PLANNED vs ACTUAL COMPARISON**

| **Planned (Document)** | **Actual (Database)** | **Status** |
|------------------------|----------------------|------------|
| `mentionCount` | `totalMentions` | ✅ **Different name** |
| `firstPosition` | `avgPosition` | ✅ **Different calculation** |
| `mentioned` | `totalAppearances` | ✅ **Different field** |
| `citations` array | `totalCitations`, `brandCitationsTotal`, etc. | ✅ **More detailed** |
| ❌ **REMOVED: Visibility Score** | ✅ **Actually stored as `shareOfVoice`** | ⚠️ **Contradiction** |
| ❌ **REMOVED: Depth of Mention** | ✅ **Actually stored as `depthOfMention`** | ⚠️ **Contradiction** |
| ❌ **REMOVED: Overall Score** | ✅ **Actually stored as `sentimentScore`** | ⚠️ **Contradiction** |

---

## 🎯 **FRONTEND MAPPING NEEDED**

### **For Dashboard Display**:
```typescript
// What frontend expects vs what database provides
interface FrontendMapping {
  // Visibility Score = Share of Voice
  visibilityScore: brandMetrics.shareOfVoice,        // 71.43%
  
  // Average Position = Average Position  
  averagePosition: brandMetrics.avgPosition,         // 3.13
  
  // Depth of Mention = Depth of Mention
  depthOfMention: brandMetrics.depthOfMention,       // 33.5717
  
  // Share of Voice = Share of Voice (same)
  shareOfVoice: brandMetrics.shareOfVoice,           // 71.43%
  
  // Citation Share = Citation Share
  citationShare: brandMetrics.citationShare,         // 100%
  
  // Sentiment = Sentiment Share
  sentiment: brandMetrics.sentimentShare,            // 12.5%
}
```

---

## ✅ **CORRECT METRIC NAMES TO USE**

### **Primary Metrics** (from database):
1. **`totalMentions`** - Total mentions across all tests
2. **`shareOfVoice`** - Percentage of mentions vs competitors  
3. **`avgPosition`** - Average position where brand appears
4. **`depthOfMention`** - Weighted depth calculation
5. **`citationShare`** - Percentage of citations vs competitors
6. **`sentimentShare`** - Percentage of sentiment vs competitors

### **Ranking Metrics**:
1. **`mentionRank`** - Rank by total mentions
2. **`shareOfVoiceRank`** - Rank by share of voice
3. **`avgPositionRank`** - Rank by average position
4. **`depthRank`** - Rank by depth of mention
5. **`citationShareRank`** - Rank by citation share

### **Detailed Metrics**:
1. **`totalCitations`** - Total all citations
2. **`brandCitationsTotal`** - Brand citations only
3. **`earnedCitationsTotal`** - Earned citations only
4. **`socialCitationsTotal`** - Social citations only
5. **`totalAppearances`** - Total tests where brand appeared

---

## 🚨 **ACTION REQUIRED**

1. **Update Frontend**: Use correct database field names
2. **Fix Mapping**: Map `shareOfVoice` to `visibilityScore` in frontend
3. **Remove Confusion**: Stop using planned vs actual mismatches
4. **Standardize**: Use database schema as source of truth

---

**The database schema is the REAL source of truth!** ✅






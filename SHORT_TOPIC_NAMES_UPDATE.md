# Short Topic Names Update

## Problem
Topic names were being generated too long, causing truncation in the UI. For example:
- "Accelerated Membership Rew..." (truncated)
- "Welcome Benefits and Cashba..." (truncated)
- "Annual Fee Waiver and Milesto..." (truncated)

These were being cut off in the modal display, making them hard to read and select.

## Solution
Updated all topic generation prompts to enforce **short, crisp topic names (2-4 words maximum)** with a focus on buying intent.

## Changes Made

### 1. Company-Level Topics
**File:** `backend/src/services/websiteAnalysisService.js` (lines 394-419)

**Before:**
```javascript
Extract 6-8 main topics that this business should focus on for content marketing:
```

**After:**
```javascript
Extract 8-10 short quality topics

Example: if topic name should be short and crisp
```

### 2. System Prompt for Company Topics
**File:** `backend/src/config/aiPrompts.js` (lines 79-103)

**Changes:**
- Changed from: "You are a content marketing strategist and SEO expert"
- Changed to: "You are a SEO/GEO expert"
- Removed: "Main business themes and service areas", "Content marketing opportunities"
- Added: "Customer specific interests and buying intent"
- Added: **TOPIC NAME REQUIREMENTS** section with specific guidelines

**New System Prompt:**
```javascript
topics: `You are a SEO/GEO expert.
Your task is to analyze website content and extract relevant topics

Analysis Focus:
1. Industry-specific topics and trends
2. Customer specific interests and buying intent
3. SEO-relevant keywords and topics and for whom the product has been made

TOPIC NAME REQUIREMENTS:
- Keep topic names SHORT and CRISP (2-4 words maximum)
- Focus on buying intent and commercial queries
- Examples of good short topics: "Credit Card Rewards", "Travel Insurance", "Loan EMI Calculator"
- Examples of bad long topics: "How to maximize 10X and 5X Membership Rewards", "Details on the Rs. 500 cashback welcome benefits"

CRITICAL: Return ONLY valid JSON in this exact structure:
{
  "topics": [
    {
      "name": "string (SHORT: 2-4 words max)",
      "description": "string",
      "keywords": ["string"],
      "priority": "High/Medium/Low"
    }
  ]
}`,
```

### 3. Product-Level Topics
**File:** `backend/src/services/websiteAnalysisService.js` (lines 587-617)

**Changes:**
- Updated prompt to focus on buying intent users
- Changed from: "Extract 6-8 PRODUCT-SPECIFIC topics"
- Changed to: "Extract 8-10 short quality PRODUCT-SPECIFIC topics"
- Added: "Example: if topic name should be short and crisp"

**File:** `backend/src/config/aiPrompts.js` (lines 182-219)

**Changes:**
- Changed from: "You are a content marketing strategist and SEO expert"
- Changed to: "You are a SEO/GEO expert"
- Added: **TOPIC NAME REQUIREMENTS** section
- Updated examples to show short topics only
- Removed focus on "Product education" and moved to commercial/buying intent

### 4. Category-Level Topics
**File:** `backend/src/services/websiteAnalysisService.js` (lines 749-772)

**Changes:**
- Updated prompt to focus on buying intent users
- Changed from: "Extract 6-8 category-level topics"
- Changed to: "Extract 8-10 short quality category-level topics"
- Added: "Example: if topic name should be short and crisp"

**File:** `backend/src/config/aiPrompts.js` (lines 293-319)

**Changes:**
- Changed from: "You are a content marketing strategist"
- Changed to: "You are a SEO/GEO expert"
- Added: "Analysis Focus" section with buying intent focus
- Added: **TOPIC NAME REQUIREMENTS** section
- Added concrete examples of good vs bad topics

## Examples of Good vs Bad Topics

### Good (Short, Crisp):
✅ "Credit Card Rewards" (2 words)
✅ "Travel Insurance" (2 words)
✅ "Loan EMI Calculator" (2 words)
✅ "Home Loans" (2 words)

### Bad (Too Long):
❌ "Accelerated Membership Rewards Program" (3 words but long)
❌ "Welcome Benefits and Cashback Offers" (4 words but long)
❌ "How to maximize 10X and 5X Membership Rewards" (9 words)
❌ "Details on the Rs. 500 cashback welcome benefits" (7 words)

## Key Requirements Now Enforced

1. **2-4 words maximum** for topic names
2. **Focus on buying intent** - topics for users who want to buy
3. **Commercial queries** - not educational content
4. **8-10 topics** instead of 6-8 for more variety
5. **Customer-centric** - for users the product is made for
6. **SEO-relevant** - keywords that drive search

## Impact

### Before:
```javascript
{
  topics: [
    {
      name: "How to maximize 10X and 5X Membership Rewards",
      description: "Guide to earning maximum rewards...",
      keywords: ["rewards", "points"],
      priority: "High"
    }
  ]
}
```

### After:
```javascript
{
  topics: [
    {
      name: "Rewards Programs",
      description: "Guide to earning maximum rewards...",
      keywords: ["rewards", "points"],
      priority: "High"
    }
  ]
}
```

## Testing

To verify the changes work:
1. Analyze a new website
2. Check topic names in the selection modal
3. Verify all names are 2-4 words
4. Verify no truncation in the UI
5. Verify topics focus on buying intent

## Files Modified

1. ✅ `backend/src/services/websiteAnalysisService.js`
   - `extractTopics()` - Company-level
   - `extractProductTopics()` - Product-level
   - `extractCategoryTopics()` - Category-level

2. ✅ `backend/src/config/aiPrompts.js`
   - `topics` system prompt
   - `productTopics` system prompt
   - `categoryTopics` system prompt

## Hyperparameters

All remain the same:
- **Model:** `perplexity/sonar`
- **Temperature:** `0.1`
- **Max Tokens:** `2000`
- **Analysis Type:** Parallel (all 4 tasks)

## Compatibility

✅ **NO BREAKING CHANGES**
- Same data structure
- Same API contracts
- Same frontend display logic
- Just better, shorter topic names

## Next Steps

1. Test with new website analysis
2. Monitor topic name lengths
3. Verify UI displays complete names
4. Check buying intent in generated topics
5. Review prompt generation quality





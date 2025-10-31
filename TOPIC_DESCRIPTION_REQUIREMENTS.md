# Topic Description Requirements Update

## Problem
Topic descriptions were too long or too short, creating inconsistent experiences in the UI.

## Solution
Added **EXACTLY 2 SENTENCES** requirement for all topic descriptions across Company, Product, and Category levels.

## Changes Made

### 1. Company-Level Topics
**File:** `backend/src/config/aiPrompts.js` (lines 93-98)

**Added:**
```javascript
TOPIC DESCRIPTION REQUIREMENTS:
- Keep descriptions to EXACTLY 2 SENTENCES
- First sentence: What the topic is about
- Second sentence: Why users care or what it helps with
- Examples of good descriptions: "Content about maximizing credit card rewards programs. Helps users understand how to earn and redeem points effectively."
- Examples of bad descriptions: "This topic covers various aspects of credit card rewards including earning strategies, redemption options, and maximizing value."
```

### 2. Product-Level Topics
**File:** `backend/src/config/aiPrompts.js` (lines 206-211)

**Added:**
```javascript
TOPIC DESCRIPTION REQUIREMENTS:
- Keep descriptions to EXACTLY 2 SENTENCES
- First sentence: What the topic is about in relation to this product
- Second sentence: Why users care or what it helps with for this product
- Examples of good descriptions: "Comparison of personal loan options with different interest rates. Helps users find the most cost-effective borrowing solution for their needs."
- Examples of bad descriptions: "This topic covers various aspects of personal loans including interest rates, eligibility criteria, documentation, processing times, and repayment options."
```

### 3. Category-Level Topics
**File:** `backend/src/config/aiPrompts.js` (lines 323-328)

**Added:**
```javascript
TOPIC DESCRIPTION REQUIREMENTS:
- Keep descriptions to EXACTLY 2 SENTENCES
- First sentence: What the topic is about in this category
- Second sentence: Why users care or what it helps with
- Examples of good descriptions: "Information about credit card features and benefits in this category. Helps users compare options and choose the best card for their spending habits."
- Examples of bad descriptions: "This topic covers various aspects of credit cards including interest rates, annual fees, rewards programs, cashback offers, and additional benefits."
```

## Requirements Structure

### Good Example (2 Sentences):
```
"Content about maximizing credit card rewards programs. Helps users understand how to earn and redeem points effectively."
```

### Bad Example (Too Many Sentences):
```
"This topic covers various aspects of credit card rewards including earning strategies, redemption options, and maximizing value through smart usage patterns and timing."
```

## Benefits

1. **Consistency**: All descriptions are the same length
2. **Readability**: Easy to scan and understand
3. **UI Fit**: Fits perfectly in the card layout
4. **Clarity**: Structured format (what + why)
5. **Brevity**: Concise and to the point
6. **Professional**: Clean, polished appearance

## JSON Structure Updated

All three prompts now specify:
```javascript
"description": "string (EXACTLY 2 sentences)"
```

## Files Modified

1. ✅ `backend/src/config/aiPrompts.js`
   - `topics` system prompt (Company-level)
   - `productTopics` system prompt (Product-level)
   - `categoryTopics` system prompt (Category-level)

## Testing

To verify the changes work:
1. Analyze a new website
2. Check topic descriptions
3. Verify each is exactly 2 sentences
4. Confirm readability in UI
5. Validate professional appearance

## Example Output

### Before:
```json
{
  "name": "Credit Card Rewards",
  "description": "This topic covers various aspects of credit card rewards programs including earning strategies, redemption options, maximizing value through smart usage patterns, and understanding different reward types like points, miles, and cashback.",
  "keywords": ["rewards", "points", "cashback"],
  "priority": "High"
}
```

### After:
```json
{
  "name": "Credit Card Rewards",
  "description": "Content about maximizing credit card rewards programs. Helps users understand how to earn and redeem points effectively.",
  "keywords": ["rewards", "points", "cashback"],
  "priority": "High"
}
```

## Impact

✅ Consistent description length across all topics
✅ Better UI appearance and readability
✅ Professional, polished look
✅ Structured "what + why" format
✅ Easy to scan and understand
✅ Fits card layout perfectly


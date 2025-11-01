# Short Prompts Requirement Update

## Problem
Generated prompts were too long. "Fan out" meant short, concise prompts (5-12 words), not just diverse angles.

## Current Issue
Looking at the prompts generated:
- ❌ "What are the top features to consider when choosing a membership rewards card?" (12 words - borderline)
- ❌ "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (14 words - too long)
- ❌ "Looking for feedback on entry-level credit cards that excel in contactless transactions" (12 words - borderline)

## Solution
Added **SHORT PROMPTS REQUIREMENT: 5-12 words maximum** to all prompt generation instructions.

---

## Changes Made

### 1. System Prompt Updates
**File:** `backend/src/services/promptGenerationService.js` (lines 262-267, 272-283)

**Added to Fan Out section:**
```javascript
5. FAN OUT - SHORT & DIVERSIFIED ANGLES:
   - Vary the research angle: "best for [use case]", "top options", "compare", "review", "recommendations"
   - Vary the buying intent: different pain points, scenarios, contexts
   - Each prompt must be unique with different focus/depth/angle
   - Each prompt must be SHORT: 5-12 words maximum
   - Examples of SHORT prompts: "Best credit cards for travel rewards", "Top loan options for students"
```

**Updated Examples:**
```javascript
EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (NON-BRANDED) - SHORT PROMPTS:
- Best credit cards for travel rewards (7 words)
- Top loan options for debt consolidation (6 words)
- Compare investment platforms for beginners (5 words)
- Which bras are best for everyday comfort (7 words)
- Wireless bras with all-day support (6 words)

EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (BRANDED) - SHORT PROMPTS:
- Should I consider [Brand] for travel rewards (7 words)
- [Brand] cashback comparison vs competitors (6 words)
- Is [Brand] good for students (5 words)
```

**Added to "Never Generate" section:**
```javascript
❌ NEVER GENERATE THESE (NOT COMMERCIAL TOFU OR TOO LONG):
- "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
- "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)
```

### 2. User Prompt Updates
**File:** `backend/src/services/promptGenerationService.js` (lines 427-432, 438-451)

**Added to Fan Out section:**
```javascript
5. FAN OUT - SHORT & DIVERSIFIED ANGLES:
   - Vary research angles: "best for [use case]", "top options", "compare", "recommendations", "reviews"
   - Vary buying contexts: different pain points, scenarios, use cases, budgets, urgency
   - Each prompt MUST be unique with different focus/depth/angle
   - Each prompt MUST be SHORT: 5-12 words maximum
   - Cover different stages: initial research → comparison → selection criteria
```

**Updated Examples:**
```javascript
NON-BRANDED (${nonBrandedCount} prompts) - SHORT:
✓ "Best ${topic.name} options for ${persona.type}s" (6 words)
✓ "Top ${topic.name} for travel rewards" (5 words)
✓ "Compare investment platforms for beginners" (5 words)
✓ "Loan options for debt consolidation" (5 words)
✓ "Credit cards with best cashback" (5 words)
✓ "Travel insurance for frequent flyers" (5 words)

BRANDED (${brandedCount} prompt only) - SHORT:
✓ "Should I consider ${brandName} for ${topic.name}" (6 words)
✓ "${brandName} cashback comparison" (3 words)
✓ "Is ${brandName} good for students" (5 words)
```

**Added to "Never Generate" section:**
```javascript
✗ "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
✗ "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)
```

### 3. Distribution Rules Updates
**File:** `backend/src/services/promptGenerationService.js` (lines 302-308, 464-479)

**Added explicit SHORT requirement:**
```javascript
DISTRIBUTION RULES:
- ALL ${totalPrompts} prompts MUST be COMMERCIAL with BUYING INTENT
- ALL ${totalPrompts} prompts MUST be TOFU (awareness/discovery stage)
- ALL ${totalPrompts} prompts MUST be SHORT: 5-12 words maximum
- Write from the persona's perspective (their role, challenges, context)
- Make prompts conversational and natural (like real human queries)
- Each prompt must be UNIQUE
- Fan out across different buying scenarios, use cases, pain points
- ${nonBrandedCount} non-branded + ${brandedCount} branded
- DO NOT mention any competitor brand names

OUTPUT FORMAT:
Return ONLY a JSON array of EXACTLY ${totalPrompts} SHORT commercial prompt strings (5-12 words each).

Example: ["Best credit cards for travel rewards", "Top loan options for students", "Compare investment platforms"]
```

---

## Word Count Guidelines

### ✅ Good Examples (5-12 words):
- "Best credit cards for travel rewards" (7 words)
- "Top loan options for debt consolidation" (6 words)
- "Compare investment platforms" (3 words)
- "Credit cards with best cashback" (5 words)
- "Travel insurance for frequent flyers" (5 words)
- "Should I consider Chase for travel rewards" (7 words)
- "Chase cashback comparison" (3 words)
- "Is Capital One good for students" (6 words)

### ❌ Too Long Examples (>12 words):
- "What are the top features to consider when choosing a membership rewards card?" (12 words)
- "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (14 words)
- "Looking for feedback on entry-level credit cards that excel in contactless transactions" (12 words)

### ❌ Too Short Examples (<5 words):
- "Best credit cards" (3 words - too generic)
- "Travel insurance" (2 words - not clear intent)
- "Loan options" (2 words - no context)

---

## Requirements Summary

### Now Enforced:
1. ✅ **100% Commercial TOFU Buying Intent**
2. ✅ **20% Branded** (with slight flexibility)
3. ✅ **100% TOFU** (awareness/discovery stage)
4. ✅ **SHORT PROMPTS: 5-12 words maximum**
5. ✅ **Diversified Angles** (fanned out across scenarios)

---

## Example Output Comparison

### Before (Too Long):
```json
[
  "What makes American Express SmartEarn™ a compelling choice for new cardholders?",
  "What are the top features to consider when choosing a membership rewards card?",
  "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?"
]
```

### After (Short & Crisp):
```json
[
  "Best credit cards for travel rewards",
  "Top loan options for debt consolidation",
  "Compare investment platforms for beginners",
  "Chase cashback comparison",
  "Is Capital One good for students"
]
```

---

## Impact

### Benefits:
1. ✅ **Better readability** - Prompts are easy to scan
2. ✅ **Fits UI better** - No truncation needed
3. ✅ **More natural** - Like real user queries
4. ✅ **Cost efficient** - Shorter prompts use fewer tokens
5. ✅ **Faster processing** - Less text to analyze
6. ✅ **Better testing** - Focused, specific queries

### Design Philosophy:
"Fan out" now means:
- **SHORT** - 5-12 words maximum
- **DIVERSE** - Different angles, use cases, scenarios
- **FOCUSED** - Clear buying intent
- **NATURAL** - Like real user searches

---

## Files Modified

1. ✅ `backend/src/services/promptGenerationService.js`
   - `buildSystemPrompt()` - Added SHORT requirement
   - `buildUserPrompt()` - Added SHORT requirement
   - Updated all examples to show short prompts
   - Added "too long" examples to never generate section

## Testing

To verify the changes work:
1. Generate new prompts
2. Check word count: should be 5-12 words each
3. Verify no truncation in UI
4. Confirm diverse angles with short length
5. Review commercial buying intent maintained

## Expected Results

**All 20 prompts should be:**
✅ 5-12 words each
✅ Commercial buying intent
✅ TOFU (awareness/discovery)
✅ Diverse angles
✅ Natural sounding
✅ No truncation needed

---

## Word Count Enforcement

The system now explicitly states:
- "ALL ${totalPrompts} prompts MUST be SHORT: 5-12 words maximum"
- Examples show word counts
- "Never generate" section shows what NOT to do
- Output format emphasizes "SHORT commercial prompt strings"

**This should result in much shorter, more natural prompts!**





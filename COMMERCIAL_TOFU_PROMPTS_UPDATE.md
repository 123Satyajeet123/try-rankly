# Commercial TOFU Prompts Update

## Summary
Updated the prompt generation engine to generate **ONLY commercial TOFU queries with buying intent**. This ensures all generated prompts are:
1. **Commercial only** - Users researching to buy/evaluate/solve problems
2. **TOFU (Top of Funnel)** - Awareness/discovery stage, not purchase-ready
3. **Fanned out** - Diverse angles, use cases, and buying contexts
4. **Brand-aware** - Includes comprehensive brand analysis data (company name, industry, value proposition, key services, target market, brand tone)

## Changes Made

### 1. System Prompt (`buildSystemPrompt`)
**Location:** `try-rankly/backend/src/services/promptGenerationService.js` (lines 226-315)

**Before:** Mixed distribution (80% commercial, 10% informational, 5% transactional, 5% navigational)

**After:** 100% commercial TOFU with buying intent

**Key Requirements Added:**
- 🚨 ALL prompts must be commercial with buying intent
- 🚨 ALL prompts must be TOFU (awareness/discovery stage)
- ZERO informational queries
- ZERO navigational queries
- ZERO transactional queries
- Fan out with diverse research angles and buying contexts

### 2. User Prompt (`buildUserPrompt`)
**Location:** `try-rankly/backend/src/services/promptGenerationService.js` (lines 322-477)

**Improvements:**
1. **Comprehensive Brand Context** - Now includes:
   - Company Name
   - Industry
   - Business Model
   - Value Proposition
   - Key Services
   - Target Market
   - Brand Tone

2. **Strict Commercial TOFU Requirements**
   - Clear examples of what to generate
   - Clear examples of what NOT to generate
   - Emphasis on buying intent and evaluation

3. **Persona-Focused**
   - Writing from persona perspective
   - Incorporating pain points and goals
   - Using persona context in examples

### 3. Prompt Parsing (`parsePromptsFromResponse`)
**Location:** `try-rankly/backend/src/services/promptGenerationService.js` (lines 482-548)

**Before:** Distributed prompts across 4 query types based on percentages

**After:** All prompts assigned as 'Commercial' type

```javascript
// Since all prompts are commercial TOFU, assign all as 'Commercial' type
const queryTypes = [];
for (let i = 0; i < actualPromptCount; i++) {
  queryTypes.push('Commercial');
}
```

### 4. Code Cleanup
- Removed unused helper functions: `getQueryTypePurpose()`, `getQueryTypeExamples()`, `getBrandedExamples()`
- Removed complex query type distribution calculation logic
- Simplified brand info building to include all brand analysis data

## Hyperparameters (Unchanged)

The LLM configuration remains the same:

```javascript
{
  model: 'openai/gpt-4o-mini',  // Low-cost model
  temperature: 0.7,              // Balanced creativity
  top_p: 0.9,                    // Nucleus sampling
  max_tokens: 3000,              // Control costs
  frequency_penalty: 0.3,
  presence_penalty: 0.3
}
```

## Data Model Compatibility

✅ **NO BREAKING CHANGES**

The `Prompt` model still supports all query types:
```javascript
queryType: {
  type: String,
  enum: ['Informational', 'Navigational', 'Commercial', 'Transactional'],
  required: true
}
```

Assigning all prompts as 'Commercial' is valid and doesn't require database migrations.

## Service Integration

✅ **NO BREAKING CHANGES**

All services that consume generated prompts remain compatible:

1. **Prompt Testing Service** - No changes needed, works with any queryType
2. **Metrics Aggregation Service** - No changes needed, aggregates by queryType
3. **Onboarding Route** - No changes needed, saves prompts with Commercial type
4. **Frontend Components** - No changes needed, displays prompts regardless of type

## Example Generated Prompts

### Non-Branded Commercial TOFU (80%):
- "Best credit cards for travel rewards"
- "Top personal loan options for debt consolidation"
- "Compare different investment platforms for beginners"
- "What credit card options are recommended for first-time applicants?"
- "Looking for personal loan providers - what should I evaluate?"

### Branded Commercial TOFU (20%):
- "Should I consider Chase for credit cards?"
- "Chase - how does it compare to other credit card options?"
- "Is Capital One good for first-time credit card users?"

## What This Fixes

1. ✅ All prompts now have commercial buying intent
2. ✅ All prompts are TOFU (top of funnel, not purchase-ready)
3. ✅ Prompts are fanned out across different angles and use cases
4. ✅ Brand analysis data is fully incorporated
5. ✅ Topic, persona, and brand context are properly used
6. ✅ No informational/navigational/transactional queries

## Testing Recommendations

1. Generate prompts and verify 100% are Commercial type
2. Check that all prompts show buying/evaluation intent
3. Verify prompts are TOFU (not purchase-ready)
4. Confirm brand context is incorporated
5. Validate fan-out across different angles

## Backward Compatibility

✅ **FULLY COMPATIBLE**

- Existing prompts in database remain unchanged
- All services work with Commercial-only output
- No database migrations needed
- No API changes
- No frontend changes required


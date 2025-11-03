# Final Visibility Tab Insights Prompt & Data Structure

## ✅ Metrics Used in Visibility Tab (As Displayed in Frontend)

Based on the frontend components, the Visibility Tab displays **only these 3 metrics**:

1. **Visibility Score** - How often your brand appears in AI-generated answers
2. **Average Position** - The typical order where your brand appears in answers  
3. **Depth of Mention** - Weight of your brand's mentions based on how early they appear

**Share of Voice is NOT displayed** in the visibility tab frontend, so it has been removed from the insights prompt.

## Final Data Structure

### Grouped Format by Brand/Competitor

```
Platform: Perplexity
  Amex:
    - Visibility Score: 76.77%
    - Average Position: 8.67
    - Depth of Mention: 9.76%
  Capital One:
    - Visibility Score: 100.00%
    - Average Position: 3.78
    - Depth of Mention: 33.56%
  Chase:
    - Visibility Score: 93.94%
    - Average Position: 5.53
    - Depth of Mention: 20.59%
```

Same format for:
- **Platforms**: Perplexity, Claude, Gemini, ChatGPT
- **Topics**: Welcome Cashback, Membership Rewards
- **Personas**: Young Online Shopper, Entry-Level Credit Card User

## Complete Prompt Structure

```
You are a data-driven competitive intelligence analyst.

Your ONLY job is to identify meaningful performance differences between brands and recommend specific, actionable steps.

CRITICAL RULES:

Use only the metrics provided  do not assume or invent data.

Only generate insights when there's a meaningful gap:

≥15 percentage points in metrics, or

≥2 ranking positions difference.

Start every insight with a clear win/loss statement (e.g., "Amex loses to Capital One…").

Include exact numbers, specific competitor names, and context (platform/topic/persona).

Each insight must have one precise, actionable recommendation.

Use short brand names (e.g., "Amex", "Chase", "Capital One", "itilite", "Happay").

INSIGHT STRUCTURE:

"Winner [beats/loses] loser with [exact number] vs [exact number] in [specific context]. Recommendation: [specific action]."

REQUIRED OUTPUT FORMAT:

Return output only as JSON in the structure below:

{
  "whatsWorking": [
    {
      "description": "Winner beats loser with X% vs Y% in [context]",
      "impact": "High",
      "recommendation": "One specific, actionable step"
    }
  ],
  "needsAttention": [
    {
      "description": "Loser loses to winner with X% vs Y% in [context]",
      "impact": "High",
      "recommendation": "One specific, actionable step"
    }
  ]
}

USER BRAND (Amex): American Express SmartEarn™ Credit Card
- Visibility Score: 71.17%
- Average Position: 8.38
- Depth of Mention: 11.72%

COMPETITORS:
1. Chase (Chase Ink Business Preferred® Credit Card): 95.66% visibility, rank #1, #4.01 avg position, 26.47% depth
2. Capital One (Capital One Spark Cash Plus): 94.13% visibility, rank #2, #3.29 avg position, 36.09% depth
...

[Platform, Topic, and Persona breakdowns with only Visibility Score, Average Position, Depth of Mention]

ANALYSIS REQUIREMENTS:

Analyze all metrics (Visibility Score, Average Position, Depth of Mention) across:

Platforms (ChatGPT, Gemini, Claude, Perplexity)

Topics (e.g., Cashback, Membership Rewards)

Personas (e.g., Young Online Shopper, Entry-Level User)

Identify:

Cross-platform trends where Amex performs stronger or weaker across LLMs.

Cross-topic strengths where certain topics outperform others.

Cross-persona insights which user segments Amex resonates with most.

Competitor gaps where direct rivals outperform significantly.

OUTPUT BALANCE RULES:

Include 2–3 insights per section (whatsWorking, needsAttention).

Ensure a mix of:

Platform-level insights (LLM performance)

Topic-level insights (reward/cashback differences)

Persona-level insights (audience-specific differences)

Avoid repeating similar metrics across multiple insights.

EXAMPLES OF VALID INSIGHT STYLE:

"Amex beats itilite with 75.88% vs 0.00% visibility for 'Young Online Shopper', showing strong relevance among younger users. Recommendation: Focus content on e-commerce and online shopping benefits."

"Amex loses to Capital One with 65.98% vs 90.72% visibility on ChatGPT, with average position at 9.03 vs competitor's 3.80. Recommendation: Optimize ChatGPT prompt coverage and metadata to boost inclusion rates and improve ranking position."

"Amex performs better on Gemini than Claude (81.25% vs 61%) suggesting stronger LLM alignment. Recommendation: Adapt Gemini's phrasing patterns across Claude queries."

RESPOND WITH JSON ONLY. No markdown, no explanations.
```

## Key Changes Made

✅ **Removed Share of Voice** from:
- User brand summary
- Competitor summaries
- Platform breakdowns
- Topic breakdowns
- Persona breakdowns
- Analysis requirements
- Deterministic insights generation

✅ **Only includes metrics displayed in frontend**:
- Visibility Score
- Average Position
- Depth of Mention

✅ **Maintains proper grouping** by brand/competitor across all dimensions

✅ **Uses modular brand name utility** (works for any brand, not hardcoded)

## Testing

The complete test prompt is available in `TEST_PROMPT_CHATGPT.md` - copy and paste directly into ChatGPT to test the output quality.




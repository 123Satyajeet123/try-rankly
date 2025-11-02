# Example Visibility Insights Prompt

This shows what the actual prompt sent to the LLM looks like with your data.

## Full Prompt Example

```
You are a data-driven competitive intelligence analyst. Your ONLY job is to identify meaningful performance differences and recommend specific actions.

CRITICAL RULES:
1. Use ONLY the metrics provided - do not make assumptions
2. Only create insights if there's a meaningful difference (≥15 percentage points or ≥2 ranking positions)
3. Start each insight with a clear win/loss statement
4. Include exact numbers, specific competitor names, and context
5. Provide one specific, actionable recommendation per insight

MANDATORY INSIGHT STRUCTURE:
"Winner [beats/loses] loser with [exact number] vs [exact number] in [specific context]. Recommendation: [specific action]"

USER BRAND: American Express SmartEarn™ Credit Card
- Visibility: 71.17%
- Share of Voice: 16.58%
- Avg Position: #8.38
- Depth of Mention: 11.72
- Sentiment: 0.04
- Citation Share: 42.57%

COMPETITORS:
1. Chase Ink Business Preferred® Credit Card: 95.66% visibility, rank #1, 28.64% SOV, #4.01 avg position
2. Capital One Spark Cash Plus: 94.13% visibility, rank #2, 54.76% SOV, #3.29 avg position
3. itilite Corporate Card: 0.26% visibility, rank #4, 0.02% SOV, #12 avg position
4. Happay EPIC Card: 0% visibility, rank #5, 0% SOV, #0 avg position

ANALYSIS BASIS:
- 87 prompts tested across 392 LLM responses
- Data represents actual brand mention frequency in AI responses


DETAILED COMPETITIVE ANALYSIS BY DIMENSION:

PLATFORM-SPECIFIC METRICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Platform: Perplexity
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 76.77%
    - Share of Voice: 16.69%
    - Average Position: 8.67
    - Depth of Mention: 9.76
  Capital One Spark Cash Plus:
    - Visibility Score: 100.00%
    - Share of Voice: 60.14%
    - Average Position: 3.78
    - Depth of Mention: 33.56
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 93.94%
    - Share of Voice: 23.11%
    - Average Position: 5.53
    - Depth of Mention: 20.59
  itilite Corporate Card:
    - Visibility Score: 1.01%
    - Share of Voice: 0.06%
    - Average Position: 12.00
    - Depth of Mention: 0.04
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00

Platform: Claude
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 61.00%
    - Share of Voice: 17.60%
    - Average Position: 2.90
    - Depth of Mention: 19.45
  Capital One Spark Cash Plus:
    - Visibility Score: 94.00%
    - Share of Voice: 57.71%
    - Average Position: 1.97
    - Depth of Mention: 58.88
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 91.00%
    - Share of Voice: 24.68%
    - Average Position: 2.77
    - Depth of Mention: 38.70
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00
  itilite Corporate Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00

Platform: Gemini
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 81.25%
    - Share of Voice: 18.24%
    - Average Position: 11.85
    - Depth of Mention: 12.15
  Capital One Spark Cash Plus:
    - Visibility Score: 91.67%
    - Share of Voice: 49.56%
    - Average Position: 3.65
    - Depth of Mention: 33.23
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 98.96%
    - Share of Voice: 32.20%
    - Average Position: 4.47
    - Depth of Mention: 27.67
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00
  itilite Corporate Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00

Platform: ChatGPT
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 65.98%
    - Share of Voice: 13.69%
    - Average Position: 9.03
    - Depth of Mention: 10.13
  Capital One Spark Cash Plus:
    - Visibility Score: 90.72%
    - Share of Voice: 53.84%
    - Average Position: 3.80
    - Depth of Mention: 32.84
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 98.97%
    - Share of Voice: 32.47%
    - Average Position: 3.26
    - Depth of Mention: 26.45
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00
  itilite Corporate Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00

TOPIC-SPECIFIC METRICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Topic: Welcome Cashback
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 68.72%
    - Share of Voice: 13.19%
    - Average Position: 10.03
    - Depth of Mention: 9.60
  Capital One Spark Cash Plus:
    - Visibility Score: 95.38%
    - Share of Voice: 59.25%
    - Average Position: 2.39
    - Depth of Mention: 40.51
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 95.38%
    - Share of Voice: 27.56%
    - Average Position: 3.99
    - Depth of Mention: 26.69
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00
  itilite Corporate Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00

Topic: Membership Rewards
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 73.60%
    - Share of Voice: 19.95%
    - Average Position: 6.86
    - Depth of Mention: 13.66
  Capital One Spark Cash Plus:
    - Visibility Score: 92.89%
    - Share of Voice: 50.30%
    - Average Position: 4.21
    - Depth of Mention: 32.06
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 95.94%
    - Share of Voice: 29.72%
    - Average Position: 4.03
    - Depth of Mention: 26.27
  itilite Corporate Card:
    - Visibility Score: 0.51%
    - Share of Voice: 0.03%
    - Average Position: 12.00
    - Depth of Mention: 0.03
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00

PERSONA-SPECIFIC METRICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Persona: Young Online Shopper
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 75.88%
    - Share of Voice: 16.77%
    - Average Position: 7.90
    - Depth of Mention: 12.12
  Capital One Spark Cash Plus:
    - Visibility Score: 93.97%
    - Share of Voice: 54.06%
    - Average Position: 3.07
    - Depth of Mention: 36.68
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 95.98%
    - Share of Voice: 29.17%
    - Average Position: 3.79
    - Depth of Mention: 28.01
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00
  itilite Corporate Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00

Persona: Entry-Level Credit Card User
  American Express SmartEarn™ Credit Card (Your Brand):
    - Visibility Score: 66.32%
    - Share of Voice: 16.37%
    - Average Position: 8.95
    - Depth of Mention: 11.31
  Capital One Spark Cash Plus:
    - Visibility Score: 94.30%
    - Share of Voice: 55.52%
    - Average Position: 3.52
    - Depth of Mention: 35.49
  Chase Ink Business Preferred® Credit Card:
    - Visibility Score: 95.34%
    - Share of Voice: 28.07%
    - Average Position: 4.24
    - Depth of Mention: 24.88
  itilite Corporate Card:
    - Visibility Score: 0.52%
    - Share of Voice: 0.03%
    - Average Position: 12.00
    - Depth of Mention: 0.03
  Happay EPIC Card:
    - Visibility Score: 0.00%
    - Share of Voice: 0.00%
    - Average Position: 0.00
    - Depth of Mention: 0.00


VISIBILITY ANALYSIS TASK:
You must analyze the grouped metrics above and generate insights comparing the user's brand (American Express SmartEarn™ Credit Card) against competitors across platforms, topics, and personas.

CRITICAL ANALYSIS REQUIREMENTS:
1. Compare ALL metrics (Visibility Score, Share of Voice, Average Position, Depth of Mention) for each brand across each dimension
2. Identify patterns where:
   - The user's brand performs POORLY on specific metrics in certain platforms/topics/personas
   - The user's brand performs WELL on specific metrics in certain platforms/topics/personas
   - Competitors outperform the user's brand on specific metrics in specific contexts
3. Generate insights in the format: "Your brand's [metric] is [poorer/better] in [platform/topic/persona] compared to [competitor name] with [exact numbers]"
4. Example insights:
   - "Your brand's Visibility Score is poorer in Perplexity, Claude, and ChatGPT platforms (76.77%, 61%, 65.98%) compared to Capital One Spark Cash Plus (100%, 94%, 90.72%), but performs better in Gemini (81.25% vs competitor's 91.67%)"
   - "Your brand's Share of Voice is stronger in the 'Welcome Cashback' topic (13.19%) compared to 'Membership Rewards' topic (19.95%)"
   - "Your brand's Average Position needs attention in Perplexity platform (8.67) compared to competitors averaging 3.78-5.53"

Only report differences where gap ≥15 percentage points or ≥2 ranking positions for meaningful insights.

Focus on:
- Cross-platform comparisons (where your brand underperforms/overperforms)
- Cross-topic comparisons (which topics show strengths/weaknesses)
- Cross-persona comparisons (which user personas show better/worse visibility)
- Metric-specific insights (e.g., visibility is fine but depth of mention is low)

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations.

{
  "whatsWorking": [
    {
      "description": "Winner beats loser with X% vs Y% in [context]",
      "impact": "High",
      "recommendation": "One specific, actionable next step"
    }
  ],
  "needsAttention": [
    {
      "description": "Loser loses to winner with X% vs Y% in [context]",
      "impact": "High",
      "recommendation": "One specific, actionable next step"
    }
  ]
}

EXACT REQUIRED FORMAT:
- description: "BrandName beats/loses CompetitorName with [number]% vs [number]% in [specific area]"
- impact: "High" (only use High for meaningful differences meeting thresholds)
- recommendation: "One specific action to take"

EXAMPLES:
✓ "AcmeBank beats Chase with 82% vs 61% visibility in business banking topics. Recommendation: Double down on content in business banking areas."
✓ "WellsFargo beats AcmeBank with 67% vs 41% visibility on mobile platforms. Recommendation: Optimize mobile content and keyword targeting for AI responses."
✓ "AcmeBank ranks #2.3 vs Bank of America's #4.1 in investment advice. Recommendation: Enhance investment-related content to maintain ranking advantage."

RULES:
- Only create insights where differences meet thresholds (≥15% or ≥2 positions or ≥0.2 sentiment)
- Use exact numbers from data provided
- Name specific competitors
- One concrete recommendation per insight
- 2-3 insights per category maximum

RESPOND WITH JSON ONLY.
```

## Summary

The prompt now:

1. ✅ **Groups metrics properly**: Each brand/competitor shows all 4 metrics together
2. ✅ **Organizes by dimension**: Clear separation of Platform, Topic, and Persona data
3. ✅ **Provides context**: Shows exact numbers for comparison
4. ✅ **Guides analysis**: Specific instructions on what patterns to identify
5. ✅ **Focuses on actionable insights**: Emphasis on cross-dimensional comparisons

The LLM will now generate insights like:
- "Your brand's Visibility Score is poorer in these three platforms but does well in this platform for these two topics"
- "Your brand's Average Position needs attention in Perplexity platform compared to competitors"
- "Your brand's Share of Voice is stronger in 'Membership Rewards' topic compared to 'Welcome Cashback' topic"

This structure ensures the AI can make meaningful cross-dimensional comparisons and provide actionable recommendations.



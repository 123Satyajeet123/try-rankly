# Visibility Tab Performance Insights - Documentation

## Overview
This document explains how the Performance Insights for the Visibility Tab work, including the data structure and prompt format.

## Data Grouping Structure

The metrics are now properly grouped by brand/competitor across three dimensions:
1. **Platform** (Perplexity, Claude, Gemini, ChatGPT)
2. **Topic** (Welcome Cashback, Membership Rewards, etc.)
3. **Persona** (Young Online Shopper, Entry-Level Credit Card User, etc.)

### Metrics Per Brand/Competitor
For each brand (your brand + competitors), we capture:
- **Visibility Score** (0-100%)
- **Share of Voice** (0-100%)
- **Average Position** (numerical rank)
- **Depth of Mention** (0-100%)

## Example Data Structure

### Platform Breakdown Format
```
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
```

### Topic Breakdown Format
```
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
```

### Persona Breakdown Format
```
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
```

## Updated Prompt Structure

The prompt now includes:

### 1. Base User Brand & Competitor Info
```
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
...
```

### 2. Grouped Metrics by Dimension
(See examples above for Platform, Topic, and Persona breakdowns)

### 3. Enhanced Analysis Task Instructions
```
VISIBILITY ANALYSIS TASK:
You must analyze the grouped metrics above and generate insights comparing the user's brand against competitors across platforms, topics, and personas.

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
```

### 4. Expected Output Format
```json
{
  "whatsWorking": [
    {
      "description": "Winner beats loser with X% vs Y% in [specific context with platform/topic/persona]",
      "impact": "High",
      "recommendation": "One specific, actionable next step"
    }
  ],
  "needsAttention": [
    {
      "description": "Loser loses to winner with X% vs Y% in [specific context with platform/topic/persona]",
      "impact": "High",
      "recommendation": "One specific, actionable next step"
    }
  ]
}
```

## Example Insights Output

### What's Working
```json
{
  "description": "Your brand's Visibility Score performs better in Gemini platform (81.25%) compared to ChatGPT (65.98%), showing strength in Google's AI ecosystem. This outperforms Capital One Spark Cash Plus in Gemini by maintaining competitive visibility.",
  "impact": "High",
  "recommendation": "Double down on content optimization for Gemini platform and replicate successful strategies across other platforms."
}
```

### Needs Attention
```json
{
  "description": "Your brand's Visibility Score is poorer in Perplexity, Claude, and ChatGPT platforms (76.77%, 61%, 65.98%) compared to Capital One Spark Cash Plus (100%, 94%, 90.72%), indicating significant platform-specific visibility gaps.",
  "impact": "High",
  "recommendation": "Review content strategy for Perplexity, Claude, and ChatGPT platforms - focus on keyword optimization and mention depth improvements to close the 23-38% visibility gap."
}
```

## Key Improvements

1. ✅ **Proper Metric Grouping**: Metrics are now grouped by brand/competitor across all dimensions
2. ✅ **All Metrics Included**: Visibility Score, Share of Voice, Average Position, and Depth of Mention are all captured
3. ✅ **Dimension-Specific Analysis**: Clear breakdown by Platform, Topic, and Persona
4. ✅ **Enhanced Prompt**: More specific instructions for generating cross-dimensional insights
5. ✅ **Actionable Insights**: Focus on "what's working" and "needs attention" with specific recommendations

## Implementation Details

The changes were made in:
- `backend/src/services/insightsService.js`
  - Updated `getTopicBreakdown()` to include all metrics
  - Updated `getPersonaBreakdown()` to include all metrics
  - Updated `getPlatformBreakdown()` to include all metrics
  - Enhanced `getVisibilityPromptData()` to format grouped metrics
  - Improved visibility analysis task instructions in `generatePrompt()`

## Next Steps

1. Test the insights generation with real data
2. Verify the prompt produces clear, actionable insights
3. Monitor the quality of generated insights and adjust thresholds if needed
4. Consider adding more context about why certain platforms/topics/personas matter




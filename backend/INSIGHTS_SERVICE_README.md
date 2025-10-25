# Insights Service - Performance Insights System

## Overview

The Insights Service generates AI-powered insights for dashboard tabs (Visibility, Prompts, Sentiment, Citations) using GPT-4o mini via OpenRouter API.

## Features

- **Automatic Data Collection**: Collects and structures metrics from AggregatedMetrics
- **Smart Caching**: 24-hour cache to avoid redundant LLM calls
- **Tab-Specific Analysis**: Tailored insights for each dashboard tab
- **OpenRouter Integration**: Uses GPT-4o mini for cost-effective insights

## Setup

1. **Environment Variables**:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

2. **Database**: Uses existing AggregatedMetrics model (extended with insights scope)

## API Endpoints

### Generate Insights
```bash
POST /api/insights/generate
Content-Type: application/json
x-user-id: your-user-id

{
  "tabType": "visibility",
  "urlAnalysisId": "optional-analysis-id"
}
```

### Get Stored Insights
```bash
GET /api/insights/visibility?urlAnalysisId=optional-id
x-user-id: your-user-id
```

### Test Data Collection
```bash
GET /api/insights/test/data-collection?tabType=visibility
x-user-id: your-user-id
```

### Test Prompt Generation
```bash
GET /api/insights/test/prompt?tabType=visibility
x-user-id: your-user-id
```

## Testing

### Quick Test
```bash
# Start backend server
npm run dev

# Run test script
node test-insights.js
```

### Manual Testing
```bash
# 1. Test data collection
curl -H "x-user-id: your-user-id" \
  "http://localhost:5000/api/insights/test/data-collection?tabType=visibility"

# 2. Test prompt generation
curl -H "x-user-id: your-user-id" \
  "http://localhost:5000/api/insights/test/prompt?tabType=visibility"

# 3. Generate insights (calls OpenRouter)
curl -X POST -H "x-user-id: your-user-id" -H "Content-Type: application/json" \
  -d '{"tabType":"visibility"}' \
  "http://localhost:5000/api/insights/generate"

# 4. Retrieve stored insights
curl -H "x-user-id: your-user-id" \
  "http://localhost:5000/api/insights/visibility"
```

## Data Structure

### Input Data (Visibility Tab)
```javascript
{
  userBrand: {
    name: "Your Brand",
    visibilityScore: 45.2,
    shareOfVoice: 23.1,
    averagePosition: 2.3,
    depthOfMention: 67.8,
    totalMentions: 156,
    sentimentScore: 0.3,
    citationShare: 12.5
  },
  competitors: [
    {
      name: "Competitor A",
      visibilityScore: 52.1,
      shareOfVoice: 28.4,
      averagePosition: 1.8,
      rank: 1,
      sentimentScore: 0.4,
      citationShare: 18.2
    }
  ],
  topicBreakdown: [
    {
      topic: "AI Technology",
      userScore: 38.5,
      competitorScores: [
        { name: "Competitor A", score: 45.2 }
      ]
    }
  ],
  personaBreakdown: [
    {
      persona: "Tech Enthusiast",
      userScore: 42.1,
      competitorScores: [
        { name: "Competitor A", score: 48.7 }
      ]
    }
  ],
  platformBreakdown: [
    {
      platform: "OpenAI",
      userScore: 35.8,
      competitorScores: [
        { name: "Competitor A", score: 41.2 }
      ]
    }
  ]
}
```

### Output Insights
```javascript
{
  tabType: "visibility",
  whatsWorking: [
    {
      title: "Strong Topic Performance",
      description: "Your brand shows exceptional visibility in AI Technology topics",
      metric: "Topic Visibility",
      value: "38.5%",
      impact: "High",
      recommendation: "Leverage this strength by creating more AI-focused content"
    }
  ],
  needsAttention: [
    {
      title: "Platform Gap",
      description: "Lower visibility on OpenAI compared to competitors",
      metric: "Platform Visibility",
      value: "35.8%",
      impact: "Medium",
      recommendation: "Optimize prompts for OpenAI's specific requirements"
    }
  ],
  generatedAt: "2024-01-15T10:30:00Z"
}
```

## Implementation Notes

1. **Caching**: Insights are cached for 24 hours to avoid redundant LLM calls
2. **Error Handling**: Falls back to basic insights if LLM parsing fails
3. **Data Validation**: Ensures required metrics exist before generating insights
4. **Cost Optimization**: Uses GPT-4o mini for cost-effective analysis

## Next Steps

1. Test with real user data
2. Tune the prompt for better insights
3. Add support for other tabs (Prompts, Sentiment, Citations)
4. Integrate with frontend dashboard
5. Add insights refresh functionality


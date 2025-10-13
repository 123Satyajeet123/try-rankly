# Subjective Metrics Backend Implementation

## Overview

This implementation evaluates brand citations in LLM responses using **GPT-4o** across 6 qualitative dimensions in a **single API call**.

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Request                        │
│         POST /api/subjective-metrics/evaluate               │
│         { promptTestId, brandName }                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Route Layer                          │
│              routes/subjectiveMetrics.js                     │
│  - Authentication                                            │
│  - Validation                                                │
│  - Authorization                                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│           services/subjectiveMetricsService.js               │
│  1. Fetch PromptTest data                                    │
│  2. Extract brand citation context                           │
│  3. Build unified evaluation prompt                          │
│  4. Call GPT-4o API                                          │
│  5. Parse & validate JSON response                           │
│  6. Save to database                                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│              models/SubjectiveMetrics.js                     │
│  - Store metrics (1-5 scores + reasoning)                    │
│  - Index for fast retrieval                                  │
│  - Aggregate statistics                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### SubjectiveMetrics Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // User who owns this
  promptTestId: ObjectId,         // Reference to PromptTest
  promptId: ObjectId,             // Reference to Prompt
  urlAnalysisId: ObjectId,        // Reference to UrlAnalysis
  
  brandName: String,              // Brand being evaluated
  platform: String,               // 'openai', 'gemini', 'claude', 'perplexity'
  
  // 6 Subjective Metrics (1-5 scale)
  relevance: {
    score: Number,                // 1-5
    reasoning: String             // Explanation
  },
  influence: {
    score: Number,
    reasoning: String
  },
  uniqueness: {
    score: Number,
    reasoning: String
  },
  position: {
    score: Number,
    reasoning: String
  },
  clickProbability: {
    score: Number,
    reasoning: String
  },
  diversity: {
    score: Number,
    reasoning: String
  },
  
  // Overall Assessment
  overallQuality: {
    score: Number,                // 1-5
    summary: String               // 2-3 sentence summary
  },
  
  // Metadata
  evaluatedAt: Date,
  model: String,                  // 'gpt-4o'
  tokensUsed: Number,
  evaluationTime: Number,         // milliseconds
  cost: Number,                   // USD
  
  // Source Data (for reference)
  sourceData: {
    query: String,
    answer: String,
    citationText: String,
    sourceUrl: String,
    citationNumber: Number,
    answerLength: Number,
    totalCitations: Number
  },
  
  status: String,                 // 'completed', 'failed'
  errorMessage: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
// Compound indexes for efficient querying
{ userId: 1, promptTestId: 1 }
{ promptId: 1, brandName: 1 }
{ userId: 1, evaluatedAt: -1 }
{ brandName: 1, platform: 1 }
```

---

## API Endpoints

### 1. Evaluate Metrics

**Endpoint:** `POST /api/subjective-metrics/evaluate`

**Description:** Generate subjective metrics for a specific prompt test and brand

**Request:**
```json
{
  "promptTestId": "507f1f77bcf86cd799439011",
  "brandName": "Stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subjectiveMetricsId": "507f1f77bcf86cd799439012",
    "metrics": {
      "relevance": {
        "score": 5,
        "reasoning": "Directly addresses payment processing query..."
      },
      "influence": {
        "score": 5,
        "reasoning": "Critical to answer, provides main solution..."
      },
      "uniqueness": {
        "score": 4,
        "reasoning": "Unique API features mentioned..."
      },
      "position": {
        "score": 5,
        "reasoning": "Prominently placed at start of answer..."
      },
      "clickProbability": {
        "score": 5,
        "reasoning": "High value proposition, likely to click..."
      },
      "diversity": {
        "score": 3,
        "reasoning": "Focused on payment processing..."
      },
      "overallQuality": {
        "score": 4.5,
        "summary": "Excellent citation with high relevance..."
      }
    },
    "cached": false
  },
  "message": "Metrics evaluated successfully"
}
```

**Error Responses:**
- `400` - Invalid request (missing fields)
- `401` - Unauthorized (invalid token)
- `404` - PromptTest not found
- `500` - Evaluation failed (GPT-4o error, parsing error, etc.)

---

### 2. Get Existing Metrics

**Endpoint:** `GET /api/subjective-metrics/:promptTestId?brandName=<name>`

**Description:** Retrieve existing metrics for a prompt test

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [...],
    "lastEvaluated": "2024-10-12T10:30:00Z"
  }
}
```

---

### 3. Batch Evaluation

**Endpoint:** `POST /api/subjective-metrics/batch`

**Description:** Evaluate multiple prompt tests at once

**Request:**
```json
{
  "promptTestIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "brandName": "Stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      { "promptTestId": "...", "success": true, "metrics": {...} },
      { "promptTestId": "...", "success": true, "metrics": {...} }
    ],
    "errors": [],
    "summary": {
      "totalEvaluated": 3,
      "avgScores": {
        "relevance": 4.3,
        "influence": 4.7,
        "uniqueness": 3.5,
        "position": 4.2,
        "clickProbability": 4.5,
        "diversity": 3.8,
        "overallQuality": 4.2
      }
    }
  },
  "message": "Evaluated 3/3 tests"
}
```

---

### 4. Get Prompt Metrics

**Endpoint:** `GET /api/subjective-metrics/prompt/:promptId?brandName=<name>`

**Description:** Get all metrics for a prompt across all platforms

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [...],
    "summary": {
      "avgScores": {...},
      "evaluationCount": 4,
      "lastEvaluated": "2024-10-12T10:30:00Z",
      "platforms": ["openai", "gemini", "claude", "perplexity"]
    }
  }
}
```

---

### 5. Get Summary

**Endpoint:** `GET /api/subjective-metrics/summary/:userId`

**Description:** Get summary statistics for all user evaluations

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvaluations": 50,
    "avgScores": {
      "relevance": 4.2,
      "influence": 4.5,
      "uniqueness": 3.8,
      "position": 4.1,
      "clickProbability": 4.3,
      "diversity": 3.9,
      "overallQuality": 4.1
    },
    "platforms": ["openai", "gemini", "claude", "perplexity"],
    "brands": ["Stripe", "Square", "PayPal"],
    "lastEvaluated": "2024-10-12T10:30:00Z"
  }
}
```

---

### 6. Delete Metrics

**Endpoint:** `DELETE /api/subjective-metrics/:metricsId`

**Description:** Delete metrics (for re-evaluation)

---

## GPT-4o Prompt Structure

### Unified Evaluation Prompt

```markdown
You are an expert evaluator analyzing citations in AI-generated answers.

TASK: Evaluate the brand "[Brand Name]" across 6 qualitative dimensions.

USER QUERY:
[Original user query]

GENERATED ANSWER:
[Full LLM response with citations]

BRAND CITATION DETAILS:
- Brand: [Brand Name]
- Position: Appears at position X in the answer
- Mention Count: X times
- Citations Present: X total citations
- Citation Text: "[Relevant excerpt]"
- Source URL: [URL if available]

EVALUATION DIMENSIONS (score each 1-5):

1. RELEVANCE (1-5)
   How well does this brand citation address the user's query?
   Consider: completeness, precision, clarity, usefulness
   1 = Not relevant, 5 = Highly relevant

2. INFLUENCE (1-5)
   How much does the answer depend on this brand citation?
   Consider: contribution to completeness, coherence, quality
   1 = No influence, 5 = Critical to answer

3. UNIQUENESS (1-5)
   How unique is this brand's information vs other sources?
   Consider: distinct insights, non-redundant content
   1 = Completely redundant, 5 = Completely unique

4. POSITION (1-5)
   How prominently is this brand positioned in the answer?
   Consider: placement, likelihood user encounters it
   1 = Not visible, 5 = Highly prominent

5. CLICK_PROBABILITY (1-5)
   Would users click this brand citation for more info?
   Consider: engagement, interest, value proposition
   1 = No interest, 5 = High likelihood to click

6. DIVERSITY (1-5)
   Range of ideas/topics contributed by this brand?
   Consider: breadth, balance, comprehensiveness
   1 = Single narrow point, 5 = Wide-ranging insights

Respond ONLY with valid JSON in this EXACT format:
{
  "relevance": { "score": 1-5, "reasoning": "..." },
  "influence": { "score": 1-5, "reasoning": "..." },
  "uniqueness": { "score": 1-5, "reasoning": "..." },
  "position": { "score": 1-5, "reasoning": "..." },
  "click_probability": { "score": 1-5, "reasoning": "..." },
  "diversity": { "score": 1-5, "reasoning": "..." },
  "overall_quality": { "score": 1-5, "summary": "..." }
}
```

### GPT-4o Configuration

```javascript
{
  model: 'gpt-4o',
  temperature: 0.3,           // Lower for consistency
  max_tokens: 1200,
  response_format: {
    type: 'json_object'       // Enforce JSON output
  }
}
```

---

## Testing

### Prerequisites

1. MongoDB running with test data
2. OpenAI API key in `.env`
3. Completed PromptTest records with brand mentions

### Step 1: Find a Test Prompt

```bash
node src/scripts/findTestPrompt.js
```

Output:
```
✅ Found 15 tests with brand mentions

TOP 5 TESTS FOR SUBJECTIVE METRICS EVALUATION:
==================================================

1. PromptTest ID: 507f1f77bcf86cd799439011
   Platform: openai
   Query: What are the best payment processors for SaaS...
   Top Brand: Stripe
   - Mentions: 3
   - Position: 2
   - Citations: 2
   
   💡 Test Command:
   node src/scripts/testSubjectiveMetrics.js 507f1f77bcf86cd799439011 "Stripe"
```

### Step 2: Run Evaluation Test

```bash
node src/scripts/testSubjectiveMetrics.js 507f1f77bcf86cd799439011 "Stripe"
```

Expected Output:
```
=======================================================================
🎯 [SubjectiveMetrics] Starting evaluation
   PromptTest: 507f1f77bcf86cd799439011
   Brand: Stripe
=======================================================================

✅ [SubjectiveMetrics] Prompt test loaded
   Platform: openai
   Query: What are the best payment processors for SaaS...

✅ [SubjectiveMetrics] Brand citation found
   Position: 2
   Citations: 2

✅ [SubjectiveMetrics] Evaluation prompt built (2547 chars)

✅ [SubjectiveMetrics] GPT-4o evaluation complete
   Tokens: 850
   Cost: $0.0068

✅ [SubjectiveMetrics] Metrics parsed and validated
   📊 Scores:
      Relevance: 5/5
      Influence: 5/5
      Uniqueness: 4/5
      Position: 5/5
      Click Probability: 5/5
      Diversity: 3/5
      Overall Quality: 4.5/5

✅ [SubjectiveMetrics] Evaluation complete in 3200ms
=======================================================================

✅ Full results saved to: ./test-metrics-output.json
```

### Step 3: Verify in Database

```bash
mongosh
> use rankly
> db.subjectivemetrics.find().pretty()
```

---

## Performance Metrics

### Expected Performance

| Metric | Value |
|--------|-------|
| API Call Time | 2-4 seconds |
| Cost per Evaluation | $0.005-0.008 |
| Tokens Used | 800-1000 |
| Accuracy | 90%+ consistency |
| Throughput | 100 evals/min |

### Cost Comparison

| Approach | Cost/Eval | Time | Tokens |
|----------|-----------|------|--------|
| **6 Separate Calls** | $0.036 | 15-20s | ~4500 |
| **Unified (1 call)** | $0.007 | 3-5s | ~900 |
| **Savings** | **81%** | **75%** | **80%** |

---

## Error Handling

### Common Errors

1. **Brand Not Found**
   ```json
   {
     "success": false,
     "message": "Brand \"XYZ\" not found in response"
   }
   ```

2. **Invalid JSON Response**
   ```json
   {
     "success": false,
     "message": "Invalid JSON response from GPT-4o"
   }
   ```

3. **Validation Failed**
   ```json
   {
     "success": false,
     "message": "Invalid score for relevance: 6 (must be 1-5)"
   }
   ```

4. **Already Evaluated**
   ```json
   {
     "success": true,
     "data": { "cached": true, ... },
     "message": "Metrics already evaluated"
   }
   ```

---

## Monitoring & Logging

### Log Format

```
🎯 [SubjectiveMetrics] Starting evaluation
   PromptTest: [ID]
   Brand: [Name]

✅ [SubjectiveMetrics] Prompt test loaded
   Platform: [openai/gemini/claude/perplexity]
   Query: [First 100 chars]

✅ [SubjectiveMetrics] Brand citation found
   Position: [Number]
   Citations: [Count]

✅ [SubjectiveMetrics] GPT-4o evaluation complete
   Tokens: [Count]
   Cost: $[Amount]

✅ [SubjectiveMetrics] Evaluation complete in [ms]
```

### Metrics to Monitor

- ✅ Success rate
- ✅ Average response time
- ✅ Average cost per evaluation
- ✅ Average scores by metric
- ✅ Error rates by type
- ✅ GPT-4o API latency

---

## Deployment

### Environment Variables Required

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/rankly

# OpenAI
OPENAI_API_KEY=sk-...

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=5000
NODE_ENV=production
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB indexes created
- [ ] OpenAI API key valid
- [ ] Rate limiting configured
- [ ] Error monitoring setup
- [ ] Cost alerts configured
- [ ] Tested with production data

---

## Future Enhancements

1. **Caching Layer**
   - Redis cache for frequently accessed metrics
   - Reduce DB queries

2. **Batch Optimization**
   - Parallel GPT-4o calls for batch requests
   - Queue system for large batches

3. **Confidence Scores**
   - Add confidence intervals for each metric
   - Flag low-confidence evaluations

4. **Trend Analysis**
   - Track metric changes over time
   - Identify improving/declining citations

5. **Custom Prompts**
   - Allow users to customize evaluation criteria
   - Industry-specific metrics

---

## Support

For issues or questions:
- Check logs in console output
- Review `test-metrics-output.json` for detailed results
- Verify PromptTest data structure
- Ensure OpenAI API key is valid

---

**Version:** 1.0.0  
**Last Updated:** October 12, 2025  
**Status:** Ready for Testing 🚀


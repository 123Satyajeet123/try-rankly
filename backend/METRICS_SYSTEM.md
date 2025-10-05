# Deterministic Metrics Calculation System

## Overview

This document describes the deterministic metrics extraction and aggregation system for calculating AEO (Answer Engine Optimization) performance metrics.

## Problem Statement

The original approach used an LLM to generate scorecards, which had several issues:
1. **Probabilistic results** - Different runs would generate different scores
2. **Lack of accuracy** - LLMs might hallucinate or miscount
3. **Cost** - Extra LLM calls for each scorecard
4. **Unreliable comparisons** - Can't compare metrics over time reliably

## Solution: Deterministic Extraction + Mathematical Calculation

Instead of asking an LLM to calculate metrics, we:
1. **Extract structured data** from LLM responses using deterministic parsing
2. **Calculate metrics mathematically** using precise formulas
3. **Store granular data** for detailed analysis
4. **Aggregate across dimensions** (overall, platform, topic, persona)

---

## Architecture

### 1. Data Flow

```
Prompt → 4 LLMs → Raw Responses
                      ↓
            Deterministic Extraction
                      ↓
              Brand Mentions + Positions
                      ↓
         Mathematical Metric Calculation
                      ↓
              Store in Database
                      ↓
          Aggregation Service
                      ↓
        Dashboard API Endpoints
```

### 2. Database Models

#### PromptTest (Enhanced)
Stores individual test results with extracted metrics:
```javascript
{
  userId: ObjectId,
  promptId: ObjectId,
  promptText: String,
  llmProvider: 'chatgpt' | 'perplexity' | 'claude' | 'gemini',
  rawResponse: String,

  // NEW: Deterministic extraction results
  brandMetrics: [
    {
      brandName: String,
      mentioned: Boolean,
      firstPosition: Number,        // 1-indexed position of first mention
      mentionCount: Number,
      sentences: [{
        text: String,
        position: Number,            // 0-indexed sentence position
        wordCount: Number
      }],
      totalWordCount: Number
    }
  ]
}
```

#### AggregatedMetrics (New)
Stores aggregated metrics across different scopes:
```javascript
{
  userId: ObjectId,
  scope: 'overall' | 'platform' | 'topic' | 'persona' | 'prompt',
  scopeValue: String,               // e.g., 'chatgpt', 'Landing Pages'

  dateFrom: Date,
  dateTo: Date,

  totalPrompts: Number,
  totalResponses: Number,
  totalBrands: Number,

  brandMetrics: [
    {
      brandId: String,
      brandName: String,

      // Metrics with ranks
      visibilityScore: Number,      // % of prompts where brand appears
      visibilityRank: Number,

      wordCount: Number,             // % of total words
      wordCountRank: Number,

      depthOfMention: Number,        // Weighted by position
      depthRank: Number,

      shareOfVoice: Number,          // % of total mentions
      shareOfVoiceRank: Number,

      avgPosition: Number,           // Average first-mention position
      avgPositionRank: Number,

      count1st: Number,              // Times mentioned first
      count2nd: Number,
      count3rd: Number,
      rank1st: Number,
      rank2nd: Number,
      rank3rd: Number
    }
  ],

  lastCalculated: Date,
  promptTestIds: [String]
}
```

---

## Metrics Formulas

### 1. Visibility Score

**Definition**: Percentage of prompts where a brand appears

**Formula**:
```
VisibilityScore(brand) = (# of prompts where brand appears / Total prompts) × 100
```

**Scope Variations**:
- **Overall**: Across all prompts and platforms
- **Platform**: `VisibilityScore(brand, platform) = (appearances on platform / total prompts on platform) × 100`
- **Topic**: `VisibilityScore(brand, topic) = (appearances in topic / total prompts in topic) × 100`
- **Persona**: `VisibilityScore(brand, persona) = (appearances for persona / total prompts for persona) × 100`

---

### 2. Word Count

**Definition**: Percentage of total words dedicated to a brand

**Formula**:
```
WordCount(brand) = (Σ words in sentences mentioning brand / Σ total words in all responses) × 100
```

**Implementation**:
1. For each response, identify sentences containing the brand
2. Count words in those sentences
3. Sum across all responses
4. Divide by total words across all responses

---

### 3. Depth of Mention

**Definition**: Word count weighted by position (earlier mentions weighted higher)

**Formula**:
```
Depth(brand) = (Σ [words × exp(-position/totalSentences)] / Σ total words) × 100
```

Where:
- `position` = 0-indexed sentence position in response
- `totalSentences` = total number of sentences in that response
- `exp(-x)` = exponential decay function

**Rationale**: Mentions earlier in the response are more valuable (users see them first)

---

### 4. Share of Voice

**Definition**: Percentage of total brand mentions across all responses

**Formula**:
```
ShareOfVoice(brand) = (Total mentions of brand / Total mentions of all brands) × 100
```

**Example**:
- Brand A: 50 mentions
- Brand B: 30 mentions
- Brand C: 20 mentions
- Total: 100 mentions
- ShareOfVoice(A) = 50/100 × 100 = 50%

---

### 5. Average Position

**Definition**: Average position where brand first appears

**Formula**:
```
AvgPosition(brand) = Σ first-mention positions / # of appearances
```

**Note**: Lower is better (1 = mentioned first)

---

### 6. Position Distribution (1st, 2nd, 3rd)

**Definition**: Count how many times a brand is mentioned 1st, 2nd, or 3rd

**Formula**:
```
Count1st(brand) = # of prompts where brand is mentioned first
Count2nd(brand) = # of prompts where brand is mentioned second
Count3rd(brand) = # of prompts where brand is mentioned third
```

**Ranking**: Brands are ranked by each count separately

---

## Services

### 1. MetricsExtractionService

**Purpose**: Extract structured data from LLM responses

**Key Methods**:
- `extractMetrics(response, brandNames)` - Parse response and extract brand mentions
- `splitIntoSentences(text)` - Split text into sentences
- `containsBrand(sentence, brandName)` - Check if sentence mentions brand (with word boundaries)
- `calculateDepthOfMention()` - Apply exponential decay formula
- `rankBrands()` - Assign ranks based on metric values

**Deterministic Guarantees**:
- Same input always produces same output
- No LLM calls (pure parsing)
- Explicit word boundary matching (prevents partial matches)

---

### 2. MetricsAggregationService

**Purpose**: Calculate and store aggregated metrics

**Key Methods**:
- `calculateAllMetrics(userId, options)` - Calculate all scopes
- `calculateOverallMetrics()` - Overall aggregation
- `calculatePlatformMetrics()` - Per-LLM aggregation
- `calculateTopicMetrics()` - Per-topic aggregation
- `calculatePersonaMetrics()` - Per-persona aggregation

**Process**:
1. Fetch all completed PromptTests in date range
2. Group by scope (overall, platform, topic, persona)
3. Accumulate raw counts (appearances, mentions, words, positions)
4. Calculate percentages and weighted metrics
5. Assign ranks
6. Store in AggregatedMetrics collection

---

## API Endpoints

### POST `/api/metrics/calculate`

Calculate and store all metrics for a user.

**Request**:
```json
{
  "dateFrom": "2025-10-01",
  "dateTo": "2025-10-31",
  "forceRefresh": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Calculated 12 metric sets",
  "data": {
    "overall": {...},
    "platforms": [...],
    "topics": [...],
    "personas": [...],
    "totalCalculations": 12
  }
}
```

---

### GET `/api/metrics/overall`

Get overall metrics (all prompts, all platforms).

**Response**:
```json
{
  "success": true,
  "data": {
    "scope": "overall",
    "dateFrom": "2025-10-01",
    "dateTo": "2025-10-31",
    "totalPrompts": 50,
    "totalBrands": 5,
    "brandMetrics": [
      {
        "brandName": "Fibr",
        "visibilityScore": 24.5,
        "visibilityRank": 5,
        "shareOfVoice": 15.2,
        "avgPosition": 2.8,
        ...
      }
    ]
  }
}
```

---

### GET `/api/metrics/platform/:platform`

Get metrics for a specific platform (chatgpt, claude, perplexity, gemini).

---

### GET `/api/metrics/topic/:topic`

Get metrics for a specific topic.

---

### GET `/api/metrics/persona/:persona`

Get metrics for a specific persona.

---

### GET `/api/metrics/dashboard`

Get all metrics formatted for dashboard display.

**Response**:
```json
{
  "success": true,
  "data": {
    "overall": {
      "scope": "overall",
      "summary": {
        "totalPrompts": 50,
        "totalBrands": 5,
        "userBrand": {
          "name": "Fibr",
          "visibilityScore": 24.5,
          "visibilityRank": 5,
          "shareOfVoice": 15.2,
          "avgPosition": 2.8
        }
      },
      "brandMetrics": [...]
    },
    "platforms": [...],
    "topics": [...],
    "personas": [...],
    "lastUpdated": "2025-10-05T10:30:00Z"
  }
}
```

---

## Usage Flow

### 1. Run Prompt Tests

```bash
POST /api/prompts/test
```

This will:
1. Fetch user prompts
2. Send to 4 LLMs (ChatGPT, Claude, Perplexity, Gemini)
3. Extract metrics deterministically (NEW)
4. Store in PromptTest collection

### 2. Calculate Aggregated Metrics

```bash
POST /api/metrics/calculate
{
  "dateFrom": "2025-10-01",
  "dateTo": "2025-10-31"
}
```

This will:
1. Fetch all PromptTests in date range
2. Calculate overall, platform, topic, and persona metrics
3. Store in AggregatedMetrics collection
4. Return summary

### 3. Display in Dashboard

```bash
GET /api/metrics/dashboard
```

The frontend can then display:
- Visibility Score charts
- Share of Voice donut charts
- Average Position bar charts
- Topic/Persona rankings
- Platform comparisons

---

## Migration Path

### Phase 1: Parallel Testing (Current)

- Keep existing LLM scorecard system
- Add deterministic extraction alongside
- Compare results
- Validate accuracy

### Phase 2: Gradual Rollout

- Use deterministic metrics for new tests
- Re-calculate historical data
- Update dashboard to use new metrics

### Phase 3: Full Migration

- Remove LLM scorecard generation
- Use only deterministic extraction
- Cost savings + reliability gains

---

## Advantages

1. **Deterministic**: Same input → same output, every time
2. **Accurate**: Mathematical calculations, no hallucinations
3. **Cost-effective**: No extra LLM calls for scoring
4. **Granular**: Store sentence-level data for detailed analysis
5. **Flexible**: Easy to add new metrics or change formulas
6. **Comparable**: Reliable comparisons across time periods
7. **Debuggable**: Can trace exactly how metrics were calculated

---

## Future Enhancements

1. **Advanced NLP**: Use proper sentence tokenization libraries
2. **Semantic matching**: Account for brand variations (e.g., "Apple Inc" vs "Apple")
3. **Citation tracking**: Extract and track citations/links
4. **Sentiment analysis**: Add sentiment scores for brand mentions
5. **Real-time updates**: Calculate metrics incrementally as tests complete
6. **Historical trends**: Track metric changes over time
7. **Competitor benchmarking**: Compare against industry averages

---

## Testing

### Unit Tests

Test individual extraction functions:
```javascript
describe('MetricsExtractionService', () => {
  it('should correctly extract brand mentions', () => {
    const response = "Apple is great. Google is good. Apple is the best."
    const brands = ['Apple', 'Google']
    const metrics = service.extractMetrics(response, brands)

    expect(metrics.brandMetrics[0].mentionCount).toBe(2)
    expect(metrics.brandMetrics[1].mentionCount).toBe(1)
  })
})
```

### Integration Tests

Test full calculation flow:
```javascript
describe('Metrics Aggregation', () => {
  it('should calculate correct visibility scores', async () => {
    // Create test data
    // Run aggregation
    // Verify results
  })
})
```

---

## Monitoring

Key metrics to monitor:
1. **Calculation time**: How long does aggregation take?
2. **Data volume**: How many tests are being processed?
3. **Accuracy**: Spot-check calculated metrics
4. **API performance**: Response times for metrics endpoints

---

## Support

For questions or issues, contact the development team or refer to:
- Main README: `/backend/README.md`
- API Documentation: `/backend/API.md`
- Database Schema: `/backend/SCHEMA.md`

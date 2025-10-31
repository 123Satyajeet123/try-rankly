# Topic Generation Flow During AI Brand Analysis

## Overview
Topics are automatically generated during the website analysis step when a user submits their website URL. The system uses **Perplexity AI** to analyze website content and extract 6-8 relevant topics for content marketing.

## Complete Flow

### Step 1: User Submits Website URL
**Location:** `app/onboarding/website/page.tsx` (lines 35-97)

User enters their website URL and clicks "Analyze Website". The frontend calls:
```javascript
const response = await apiService.analyzeWebsite(url)
```

### Step 2: Backend Receives Analysis Request
**Location:** `backend/src/services/websiteAnalysisService.js`

The backend performs a multi-step analysis:
1. Scrapes the website content
2. Extracts brand context
3. Finds competitors
4. **Extracts topics** ← This is where topics are generated
5. Identifies personas

### Step 3: Website Scraping
**Location:** `backend/src/services/websiteAnalysisService.js` (lines 90-235)

The service uses Puppeteer to scrape:
- Page title
- All headings (H1-H6)
- Paragraphs (first 10 paragraphs)
- Business information (company name, services, etc.)
- Meta descriptions
- Keywords

```javascript
websiteData = {
  title: "...",
  headings: ["Heading 1", "Heading 2", ...],
  paragraphs: ["Para 1", "Para 2", ...],
  businessInfo: {
    companyName: "Company Name",
    services: ["Service 1", "Service 2", ...]
  }
}
```

### Step 4: AI Topic Extraction
**Location:** `backend/src/services/websiteAnalysisService.js` (lines 394-419)

#### The Prompt
The system builds a prompt with:
- Website title
- All headings
- First 10 paragraphs of content
- Business services

```javascript
const prompt = `
Analyze this website content and extract the main topics and themes that would be relevant for those type of users for whome the product has been made and who would show buying intent for the product/brand.

Website Content:
- Title: ${websiteData.title}
- Headings: ${JSON.stringify(websiteData.headings)}
- Main Content: ${websiteData.paragraphs.slice(0, 10).join(' ')}
- Services: ${websiteData.businessInfo.services.join(', ')}

Extract 8-10 short quality topics

Example: if topic name should be short and crisp
{
  "topics": [
    {
      "name": "Topic Name",
      "description": "Brief description of why this topic is relevant",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "priority": "High/Medium/Low"
    }
  ]
}
`;
```

#### The System Prompt
**Location:** `backend/src/config/aiPrompts.js` (lines 79-99)

```javascript
topics: `You are a SEO/GEO expert.
Your task is to analyze website content and extract relevant topics

Analysis Focus:
1. Industry-specific topics and trends
2. Customer specific interests and buying intent
3. SEO-relevant keywords and topics and for whom the product has been made

CRITICAL: Return ONLY valid JSON in this exact structure:
{
  "topics": [
    {
      "name": "string",
      "description": "string",
      "keywords": ["string"],
      "priority": "High/Medium/Low"
    }
  ]
}`,
```

### Step 5: LLM API Call
**Location:** `backend/src/services/websiteAnalysisService.js` (lines 808-935)

The system calls Perplexity AI via OpenRouter:

```javascript
const response = await axios.post(`${this.openRouterBaseUrl}/chat/completions`, {
  model: 'perplexity/sonar',  // Perplexity AI model with web search
  messages: [
    {
      role: 'system',
      content: SYSTEM_PROMPTS['topics']  // The system prompt above
    },
    {
      role: 'user',
      content: prompt  // The user prompt with website data
    }
  ],
  temperature: 0.1,    // Low temperature for consistent results
  max_tokens: 2000
});
```

**Why Perplexity?**
- Has web search capability for context
- Can access current industry trends
- Better for research and analysis tasks
- 128k context window for comprehensive analysis

### Step 6: Response Processing
**Location:** `backend/src/services/websiteAnalysisService.js` (lines 866-909)

1. **Remove markdown** - Strips ```json code blocks if present
2. **Parse JSON** - Extracts the topics array
3. **Validate & Normalize** - Ensures correct structure
4. **Error handling** - Falls back to defaults if parsing fails

```javascript
// Remove markdown code blocks
content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

// Parse JSON
const parsed = JSON.parse(content);

// Validate and normalize
const normalized = this.validateAndNormalizeResponse(parsed, 'topics');

// Returns:
{
  topics: [
    {
      name: "Credit Card Rewards",
      description: "Content about maximizing credit card rewards",
      keywords: ["rewards", "points", "cashback"],
      priority: "High"
    },
    // ... 5-7 more topics
  ]
}
```

### Step 7: Response to Frontend
**Location:** `app/onboarding/website/page.tsx` (lines 64-72)

The analysis results are stored in the onboarding context:

```javascript
updateData({
  websiteUrl: url,
  urlAnalysisId: response.data.urlAnalysisId,
  analysisResults: response.data.analysis,  // ← Contains topics
  analysisCompleted: true
})
```

**Structure:**
```javascript
analysisResults = {
  brandContext: { companyName, industry, ... },
  competitors: [{ name, url, ... }],
  topics: [
    { name, description, keywords, priority },
    { name, description, keywords, priority },
    // ... 6-8 topics total
  ],
  personas: [{ type, description, painPoints, goals, ... }]
}
```

### Step 8: Topics Display
**Location:** `app/onboarding/topics/page.tsx` (lines 48-76)

Topics are displayed to the user for selection:

```javascript
useEffect(() => {
  if (data.analysisResults?.topics) {
    // Use ALL AI-generated topics from analysis
    const aiTopics = data.analysisResults.topics.map((topic: any, index: number) => ({
      id: `topic-${index}`,
      name: topic.name,
      description: topic.description,
      selected: false
    }))
    setTopics(aiTopics)
  }
}, [data.analysisResults])
```

**User can:**
- See all generated topics
- Select up to 2 topics
- Review descriptions
- See keywords

### Step 9: Topics Used for Prompt Generation
**Location:** `backend/src/routes/onboarding.js` (lines 217-220, 245-250)

Selected topics are then used when generating prompts:

```javascript
// Get selected topics
const selectedTopics = await Topic.find({ 
  userId, 
  selected: true 
});

// Map to prompt generation format
const topics = selectedTopics.map(t => ({
  id: t._id.toString(),
  name: t.name,
  description: t.description || '',
  keywords: t.keywords || []
}));

// Pass to prompt generation
const generatedPrompts = await promptGenerationService.generatePrompts({
  topics,  // ← AI-generated topics used here
  personas,
  // ... other params
});
```

**In Prompt Generation:**
**Location:** `backend/src/services/promptGenerationService.js` (lines 379-382)

Topics are incorporated into the user prompt:

```javascript
TOPIC: ${topic.name}
Description: ${topic.description}
Keywords: ${topic.keywords.join(', ')}
```

## Hyperparameters for Topic Extraction

**Model:** `perplexity/llama-3.1-sonar-large-128k-online`

**Temperature:** `0.1` (very low for consistency)
- Low temperature ensures consistent, focused topic extraction
- Reduces randomness in the output

**Max Tokens:** `2000`
- Enough for 6-8 topics with descriptions and keywords
- Controls API costs

**Other Settings:**
- Uses system + user prompt pattern
- Has retry logic (3 retries with exponential backoff)
- Handles rate limiting gracefully
- Falls back to default topics on error

## Example: What Gets Generated

### Input (Website Data):
```javascript
{
  title: "Chase Credit Cards",
  headings: ["Compare Credit Cards", "Rewards Programs", "Travel Benefits"],
  paragraphs: ["Chase offers various credit cards...", "Earn points on every purchase..."],
  services: ["Credit Cards", "Rewards Programs", "Travel Insurance"]
}
```

### AI Prompt:
"Analyze this website content and extract 6-8 main topics... Website: Chase Credit Cards..."

### Output (Generated Topics):
```javascript
{
  topics: [
    {
      name: "Credit Card Rewards",
      description: "Content about maximizing credit card rewards programs",
      keywords: ["rewards", "points", "cashback", "miles"],
      priority: "High"
    },
    {
      name: "Travel Credit Cards",
      description: "Content comparing travel credit card benefits",
      keywords: ["travel", "airlines", "hotels", "miles"],
      priority: "High"
    },
    {
      name: "Credit Card Comparison",
      description: "Content helping users choose the right credit card",
      keywords: ["compare", "best", "features", "benefits"],
      priority: "Medium"
    },
    // ... 3-5 more topics
  ]
}
```

## Key Design Decisions

1. **Perplexity over GPT**: Better web context and research capabilities
2. **Low temperature (0.1)**: Consistent, focused results
3. **6-8 topics**: Optimal for prompt generation (with 2 selected)
4. **Keywords included**: Helps with SEO and prompt variety
5. **Priority levels**: Helps users understand importance
6. **JSON-only output**: Structured, parseable response
7. **Retry logic**: Handles transient API failures
8. **Fallback defaults**: Graceful degradation on errors

## Data Flow Summary

```
User enters URL
    ↓
Backend scrapes website
    ↓
Perplexity AI analyzes content
    ↓
Extracts 6-8 topics with descriptions & keywords
    ↓
Topics sent to frontend
    ↓
User selects up to 2 topics
    ↓
Selected topics used in prompt generation
    ↓
Topics shape the commercial TOFU prompts
```

## Integration with Prompt Generation

The topics generated here are **critical** for prompt generation:

1. **Topic Name**: Used directly in prompts ("Best [topic.name] options for...")
2. **Topic Description**: Provides context for the LLM generating prompts
3. **Topic Keywords**: Adds variety and SEO relevance
4. **Topic + Persona**: Combined to create targeted prompts

**Example:**
- Topic: "Credit Card Rewards"
- Persona: "Frequent Traveler"
- Generated Prompt: "Best credit card rewards programs for frequent travelers"

## Error Handling

If topic extraction fails:
1. Retry 3 times with exponential backoff
2. If all retries fail, return default topics:
   - Marketing
   - Technology
   - Business
   - Design
3. Log error but don't fail the entire analysis
4. User can still proceed with defaults

## Performance

- **Typical time**: 3-5 seconds per topic extraction
- **Total analysis**: 15-25 seconds (all 4 tasks in parallel)
- **Retry on 429**: Adds 2-8 seconds if rate limited
- **Timeout**: 60 seconds per call

## Future Improvements

1. Add more context from brand analysis to topic extraction
2. Use competitor topics to find gaps
3. Incorporate industry trends from Perplexity's web search
4. A/B test different temperature values
5. Add topic validation against brand context
6. Cache similar website analyses to speed up


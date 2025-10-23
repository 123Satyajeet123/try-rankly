# Hyperparameters Centralization - Complete Audit Report

## ✅ Audit Summary

All hyperparameters in the try-rankly codebase have been successfully centralized into two main configuration files:

1. **Backend**: `/backend/src/config/hyperparameters.js`
2. **Frontend**: `/lib/config.ts`

## 📊 Centralized Hyperparameters

### Backend Configuration (`/backend/src/config/hyperparameters.js`)

#### 1. Prompt Generation
- ✅ `PROMPTS_PER_QUERY_TYPE` (default: 3)
- ✅ `MAX_PROMPTS_TO_TEST` (default: 20)
- ✅ `AGGRESSIVE_PARALLELIZATION` (default: true)
- ✅ Query types (fixed: 5 types)
- ✅ Branded percentage (default: 15%)

#### 2. Analysis Limits
- ✅ `MAX_COMPETITORS` (default: 10)
- ✅ `MAX_TOPICS` (default: 8)
- ✅ `MAX_PERSONAS` (default: 6)
- ✅ `MAX_CITATIONS_PER_BRAND` (default: 50)
- ✅ `MAX_WORD_COUNT` (default: 10000)

#### 3. LLM Configuration
- ✅ `LLM_TEMPERATURE` (default: 0.4)
- ✅ `LLM_MAX_TOKENS` (default: 2000)
- ✅ `SUBJECTIVE_METRICS_MAX_TOKENS` (default: 1500)
- ✅ `PROMPT_TESTING_MAX_TOKENS` (default: 1000)
- ✅ LLM model identifiers

#### 4. Timeouts
- ✅ `ANALYSIS_TIMEOUT` (default: 300000ms)
- ✅ `LLM_REQUEST_TIMEOUT` (default: 60000ms)
- ✅ `DATABASE_TIMEOUT` (default: 30000ms)

#### 5. Scoring & Metrics
- ✅ Decimal places for visibility score (2)
- ✅ Decimal places for depth of mention (4)
- ✅ Decimal places for sentiment score (2)
- ✅ Decimal places for citation share (2)
- ✅ Decimal places for position distribution (2)

#### 6. Cost Control
- ✅ GPT-4o pricing configuration
- ✅ Estimated cost per prompt ($0.08)
- ✅ `MAX_DAILY_COST` (default: $50)

#### 7. Development & Debugging
- ✅ `DEBUG_LOGGING` (default: false)
- ✅ `PERFORMANCE_PROFILING` (default: false)
- ✅ `MOCK_LLM_RESPONSES` (default: false)
- ✅ `SKIP_EXPENSIVE_OPERATIONS` (default: false)

### Frontend Configuration (`/lib/config.ts`)

#### 1. UI Limits
- ✅ `maxCompetitors` (default: 4)
- ✅ `maxTopics` (default: 2)
- ✅ `maxPersonas` (default: 2)
- ✅ `maxCitationsPerBrand` (default: 50)
- ✅ `maxWordCount` (default: 10000)

#### 2. Animation Configuration
- ✅ Card animation delays
- ✅ Step completion delays
- ✅ Animation durations

#### 3. Chart Configuration
- ✅ Brand color palette (10 colors)
- ✅ Chart dimensions
- ✅ Chart margins

#### 4. Validation Messages
- ✅ Competitor limit messages
- ✅ Topic limit messages
- ✅ Persona limit messages
- ✅ Field validation messages

#### 5. Performance Configuration
- ✅ Search debounce delay (300ms)
- ✅ Scroll throttle delay (100ms)
- ✅ Maximum list items (100)
- ✅ Virtual scrolling threshold (50)

## 🔄 Refactored Files

### Backend Services
- ✅ `promptGenerationService.js` - Uses centralized prompt config
- ✅ `promptTestingService.js` - Uses centralized LLM and testing config
- ✅ `onboarding.js` - Uses centralized prompt and testing config
- ✅ `prompts.js` - Uses centralized prompt and testing config

### Frontend Components
- ✅ `Onboarding.tsx` - Uses centralized UI limits and validation
- ✅ `CitationShareSection.tsx` - Uses centralized color palette
- ✅ `CitationTypesSection.tsx` - Uses centralized color palette

## 🎯 Quick Configuration Examples

### Development (Fast & Cheap)
```bash
PROMPTS_PER_QUERY_TYPE=2
MAX_PROMPTS_TO_TEST=10
MAX_COMPETITORS=5
MAX_TOPICS=4
MAX_PERSONAS=3
```
**Result:** 40 prompts generated, 10 tested, ~$3.20 cost

### Production (Balanced)
```bash
PROMPTS_PER_QUERY_TYPE=5
MAX_PROMPTS_TO_TEST=20
MAX_COMPETITORS=10
MAX_TOPICS=8
MAX_PERSONAS=6
```
**Result:** 100 prompts generated, 20 tested, ~$6.40 cost

### Comprehensive Analysis
```bash
PROMPTS_PER_QUERY_TYPE=10
MAX_PROMPTS_TO_TEST=50
MAX_COMPETITORS=15
MAX_TOPICS=12
MAX_PERSONAS=8
```
**Result:** 200 prompts generated, 50 tested, ~$16.00 cost

### Stress Testing
```bash
PROMPTS_PER_QUERY_TYPE=10
MAX_PROMPTS_TO_TEST=200
MAX_COMPETITORS=20
MAX_TOPICS=15
MAX_PERSONAS=10
```
**Result:** 200 prompts generated, 200 tested, ~$64.00 cost

## 📝 Environment Variables

All hyperparameters can be overridden via environment variables:

```bash
# Prompt Generation
PROMPTS_PER_QUERY_TYPE=3
MAX_PROMPTS_TO_TEST=20
AGGRESSIVE_PARALLELIZATION=true

# Analysis Limits
MAX_COMPETITORS=10
MAX_TOPICS=8
MAX_PERSONAS=6
MAX_CITATIONS_PER_BRAND=50
MAX_WORD_COUNT=10000

# LLM Configuration
LLM_TEMPERATURE=0.4
LLM_MAX_TOKENS=2000
SUBJECTIVE_METRICS_MAX_TOKENS=1500
PROMPT_TESTING_MAX_TOKENS=1000

# Timeouts
ANALYSIS_TIMEOUT=300000
LLM_REQUEST_TIMEOUT=60000
DATABASE_TIMEOUT=30000

# UI Limits
MAX_COMPETITORS_DISPLAY=4
MAX_TOPICS_DISPLAY=2
MAX_PERSONAS_DISPLAY=2

# Cost Control
MAX_DAILY_COST=50.0

# Development
DEBUG_LOGGING=false
PERFORMANCE_PROFILING=false
MOCK_LLM_RESPONSES=false
SKIP_EXPENSIVE_OPERATIONS=false
```

## 🛠️ Usage in Code

### Backend
```javascript
const { config } = require('./src/config/hyperparameters');

// Access prompt configuration
const promptsPerQueryType = config.prompts.perQueryType;
const maxPromptsToTest = config.prompts.maxToTest;

// Access LLM configuration
const temperature = config.llm.temperature;
const maxTokens = config.llm.maxTokens;

// Access limits
const maxCompetitors = config.limits.maxCompetitors;
const maxTopics = config.limits.maxTopics;
```

### Frontend
```typescript
import { frontendConfig, validateCompetitorCount, getValidationMessage } from '@/lib/config';

// Access UI limits
const maxCompetitors = frontendConfig.limits.maxCompetitors;

// Validate counts
const isValid = validateCompetitorCount(selectedCount);

// Get validation messages
const message = getValidationMessage('competitors');
```

## ✅ Validation & Error Handling

The configuration system includes:
- ✅ Automatic validation of all numeric ranges
- ✅ Type validation for boolean values
- ✅ Clear error messages for invalid configurations
- ✅ Default fallback values for all parameters

## 🎨 Benefits Achieved

1. **Single Source of Truth**: All hyperparameters in one place
2. **Easy Configuration**: Change values without hunting through code
3. **Environment Override**: Use .env files for different environments
4. **Validation**: Automatic range and type checking
5. **Documentation**: Clear examples and presets
6. **Cost Control**: Built-in cost estimation and limits
7. **Development Friendly**: Debug and mock options
8. **Performance**: Optimized settings for different use cases

## 🚀 Next Steps

1. **Test the configuration** with different environment variables
2. **Update deployment scripts** to use the new configuration
3. **Create environment-specific .env files** for different stages
4. **Monitor costs** using the built-in cost estimation
5. **Adjust limits** based on actual usage patterns

## 📚 Documentation

- **Configuration Guide**: `/backend/HYPERPARAMETERS_CONFIG.md`
- **Backend Config**: `/backend/src/config/hyperparameters.js`
- **Frontend Config**: `/lib/config.ts`
- **Environment Example**: See `.env.example` in backend directory

All hyperparameters are now centralized and easily configurable! 🎉

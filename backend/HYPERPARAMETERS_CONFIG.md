# Hyperparameters Configuration Guide

## Overview
All hyperparameters for the Rankly system are now centralized in `/backend/src/config/hyperparameters.js`. This allows for easy configuration without hunting through the codebase.

## Quick Setup

### 1. Environment Variables
Create a `.env` file in the backend directory with these variables:

```bash
# ===== PROMPT GENERATION =====
PROMPTS_PER_QUERY_TYPE=3          # Number of prompts per query type (1-20)
MAX_PROMPTS_TO_TEST=20            # Maximum prompts to test (1-1000)
AGGRESSIVE_PARALLELIZATION=true  # Enable parallel processing

# ===== ANALYSIS LIMITS =====
MAX_COMPETITORS=10                # Maximum competitors to analyze (1-50)
MAX_TOPICS=8                     # Maximum topics to extract (1-20)
MAX_PERSONAS=6                   # Maximum personas to identify (1-15)
MAX_CITATIONS_PER_BRAND=50       # Maximum citations per brand (1-200)
MAX_WORD_COUNT=10000             # Maximum word count for analysis

# ===== LLM CONFIGURATION =====
LLM_TEMPERATURE=0.4              # LLM response temperature (0-2)
LLM_MAX_TOKENS=2000              # Maximum tokens for responses (100-10000)
SUBJECTIVE_METRICS_MAX_TOKENS=1500  # Tokens for metrics evaluation
PROMPT_TESTING_MAX_TOKENS=1000   # Tokens for prompt testing

# ===== TIMEOUTS =====
ANALYSIS_TIMEOUT=300000          # Analysis timeout (milliseconds)
LLM_REQUEST_TIMEOUT=60000        # LLM request timeout (milliseconds)
DATABASE_TIMEOUT=30000           # Database timeout (milliseconds)

# ===== UI LIMITS =====
MAX_COMPETITORS_DISPLAY=4        # Competitors shown in UI (1-10)
MAX_TOPICS_DISPLAY=2             # Topics shown in UI (1-5)
MAX_PERSONAS_DISPLAY=2           # Personas shown in UI (1-5)

# ===== COST CONTROL =====
MAX_DAILY_COST=50.0              # Maximum daily cost limit (USD)

# ===== DEVELOPMENT =====
DEBUG_LOGGING=false              # Enable debug logging
PERFORMANCE_PROFILING=false      # Enable performance profiling
MOCK_LLM_RESPONSES=false         # Mock LLM responses for testing
SKIP_EXPENSIVE_OPERATIONS=false  # Skip expensive operations in dev
```

### 2. Quick Presets

#### Development (Fast & Cheap)
```bash
PROMPTS_PER_QUERY_TYPE=2
MAX_PROMPTS_TO_TEST=10
MAX_COMPETITORS=5
MAX_TOPICS=4
MAX_PERSONAS=3
```
**Result:** Generate 40 prompts, test 10 (40 LLM calls), ~$3.20 cost

#### Production (Balanced)
```bash
PROMPTS_PER_QUERY_TYPE=5
MAX_PROMPTS_TO_TEST=20
MAX_COMPETITORS=10
MAX_TOPICS=8
MAX_PERSONAS=6
```
**Result:** Generate 100 prompts, test 20 (80 LLM calls), ~$6.40 cost

#### Comprehensive Analysis
```bash
PROMPTS_PER_QUERY_TYPE=10
MAX_PROMPTS_TO_TEST=50
MAX_COMPETITORS=15
MAX_TOPICS=12
MAX_PERSONAS=8
```
**Result:** Generate 200 prompts, test 50 (200 LLM calls), ~$16.00 cost

#### Stress Testing
```bash
PROMPTS_PER_QUERY_TYPE=10
MAX_PROMPTS_TO_TEST=200
MAX_COMPETITORS=20
MAX_TOPICS=15
MAX_PERSONAS=10
```
**Result:** Generate 200 prompts, test 200 (800 LLM calls), ~$64.00 cost

## Configuration Categories

### 1. Prompt Generation
- **PROMPTS_PER_QUERY_TYPE**: Controls prompt variety and sample size
- **MAX_PROMPTS_TO_TEST**: Controls API costs and testing time
- **AGGRESSIVE_PARALLELIZATION**: Enables parallel processing for faster testing

### 2. Analysis Limits
- **MAX_COMPETITORS**: Maximum competitors to analyze
- **MAX_TOPICS**: Maximum topics to extract from website
- **MAX_PERSONAS**: Maximum user personas to identify
- **MAX_CITATIONS_PER_BRAND**: Maximum citations to track per brand

### 3. LLM Configuration
- **LLM_TEMPERATURE**: Controls response creativity (0=deterministic, 2=creative)
- **LLM_MAX_TOKENS**: Maximum response length
- **SUBJECTIVE_METRICS_MAX_TOKENS**: Tokens for metrics evaluation
- **PROMPT_TESTING_MAX_TOKENS**: Tokens for prompt testing

### 4. Timeouts
- **ANALYSIS_TIMEOUT**: Maximum time for website analysis
- **LLM_REQUEST_TIMEOUT**: Maximum time for LLM requests
- **DATABASE_TIMEOUT**: Maximum time for database operations

### 5. UI Limits
- **MAX_COMPETITORS_DISPLAY**: Competitors shown in UI
- **MAX_TOPICS_DISPLAY**: Topics shown in UI
- **MAX_PERSONAS_DISPLAY**: Personas shown in UI

### 6. Cost Control
- **MAX_DAILY_COST**: Daily spending limit to prevent runaway costs

### 7. Development
- **DEBUG_LOGGING**: Enable detailed logging
- **PERFORMANCE_PROFILING**: Enable performance monitoring
- **MOCK_LLM_RESPONSES**: Use mock responses for testing
- **SKIP_EXPENSIVE_OPERATIONS**: Skip costly operations in development

## Cost Estimates

| Configuration | Total Prompts | Tested | API Calls | Est. Cost |
|---------------|---------------|--------|-----------|-----------|
| Development   | 40            | 10     | 40        | $3.20     |
| Production    | 100           | 20     | 80        | $6.40     |
| Comprehensive | 200           | 50     | 200       | $16.00    |
| Stress Test   | 200           | 200    | 800       | $64.00    |

## Usage in Code

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

// Access UI configuration
const maxCompetitorsDisplay = config.ui.maxCompetitorsDisplay;
const brandColors = config.ui.brandColors;
```

## Validation

The configuration system includes automatic validation:
- Range checks for all numeric values
- Type validation for boolean values
- Error messages for invalid configurations

## Migration from Hardcoded Values

All hardcoded values have been moved to the centralized configuration:
- ✅ Prompt generation limits
- ✅ LLM configuration
- ✅ Analysis limits
- ✅ UI display limits
- ✅ Timeout values
- ✅ Cost control settings
- ✅ Development flags

## Best Practices

1. **Start with Development preset** for initial testing
2. **Use Production preset** for regular use
3. **Monitor costs** with MAX_DAILY_COST
4. **Enable debug logging** for troubleshooting
5. **Use mock responses** for development testing
6. **Adjust limits** based on your specific needs

## Troubleshooting

### Common Issues
1. **Too many prompts generated**: Reduce PROMPTS_PER_QUERY_TYPE
2. **High API costs**: Reduce MAX_PROMPTS_TO_TEST
3. **Slow analysis**: Increase ANALYSIS_TIMEOUT
4. **Memory issues**: Reduce MAX_COMPETITORS, MAX_TOPICS, MAX_PERSONAS

### Performance Tips
1. **Use aggressive parallelization** for faster testing
2. **Set appropriate timeouts** to prevent hanging
3. **Monitor daily costs** to avoid surprises
4. **Use development presets** for testing

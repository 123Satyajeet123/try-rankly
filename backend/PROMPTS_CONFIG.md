# Prompt Generation & Testing Configuration

## Overview
The system has **TWO separate controls** for managing prompts:
1. **Generation**: How many prompts to create (sample size)
2. **Testing**: How many to actually send to LLMs (cost control)

This two-stage approach lets you generate a comprehensive prompt library while controlling testing costs.

## Configuration Variables

### 1. PROMPTS_PER_QUERY_TYPE (Generation Control)
```bash
PROMPTS_PER_QUERY_TYPE=3  # Default: 3
```

**What it controls:** Number of prompt variations generated per query type

### 2. MAX_PROMPTS_TO_TEST (Testing Control)
```bash
MAX_PROMPTS_TO_TEST=20  # Default: 20
```

**What it controls:** Maximum prompts sent to LLMs for testing

### How It Works

**Query Types (Fixed - Always 5):**
1. Navigational
2. Commercial Investigation
3. Transactional
4. Comparative
5. Reputational

**Sample Size Multiplier:**
- `PROMPTS_PER_QUERY_TYPE` controls how many **variations** are generated per query type
- This increases your sample size for more comprehensive testing

### Example: Two-Stage Process

**Scenario:** 2 topics, 2 personas

**Stage 1: Generation**
```
PROMPTS_PER_QUERY_TYPE = 5

Total Generated = 2 topics × 2 personas × 5 query types × 5 variations
                = 100 prompts saved to database
```

**Stage 2: Testing**
```
MAX_PROMPTS_TO_TEST = 20

Tested = 20 prompts (balanced across query types)
LLM API Calls = 20 prompts × 4 LLMs = 80 total calls
Untested = 80 prompts (remain in database for future use)
```

### Recommended Configurations

#### For Development/Testing
```bash
PROMPTS_PER_QUERY_TYPE=3     # Generate 60 prompts (2×2×5×3)
MAX_PROMPTS_TO_TEST=10       # Test 10 (40 API calls)
```

#### For Standard Production
```bash
PROMPTS_PER_QUERY_TYPE=5     # Generate 100 prompts (2×2×5×5)
MAX_PROMPTS_TO_TEST=20       # Test 20 (80 API calls)
```

#### For Comprehensive Analysis
```bash
PROMPTS_PER_QUERY_TYPE=10    # Generate 200 prompts (2×2×5×10)
MAX_PROMPTS_TO_TEST=50       # Test 50 (200 API calls)
```

#### For Stress Testing
```bash
PROMPTS_PER_QUERY_TYPE=10    # Generate 200 prompts
MAX_PROMPTS_TO_TEST=200      # Test ALL (800 API calls!)
```

### How to Change

**Option 1: Environment Variable**
```bash
# In your terminal or .env file
export PROMPTS_PER_QUERY_TYPE=5
```

**Option 2: Add to .env file**
```bash
# Create/edit backend/.env
echo "PROMPTS_PER_QUERY_TYPE=5" >> .env
```

**Option 3: Inline when running**
```bash
PROMPTS_PER_QUERY_TYPE=10 npm run dev
```

## Smart Sampling

When `MAX_PROMPTS_TO_TEST` < total prompts, the system uses **balanced sampling**:

- **Distributes evenly** across all 5 query types
- **Random selection** within each query type
- **Ensures representation** from all categories

Example: 100 prompts, test limit = 20
```
Navigational:            4 prompts tested (out of 20)
Commercial Investigation: 4 prompts tested (out of 20)
Transactional:           4 prompts tested (out of 20)
Comparative:             4 prompts tested (out of 20)
Reputational:            4 prompts tested (out of 20)
```

### What Each Variable Controls

**PROMPTS_PER_QUERY_TYPE:**
✅ Total prompts generated and saved to database
✅ Sample size and variation coverage
✅ Prompt library size

**MAX_PROMPTS_TO_TEST:**
✅ Number of LLM API calls (cost control)
✅ Testing duration
✅ Which prompts from library get tested

❌ **Neither changes:**
- Query types (always 5)
- Topics and personas selection
- Scoring methodology

### Example Output

With `PROMPTS_PER_QUERY_TYPE=3`, for **Navigational** query type, you get 3 variations:
```
1. "What is HDFC Bank?"
2. "Tell me about HDFC Bank credit cards"
3. "How does HDFC Bank work?"
```

Instead of just 1 prompt per query type, you get multiple variations for better statistical significance.

## Performance & Cost Impact

### Generation (PROMPTS_PER_QUERY_TYPE)
- **Time:** ~2-3 seconds per topic-persona combination
- **Cost:** GPT-4o API call per combination (~$0.01-0.02 each)
- **Storage:** Minimal (text-based, ~1KB per prompt)

### Testing (MAX_PROMPTS_TO_TEST)
- **Time:** ~3-5 seconds per prompt (4 LLMs in parallel)
- **Cost:** 4 API calls per prompt tested (~$0.04-0.08 per prompt)
- **Total Time:** `MAX_PROMPTS_TO_TEST × 4 seconds`
- **Total Cost:** `MAX_PROMPTS_TO_TEST × 4 LLM calls`

### Cost Examples (USD estimates)

| Config | Prompts Gen | Prompts Test | Gen Cost | Test Cost | Total |
|--------|------------|--------------|----------|-----------|-------|
| Dev | 60 | 10 | $0.08 | $0.40 | $0.48 |
| Standard | 100 | 20 | $0.12 | $1.60 | $1.72 |
| Comprehensive | 200 | 50 | $0.24 | $4.00 | $4.24 |
| Stress Test | 200 | 200 | $0.24 | $16.00 | $16.24 |

## When to Increase Each Variable

### Increase PROMPTS_PER_QUERY_TYPE when:
- Building a comprehensive prompt library
- Need more variation coverage
- Want diverse testing scenarios
- Creating reusable prompt sets

### Increase MAX_PROMPTS_TO_TEST when:
- Need statistical significance
- Budget allows more testing
- Comprehensive brand visibility analysis
- Production deployment with critical data


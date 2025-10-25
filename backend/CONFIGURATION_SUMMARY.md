# Quick Configuration Guide

## 🎯 Two-Stage Prompt System

Your system now has **TWO independent controls** for prompts:

### 1️⃣ Generation (How many to create)
```bash
PROMPTS_PER_QUERY_TYPE=3
```
- Controls variety and sample size
- All prompts saved to database
- Run once during onboarding

### 2️⃣ Testing (How many to send to LLMs)
```bash
MAX_PROMPTS_TO_TEST=20
```
- Controls API costs and time
- Selects subset from database
- Uses smart sampling (balanced across query types)
- Run when clicking "Test Prompts"

## 📊 Quick Setup Examples

### For Development (Fast & Cheap)
```bash
export PROMPTS_PER_QUERY_TYPE=2
export MAX_PROMPTS_TO_TEST=10
```
Result: Generate 40 prompts, test 10 (40 LLM calls)

### For Production (Balanced)
```bash
export PROMPTS_PER_QUERY_TYPE=5
export MAX_PROMPTS_TO_TEST=20
```
Result: Generate 100 prompts, test 20 (80 LLM calls)

### For Stress Testing (Comprehensive)
```bash
export PROMPTS_PER_QUERY_TYPE=10
export MAX_PROMPTS_TO_TEST=50
```
Result: Generate 200 prompts, test 50 (200 LLM calls)

## 🚀 How to Use

**Step 1:** Set your environment variables
```bash
# In backend directory
echo "PROMPTS_PER_QUERY_TYPE=5" >> .env
echo "MAX_PROMPTS_TO_TEST=20" >> .env
```

**Step 2:** Restart backend
```bash
npm run dev
```

**Step 3:** Use the onboarding flow
- **Generate Prompts**: Uses `PROMPTS_PER_QUERY_TYPE`
- **Test Prompts**: Uses `MAX_PROMPTS_TO_TEST`

## 💰 Cost Estimates

| Setup | Total Prompts | Tested | API Calls | Est. Cost |
|-------|--------------|--------|-----------|-----------|
| Quick | 40 | 10 | 40 | $0.40 |
| Standard | 100 | 20 | 80 | $1.60 |
| Comprehensive | 200 | 50 | 200 | $4.00 |
| Full | 200 | 200 | 800 | $16.00 |

## 🎲 Smart Sampling

When testing fewer prompts than generated, the system:
- ✅ Distributes evenly across all 5 query types
- ✅ Randomly selects within each type
- ✅ Ensures balanced representation

Example: 100 prompts generated, 20 to test
```
Each query type: 4 prompts tested
- Navigational: 4/20
- Commercial Investigation: 4/20
- Transactional: 4/20
- Comparative: 4/20
- Reputational: 4/20
```

## 🔍 What Stays the Same

❌ Query types (always 5)
❌ Topics and personas selection
❌ Scoring methodology
❌ Testing logic

✅ You're just controlling the **volume** at each stage!


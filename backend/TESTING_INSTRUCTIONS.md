# Testing Instructions for Subjective Metrics

## Quick Start Guide

### 1. Prerequisites Check

```bash
# Check MongoDB is running
mongosh --eval "db.version()"

# Check .env file has OpenAI key
grep OPENAI_API_KEY .env

# Install dependencies if needed
npm install
```

### 2. Start Backend Server

```bash
# In one terminal
cd /home/jeet/rankly/tryrankly/backend
npm start

# Server should start on port 5000
# Check: http://localhost:5000/health
```

### 3. Find a Test PromptTest

```bash
# In another terminal
node src/scripts/findTestPrompt.js

# This will show available prompt tests with brands
# Copy one of the test commands shown
```

Example output:
```
✅ Found 5 tests with brand mentions

1. PromptTest ID: 67304a7e8b9c1d2e3f4a5b6c
   Platform: openai
   Query: What are the best payment processing solutions...
   Top Brand: Stripe
   
   💡 Test Command:
   node src/scripts/testSubjectiveMetrics.js 67304a7e8b9c1d2e3f4a5b6c "Stripe"
```

### 4. Run Subjective Metrics Evaluation

```bash
# Copy and paste the test command from step 3
node src/scripts/testSubjectiveMetrics.js 67304a7e8b9c1d2e3f4a5b6c "Stripe"
```

Expected output:
```
🎯 [SubjectiveMetrics] Starting evaluation
   PromptTest: 67304a7e8b9c1d2e3f4a5b6c
   Brand: Stripe

✅ Evaluation Complete!
   Total time: 3200ms
   Cost: $0.0068
   Tokens: 850

📊 SUBJECTIVE METRICS RESULTS
=====================================

1. RELEVANCE
   Score: 5/5
   Directly addresses payment processing...

2. INFLUENCE
   Score: 5/5
   Critical to answer quality...

[... more metrics ...]

✅ Full results saved to: ./test-metrics-output.json
```

### 5. Verify in Database

```bash
mongosh

# Switch to rankly database
use rankly

# Check if metrics were saved
db.subjectivemetrics.find().pretty()

# Check count
db.subjectivemetrics.count()
```

### 6. Test via API (Optional)

```bash
# Get auth token first (from your frontend or Postman)
TOKEN="your-jwt-token"

# Test evaluate endpoint
curl -X POST http://localhost:5000/api/subjective-metrics/evaluate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "promptTestId": "67304a7e8b9c1d2e3f4a5b6c",
    "brandName": "Stripe"
  }'
```

---

## Validation Checklist

After running the test, verify:

- [ ] ✅ Script completes without errors
- [ ] ✅ All 6 metrics have scores 1-5
- [ ] ✅ Each metric has reasoning text
- [ ] ✅ Overall quality score is calculated
- [ ] ✅ Cost is < $0.01
- [ ] ✅ Time is < 5 seconds
- [ ] ✅ Data saved to database
- [ ] ✅ Output JSON file created

---

## Troubleshooting

### Error: "PromptTest not found"

**Solution:** Run `findTestPrompt.js` to find a valid prompt test ID

### Error: "Brand not found in response"

**Solution:** The brand name must match exactly. Check the brand names in the prompt test:

```bash
mongosh
> use rankly
> db.prompttests.findOne({_id: ObjectId("...")}).brandMetrics
```

### Error: "Invalid token"

**Solution:** Make sure you're using a valid JWT token. Get one by:
1. Sign in through the frontend
2. Check localStorage for 'authToken'
3. Use that token in API requests

### Error: "OpenAI API error"

**Solution:** Check your OpenAI API key:
```bash
# Test the API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## Expected Results

### Score Distribution

Based on our testing, expect scores like:

| Metric | Typical Range | Good Score |
|--------|---------------|------------|
| Relevance | 3-5 | 4+ |
| Influence | 2-5 | 4+ |
| Uniqueness | 2-4 | 3+ |
| Position | 3-5 | 4+ |
| Click Probability | 3-5 | 4+ |
| Diversity | 2-4 | 3+ |

### Cost & Performance

- **Cost:** $0.005 - $0.008 per evaluation
- **Time:** 2-5 seconds per evaluation
- **Tokens:** 800-1000 tokens

---

## Next Steps

Once testing is successful:

1. ✅ Backend working correctly
2. 🔄 Move to frontend integration
3. 🔄 Add UI for "Generate Metrics" button
4. 🔄 Display metrics in modal
5. 🔄 Add loading states
6. 🔄 Test end-to-end flow

---

## Files to Review

If you want to inspect the code:

```bash
# Model
cat src/models/SubjectiveMetrics.js

# Service (main logic)
cat src/services/subjectiveMetricsService.js

# API Routes
cat src/routes/subjectiveMetrics.js

# Test output (after running test)
cat test-metrics-output.json
```

---

**Ready to test!** 🚀

Start with step 1 above.


# 🚀 Quick Start - Test Subjective Metrics NOW

## Run These Commands (5 minutes)

### 1. Check Prerequisites ✅

```bash
# Are you in the backend directory?
pwd
# Should show: /home/jeet/rankly/tryrankly/backend

# Check MongoDB is running
mongosh --eval "db.version()"
# Should show version number

# Check OpenAI API key exists
grep OPENAI_API_KEY .env
# Should show: OPENAI_API_KEY=sk-...
```

### 2. Find Test Data 🔍

```bash
node src/scripts/findTestPrompt.js
```

**Expected Output:**
```
✅ Found 5 tests with brand mentions

1. PromptTest ID: 67304a7e8b9c1d2e3f4a5b6c
   Platform: openai
   Query: What are the best payment solutions...
   Top Brand: Stripe
   
   💡 Test Command:
   node src/scripts/testSubjectiveMetrics.js 67304a7e8b9c1d2e3f4a5b6c "Stripe"
```

### 3. Run Evaluation 🎯

```bash
# Copy the command from step 2 output and run it
node src/scripts/testSubjectiveMetrics.js <promptTestId> "<BrandName>"
```

**What Happens:**
1. Fetches prompt test data from MongoDB
2. Extracts brand citation context
3. Calls GPT-4o with unified prompt
4. Parses and validates JSON response
5. Saves to database
6. Shows results in console
7. Saves to `test-metrics-output.json`

**Expected Time:** 3-5 seconds  
**Expected Cost:** $0.005-0.008

### 4. Check Results ✅

```bash
# View the output file
cat test-metrics-output.json | jq .

# Or just check the console - it shows all 6 metrics!
```

**Expected Scores:**
```
📊 SUBJECTIVE METRICS RESULTS
========================================

1. RELEVANCE
   Score: 5/5
   Citation directly addresses payment...

2. INFLUENCE  
   Score: 5/5
   Critical to answer, provides main...

3. UNIQUENESS
   Score: 4/5
   Mentions unique API features...

4. POSITION
   Score: 5/5
   Prominently placed at start...

5. CLICK PROBABILITY
   Score: 5/5
   High value proposition...

6. DIVERSITY
   Score: 3/5
   Focused on payment processing...

OVERALL QUALITY: 4.5/5
Average Score: 4.50/5
```

### 5. Verify in Database 💾

```bash
mongosh
```

```javascript
use rankly
db.subjectivemetrics.find().pretty()
db.subjectivemetrics.count()
```

Should show your evaluation results!

---

## If You Get Errors ❌

### "PromptTest not found"
**Fix:** You need to have completed prompt tests in your database. Run the onboarding flow first to generate test data.

### "Brand not found"
**Fix:** Check available brands:
```bash
mongosh
use rankly
db.prompttests.findOne({_id: ObjectId("<yourId>")}).brandMetrics
```

### "OpenAI API error"
**Fix:** Check your API key:
```bash
# Test it directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## Success Criteria ✅

After running the test, you should see:

- ✅ All 6 metrics with scores 1-5
- ✅ Reasoning for each metric (20-50 words)
- ✅ Overall quality score
- ✅ Cost < $0.01
- ✅ Time < 5 seconds
- ✅ Data saved to MongoDB
- ✅ JSON file created

---

## What's Next? 🔄

Once backend testing is successful:

1. ✅ **Validate Quality**
   - Run 5-10 more tests
   - Check scores are reasonable
   - Verify consistency

2. 🚀 **Frontend Integration**
   - Add "Generate Metrics" button
   - Call API endpoint
   - Display results in modal

3. 🎨 **UI Design**
   - 6 metric cards
   - Score visualization
   - Reasoning display
   - Loading states

---

## One-Line Test Command

```bash
cd /home/jeet/rankly/tryrankly/backend && node src/scripts/findTestPrompt.js
```

Copy a test command from output and run it! 🚀

---

**That's it!** You're ready to test. Takes less than 5 minutes.

Questions? Check `TESTING_INSTRUCTIONS.md` for detailed troubleshooting.


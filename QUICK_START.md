# 🚀 Quick Start - Testing Your Rankly Dashboard

## Start the Application

### Terminal 1 - Backend
```bash
cd /home/jeet/rankly/tryrankly/backend
node src/index.js
```

You should see:
```
🚀 Server running on http://localhost:5000
📊 MongoDB connected successfully
```

### Terminal 2 - Frontend
```bash
cd /home/jeet/rankly/tryrankly
npm run dev
```

You should see:
```
✓ Ready in X.Xs
○ Local:   http://localhost:3000
```

---

## Test the Complete Flow

### 1. Open Browser
Navigate to: `http://localhost:3000`

### 2. Register/Login
- Click "Create Account" or Login if you already have one
- Enter your email and password

### 3. Onboarding Flow

#### Step 1: Enter Website URL
- Enter: `https://fibr.ai` (or any website)
- Click "Analyze →"
- Wait ~10-15 seconds for AI analysis

#### Step 2: Select Competitors
- AI will suggest competitors
- Select 2-4 competitors (click to select)
- Click "Next →"

#### Step 3: Select Topics
- AI will suggest topics
- Select 1-2 topics
- Click "Next →"

#### Step 4: Select User Personas
- AI will suggest personas
- Select 1-2 personas
- Click "Next →"

#### Step 5: Generate Prompts
- Review Region & Language (locked to Global/English for now)
- Click "Generate Prompts"

### 4. Automatic Testing (Watch the Magic!)

You'll be redirected to the dashboard and see:

1. **"Testing prompts across 4 LLM platforms..."**
   - System tests your prompts on ChatGPT, Claude, Gemini, Perplexity
   - Takes ~20-30 seconds

2. **"Calculating metrics..."**
   - System extracts brand mentions deterministically
   - Calculates visibility, share of voice, position, etc.
   - Takes ~5-10 seconds

3. **"Loading dashboard data..."**
   - Fetches all analytics from backend
   - Takes ~2-3 seconds

4. **"Analysis complete!"**
   - Dashboard is ready!

### 5. Explore the Dashboard

#### Visibility Tab
- Shows visibility score, word count, depth of mention
- Platform breakdowns (ChatGPT, Claude, Gemini, Perplexity)
- Topic and persona rankings

#### Prompts Tab
- All generated prompts
- LLM responses for each prompt
- Visibility scores per response

#### Sentiment Tab
- Overall sentiment analysis
- Sentiment by platform and topic

#### Citations Tab
- Citation analysis
- Source breakdown

---

## Verify Data Persistence

### Test 1: Page Reload
1. While on dashboard, press F5 (reload)
2. ✅ Should stay on dashboard (not go to onboarding)
3. ✅ Data should still be visible

### Test 2: Close & Reopen Browser
1. Close the browser completely
2. Open browser again
3. Go to `http://localhost:3000`
4. ✅ Should go directly to dashboard
5. ✅ All data should be there

### Test 3: Start New Analysis
1. Click "New Analysis" button in sidebar
2. ✅ Should go to onboarding
3. Complete flow with different URL
4. ✅ New analysis should replace old one

---

## What to Check

### ✅ Backend Console
You should see logs like:
```
🌐 [API] POST /onboarding/analyze-website
✅ [API] Response received in XXXms (status: 200)
🎯 Starting prompt generation...
✅ Prompts generated successfully
🧪 Starting prompt testing...
✅ Prompt testing completed
📊 Calculating metrics...
✅ Metrics calculated successfully
```

### ✅ Frontend Console (Browser DevTools)
You should see logs like:
```
🔍 Starting website analysis for: https://fibr.ai
✅ Website analysis completed
🎯 Starting prompt generation...
✅ Prompts generated successfully
🧪 Starting prompt testing...
✅ Prompt testing completed
✅ Metrics calculated successfully
📊 Fetching analytics data...
✅ Analytics data fetched successfully
```

### ✅ Dashboard UI
- Loading states should show spinners
- Error states should show error messages (if any)
- Data should populate in all tabs
- Tabs should switch smoothly

---

## Troubleshooting

### Issue: "No data available"
**Solution:** Complete the onboarding flow first

### Issue: Testing takes forever
**Check:**
- Backend is running
- OpenRouter API key is configured in `.env`
- Internet connection is stable

### Issue: Dashboard shows loading forever
**Check:**
- Backend console for errors
- Browser console for errors
- Network tab in DevTools for failed requests

### Issue: Backend errors
**Check:**
- MongoDB is running
- `.env` file has all required keys:
  ```
  MONGODB_URI=mongodb://localhost:27017/rankly
  JWT_SECRET=your-secret-key
  OPENAI_API_KEY=your-openai-key
  OPENROUTER_API_KEY=your-openrouter-key
  ```

---

## Expected Test Results

### After completing the flow, you should have:

1. **Database Data:**
   - User account created
   - Onboarding data saved
   - Website analysis results
   - Generated prompts
   - Prompt test results (4 LLMs × number of prompts)
   - Aggregated metrics

2. **Dashboard Tabs:**
   - **Visibility:** Shows visibility scores, platform breakdown
   - **Prompts:** Lists all prompts with LLM responses
   - **Sentiment:** Shows sentiment analysis
   - **Citations:** Shows citation data

3. **Data Persistence:**
   - Reload works
   - Browser close/reopen works
   - "New Analysis" button works

---

## Quick Commands

```bash
# Start backend
cd backend && node src/index.js

# Start frontend
cd tryrankly && npm run dev

# Check backend health
curl http://localhost:5000/health

# Check MongoDB
mongosh
> use rankly
> db.users.countDocuments()
> db.prompts.countDocuments()
> db.prompttests.countDocuments()
> db.aggregatedmetrics.countDocuments()
```

---

## Success Criteria

✅ Onboarding completes without errors
✅ Prompts are generated
✅ Dashboard shows "Testing..." → "Calculating..." → "Loading..." → "Complete!"
✅ All 4 tabs load without errors
✅ Page reload keeps data
✅ "New Analysis" button works

---

## 🎉 You're All Set!

Your Rankly dashboard is fully integrated and ready to use!

For detailed technical documentation, see:
- [IMPLEMENTATION_FINAL.md](IMPLEMENTATION_FINAL.md) - Complete implementation details
- [FRONTEND_INTEGRATION_COMPLETE.md](FRONTEND_INTEGRATION_COMPLETE.md) - Integration guide
- [ANALYTICS_API_GUIDE.md](ANALYTICS_API_GUIDE.md) - API documentation

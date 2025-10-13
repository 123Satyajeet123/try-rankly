# 🔑 OpenAI API Key Setup

## Current Status

The OpenAI API key is commented out in your `.env` file:

```bash
#OPENAI_API_KEY=your_openai_api_key
```

You need to add a valid OpenAI API key to test the subjective metrics.

---

## Option 1: Add Your OpenAI API Key (Recommended)

### Step 1: Get an API Key

If you don't have one:
1. Go to https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### Step 2: Add to .env File

```bash
# Edit the .env file
nano /home/jeet/rankly/tryrankly/backend/.env

# Or use sed to uncomment and replace
sed -i 's/#OPENAI_API_KEY=your_openai_api_key/OPENAI_API_KEY=sk-YOUR-ACTUAL-KEY-HERE/' /home/jeet/rankly/tryrankly/backend/.env
```

Your `.env` should look like:
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Verify

```bash
cd /home/jeet/rankly/tryrankly/backend
grep OPENAI_API_KEY .env
# Should show: OPENAI_API_KEY=sk-proj-...
```

### Step 4: Test

```bash
node src/scripts/findTestPrompt.js
# Then run the test command
```

---

## Option 2: Use Environment Variable (Temporary)

```bash
# Set for current session only
export OPENAI_API_KEY="sk-proj-your-key-here"

# Then run test
node src/scripts/testSubjectiveMetrics.js <promptId> "<Brand>"
```

---

## Option 3: Mock/Skip for Now

If you want to see the code structure without OpenAI:

I can create a mock service that returns sample metrics without calling GPT-4o, just to validate the flow works. Let me know if you want this!

---

## 🎯 Recommended Path

### If You Have OpenAI Key:
1. Add key to `.env` file
2. Run test immediately
3. Validate metrics quality
4. Move to frontend

### If You Don't Have Key:
**Option A:** Get a key (takes 2 minutes)
- Go to https://platform.openai.com/api-keys
- Free tier gives $5 credit for testing
- Should be enough for 500+ evaluations

**Option B:** I can create mock version
- Skip GPT-4o call
- Return sample metrics
- Test the flow without API cost
- Later swap in real GPT-4o

Which would you prefer?

---

## 💰 Cost Info

**GPT-4o Pricing:**
- $5 per 1M input tokens
- $15 per 1M output tokens

**Our Usage per Evaluation:**
- ~600 input tokens = $0.003
- ~600 output tokens = $0.009
- **Total: ~$0.012 per evaluation**

**For Testing:**
- 10 test evaluations = $0.12
- 100 evaluations = $1.20
- Free tier $5 credit = ~400 evaluations

Very affordable for testing! 💪

---

## 🚀 Quick Fix

If you have an OpenAI API key, just:

```bash
# Replace sk-YOUR-KEY with your actual key
echo 'OPENAI_API_KEY=sk-YOUR-KEY-HERE' >> /home/jeet/rankly/tryrankly/backend/.env

# Test immediately
cd /home/jeet/rankly/tryrankly/backend
node src/scripts/testSubjectiveMetrics.js 68ea26f243e36b0d6038f175 "HDFC Bank"
```

---

Let me know:
1. ✅ Do you have an OpenAI API key?
2. 🔑 Should I help you add it to `.env`?
3. 🎭 Or should I create a mock version for testing the flow?


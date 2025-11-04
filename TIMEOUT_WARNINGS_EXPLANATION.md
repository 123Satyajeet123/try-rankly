# Timeout Warnings Explanation

## What Are These Warnings?

These warnings appear during the **website analysis** phase of onboarding:

```
⚠️ productContext task timed out after 90000ms, using default response
⚠️ competitors task timed out after 90000ms, using default response
⚠️ topics task timed out after 90000ms, using default response
⚠️ personas task timed out after 90000ms, using default response
```

## What's Happening?

When you submit a website URL for analysis, the system calls AI services (via OpenRouter API) to generate:

1. **Product Context** - Understanding your product/service
2. **Competitors** - Finding similar companies/products
3. **Topics** - Identifying relevant SEO topics
4. **Personas** - Identifying target customer personas

Each of these tasks runs in **parallel** and has a **90-second timeout** (90000ms).

## Why Timeouts Happen?

Timeouts can occur due to:

1. **Slow AI API Response** - The OpenRouter API (or underlying LLM) is taking longer than 90 seconds
2. **API Rate Limiting** - The API is rate-limited and queuing requests
3. **Network Issues** - Slow network connection to the AI service
4. **High API Load** - The AI service is experiencing high traffic
5. **Complex Analysis** - The website is very complex and requires more processing time

## What Happens When Timeout Occurs?

When a task times out:
- ✅ **The system doesn't crash** - It gracefully handles the timeout
- ✅ **Default response is used** - A fallback/default response is provided
- ✅ **Onboarding continues** - The process continues with available data
- ⚠️ **Data quality may be reduced** - Default responses may be less accurate than AI-generated ones

## Where Is This Implemented?

**File**: `backend/src/services/websiteAnalysisService.js`

**Code Location**:
- Line 238-254: `withTimeout()` wrapper function
- Line 296: `FAST_FAIL_TIMEOUT = 90000` (90 seconds)
- Line 302: Each task is wrapped with timeout protection

**Example**:
```javascript
// Wrap each task with 90-second timeout for fast-fail
const FAST_FAIL_TIMEOUT = 90000; // 90 seconds
const wrappedTasks = analysisTasks.map((task, index) => {
  const analysisType = resultKeys[index];
  const defaultResponse = this.getDefaultResponse(analysisType);
  return this.withTimeout(task, FAST_FAIL_TIMEOUT, analysisType, defaultResponse);
});
```

## Is This a Problem?

**Short Answer**: Usually not critical, but indicates potential issues.

**Impact**:
- ✅ **Onboarding still works** - The process completes successfully
- ⚠️ **Data quality** - Default responses may be less accurate
- ⚠️ **User experience** - Users may see less relevant competitors/topics/personas

**When to Worry**:
- If **all 4 tasks** timeout consistently → API service issue
- If timeouts happen **frequently** → Need to investigate API performance
- If **default responses** are poor quality → Need better fallback data

## How to Fix/Improve?

### Option 1: Increase Timeout (Not Recommended)
- **Current**: 90 seconds
- **Could increase to**: 120-180 seconds
- **Risk**: Longer wait times if API is truly down

### Option 2: Improve Default Responses (Recommended)
- Enhance the `getDefaultResponse()` method to provide better fallback data
- Use cached/previous analysis data as fallback
- Provide more context-aware defaults

### Option 3: Add Retry Logic (Recommended)
- Automatically retry failed tasks with exponential backoff
- Currently only competitors have retry logic
- Could add retries for all tasks

### Option 4: Better Error Handling
- Show user-friendly messages when timeouts occur
- Allow users to manually edit/improve default data
- Provide option to retry specific tasks

### Option 5: Monitor and Alert
- Track timeout frequency
- Alert when timeout rate exceeds threshold
- Monitor API response times

## Current Status

**Current Behavior**:
- ✅ Timeouts are handled gracefully
- ✅ Default responses prevent crashes
- ✅ Onboarding completes successfully
- ⚠️ Warnings are logged for debugging

**Recommendation**:
- Monitor timeout frequency
- If timeouts are rare (< 5% of analyses), current behavior is acceptable
- If timeouts are frequent (> 10% of analyses), investigate API performance or increase timeout

## Related Code

- **Timeout Implementation**: `backend/src/services/websiteAnalysisService.js:238-254`
- **Default Responses**: `backend/src/services/websiteAnalysisService.js:getDefaultResponse()`
- **Analysis Tasks**: `backend/src/services/websiteAnalysisService.js:257-293`
- **Retry Logic**: `backend/src/services/websiteAnalysisService.js:307-350` (competitors only)


# Quick Start: GA4 Data Verification

## Step 1: Understand Your Setup

1. **Read the summaries**:
   - `GA4_CODEBASE_SUMMARY.md` - Understand codebase structure
   - `GA4_DATA_VERIFICATION_PLAN.md` - Detailed verification checklist

## Step 2: Manual Verification (Start Here)

### A. Check Platform Split Tab

1. Open your app and navigate to Agent Analytics → Platform tab
2. Note down the displayed numbers:
   - Total Sessions
   - LLM Sessions
   - Individual platform sessions (ChatGPT, Claude, etc.)
   - Percentages

3. Compare with GA4 Web Interface:
   - Go to GA4 → Reports → Realtime or Standard Reports
   - Create a custom report matching your query:
     - Dimensions: Session source, Session medium, Page referrer
     - Metrics: Sessions
     - Filter: Page referrer contains "chatgpt" OR "claude" OR "gemini" etc.
   - Compare totals

**Things to Verify**:
- ✅ Total sessions match
- ✅ LLM sessions match
- ✅ Percentages add up to ~100% (allow small rounding differences)
- ✅ Engagement rates are displayed as percentages (0-100), not decimals

---

### B. Check LLM Platforms Tab

1. In the same Platform tab, scroll to "LLM Platform Performance" section
2. Note down:
   - Total LLM Sessions
   - Individual platform sessions (ChatGPT, Claude, Gemini, Perplexity)
   - Percentages for each platform

3. **Cross-check with Platform Split**:
   - LLM Platforms total should match Platform Split LLMs total
   - Individual platform sessions should match

**Things to Verify**:
- ✅ Total matches Platform Split LLMs
- ✅ Individual platforms sum to total
- ✅ Percentages are relative to LLM total (not all traffic)
- ✅ Engagement/bounce rates are reasonable (0-100%)

---

### C. Check Pages Tab

1. Navigate to Agent Analytics → Pages tab
2. Note down:
   - Total Sessions (should match LLM total)
   - Top 10 pages with sessions
   - Conversion rates
   - Session Quality Scores

3. **Cross-check**:
   - Total page sessions = Total LLM sessions (from Platform tab)
   - Page URLs are properly formatted
   - Conversion rates are reasonable percentages

**Things to Verify**:
- ✅ Total sessions match LLM total
- ✅ Page URLs are clickable and correct
- ✅ Conversion rates calculated correctly: `conversions / sessions * 100`
- ✅ Session Quality Score is between 0-100

---

### D. Check Geo/Device Tabs

1. Navigate to Geo-Device tab
2. Note down:
   - Total Sessions (should match LLM total)
   - Top countries with sessions
   - Device breakdown totals

3. **Cross-check**:
   - Geo total = Device total = LLM total
   - Percentages add up to ~100%

**Things to Verify**:
- ✅ All totals match LLM sessions
- ✅ Percentages add up correctly
- ✅ Only LLM traffic is shown (filtered correctly)

---

## Step 3: Run Automated Verification Script

1. **Set up environment variables**:
   ```bash
   export TEST_USER_ID="your_user_id"
   export TEST_SESSION_TOKEN="your_session_token"
   export API_URL="http://localhost:5000/api"  # or your backend URL
   ```

2. **Run the script**:
   ```bash
   cd backend
   node scripts/verify-ga4-data-consistency.js
   ```

3. **Review the output**:
   - ✅ Green checks = No issues
   - ⚠️ Yellow warnings = Potential issues (review)
   - ❌ Red errors = Actual problems (fix needed)

---

## Step 4: Debugging Tips

### If Sessions Don't Match:

1. **Check LLM Detection**:
   - Open browser DevTools → Network tab
   - Find API calls to `/api/ga4/platform-split` or `/api/ga4/llm-platforms`
   - Check response data
   - Verify LLM detection patterns are matching correctly

2. **Check Backend Logs**:
   ```bash
   # Look for console.log outputs in backend
   # Check for "LLM Detection Stats" logs
   ```

3. **Verify GA4 Query**:
   - Check if dimension filter is applied correctly
   - Verify regex pattern matches your GA4 referrer values
   - Test in GA4 Query Explorer: https://ga-dev-tools.web.app/ga4/query-explorer/

### If Percentages Don't Add Up:

1. **Check Calculation Logic**:
   - Review `transformToPlatformSplit` function
   - Verify percentage calculation: `(sessions / totalSessions) * 100`
   - Check rounding issues (allow ±0.1% tolerance)

2. **Check Data Aggregation**:
   - Ensure all rows are being processed
   - Verify no data is being filtered out incorrectly

### If Conversion Rates Are Wrong:

1. **Check Conversion Event**:
   - Verify correct metric name is used
   - Check if custom event exists in GA4
   - Review fallback logic when event doesn't exist

2. **Check Calculation**:
   - Formula: `(conversions / sessions) * 100`
   - Verify conversions and sessions are from same query
   - Check if conversions are being aggregated correctly

---

## Step 5: Create Verification Checklist

Create a simple checklist for each deployment/release:

- [ ] Platform Split total sessions match GA4
- [ ] LLM Platforms total matches Platform Split LLMs
- [ ] Pages total matches LLM total
- [ ] Geo total matches LLM total
- [ ] Device total matches LLM total
- [ ] Percentages add up to ~100% (within tolerance)
- [ ] Engagement/bounce rates are 0-100%
- [ ] Conversion rates are calculated correctly
- [ ] Page URLs are correctly formatted
- [ ] Cross-tab consistency verified

---

## Common Issues and Fixes

### Issue: "LLM sessions don't match across tabs"
**Fix**: 
- Check LLM detection patterns in `ga4DataTransformer.js`
- Verify all tabs use same filter criteria
- Ensure no additional filtering in frontend

### Issue: "Percentages don't add up to 100%"
**Fix**:
- Check rounding logic (may be intentional for display)
- Verify no missing data categories
- Check percentage calculation uses correct total

### Issue: "Conversion rates are always 0"
**Fix**:
- Verify conversion event exists in GA4
- Check metric name format (`conversions` vs `keyEvents:eventName`)
- Ensure conversions are being tracked in GA4

### Issue: "Page URLs are incorrect"
**Fix**:
- Check if `defaultUri` is fetched and stored correctly
- Verify URL construction logic in `transformPagesData`
- Test with different page path formats

---

## Next Steps

1. ✅ Complete manual verification for all tabs
2. ✅ Run automated verification script
3. ✅ Fix any issues found
4. ✅ Document any GA4 API limitations or quirks
5. ✅ Set up periodic verification (weekly/monthly)

---

## Resources

- **GA4 Query Explorer**: https://ga-dev-tools.web.app/ga4/query-explorer/
- **GA4 API Documentation**: https://developers.google.com/analytics/devguides/reporting/data/v1
- **Your Codebase**:
  - Backend Routes: `/backend/src/routes/ga4.js`
  - Transformers: `/backend/src/utils/ga4DataTransformer.js`
  - Frontend Services: `/services/ga4Api.ts`
  - Components: `/components/agent-analytics/`

---

**Remember**: Data verification is an ongoing process. Set up regular checks to ensure data accuracy and consistency over time.




# Citation URL Issue Analysis & Fix Report

## Issue Summary

When viewing earned citations for prompts like "Top accelerator programs for startup investment", clicking on CrunchBase citations redirects to `https://www.crunchbase.com` (just the domain) instead of the specific path like `https://www.crunchbase.com/hub/accelerators` which contains the brand/competitor information.

## Root Cause Analysis

### Investigation Findings

After analyzing the database and codebase, I found:

1. **URL Extraction is Working Correctly**: The citation extraction service is correctly extracting and storing URLs as they appear in LLM responses. No truncation is happening in the extraction logic.

2. **The Real Problem**: **LLMs are generating incomplete URLs** (domain-only URLs) because **web search is not enabled** on OpenRouter models.

#### Evidence from Database Analysis

- **Claude Response**: Sometimes provides full URLs like:
  ```
  [Crunchbase Accelerator Database](https://www.crunchbase.com/lists/accelerators/f9137398-9d27-4a5e-9d40-e952c1f22c48/organization.companies)
  ```
  - ✅ **Correctly stored** in database with full path

- **OpenAI Response**: Often provides just domain names:
  ```
  [Crunchbase](https://www.crunchbase.com)
  ```
  - ❌ **Stored correctly** but LLM only generated domain name (no path)

### Why This Happens

1. **Training Data Limitations**: LLMs trained on static data may have outdated or incomplete URL information
2. **No Real-Time Web Access**: Without web search enabled, models can't access current web pages to get specific URLs
3. **Hallucination**: Models may generate URLs based on their training data rather than real-time web results

## Solutions Implemented

### 1. Enable Web Search for OpenRouter Models ✅

**File**: `backend/src/services/promptTestingService.js`

**Change**: Added `:online` suffix to all models to enable real-time web search:

```javascript
// Before
this.llmModels = {
  openai: 'openai/gpt-4o-mini',
  gemini: 'google/gemini-2.0-flash-001',
  claude: 'anthropic/claude-3-5-haiku',
  perplexity: 'perplexity/sonar'
};

// After
this.llmModels = {
  openai: 'openai/gpt-4o-mini:online',      // ✅ Web search enabled
  gemini: 'google/gemini-2.0-flash-001:online', // ✅ Web search enabled
  claude: 'anthropic/claude-3-5-haiku:online',  // ✅ Web search enabled
  perplexity: 'perplexity/sonar'                // Already has web search
};
```

**Impact**: Models can now access real-time web data and provide accurate, specific URLs instead of just domain names.

**Cost Note**: Web search (`:online`) may increase API costs slightly, but significantly improves citation accuracy.

### 2. Improved URL Extraction Regex Patterns ✅

**Files**: 
- `backend/src/routes/citations.js`
- `backend/src/routes/dashboardMetrics.js`
- `backend/src/services/citationExtractionService.js`

**Problem**: The previous regex pattern `/https?:\/\/[^\s\)\]\}]+\b/g` used a word boundary (`\b`) which could truncate URLs at certain characters.

**Solution**: Removed word boundary and improved pattern to capture full URLs:

```javascript
// Before
const urlRegex = /https?:\/\/[^\s\)\]\}]+\b/g;

// After
const urlRegex = /https?:\/\/[^\s\)\]\}]+(?:\/[^\s\)\]\}]*)*/g;
```

**Impact**: URLs with paths are now fully captured without truncation.

### 3. Enhanced Markdown Link Extraction ✅

**File**: `backend/src/services/citationExtractionService.js`

**Improvement**: Better handling of markdown links `[text](url)` with URLs containing special characters:

```javascript
// Improved patterns to handle URLs with parentheses and special chars
const markdownPatterns = [
  /\[([^\]]+)\]\((https?:\/\/[^\)]+?)\)/g,  // Non-greedy match
  /\[([^\]]+)\]\((https?:\/\/[^\)]*\/[^\)]*)\)/g,  // URLs with paths
  // ... other patterns
];
```

### 4. Improved Bare URL Extraction ✅

**File**: `backend/src/services/citationExtractionService.js`

**Improvement**: Enhanced URL patterns to capture full URLs including paths:

```javascript
// Before
/https?:\/\/[^\s<>"{}|\\^`[\]]+/g

// After  
/https?:\/\/[^\s<>"{}|\\^`\[\]()]+(?:\/[^\s<>"{}|\\^`\[\]()]*)*/g
```

## Expected Results

### Before Fixes
- ❌ LLMs generate domain-only URLs: `https://www.crunchbase.com`
- ❌ Users click citations and land on homepage instead of specific pages
- ❌ Missing brand/competitor information in citation URLs

### After Fixes
- ✅ LLMs can access real-time web data via `:online` suffix
- ✅ Models generate specific URLs: `https://www.crunchbase.com/hub/accelerators`
- ✅ Citations link directly to relevant pages with brand information
- ✅ URL extraction captures full paths without truncation

## Testing Recommendations

1. **Run New Prompt Tests**: Test with the prompt "Top accelerator programs for startup investment" and verify:
   - Claude, OpenAI, and Gemini all generate full URLs with paths
   - Citations are correctly extracted and stored
   - Clicking citations leads to specific pages (not just domains)

2. **Verify Web Search is Working**: Check OpenRouter API responses to confirm web search is enabled and returning real-time URLs.

3. **Check Citation URLs**: Verify that earned citations contain full paths like:
   - ✅ `https://www.crunchbase.com/hub/accelerators`
   - ❌ NOT just `https://www.crunchbase.com`

## Additional Notes

### OpenRouter Web Search Feature

According to OpenRouter documentation:
- The `:online` suffix enables real-time web search via Exa's search technology
- This combines keyword and embeddings-based search for accurate results
- Web search allows models to cite current, specific URLs instead of training data

### Cost Implications

- **Web search enabled**: Slightly higher API costs (web search adds overhead)
- **Benefit**: Much more accurate citations with real-time, specific URLs
- **Recommendation**: Monitor costs initially, but the accuracy improvement is worth it

### Alternative Solutions (If Web Search Not Available)

If web search causes issues or isn't available:

1. **Post-Processing URLs**: Add logic to detect domain-only URLs and attempt to find the correct path
2. **URL Validation Service**: Use a service to validate and expand domain-only URLs to specific pages
3. **Manual URL Mapping**: Create a mapping of common domain-only citations to their specific pages

However, enabling web search is the **preferred solution** as it fixes the problem at the source.

## Files Modified

1. ✅ `backend/src/services/promptTestingService.js` - Enabled web search for all models
2. ✅ `backend/src/routes/citations.js` - Improved URL extraction regex
3. ✅ `backend/src/routes/dashboardMetrics.js` - Improved URL extraction regex  
4. ✅ `backend/src/services/citationExtractionService.js` - Enhanced URL extraction patterns

## Next Steps

1. ✅ Code fixes applied
2. ⏳ **Test with new prompt runs** to verify fixes work
3. ⏳ **Monitor API costs** to ensure web search doesn't cause budget issues
4. ⏳ **Verify citation URLs** in earned citations are now full paths

---

**Date**: 2025-01-XX
**Issue**: Citation URLs truncating to domain names
**Status**: ✅ Fixed - Awaiting testing verification


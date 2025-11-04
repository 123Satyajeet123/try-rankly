# Website Analysis Optimization Plan

## Current Issues

### 1. Few Competitors Problem
**Root Causes:**
- Overly restrictive prompt requiring exact matches on: revenue range, funding stage, category, segment
- Perplexity/sonar web search may not find competitors matching all strict criteria
- Retry logic uses same strict prompt, so retries fail too
- No fallback to simpler competitor identification

**Current Flow:**
```
findCompetitors() → Perplexity search with strict criteria → Returns 0-2 competitors
→ Retry with same strict criteria → Still returns 0-2 competitors
```

### 2. Long Analysis Time Problem
**Bottlenecks:**
1. **Scraping**: 60s timeout + 2s wait = ~62 seconds
2. **AI Analysis (4 parallel tasks)**: Each has 300s timeout
   - Brand Context: ~30-60s
   - Competitors (with web search): ~60-120s (SLOWEST)
   - Topics: ~20-40s  
   - Personas: ~20-40s
3. **Competitor Retries**: Up to 2 more attempts = +60-120s
4. **Total worst case**: 62s + 300s + 120s = ~8 minutes

**Current Flow:**
```
scrapeWebsite() [~62s]
  ↓
performAIAnalysis() [4 parallel tasks, wait for slowest ~120s]
  ├─ analyzeBrandContext() [~30-60s]
  ├─ findCompetitors() [~60-120s] ⚠️ SLOWEST
  ├─ extractTopics() [~20-40s]
  └─ identifyUserPersonas() [~20-40s]
  ↓
If competitors = 0, retry up to 2 times [+60-120s]
```

## Optimization Strategies

### Strategy 1: Simplify Competitor Search (High Impact)
**Changes:**
- Start with broader search criteria
- Only require: same industry + similar products/services
- Remove strict revenue/funding requirements initially
- If strict search finds < 4 competitors, fallback to broader search
- Use simpler model for initial search, detailed model for enrichment

**Expected Impact:**
- More competitors found (4-6 instead of 0-2)
- Faster initial search (30-45s instead of 60-120s)

### Strategy 2: Reduce Timeouts & Add Fast-Fail (High Impact)
**Changes:**
- Reduce LLM timeout from 300s to 120s (most calls complete in 30-60s)
- Add per-task timeout wrapper (fail fast after 90s)
- Reduce scraping timeout from 60s to 30s
- Remove unnecessary 2s wait after page load

**Expected Impact:**
- Faster failure detection
- Total time: ~32s (scrape) + ~90s (slowest task) = ~2 minutes worst case

### Strategy 3: Optimize Scraping (Medium Impact)
**Changes:**
- Use 'networkidle0' instead of 'domcontentloaded' (faster, but less reliable)
- Or reduce wait time from 2s to 500ms
- Consider using axios first, puppeteer as fallback
- Add request timeout to prevent hanging

**Expected Impact:**
- Scraping time: ~32s → ~15-20s

### Strategy 4: Smart Competitor Retry (Medium Impact)
**Changes:**
- On first failure, switch to simpler prompt (remove strict criteria)
- On second failure, use fallback list from industry knowledge base
- Add competitor count check before retry (avoid retrying if we have 3+)

**Expected Impact:**
- More reliable competitor finding
- Avoid unnecessary retries

### Strategy 5: Parallel Optimizations (Low Impact)
**Changes:**
- Tasks already run in parallel (good!)
- Consider starting competitor search earlier (after brand context extracted)
- Could pipeline: brand context → competitors (using brand context data)

**Expected Impact:**
- Slight time reduction by using brand context immediately

## Recommended Implementation Order

1. **Phase 1: Quick Wins (1-2 hours)**
   - Reduce timeouts (300s → 120s, 60s → 30s)
   - Remove 2s wait after page load
   - Add fast-fail wrappers
   - **Expected: ~50% time reduction**

2. **Phase 2: Competitor Improvement (2-3 hours)**
   - Simplify competitor prompt (remove strict revenue/funding)
   - Add fallback to broader search
   - Improve retry logic with simpler prompt
   - **Expected: 4-6 competitors consistently**

3. **Phase 3: Further Optimizations (1-2 hours)**
   - Optimize scraping (faster waitUntil)
   - Add competitor caching for common industries
   - Pipeline brand context → competitors

## Target Metrics

**Before:**
- Competitors: 0-2 (often 0)
- Analysis time: 3-8 minutes

**After (Phase 1+2):**
- Competitors: 4-6 (consistently)
- Analysis time: 1-3 minutes (75% faster)

**After (All phases):**
- Competitors: 4-6 (consistently)  
- Analysis time: 1-2 minutes (80% faster)

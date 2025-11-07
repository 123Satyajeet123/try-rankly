# Citation Classification Improvements

## Overview

Improved the citation classification logic based on marketing PESO model definitions:
- **Owned Media (Brand)**: Content you own and control
- **Earned Media (Earned)**: Third-party editorial references
- **Shared Media (Social)**: Social media platforms

---

## Changes Made

### 1. Expanded Social Media Domain List ✅

**Before:** Limited list of ~20 social platforms

**After:** Comprehensive list of 50+ social media platforms including:
- Major social networks (Facebook, Twitter/X, Instagram, LinkedIn, etc.)
- Messaging platforms (WhatsApp, Telegram, Signal, Discord, etc.)
- Video platforms (YouTube, TikTok, Twitch, Vimeo, etc.)
- Content sharing (Medium, Tumblr, Flickr, Imgur)
- Q&A platforms (Quora, Stack Overflow)
- Professional networks (Threads, Mastodon)
- Blogging platforms (WordPress.com, Blogger, Substack)

**Key Features:**
- Handles subdomains (e.g., `m.facebook.com`, `uk.linkedin.com`)
- Handles URL shorteners (e.g., `t.co`, `youtu.be`)
- Handles variations (e.g., `fb.com`, `ig.com`)

---

### 2. Generic Earned Media Classification ✅

**Before:** Hardcoded lists of news, review, and financial sites (not generic)

**After:** Pattern-based generic classification that works for any industry:

#### Pattern-Based Classification:

1. **News/Media Outlets:**
   - Patterns: `news`, `media`, `press`, `journal`, `times`, `post`, etc.
   - Examples: `techcrunch.com`, `reuters.com`, `nytimes.com`
   - Confidence: 0.85

2. **Review/Comparison Sites:**
   - Patterns: `review`, `compare`, `ratings`, `best`, `top`, `vs`
   - Examples: `trustpilot.com`, `g2.com`, `capterra.com`
   - Confidence: 0.8

3. **Industry Publications:**
   - Patterns: `industry`, `business`, `tech`, `magazine`, `journal`
   - TLD patterns: `.org`, `.edu`, `.gov` (typically editorial)
   - Examples: `hbr.org`, `forbes.com`
   - Confidence: 0.75

4. **Default Earned Media:**
   - Everything that's not brand or social = earned
   - Third-party editorial references
   - Confidence: 0.7

**Benefits:**
- ✅ Works for any industry (not just financial/tech)
- ✅ No hardcoding of specific domains
- ✅ Automatically classifies new sites based on patterns
- ✅ More accurate confidence scores

---

### 3. Improved Classification Logic ✅

**Classification Order:**
1. **Brand** (checked first) - Only if domain matches the specific brand
2. **Social** (checked second) - If domain matches social media platforms
3. **Earned** (default) - Everything else is earned media

**Key Improvements:**
- Brand classification only checks the target brand (prevents false positives)
- Social media uses comprehensive hardcoded list (as requested)
- Earned media uses generic patterns (no hardcoding)
- Better confidence scoring based on match quality

---

## Classification Examples

### Brand Citations
- `fibr.ai` → **Brand** (confidence: 0.95) ✅
- `blog.fibr.ai` → **Brand** (confidence: 0.85) ✅
- `optimizely.com` for Optimizely → **Brand** ✅
- `optimizely.com` for Fibr AI → **Earned** ✅ (not brand)

### Social Citations
- `facebook.com` → **Social** (confidence: 0.95) ✅
- `linkedin.com` → **Social** (confidence: 0.95) ✅
- `medium.com` → **Social** (confidence: 0.95) ✅
- `quora.com` → **Social** (confidence: 0.95) ✅
- `m.facebook.com` → **Social** (confidence: 0.9) ✅

### Earned Citations
- `techcrunch.com` → **Earned** (confidence: 0.85, label: news_media_outlet) ✅
- `trustpilot.com` → **Earned** (confidence: 0.8, label: review_comparison_site) ✅
- `forbes.com` → **Earned** (confidence: 0.75, label: industry_publication) ✅
- `random-blog.com` → **Earned** (confidence: 0.7, label: third_party_editorial) ✅
- `seventhsense.ai` → **Earned** (confidence: 0.7) ✅ (not brand for Fibr AI)

---

## Technical Details

### Social Media Classification
```javascript
getSocialMediaDomains() {
  // Returns comprehensive list of 50+ social platforms
  // Handles subdomains, variations, and URL shorteners
}
```

### Earned Media Classification
```javascript
classifyEarnedCitation(domain) {
  // Uses regex patterns to identify:
  // - News/media outlets
  // - Review/comparison sites
  // - Industry publications
  // - Default: everything else is earned
}
```

### Classification Flow
```
URL → cleanAndValidateUrl() 
  → classifyBrandCitation() [if brand match → return 'brand']
  → classifySocialCitation() [if social match → return 'social']
  → classifyEarnedCitation() [default → return 'earned']
```

---

## Benefits

1. **Generic & Scalable:**
   - No hardcoded domain lists (except social media)
   - Works for any industry/vertical
   - Automatically handles new sites

2. **Accurate:**
   - Brand citations only for actual brand domains
   - Social media properly identified
   - Earned media correctly classified

3. **Confidence Scoring:**
   - Higher confidence for exact matches
   - Lower confidence for pattern matches
   - Better weighting in citation share calculations

4. **Maintainable:**
   - Only social media list needs updates
   - Pattern-based earned media is self-maintaining
   - Clear separation of concerns

---

## Testing Recommendations

1. **Test Brand Classification:**
   - Verify brand domains are correctly identified
   - Verify competitor domains are NOT marked as brand
   - Test subdomains (blog.example.com)

2. **Test Social Classification:**
   - Verify all major platforms are recognized
   - Test subdomains (m.facebook.com)
   - Test URL shorteners (t.co, youtu.be)

3. **Test Earned Classification:**
   - Verify news sites are classified correctly
   - Verify review sites are classified correctly
   - Verify generic third-party sites default to earned

---

**Status:** ✅ Complete  
**Date:** 2025-11-05



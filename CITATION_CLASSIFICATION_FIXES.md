# Citation Classification Fixes

## Issues Fixed

### 1. ✅ Legacy Domain Matching False Positives

**Problem:**
- Legacy hardcoded domain matching was matching domains like `americanexpress.com`, `chase.com`, `capitalone.com` even when analyzing different brands (e.g., "HDFC Bank Platinum Debit Card")
- This caused false positive brand citations and incorrect classification

**Fix:**
- Modified `classifyBrandCitation` to only use legacy matching if the domain actually matches the target brand
- Added fuzzy matching to compare extracted brand from domain with target brand name
- Legacy matching now returns `unknown` if the domain doesn't match the target brand

**Result:**
- ✅ No more false positive brand matches
- ✅ Legacy warnings only appear when domain actually matches target brand
- ✅ Prevents incorrect classification of competitor domains as brand citations

### 2. ✅ Social Media Classification Too Broad

**Problem:**
- Credit card company domains (`chase.com`, `capitalone.com`) were being classified as "social" instead of "earned"
- Review/comparison sites (`thepointsguy.com`) were being classified as "social" instead of "earned"
- The pattern matching logic was too permissive, matching domains that contained social platform names

**Fix:**
- Removed partial string matching from `classifySocialCitation`
- Now only matches exact domains or subdomains (e.g., `facebook.com`, `m.facebook.com`)
- No longer matches domains that just contain social platform words

**Result:**
- ✅ `chase.com` → `earned` (correct - company website)
- ✅ `capitalone.com` → `earned` (correct - company website)
- ✅ `thepointsguy.com` → `earned` (correct - review site)
- ✅ `facebook.com` → `social` (correct)
- ✅ `m.facebook.com` → `social` (correct)

## Code Changes

### `citationClassificationService.js`

1. **Legacy Domain Matching (lines 282-330)**
   - Added brand name comparison before using legacy matching
   - Only returns brand match if extracted brand matches target brand
   - Returns `unknown` if domain is in legacy list but doesn't match target brand

2. **Social Media Classification (lines 402-438)**
   - Removed partial string matching logic
   - Only exact matches and subdomain matches allowed
   - Prevents false positives from partial word matches

3. **New Method: `extractBrandFromLegacyDomain` (lines 567-606)**
   - Maps legacy domains to their brand names
   - Handles exact matches and subdomain matches
   - Falls back to generic extraction if not in legacy list

## Testing

All fixes verified with test cases:
- ✅ Legacy domain matching only works for target brand
- ✅ Credit card domains correctly classified as earned
- ✅ Social media domains correctly classified as social
- ✅ Review/comparison sites correctly classified as earned

## Impact on Metrics

### Citation Share Calculation
- **Before:** Incorrect classification led to wrong citation counts
  - Brand citations: Overcounted (false positives from legacy matching)
  - Social citations: Overcounted (credit card domains misclassified)
  - Earned citations: Undercounted

- **After:** Accurate classification
  - Brand citations: Only actual brand domains
  - Social citations: Only actual social media platforms
  - Earned citations: All third-party references correctly classified

### Visibility Score
- Visibility score calculation is unaffected (based on mention position, not citations)
- However, citation share accuracy improves overall score reliability

## Next Steps

1. ✅ Fixes applied and tested
2. ⚠️ **Reprocess existing data** - Consider running a script to reprocess existing prompt tests with the fixed classification logic
3. ✅ Monitor logs - Legacy warnings should now only appear when appropriate

## Files Modified

- `backend/src/services/citationClassificationService.js`
  - Fixed legacy domain matching (lines 282-330)
  - Fixed social media classification (lines 402-438)
  - Added `extractBrandFromLegacyDomain` method (lines 567-606)


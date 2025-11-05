# Generic Brand Matching Solution Plan

## Problem Analysis

Currently, the code has hardcoded brand names and abbreviations:
- Hardcoded abbreviation patterns (American Express → Amex, etc.)
- Hardcoded brand domains (americanexpress.com, amex.com, etc.)
- Hardcoded brand mappings in multiple services

**Issue**: If a new brand (e.g., "Tesla", "Apple", "Microsoft") is added, the system won't recognize their domains or abbreviations.

## Research-Based Generic Solution

### 1. Generic Abbreviation Generation Algorithm

**Principles**:
- **Acronym Generation**: First letters of words (e.g., "American Express" → "AE", "AX")
- **Common Word Removal**: Remove articles, prepositions ("the", "of", "for")
- **Syllable-based**: First syllables of words for longer names
- **Word Extraction**: Use significant words only (skip common words)
- **Length-based**: Shorter abbreviations for longer names

**Algorithm**:
```
1. Remove common words (the, a, an, of, for, and, etc.)
2. Extract significant words (length > 2)
3. Generate acronyms (first letter of each word)
4. Generate first-syllable abbreviations (for words > 6 chars)
5. Generate first-word-only (if brand has multiple words)
6. Generate first-two-words combination
```

### 2. Generic Domain Generation Algorithm

**Principles**:
- **Common TLDs**: .com, .org, .net, .io, .co, .ai, .in, .uk
- **Variations**: Remove spaces, hyphens, dots, underscores
- **Subdomain patterns**: www, blog, app, shop, store
- **Country-specific**: .co.uk, .co.in for international brands

**Algorithm**:
```
1. Clean brand name (lowercase, remove special chars)
2. Generate base variations:
   - No spaces: "americanexpress"
   - Hyphens: "american-express"
   - Dots: "american.express"
   - Underscores: "american_express"
3. Add TLDs: .com, .org, .net, .io, etc.
4. Add subdomain patterns: www., blog., app.
5. Add country TLDs: .co.uk, .co.in, etc.
```

### 3. Generic Domain Matching Strategy

**Principles**:
- **Exact Match**: Highest confidence (0.95)
- **Subdomain Match**: Medium confidence (0.85)
- **Fuzzy Match**: Lower confidence (0.7-0.8)
- **Abbreviation Match**: Medium-high confidence (0.9)
- **Pattern Match**: Lower confidence (0.75)

**Multi-Strategy Approach**:
```
1. Exact domain match (exact string)
2. Subdomain match (ends with brand domain)
3. Abbreviation match (domain contains abbreviation)
4. Fuzzy string match (Levenshtein similarity > 0.7)
5. Pattern match (domain contains significant words)
```

### 4. Generic Abbreviation Detection

**Principles**:
- **No hardcoded mappings**: Generate dynamically
- **Context-aware**: Consider brand name structure
- **Confidence scoring**: Based on match quality

**Algorithm**:
```
For brand "American Express":
1. Generate acronyms: "AE", "AX"
2. Generate first letters: "AE"
3. Generate first syllables: "AMEX", "AMEXP"
4. Generate first word: "american"
5. Generate significant words: "express"
6. Generate combinations: "amex", "amxprs"
```

## Implementation Plan

### Phase 1: Generic Abbreviation Generator (No Hardcoding)

**File**: `metricsExtractionService.js` & `promptTestingService.js`

**Changes**:
1. Remove hardcoded `abbrevPatterns` object
2. Implement generic abbreviation generation algorithm
3. Use linguistic patterns (syllables, word extraction)
4. Support any brand name structure

### Phase 2: Generic Domain Generator (No Hardcoding)

**File**: `promptTestingService.js`

**Changes**:
1. Enhance `generateDomainVariations()` to be more comprehensive
2. Remove hardcoded brand domains
3. Generate all possible domain variations algorithmically
4. Support international TLDs

### Phase 3: Generic Domain Matcher (No Hardcoding)

**File**: `promptTestingService.js`

**Changes**:
1. Remove hardcoded brand domain checks
2. Use only dynamic brand matching
3. Implement fuzzy matching for edge cases
4. Confidence-based scoring system

### Phase 4: Fallback Strategy

**Keep hardcoded list as fallback ONLY**:
- Mark as "legacy support"
- Use only if dynamic matching fails
- Log when fallback is used
- Document for gradual deprecation

## Generic Algorithm Specifications

### Abbreviation Generation Algorithm

```javascript
generateAbbreviations(brandName) {
  // 1. Remove common words
  const significantWords = removeCommonWords(brandName);
  
  // 2. Generate acronyms
  const acronyms = generateAcronyms(significantWords);
  
  // 3. Generate syllable-based abbreviations
  const syllableAbbrevs = generateSyllableAbbrevs(significantWords);
  
  // 4. Generate word-based abbreviations
  const wordAbbrevs = generateWordAbbrevs(significantWords);
  
  // 5. Combine and return
  return [...acronyms, ...syllableAbbrevs, ...wordAbbrevs];
}
```

### Domain Generation Algorithm

```javascript
generateDomainVariations(brandName) {
  // 1. Clean and normalize
  const cleanName = normalizeBrandName(brandName);
  
  // 2. Generate base variations
  const bases = [
    cleanName.replace(/\s+/g, ''),      // No spaces
    cleanName.replace(/\s+/g, '-'),     // Hyphens
    cleanName.replace(/\s+/g, '.'),      // Dots
    cleanName.replace(/\s+/g, '_'),     // Underscores
  ];
  
  // 3. Add TLDs
  const tlds = ['.com', '.org', '.net', '.io', '.co', '.ai', '.in', '.uk'];
  
  // 4. Generate all combinations
  const domains = [];
  bases.forEach(base => {
    tlds.forEach(tld => {
      domains.push(base + tld);
      domains.push('www.' + base + tld);
    });
  });
  
  return domains;
}
```

## Testing Strategy

1. **Test with Various Brand Types**:
   - Financial: "Goldman Sachs", "JPMorgan Chase"
   - Tech: "Apple Inc", "Microsoft Corporation"
   - Retail: "Target Corporation", "Walmart Inc"
   - SaaS: "Salesforce", "HubSpot"

2. **Test Edge Cases**:
   - Single-word brands: "Tesla"
   - Multi-word brands: "American Express Company"
   - Brands with special chars: "AT&T", "3M"
   - Brands with numbers: "7-Eleven"

3. **Verify Backward Compatibility**:
   - Existing brands still work
   - No breaking changes
   - Performance not degraded

## Expected Outcomes

- ✅ Works for ANY brand (financial, tech, retail, SaaS, etc.)
- ✅ No hardcoded brand names
- ✅ Generates abbreviations algorithmically
- ✅ Generates domain variations automatically
- ✅ Maintains backward compatibility
- ✅ Performance optimized (caching opportunities)

## Migration Strategy

1. **Phase 1**: Implement generic algorithms alongside hardcoded (parallel)
2. **Phase 2**: Test with new brands to verify generic works
3. **Phase 3**: Mark hardcoded as deprecated, use only as fallback
4. **Phase 4**: Remove hardcoded after sufficient confidence



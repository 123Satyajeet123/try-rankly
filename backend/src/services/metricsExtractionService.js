 /**
 * Deterministic Metrics Extraction Service
 *
 * Instead of asking an LLM to calculate metrics (which is probabilistic),
 * this service extracts structured data from LLM responses and calculates
 * metrics mathematically for consistent, accurate results.
 *
 * This service now performs COMPLETE extraction of all brand mentions,
 * positions, word counts, and depth metrics from raw LLM responses.
 */

class MetricsExtractionService {
  constructor() {
    console.log('📊 MetricsExtractionService initialized');
  }

  /**
   * Extract COMPLETE metrics from a single prompt test response
   * This is the main entry point for deterministic extraction
   *
   * @param {Object} promptTest - PromptTest document with rawResponse
   * @param {Array} allBrandNames - All brands to track (user brand + competitors)
   * @returns {Object} - Complete extracted metrics for all brands
   */
  extractFromPromptTest(promptTest, allBrandNames) {
    const rawResponse = promptTest.rawResponse || '';

    if (!rawResponse) {
      console.warn('⚠️  No rawResponse found in prompt test');
      return null;
    }

    // Extract metrics for all brands
    const extraction = this.extractMetrics(rawResponse, allBrandNames);

    // Calculate depth of mention for each brand
    extraction.brandMetrics.forEach(brand => {
      brand.depthOfMention = this.calculateDepthOfMention(
        brand.sentences,
        extraction.response.totalSentences,
        extraction.response.totalWords
      );
    });

    return extraction;
  }

  /**
   * Extract all brand mentions and calculate metrics from an LLM response
   * @param {string} response - Raw LLM response text
   * @param {string[]} brandNames - List of brand names to track (including user's brand and competitors)
   * @returns {object} - Structured metrics data
   */
  extractMetrics(response, brandNames) {
    // Safety checks for demo reliability
    if (!response || typeof response !== 'string') {
      console.warn('⚠️ [SAFETY] Invalid response in extractMetrics, using empty string');
      response = '';
    }
    if (!Array.isArray(brandNames) || brandNames.length === 0) {
      console.warn('⚠️ [SAFETY] Invalid or empty brandNames array in extractMetrics');
      brandNames = ['Unknown Brand'];
    }

    // Split response into sentences
    const sentences = this.splitIntoSentences(response);
    const totalSentences = sentences.length;
    const totalWords = this.countWords(response);

    console.log(`   📝 [EXTRACT] Processing ${totalSentences} sentences, ${totalWords} words`);

    // Track metrics for each brand
    const brandMetrics = {};
    brandNames.forEach(brand => {
      brandMetrics[brand] = {
        brandName: brand,
        mentioned: false,
        firstPosition: null, // Position of first mention (1-indexed)
        mentionCount: 0,
        sentences: [], // Array of { text, position, wordCount }
        totalWordCount: 0
      };
    });

    // Process each sentence to find brand mentions
    sentences.forEach((sentence, index) => {
      const sentenceWords = this.countWords(sentence);

      brandNames.forEach(brand => {
        const detectionResult = this.containsBrand(sentence, brand);
        // Backward compatible: always returns { detected, confidence, method }
        // Check detected property (new format) or fallback to truthy check
        if (detectionResult && (detectionResult.detected || detectionResult === true)) {
          const metrics = brandMetrics[brand];
          metrics.mentioned = true;
          metrics.mentionCount++;
          
          // Store detection confidence (optional - for weighted calculations)
          // Only add if confidence is available (backward compatible)
          if (detectionResult.confidence !== undefined) {
            if (!metrics.detectionConfidences) {
              metrics.detectionConfidences = [];
            }
            metrics.detectionConfidences.push(detectionResult.confidence);
          }

          // Record first position (1-indexed)
          if (metrics.firstPosition === null) {
            metrics.firstPosition = index + 1;
          }

          // Store sentence with metadata (backward compatible structure)
          const sentenceData = {
            text: sentence,
            position: index,
            wordCount: sentenceWords
          };
          // Add optional enhanced metadata if available
          if (detectionResult.confidence !== undefined) {
            sentenceData.confidence = detectionResult.confidence;
          }
          if (detectionResult.method) {
            sentenceData.detectionMethod = detectionResult.method;
          }
          metrics.sentences.push(sentenceData);

          metrics.totalWordCount += sentenceWords;
        }
      });
    });

    console.log(`   ✅ [EXTRACT] Found mentions for ${Object.values(brandMetrics).filter(m => m.mentioned).length}/${brandNames.length} brands`);

    return {
      response: {
        text: response,
        totalSentences,
        totalWords
      },
      brandMetrics: Object.values(brandMetrics)
    };
  }

  /**
   * Calculate all metrics for a brand based on extracted data
   * Used for aggregation across multiple prompts/responses
   */
  calculateAggregatedMetrics(brandData, totalPrompts, allBrandMetrics, responseText = '') {
    const brandName = brandData.brandName;

    // Visibility Score: % of prompt responses where brand appears
    const appearanceCount = brandData.totalAppearances || 0;
    const visibilityScore = (appearanceCount / totalPrompts) * 100; // totalPrompts here represents total responses

    // Citation Share: % of hyperlinks that mention the brand
    const brandHyperlinks = this.extractBrandHyperlinks(brandData, responseText);
    const totalHyperlinks = this.extractTotalHyperlinks(allBrandMetrics, responseText);
    const citationShare = totalHyperlinks > 0 
      ? (brandHyperlinks / totalHyperlinks) * 100 
      : 0;

    // Word Count: % of total words (not needed for dashboard - removed)

    // Average Position: average first-mention position
    const avgPosition = appearanceCount > 0
      ? brandData.sumPositions / appearanceCount
      : 0;

    // Depth of Mention: word count weighted by position (with exponential decay)
    // This is already calculated in the detailed extraction
    const depthOfMention = brandData.weightedWordCount || 0;

    // Sentiment analysis
    const sentimentData = this.analyzeSentiment(brandData, responseText);

    return {
      brandName,
      visibilityScore: parseFloat(visibilityScore.toFixed(2)),
      citationShare: parseFloat(citationShare.toFixed(2)), // Citation share (hyperlinks)
      avgPosition: parseFloat(avgPosition.toFixed(2)),
      depthOfMention: parseFloat(depthOfMention.toFixed(4)),
      
      // Sentiment analysis
      ...sentimentData,

      // Raw counts (for internal calculations)
      totalAppearances: appearanceCount,
      totalMentions: brandData.totalMentions || 0,
      totalWordCount: brandData.totalWordCount || 0,
      totalCitations: brandHyperlinks
    };
  }

  /**
   * Extract all citations in response, categorizing as brand, competitor, social, or earned.
   * brandUrlsMap: {brandName: [domains]}
   * competitorUrlsMap: {brandName: [domains]}
   * socialDomains: array of domains (lowercase, strip www)
   *
   * Returns array of {url, type, brand (where relevant), text}
   */
  extractCategorizedCitations(response, { brandUrlsMap, competitorUrlsMap, socialDomains }) {
    if (!response) return [];
    const hyperlinkRegex = /\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    const result = [];

    while ((match = hyperlinkRegex.exec(response)) !== null) {
      const text = match[1];
      const url = match[2];
      const domain = this.cleanDomain(url);
      let type = 'earned';
      let brand = null;
      for (const [bname, domains] of Object.entries(brandUrlsMap)) {
        if (domains.some(d => d === domain)) { type = 'brand'; brand = bname; break; }
      }
      if (type === 'earned') {
        for (const [cname, domains] of Object.entries(competitorUrlsMap)) {
          if (domains.some(d => d === domain)) { type = 'competitor'; brand = cname; break; }
        }
      }
      if (type === 'earned' && socialDomains.includes(domain)) {
        type = 'social';
      }
      result.push({ url, type, brand, text });
    }
    return result;
  }

  /**
   * Filter citations to include only brand, competitor, social, or earned types
   * Return {type, url, brand, text} for each, excluding unknown/untyped citations
   */
  filterRelevantCitations(citations) {
    const allowed = new Set(['brand', 'competitor', 'social', 'earned']);
    return (citations || [])
      .filter(cit => cit && allowed.has(cit.type))
      .map(cit => ({
        type: cit.type,
        url: cit.url,
        text: cit.text || '',
        brand: cit.brand || null,
      }));
  }

  cleanDomain(url) {
    try {
      const u = new URL(url); return u.hostname.replace(/^www\./,"").trim().toLowerCase();
    } catch { return url; }
  }

  /**
   * Extract hyperlinks that mention a specific brand
   * @param {object} brandData - Brand data object
   * @param {string} response - LLM response text
   * @returns {number} - Number of hyperlinks mentioning the brand
   */
  extractBrandHyperlinks(brandData, response) {
    if (!response || !brandData) return 0;
    
    const brandName = brandData.brandName;
    const hyperlinkRegex = /\[([^\]]*)\]\(https?:\/\/[^\)]+\)/g;
    let brandHyperlinkCount = 0;
    let match;
    
    // Find all hyperlinks in the response
    while ((match = hyperlinkRegex.exec(response)) !== null) {
      const linkText = match[1].toLowerCase();
      const fullMatch = match[0];
      
      // Check if the link text or surrounding context mentions the brand
      if (linkText.includes(brandName.toLowerCase()) || 
          fullMatch.toLowerCase().includes(brandName.toLowerCase())) {
        brandHyperlinkCount++;
      }
    }
    
    console.log(`   🔗 [HYPERLINKS] Found ${brandHyperlinkCount} hyperlinks for brand: ${brandName}`);
    return brandHyperlinkCount;
  }

  /**
   * Analyze sentiment for a brand in the response
   * @param {object} brandData - Brand data object
   * @param {string} response - LLM response text
   * @returns {object} - Sentiment analysis results
   */
  analyzeSentiment(brandData, response) {
    if (!response || !brandData || !brandData.sentences) {
      return {
        sentimentScore: 0,
        positiveMentions: 0,
        negativeMentions: 0,
        neutralMentions: 0
      };
    }

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    // Simple sentiment analysis based on keywords
    const positiveWords = [
      'leading', 'best', 'excellent', 'outstanding', 'superior', 'premium', 'advanced',
      'innovative', 'reliable', 'trusted', 'comprehensive', 'strong', 'well-regarded',
      'excel', 'attractive', 'competitive', 'expert', 'specialized', 'dedicated'
    ];
    
    const negativeWords = [
      'poor', 'bad', 'worst', 'inferior', 'weak', 'unreliable', 'expensive', 'limited',
      'outdated', 'slow', 'problematic', 'issues', 'concerns', 'disappointing', 'failing'
    ];

    brandData.sentences.forEach(sentence => {
      const text = sentence.text.toLowerCase();
      let sentiment = 'neutral';
      
      // Check for positive words
      const positiveMatches = positiveWords.filter(word => text.includes(word));
      const negativeMatches = negativeWords.filter(word => text.includes(word));
      
      if (positiveMatches.length > negativeMatches.length) {
        sentiment = 'positive';
        positiveCount++;
      } else if (negativeMatches.length > positiveMatches.length) {
        sentiment = 'negative';
        negativeCount++;
      } else {
        neutralCount++;
      }
    });

    const totalSentences = brandData.sentences.length;
    const sentimentScore = totalSentences > 0 
      ? ((positiveCount - negativeCount) / totalSentences) * 100 
      : 0;

    console.log(`   😊 [SENTIMENT] ${brandData.brandName}: ${sentimentScore.toFixed(1)} (${positiveCount}+, ${negativeCount}-, ${neutralCount}~)`);
    
    return {
      sentimentScore: parseFloat(sentimentScore.toFixed(2)),
      positiveMentions: positiveCount,
      negativeMentions: negativeCount,
      neutralMentions: neutralCount
    };
  }

  /**
   * Extract total number of hyperlinks across all brands
   * @param {array} allBrandMetrics - All brand metrics
   * @param {string} responseText - Full response text
   * @returns {number} - Total number of hyperlinks
   */
  extractTotalHyperlinks(allBrandMetrics, responseText) {
    if (!responseText) return 0;
    
    const hyperlinkRegex = /\[([^\]]*)\]\(https?:\/\/[^\)]+\)/g;
    const matches = responseText.match(hyperlinkRegex);
    const totalHyperlinks = matches ? matches.length : 0;
    
    console.log(`   🔗 [HYPERLINKS] Found ${totalHyperlinks} total hyperlinks in response`);
    return totalHyperlinks;
  }

  /**
   * Calculate depth of mention with exponential decay based on sentence position
   * Formula: Σ [words × exp(-position/totalSentences)] / total words in response
   * Position is 1-indexed (first sentence = position 1, not 0)
   */
  calculateDepthOfMention(brandSentences, totalSentences, totalWordsInResponse) {
    if (brandSentences.length === 0 || totalWordsInResponse === 0) {
      return 0;
    }

    let weightedWordCount = 0;

    brandSentences.forEach(sentence => {
      // Convert 0-indexed position to 1-indexed for correct decay calculation
      const position1Indexed = sentence.position + 1;
      const decayFactor = Math.exp(-position1Indexed / totalSentences);
      weightedWordCount += sentence.wordCount * decayFactor;
    });

    // Return as percentage of total words
    return (weightedWordCount / totalWordsInResponse) * 100;
  }

  /**
   * Assign ranking position based on first mention
   * Returns 1, 2, 3, or higher
   */
  calculateMentionPosition(brandMetrics) {
    // Filter brands that were mentioned
    const mentionedBrands = brandMetrics
      .filter(b => b.mentioned && b.firstPosition !== null)
      .sort((a, b) => a.firstPosition - b.firstPosition);

    // Assign positions
    mentionedBrands.forEach((brand, index) => {
      brand.rankPosition = index + 1;
    });

    return brandMetrics;
  }

  /**
   * Split text into sentences using simple rules
   * Handles periods, question marks, exclamation points
   */
  splitIntoSentences(text) {
    if (!text || typeof text !== 'string') return [];

    // Simple sentence splitting - split on ., !, ?
    // This is a simplified version; for production consider using NLP libraries
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences;
  }

  /**
   * Count words in text
   */
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Calculate Levenshtein distance between two strings (optimized with early exit)
   * Used for fuzzy string matching
   * Performance: Early exit if strings are too different (>30% length difference)
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    
    // Early exit: if length difference is too large, skip expensive calculation
    const maxLen = Math.max(m, n);
    const minLen = Math.min(m, n);
    if (maxLen === 0) return 0;
    if (minLen / maxLen < 0.5) return maxLen; // More than 50% difference, likely not similar
    
    // Limit computation for very long strings (performance optimization)
    const MAX_COMPARE_LENGTH = 50;
    if (m > MAX_COMPARE_LENGTH || n > MAX_COMPARE_LENGTH) {
      // Use simple length-based similarity for very long strings
      return Math.abs(m - n) + (m > n ? m : n) * 0.3;
    }

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase()) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity score between two strings (0-1)
   * Based on Levenshtein distance
   */
  calculateSimilarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Remove common words (articles, prepositions) from brand name
   * Generic algorithm that works for any brand
   */
  removeCommonWords(text) {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'company', 'inc', 'incorporated', 'corp', 'corporation', 'ltd', 'limited', 'llc',
      'group', 'holdings', 'enterprises', 'industries', 'international', 'global'
    ]);
    
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => {
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      return cleanWord.length > 2 && !commonWords.has(cleanWord);
    });
  }

  /**
   * Extract first syllables from a word (simple heuristic)
   * For "American" → "am", "ame", "amer"
   */
  extractFirstSyllables(word, maxSyllables = 3) {
    const syllables = [];
    const vowels = /[aeiouy]/gi;
    let vowelCount = 0;
    let currentSyllable = '';
    
    for (let i = 0; i < word.length && vowelCount < maxSyllables; i++) {
      currentSyllable += word[i];
      if (vowels.test(word[i])) {
        vowelCount++;
        if (currentSyllable.length >= 2) {
          syllables.push(currentSyllable);
        }
      }
    }
    
    return syllables.filter(s => s.length >= 2);
  }

  /**
   * Get brand abbreviations (GENERIC - no hardcoding)
   * Works for ANY brand: financial, tech, retail, SaaS, etc.
   * Returns a map of abbreviation -> full brand name
   */
  getBrandAbbreviations(brandName) {
    const abbreviations = new Map();
    if (!brandName || typeof brandName !== 'string') return abbreviations;
    
    // Step 1: Remove common words and get significant words
    const significantWords = this.removeCommonWords(brandName);
    if (significantWords.length === 0) {
      // If all words were common, use original (but clean it)
      significantWords.push(...brandName.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    }
    
    // Step 2: Generate acronyms from first letters
    if (significantWords.length > 1) {
      // Full acronym: "American Express" → "ae"
      const fullAcronym = significantWords.map(w => w[0]).join('').toLowerCase();
      if (fullAcronym.length >= 2) {
        abbreviations.set(fullAcronym, brandName);
      }
      
      // First two words acronym
      if (significantWords.length >= 2) {
        const twoWordAcronym = significantWords.slice(0, 2).map(w => w[0]).join('').toLowerCase();
        if (twoWordAcronym.length >= 2 && twoWordAcronym !== fullAcronym) {
          abbreviations.set(twoWordAcronym, brandName);
        }
      }
    }
    
    // Step 3: Generate syllable-based abbreviations (for longer words)
    significantWords.forEach(word => {
      if (word.length > 6) {
        const syllables = this.extractFirstSyllables(word, 2);
        syllables.forEach(syllable => {
          if (syllable.length >= 2 && syllable.length <= 6) {
            abbreviations.set(syllable, brandName);
          }
        });
      }
    });
    
    // Step 4: Generate word-based abbreviations
    // First word only
    if (significantWords.length > 1 && significantWords[0].length >= 3) {
      abbreviations.set(significantWords[0], brandName);
    }
    
    // First two words combined
    if (significantWords.length >= 2) {
      const firstTwo = significantWords.slice(0, 2).join('');
      if (firstTwo.length >= 3) {
        abbreviations.set(firstTwo, brandName);
      }
    }
    
    // Step 5: Generate first word + last word initial
    if (significantWords.length >= 2) {
      const firstLast = (significantWords[0] + significantWords[significantWords.length - 1][0]).toLowerCase();
      if (firstLast.length >= 3) {
        abbreviations.set(firstLast, brandName);
      }
    }
    
    // Step 6: Generate first letter + partial word combinations
    if (significantWords.length >= 2) {
      const firstLetter = significantWords[0][0];
      significantWords.slice(1).forEach(word => {
        if (word.length >= 4) {
          for (let len = 3; len <= Math.min(5, word.length); len++) {
            const combo = firstLetter + word.substring(0, len);
            if (combo.length >= 3) {
              abbreviations.set(combo, brandName);
            }
          }
        }
      });
    }

    return abbreviations;
  }

  /**
   * Check if a sentence contains a brand mention with confidence scoring
   * Returns: { detected: boolean, confidence: number (0-1), method: string }
   * Uses case-insensitive word boundary matching with fuzzy matching, abbreviations, and partial matching
   */
  containsBrand(sentence, brandName, options = {}) {
    if (!sentence || !brandName) {
      return { detected: false, confidence: 0 };
    }

    // Strategy 1: Exact match with word boundaries (confidence: 1.0)
    const escapedBrand = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`\\b${escapedBrand}\\b`, 'i');
    
    if (exactRegex.test(sentence)) {
      return { detected: true, confidence: 1.0, method: 'exact' };
    }

    // Strategy 2: Abbreviation matching (confidence: 0.9)
    const abbreviations = this.getBrandAbbreviations(brandName);
    for (const [abbrev, fullBrand] of abbreviations.entries()) {
      const abbrevRegex = new RegExp(`\\b${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (abbrevRegex.test(sentence)) {
        return { detected: true, confidence: 0.9, method: 'abbreviation' };
      }
    }

    // Strategy 3: Partial word match (if brand name contains multiple words)
    const brandWords = brandName.split(/\s+/).filter(w => w.length > 2);
    if (brandWords.length >= 2) {
      const allWordsMatch = brandWords.every(word => {
        const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return wordRegex.test(sentence);
      });
      
      if (allWordsMatch) {
        const sentenceWords = sentence.split(/\s+/);
        const wordIndices = brandWords.map(word => {
          return sentenceWords.findIndex(w => 
            w.toLowerCase().replace(/[^\w]/g, '') === word.toLowerCase().replace(/[^\w]/g, '')
          );
        }).filter(idx => idx !== -1).sort((a, b) => a - b);
        
        if (wordIndices.length === brandWords.length) {
          const maxDistance = Math.max(...wordIndices) - Math.min(...wordIndices);
          if (maxDistance <= 10) {
            return { detected: true, confidence: 0.85, method: 'partial' };
          } else {
            return { detected: true, confidence: 0.7, method: 'partial-distant' };
          }
        }
      }
    }

    // Strategy 4: Fuzzy matching with Levenshtein distance (OPTIMIZED)
    // Only check if brand name is short enough (performance optimization)
    // Skip fuzzy matching for very long brand names/sentences to avoid performance overhead
    if (brandName.length <= 30 && sentence.length <= 200) {
      const sentenceWords = sentence.split(/\s+/);
      // Limit fuzzy matching to first 5 words to avoid performance overhead
      const maxWords = Math.min(sentenceWords.length, 5);
      for (let i = 0; i < maxWords; i++) {
        // Check single word
        const word = sentenceWords[i].replace(/[^\w]/g, '');
        if (word.length >= 3 && word.length <= brandName.length + 5) {
          const similarity = this.calculateSimilarity(word, brandName);
          if (similarity >= 0.7) {
            return { detected: true, confidence: similarity * 0.9, method: 'fuzzy' };
          }
        }

        // Check two-word phrases (only first 3 phrases to limit computation)
        if (i < maxWords - 1 && i < 3) {
          const phrase = (sentenceWords[i] + ' ' + sentenceWords[i + 1]).replace(/[^\w\s]/g, '');
          if (phrase.length >= 4) {
            const similarity = this.calculateSimilarity(phrase, brandName);
            if (similarity >= 0.7) {
              return { detected: true, confidence: similarity * 0.9, method: 'fuzzy-phrase' };
            }
          }
        }
      }
    }

    // Strategy 5: Variation matching
    if (brandName.length > 10) {
      const variations = this.generateBrandVariations(brandName);
      
      for (const variation of variations) {
        const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const variationRegex = new RegExp(`\\b${escapedVariation}\\b`, 'i');
        
        if (variationRegex.test(sentence)) {
          return { detected: true, confidence: 0.8, method: 'variation' };
        }
      }
    }

    return { detected: false, confidence: 0 };
  }

  /**
   * Generate common variations of a brand name for fuzzy matching
   */
  generateBrandVariations(brandName) {
    const variations = [];
    
    // Replace common words that might vary
    const replacements = [
      { from: /\bfor\b/gi, to: 'of' },
      { from: /\bof\b/gi, to: 'for' },
      { from: /\byour\b/gi, to: 'a' },
      { from: /\ba\b/gi, to: 'your' },
      { from: /\bthe\b/gi, to: '' }, // Remove "the"
      { from: /\bdesign\b/gi, to: 'design' }, // Keep as is
      { from: /\bsystem\b/gi, to: 'system' }, // Keep as is
    ];

    // Apply each replacement
    replacements.forEach(replacement => {
      const variation = brandName.replace(replacement.from, replacement.to);
      if (variation !== brandName && variation.trim().length > 0) {
        variations.push(variation.trim());
      }
    });

    // Also try without common articles and prepositions
    const withoutArticles = brandName.replace(/\b(the|a|an|for|of|your)\b/gi, '').trim();
    if (withoutArticles !== brandName && withoutArticles.length > 0) {
      variations.push(withoutArticles);
    }

    return variations;
  }

  /**
   * Rank brands by a specific metric
   * @param {Array} brandMetrics - Array of brand metrics
   * @param {string} metricKey - Key to rank by (e.g., 'visibilityScore')
   * @param {boolean} ascending - True for ascending (lower is better), false for descending
   * @returns {Array} - Brands with rank assigned
   */
  rankBrands(brandMetrics, metricKey, ascending = false) {
    const sorted = [...brandMetrics].sort((a, b) => {
      if (ascending) {
        return a[metricKey] - b[metricKey];
      }
      return b[metricKey] - a[metricKey];
    });

    sorted.forEach((brand, index) => {
      brand.rank = index + 1;
    });

    return sorted;
  }

  /**
   * Calculate position distribution (1st, 2nd, 3rd) for each brand
   * across all prompts
   */
  calculatePositionDistribution(promptTests) {
    const distribution = {};

    promptTests.forEach(test => {
      if (!test.brandMetrics) return;

      // Sort brands by first position for this prompt
      const ranked = [...test.brandMetrics]
        .filter(b => b.mentioned && b.firstPosition !== null)
        .sort((a, b) => a.firstPosition - b.firstPosition);

      // Count 1st, 2nd, 3rd positions
      ranked.forEach((brand, index) => {
        if (!distribution[brand.brandName]) {
          distribution[brand.brandName] = {
            count1st: 0,
            count2nd: 0,
            count3rd: 0
          };
        }

        if (index === 0) distribution[brand.brandName].count1st++;
        else if (index === 1) distribution[brand.brandName].count2nd++;
        else if (index === 2) distribution[brand.brandName].count3rd++;
      });
    });

    return distribution;
  }

  /**
   * Extract competitor names from response with confidence scores
   * Useful for identifying which competitors are being mentioned
   * Returns array of { name, confidence }
   */
  extractCompetitorMentions(response, competitorNames) {
    const mentioned = [];

    competitorNames.forEach(competitor => {
      const detectionResult = this.containsBrand(response, competitor);
      if (detectionResult.detected) {
        mentioned.push({
          name: competitor,
          confidence: detectionResult.confidence,
          method: detectionResult.method
        });
      }
    });

    return mentioned;
  }

  /**
   * Validate and normalize brand names for consistent matching
   */
  normalizeBrandName(brandName) {
    if (!brandName) return '';
    return brandName.trim();
  }
}

module.exports = new MetricsExtractionService();

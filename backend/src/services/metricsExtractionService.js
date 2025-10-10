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
        if (this.containsBrand(sentence, brand)) {
          const metrics = brandMetrics[brand];
          metrics.mentioned = true;
          metrics.mentionCount++;

          // Record first position (1-indexed)
          if (metrics.firstPosition === null) {
            metrics.firstPosition = index + 1;
          }

          // Store sentence with metadata
          metrics.sentences.push({
            text: sentence,
            position: index,
            wordCount: sentenceWords
          });

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

    // Visibility Score: % of prompts where brand appears
    const appearanceCount = brandData.totalAppearances || 0;
    const visibilityScore = (appearanceCount / totalPrompts) * 100;

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
   * Check if a sentence contains a brand mention
   * Uses case-insensitive word boundary matching with fuzzy matching for variations
   */
  containsBrand(sentence, brandName) {
    if (!sentence || !brandName) return false;

    // First try exact matching
    const escapedBrand = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`\\b${escapedBrand}\\b`, 'i');
    
    if (exactRegex.test(sentence)) {
      return true;
    }

    // For longer brand names, try fuzzy matching with common variations
    if (brandName.length > 10) {
      // Create variations by replacing common words
      const variations = this.generateBrandVariations(brandName);
      
      for (const variation of variations) {
        const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const variationRegex = new RegExp(`\\b${escapedVariation}\\b`, 'i');
        
        if (variationRegex.test(sentence)) {
          return true;
        }
      }
    }

    return false;
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
   * Extract competitor names from response
   * Useful for identifying which competitors are being mentioned
   */
  extractCompetitorMentions(response, competitorNames) {
    const mentioned = [];

    competitorNames.forEach(competitor => {
      if (this.containsBrand(response, competitor)) {
        mentioned.push(competitor);
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

/**
 * Deterministic Metrics Extraction Service
 *
 * Instead of asking an LLM to calculate metrics (which is probabilistic),
 * this service extracts structured data from LLM responses and calculates
 * metrics mathematically for consistent, accurate results.
 */

class MetricsExtractionService {
  constructor() {
    console.log('📊 MetricsExtractionService initialized');
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
  calculateAggregatedMetrics(brandData, totalPrompts, allBrandMetrics) {
    const brandName = brandData.brandName;

    // Visibility Score: % of prompts where brand appears
    const appearanceCount = brandData.totalAppearances || 0;
    const visibilityScore = (appearanceCount / totalPrompts) * 100;

    // Share of Voice: % of total mentions
    const totalMentionsAllBrands = allBrandMetrics.reduce((sum, b) => sum + (b.totalMentions || 0), 0);
    const shareOfVoice = totalMentionsAllBrands > 0
      ? (brandData.totalMentions / totalMentionsAllBrands) * 100
      : 0;

    // Word Count: % of total words
    const totalWordsAllBrands = allBrandMetrics.reduce((sum, b) => sum + (b.totalWordCount || 0), 0);
    const wordCount = totalWordsAllBrands > 0
      ? (brandData.totalWordCount / totalWordsAllBrands) * 100
      : 0;

    // Average Position: average first-mention position
    const avgPosition = appearanceCount > 0
      ? brandData.sumPositions / appearanceCount
      : 0;

    // Depth of Mention: word count weighted by position (with exponential decay)
    // This is already calculated in the detailed extraction
    const depthOfMention = brandData.weightedWordCount || 0;

    return {
      brandName,
      visibilityScore: parseFloat(visibilityScore.toFixed(2)),
      shareOfVoice: parseFloat(shareOfVoice.toFixed(2)),
      wordCount: parseFloat(wordCount.toFixed(2)),
      avgPosition: parseFloat(avgPosition.toFixed(2)),
      depthOfMention: parseFloat(depthOfMention.toFixed(4)),

      // Raw counts
      totalAppearances: appearanceCount,
      totalMentions: brandData.totalMentions || 0,
      totalWordCount: brandData.totalWordCount || 0,

      // Position distribution
      count1st: brandData.count1st || 0,
      count2nd: brandData.count2nd || 0,
      count3rd: brandData.count3rd || 0
    };
  }

  /**
   * Calculate depth of mention with exponential decay based on sentence position
   * Formula: Σ [words × exp(-position/totalSentences)] / total words in response
   */
  calculateDepthOfMention(brandSentences, totalSentences, totalWordsInResponse) {
    if (brandSentences.length === 0 || totalWordsInResponse === 0) {
      return 0;
    }

    let weightedWordCount = 0;

    brandSentences.forEach(sentence => {
      const decayFactor = Math.exp(-sentence.position / totalSentences);
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
   * Uses case-insensitive word boundary matching
   */
  containsBrand(sentence, brandName) {
    if (!sentence || !brandName) return false;

    // Escape special regex characters in brand name
    const escapedBrand = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create regex with word boundaries for exact matching
    // This prevents partial matches (e.g., "Apple" shouldn't match "Pineapple")
    const regex = new RegExp(`\\b${escapedBrand}\\b`, 'i');

    return regex.test(sentence);
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

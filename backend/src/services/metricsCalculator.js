/**
 * Comprehensive Metrics Calculator Service
 * 
 * Implements core metric calculations based on dashboard requirements:
 * - Visibility Score (how often brand appears)
 * - Depth of Mention (position-weighted word count)
 * - Average Position (average mention position)
 * - Citation Share (percentage of hyperlinks)
 * - Sentiment Analysis (positive/negative/neutral mentions)
 * 
 * All formulas are deterministic and match the frontend dashboard requirements.
 */

class MetricsCalculator {
  constructor() {
    console.log('📊 MetricsCalculator initialized');
  }

  /**
   * Calculate all metrics for aggregated data
   * @param {Array} promptTests - Array of PromptTest documents with brandMetrics
   * @param {Array} brandNames - All brand names being tracked
   * @returns {Object} Complete metrics for all brands
   */
  calculateAllMetrics(promptTests, brandNames) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 [CALCULATOR] Calculating metrics for ${promptTests.length} tests, ${brandNames.length} brands`);
    console.log('='.repeat(70));

    // Initialize brand accumulators
    const brandData = {};
    brandNames.forEach(brandName => {
      brandData[brandName] = {
        brandName,
        brandId: brandName.toLowerCase().replace(/\s+/g, '_'),
        
        // Accumulators for calculations
        totalPrompts: 0,
        promptsWithBrand: 0,
        totalMentions: 0,
        totalWords: 0,
        totalWeightedWords: 0,
        positions: [],
        
        // Citation tracking
        totalCitations: 0,
        
        // Sentiment tracking
        positiveMentions: 0,
        negativeMentions: 0,
        neutralMentions: 0,
        
        // For averages
        sumPositions: 0,
        appearances: 0
      };
    });

    // Global totals
    let totalWordsAllResponses = 0;
    let totalMentionsAllBrands = 0;
    const totalPromptsCount = promptTests.length;

    // ✅ CORRECT: Calculate visibility score based on explicit brand mentions in prompt text
    // Get unique prompts and check for explicit brand mentions
    const uniquePrompts = promptTests.reduce((acc, test) => {
      const promptId = test.promptId.toString();
      if (!acc[promptId]) {
        acc[promptId] = {
          promptId: test.promptId,
          promptText: test.promptText,
          tests: []
        };
      }
      acc[promptId].tests.push(test);
      return acc;
    }, {});

    const uniquePromptList = Object.values(uniquePrompts);
    const actualTotalPrompts = uniquePromptList.length;
    console.log(`📊 [CALCULATOR] Found ${actualTotalPrompts} unique prompts`);

    // Count prompts where each brand is explicitly mentioned in the prompt text
    const brandPromptCounts = {};
    brandNames.forEach(brandName => {
      brandPromptCounts[brandName] = uniquePromptList.filter(prompt => 
        prompt.promptText.toLowerCase().includes(brandName.toLowerCase())
      ).length;
      console.log(`📊 [CALCULATOR] ${brandName} explicitly mentioned in ${brandPromptCounts[brandName]}/${actualTotalPrompts} prompts`);
    });

    // Set totalPrompts and promptsWithBrand for all brands
    brandNames.forEach(brandName => {
      brandData[brandName].totalPrompts = actualTotalPrompts;
      brandData[brandName].promptsWithBrand = brandPromptCounts[brandName];
    });

    // Process each prompt test
    promptTests.forEach(test => {
      if (!test.brandMetrics || test.brandMetrics.length === 0) {
        console.warn(`⚠️  No brandMetrics in test ${test._id}`);
        return;
      }

      // Add response metadata totals
      if (test.responseMetadata?.totalWords) {
        totalWordsAllResponses += test.responseMetadata.totalWords;
      }

      // Sort brands by first position for this response
      const mentionedBrands = test.brandMetrics
        .filter(b => b.mentioned && b.firstPosition !== null)
        .sort((a, b) => a.firstPosition - b.firstPosition);

      // Count total mentions for share of voice
      mentionedBrands.forEach(brand => {
        totalMentionsAllBrands += brand.mentionCount || 1;
      });

      // Process each brand's metrics
      test.brandMetrics.forEach(brandMetric => {
        const brandName = brandMetric.brandName;
        if (!brandData[brandName]) {
          console.warn(`⚠️  Unknown brand: ${brandName}`);
          return;
        }

        const data = brandData[brandName];
        // ✅ CORRECT: promptsWithBrand is already set based on explicit prompt mentions
        // Don't increment it here based on LLM responses

        if (brandMetric.mentioned) {
          // Don't increment promptsWithBrand here - it's already set correctly above
          data.totalMentions += brandMetric.mentionCount || 1;
          data.totalWords += brandMetric.totalWordCount || 0;
          
          // Add weighted words for depth of mention
          if (brandMetric.depthOfMention && test.responseMetadata?.totalWords) {
            // depthOfMention is already a percentage, convert back to weighted words
            const weightedWords = (brandMetric.depthOfMention / 100) * test.responseMetadata.totalWords;
            data.totalWeightedWords += weightedWords;
          }

          // Track position
          if (brandMetric.firstPosition) {
            data.positions.push(brandMetric.firstPosition);
            data.sumPositions += brandMetric.firstPosition;
            data.appearances++;
          }

          // Track citations
          if (brandMetric.totalCitations) {
            data.totalCitations += brandMetric.totalCitations;
          }
          
          // Track sentiment
          if (brandMetric.positiveMentions) data.positiveMentions += brandMetric.positiveMentions;
          if (brandMetric.negativeMentions) data.negativeMentions += brandMetric.negativeMentions;
          if (brandMetric.neutralMentions) data.neutralMentions += brandMetric.neutralMentions;
        }
      });
    });

    // Calculate final metrics for each brand
    const brandMetrics = brandNames.map(brandName => {
      const data = brandData[brandName];
      
      // 1. Visibility Score: (responses with brand / total responses) × 100
      const visibilityScore = data.totalPrompts > 0
        ? (data.promptsWithBrand / data.totalPrompts) * 100
        : 0;

      // 2. Depth of Mention: (weighted words / total words all responses) × 100
      const depthOfMention = totalWordsAllResponses > 0
        ? (data.totalWeightedWords / totalWordsAllResponses) * 100
        : 0;

      // 3. Average Position: sum positions / appearances
      const avgPosition = data.appearances > 0
        ? data.sumPositions / data.appearances
        : 0;
        
      // 4. Citation Share: (total citations / total citations all brands) × 100
      const totalCitationsAllBrands = brandNames.reduce((sum, name) => sum + brandData[name].totalCitations, 0);
      const citationShare = totalCitationsAllBrands > 0
        ? (data.totalCitations / totalCitationsAllBrands) * 100
        : 0;
        
      // 5. Sentiment Score: (positive - negative) / total sentiment mentions × 100
      const totalSentimentMentions = data.positiveMentions + data.negativeMentions + data.neutralMentions;
      const sentimentScore = totalSentimentMentions > 0
        ? ((data.positiveMentions - data.negativeMentions) / totalSentimentMentions) * 100
        : 0;

      return {
        brandId: data.brandId,
        brandName: data.brandName,
        
        // Core Metrics (with 2 decimal places)
        visibilityScore: parseFloat(visibilityScore.toFixed(2)),
        depthOfMention: parseFloat(depthOfMention.toFixed(2)),
        avgPosition: parseFloat(avgPosition.toFixed(2)),
        citationShare: parseFloat(citationShare.toFixed(2)),
        sentimentScore: parseFloat(sentimentScore.toFixed(2)),
        
        // Sentiment breakdown
        positiveMentions: data.positiveMentions,
        negativeMentions: data.negativeMentions,
        neutralMentions: data.neutralMentions,
        
        // Raw Counts
        totalAppearances: data.promptsWithBrand,
        totalMentions: data.totalMentions,
        totalWordCountRaw: data.totalWords,
        
        // For debugging
        _debug: {
          totalPrompts: data.totalPrompts,
          sumPositions: data.sumPositions,
          totalWeightedWords: data.totalWeightedWords
        }
      };
    });

    // Assign ranks for each metric
    this.assignRanks(brandMetrics, 'visibilityScore', 'visibilityRank', false); // Higher is better
    this.assignRanks(brandMetrics, 'wordCount', 'wordCountRank', false);
    this.assignRanks(brandMetrics, 'depthOfMention', 'depthRank', false);
    this.assignRanks(brandMetrics, 'shareOfVoice', 'shareOfVoiceRank', false);
    this.assignRanks(brandMetrics, 'avgPosition', 'avgPositionRank', true); // Lower is better
    this.assignRanks(brandMetrics, 'count1st', 'rank1st', false);
    this.assignRanks(brandMetrics, 'count2nd', 'rank2nd', false);
    this.assignRanks(brandMetrics, 'count3rd', 'rank3rd', false);

    console.log(`✅ [CALCULATOR] Calculated metrics for ${brandMetrics.length} brands`);
    
    return {
      brandMetrics,
      totals: {
        totalPrompts: totalPromptsCount,
        totalResponses: promptTests.length,
        totalBrands: brandNames.length,
        totalWordsAllResponses,
        totalMentionsAllBrands
      }
    };
  }

  /**
   * Assign ranks to brands based on a metric
   * @param {Array} brandMetrics - Array of brand metrics
   * @param {String} metricKey - Key to rank by (e.g., 'visibilityScore')
   * @param {String} rankKey - Key to store rank (e.g., 'visibilityRank')
   * @param {Boolean} ascending - True if lower values are better (e.g., avgPosition)
   */
  assignRanks(brandMetrics, metricKey, rankKey, ascending = false) {
    // Sort brands by metric
    const sorted = [...brandMetrics].sort((a, b) => {
      const aVal = a[metricKey] || 0;
      const bVal = b[metricKey] || 0;
      return ascending ? aVal - bVal : bVal - aVal;
    });

    // Assign ranks (handle ties)
    let currentRank = 1;
    sorted.forEach((brand, index) => {
      if (index > 0) {
        const prevValue = sorted[index - 1][metricKey] || 0;
        const currValue = brand[metricKey] || 0;
        
        // If values are different, increment rank
        if (prevValue !== currValue) {
          currentRank = index + 1;
        }
        // If values are the same, keep the same rank
      }
      
      // Find original brand and assign rank
      const originalBrand = brandMetrics.find(b => b.brandName === brand.brandName);
      if (originalBrand) {
        originalBrand[rankKey] = currentRank;
      }
    });
  }

  /**
   * Calculate metrics for a specific scope (platform, topic, persona)
   * @param {Array} promptTests - Filtered prompt tests for this scope
   * @param {Array} brandNames - All brand names
   * @param {String} scope - 'platform', 'topic', or 'persona'
   * @param {String} scopeValue - The specific value (e.g., 'chatgpt', 'Personalization')
   * @returns {Object} Metrics for this scope
   */
  calculateScopeMetrics(promptTests, brandNames, scope, scopeValue) {
    const result = this.calculateAllMetrics(promptTests, brandNames);
    
    return {
      scope,
      scopeValue,
      ...result
    };
  }

  /**
   * Calculate depth of mention for a single brand in a single response
   * Uses exponential decay: exp(-position/total)
   * 
   * @param {Array} sentences - Array of sentence objects {text, position, wordCount}
   * @param {Number} totalSentences - Total sentences in response
   * @param {Number} totalWords - Total words in response
   * @returns {Number} Depth of mention as percentage
   */
  calculateDepthOfMention(sentences, totalSentences, totalWords) {
    if (!sentences || sentences.length === 0 || totalWords === 0) {
      return 0;
    }

    let weightedWordCount = 0;

    sentences.forEach(sentence => {
      // Exponential decay: earlier mentions get higher weight
      const decayFactor = Math.exp(-sentence.position / totalSentences);
      const weighted = sentence.wordCount * decayFactor;
      weightedWordCount += weighted;
      
      console.log(`   📍 Sentence ${sentence.position + 1}/${totalSentences}: ` +
                  `${sentence.wordCount} words × ${decayFactor.toFixed(4)} = ${weighted.toFixed(2)}`);
    });

    // Return as percentage
    const depthPercentage = (weightedWordCount / totalWords) * 100;
    console.log(`   ✅ Total weighted: ${weightedWordCount.toFixed(2)} / ${totalWords} = ${depthPercentage.toFixed(2)}%`);
    
    return parseFloat(depthPercentage.toFixed(4));
  }

  /**
   * Calculate position distribution percentages
   * @param {Object} brandMetric - Brand metric object with count1st, count2nd, count3rd
   * @returns {Object} Percentages for each position
   */
  calculatePositionDistributionPercentages(brandMetric) {
    const total = (brandMetric.count1st || 0) + 
                  (brandMetric.count2nd || 0) + 
                  (brandMetric.count3rd || 0) +
                  (brandMetric.countOther || 0);

    if (total === 0) {
      return {
        firstRank: 0,
        secondRank: 0,
        thirdRank: 0,
        otherRank: 0
      };
    }

    return {
      firstRank: parseFloat(((brandMetric.count1st / total) * 100).toFixed(2)),
      secondRank: parseFloat(((brandMetric.count2nd / total) * 100).toFixed(2)),
      thirdRank: parseFloat(((brandMetric.count3rd / total) * 100).toFixed(2)),
      otherRank: parseFloat(((brandMetric.countOther / total) * 100).toFixed(2))
    };
  }

  /**
   * Format metrics for dashboard API response
   * @param {Object} metrics - Raw calculated metrics
   * @param {String} userBrandName - Name of user's brand
   * @returns {Object} Formatted for dashboard
   */
  formatForDashboard(metrics, userBrandName) {
    // Find user's brand
    const userBrand = metrics.brandMetrics.find(b => 
      b.brandName === userBrandName || 
      b.brandId === userBrandName?.toLowerCase().replace(/\s+/g, '_')
    ) || metrics.brandMetrics[0];

    // Calculate position distribution percentages for user brand
    const positionDist = this.calculatePositionDistributionPercentages(userBrand);

    return {
      scope: metrics.scope || 'overall',
      scopeValue: metrics.scopeValue || null,
      
      summary: {
        totalPrompts: metrics.totals.totalPrompts,
        totalBrands: metrics.totals.totalBrands,
        yourBrand: {
          name: userBrand.brandName,
          visibilityScore: userBrand.visibilityScore,
          visibilityRank: userBrand.visibilityRank,
          depthOfMention: userBrand.depthOfMention,
          depthRank: userBrand.depthRank,
          avgPosition: userBrand.avgPosition,
          avgPositionRank: userBrand.avgPositionRank,
          shareOfVoice: userBrand.shareOfVoice,
          shareOfVoiceRank: userBrand.shareOfVoiceRank,
          ...positionDist
        }
      },
      
      brandMetrics: metrics.brandMetrics.map(brand => ({
        ...brand,
        ...this.calculatePositionDistributionPercentages(brand),
        // Remove debug info
        _debug: undefined
      })),
      
      lastCalculated: new Date()
    };
  }

  /**
   * Validate calculated metrics against expected formulas
   * Useful for testing and debugging
   */
  validateMetrics(metrics, promptTests) {
    console.log('\n🔍 [VALIDATION] Checking metric calculations...');
    
    const totalPrompts = promptTests.length;
    
    metrics.brandMetrics.forEach(brand => {
      // Validate visibility score
      const expectedVisibility = (brand.totalAppearances / totalPrompts) * 100;
      const actualVisibility = brand.visibilityScore;
      
      if (Math.abs(expectedVisibility - actualVisibility) > 0.01) {
        console.warn(`⚠️  ${brand.brandName}: Visibility mismatch - Expected: ${expectedVisibility.toFixed(2)}, Got: ${actualVisibility}`);
      } else {
        console.log(`✅ ${brand.brandName}: Visibility Score validated`);
      }
    });
    
    console.log('✅ [VALIDATION] Complete\n');
  }
}

module.exports = new MetricsCalculator();


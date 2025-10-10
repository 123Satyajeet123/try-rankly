/**
 * Metrics Aggregation Service
 *
 * Aggregates PromptTest results into dashboard metrics using deterministic formulas.
 * Calculates metrics at: Overall, Platform, Topic, Persona levels
 *
 * Uses sentence-level data from PromptTest.brandMetrics to calculate:
 * - Total Mentions (primary ranking metric)
 * - Depth of Mention (exponential decay formula)
 * - Average Position
 * - Share of Voice
 * - Citation Share (brand, earned, social)
 * - Sentiment Score & Breakdown
 * - Position Distribution
 */

const PromptTest = require('../models/PromptTest');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const UrlAnalysis = require('../models/UrlAnalysis');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const PerformanceInsights = require('../models/PerformanceInsights');
const insightsGenerationService = require('./insightsGenerationService');

class MetricsAggregationService {
  constructor() {
    console.log('📊 MetricsAggregationService initialized');
  }

  /**
   * Calculate and store all metrics for a user
   * @param {string} userId - User ID
   * @param {object} filters - Optional filters { urlAnalysisId, dateFrom, dateTo }
   * @returns {Promise<object>} - Aggregation results
   */
  async calculateMetrics(userId, filters = {}) {
    try {
      console.log('📊 Starting metrics aggregation for user:', userId);

      const { urlAnalysisId, dateFrom, dateTo } = filters;

      // Build query
      const query = {
        userId,
        status: 'completed'
      };

      if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId;
      if (dateFrom || dateTo) {
        query.testedAt = {};
        if (dateFrom) query.testedAt.$gte = new Date(dateFrom);
        if (dateTo) query.testedAt.$lte = new Date(dateTo);
      }

      // Fetch all completed tests
      const tests = await PromptTest.find(query)
        .populate('topicId', 'name')
        .populate('personaId', 'type')
        .lean();

      if (!tests || tests.length === 0) {
        console.log('⚠️  No completed tests found');
        return { success: false, message: 'No tests to aggregate' };
      }

      console.log(`✅ Found ${tests.length} tests to aggregate`);

      // Calculate metrics at each scope level
      const results = {
        overall: await this.aggregateOverall(userId, tests, filters),
        platform: await this.aggregatePlatform(userId, tests, filters),
        topic: await this.aggregateTopic(userId, tests, filters),
        persona: await this.aggregatePersona(userId, tests, filters)
      };

      const totalCalculations = 
        (results.overall ? 1 : 0) + 
        results.platform.length + 
        results.topic.length + 
        results.persona.length;

      console.log('✅ Metrics aggregation complete');
      console.log('   Overall:', results.overall ? 'saved' : 'skipped');
      console.log('   Platforms:', results.platform.length, 'saved');
      console.log('   Topics:', results.topic.length, 'saved');
      console.log('   Personas:', results.persona.length, 'saved');
      console.log('   Total calculations:', totalCalculations);

      // ✅ Generate AI-powered Performance Insights after metrics aggregation
      let insightsGenerated = false;
      if (results.overall) {
        try {
          console.log('🧠 Generating AI-powered Performance Insights...');
          
          const context = {
            brandName: results.overall.brandMetrics?.[0]?.brandName || 'Your Brand',
            userId,
            urlAnalysisId: results.overall.urlAnalysisId,
            totalPrompts: results.overall.totalPrompts,
            totalResponses: results.overall.totalResponses
          };

          const insightsResult = await insightsGenerationService.generateInsights(
            { overall: results.overall, platforms: results.platform, topics: results.topic, personas: results.persona },
            context
          );

          console.log(`✅ AI Insights generated: ${insightsResult.insights.length} insights`);
          console.log('   What\'s Working:', insightsResult.insights.filter(i => i.category === 'whats_working').length);
          console.log('   Needs Attention:', insightsResult.insights.filter(i => i.category === 'needs_attention').length);
          
          // ✅ Save insights to database
          const performanceInsights = new PerformanceInsights({
            userId,
            urlAnalysisId: results.overall.urlAnalysisId,
            model: insightsResult.metadata.model,
            metricsSnapshot: {
              totalTests: results.overall.totalResponses || 0,
              totalBrands: results.overall.totalBrands || 0,
              totalPrompts: results.overall.totalPrompts || 0,
              dateRange: {
                from: results.overall.dateFrom,
                to: results.overall.dateTo
              }
            },
            insights: insightsResult.insights,
            summary: insightsResult.summary
          });

          await performanceInsights.save();
          console.log('💾 AI Insights saved to database');
          console.log('   Insights ID:', performanceInsights._id);
          
          insightsGenerated = true;
          
        } catch (error) {
          console.error('⚠️ AI Insights generation failed (non-critical):', error.message);
          // Don't fail the entire process if insights generation fails
        }
      }

      return { 
        success: true, 
        results,
        totalCalculations,
        insightsGenerated
      };

    } catch (error) {
      console.error('❌ Metrics aggregation error:', error);
      throw error;
    }
  }

  /**
   * Aggregate metrics at OVERALL level (all tests combined)
   */
  async aggregateOverall(userId, tests, filters) {
    console.log('  → Aggregating OVERALL metrics');

    const brandMetrics = this.calculateBrandMetrics(tests);

    const metricsDoc = {
      userId,
      urlAnalysisId: filters.urlAnalysisId || null,
      scope: 'overall',
      scopeValue: 'all',
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(tests[0].testedAt),
      dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(tests[tests.length - 1].testedAt),
      totalPrompts: new Set(tests.map(t => t.promptId.toString())).size,
      totalResponses: tests.length,
      totalBrands: brandMetrics.length,
      brandMetrics,
      lastCalculated: new Date(),
      promptTestIds: tests.map(t => t._id.toString())
    };

    // Upsert (replace existing or create new)
    await AggregatedMetrics.findOneAndUpdate(
      { userId, scope: 'overall', scopeValue: 'all' },
      metricsDoc,
      { upsert: true, new: true }
    );

    return metricsDoc;
  }

  /**
   * Aggregate metrics at PLATFORM level (per LLM provider)
   */
  async aggregatePlatform(userId, tests, filters) {
    console.log('  → Aggregating PLATFORM metrics');

    const platforms = ['openai', 'gemini', 'claude', 'perplexity'];
    const saved = [];

    for (const platform of platforms) {
      const platformTests = tests.filter(t => t.llmProvider === platform);

      if (platformTests.length === 0) continue;

      const brandMetrics = this.calculateBrandMetrics(platformTests);

      const metricsDoc = {
        userId,
        urlAnalysisId: filters.urlAnalysisId || null,
        scope: 'platform',
        scopeValue: platform,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(platformTests[0].testedAt),
        dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(platformTests[platformTests.length - 1].testedAt),
        totalPrompts: new Set(platformTests.map(t => t.promptId.toString())).size,
        totalResponses: platformTests.length,
        totalBrands: brandMetrics.length,
        brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: platformTests.map(t => t._id.toString())
      };

      await AggregatedMetrics.findOneAndUpdate(
        { userId, scope: 'platform', scopeValue: platform },
        metricsDoc,
        { upsert: true, new: true }
      );

      saved.push(metricsDoc);
    }

    return saved;
  }

  /**
   * Aggregate metrics at TOPIC level
   */
  async aggregateTopic(userId, tests, filters) {
    console.log('  → Aggregating TOPIC metrics');

    // Group tests by topic
    const topicGroups = {};
    tests.forEach(t => {
      const topicName = t.topicId?.name || 'Unknown';
      if (!topicGroups[topicName]) topicGroups[topicName] = [];
      topicGroups[topicName].push(t);
    });

    const saved = [];

    for (const [topicName, topicTests] of Object.entries(topicGroups)) {
      const brandMetrics = this.calculateBrandMetrics(topicTests);

      const metricsDoc = {
        userId,
        urlAnalysisId: filters.urlAnalysisId || null,
        scope: 'topic',
        scopeValue: topicName,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(topicTests[0].testedAt),
        dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(topicTests[topicTests.length - 1].testedAt),
        totalPrompts: new Set(topicTests.map(t => t.promptId.toString())).size,
        totalResponses: topicTests.length,
        totalBrands: brandMetrics.length,
        brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: topicTests.map(t => t._id.toString())
      };

      await AggregatedMetrics.findOneAndUpdate(
        { userId, scope: 'topic', scopeValue: topicName },
        metricsDoc,
        { upsert: true, new: true }
      );

      saved.push(metricsDoc);
    }

    return saved;
  }

  /**
   * Aggregate metrics at PERSONA level
   */
  async aggregatePersona(userId, tests, filters) {
    console.log('  → Aggregating PERSONA metrics');

    // Group tests by persona
    const personaGroups = {};
    tests.forEach(t => {
      const personaType = t.personaId?.type || 'Unknown';
      if (!personaGroups[personaType]) personaGroups[personaType] = [];
      personaGroups[personaType].push(t);
    });

    const saved = [];

    for (const [personaType, personaTests] of Object.entries(personaGroups)) {
      const brandMetrics = this.calculateBrandMetrics(personaTests);

      const metricsDoc = {
        userId,
        urlAnalysisId: filters.urlAnalysisId || null,
        scope: 'persona',
        scopeValue: personaType,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : new Date(personaTests[0].testedAt),
        dateTo: filters.dateTo ? new Date(filters.dateTo) : new Date(personaTests[personaTests.length - 1].testedAt),
        totalPrompts: new Set(personaTests.map(t => t.promptId.toString())).size,
        totalResponses: personaTests.length,
        totalBrands: brandMetrics.length,
        brandMetrics,
        lastCalculated: new Date(),
        promptTestIds: personaTests.map(t => t._id.toString())
      };

      await AggregatedMetrics.findOneAndUpdate(
        { userId, scope: 'persona', scopeValue: personaType },
        metricsDoc,
        { upsert: true, new: true }
      );

      saved.push(metricsDoc);
    }

    return saved;
  }

  /**
   * Calculate brand metrics from a set of tests using dashboard formulas
   */
  calculateBrandMetrics(tests) {
    // Collect all brand names across all tests
    const brandNames = new Set();
    tests.forEach(test => {
      test.brandMetrics?.forEach(bm => {
        brandNames.add(bm.brandName);
      });
    });

    const brandMetrics = [];

    // Calculate metrics for each brand
    brandNames.forEach(brandName => {
      const metrics = this.calculateSingleBrandMetrics(brandName, tests);
      brandMetrics.push(metrics);
    });

    // Calculate ranks for each metric
    this.assignRanks(brandMetrics);

    return brandMetrics;
  }

  /**
   * Calculate all metrics for a single brand across tests
   */
  calculateSingleBrandMetrics(brandName, tests) {
    const brandData = {
      brandId: brandName.toLowerCase().replace(/\s+/g, '-'),
      brandName,
      totalAppearances: 0, // Will be set from uniquePromptIds.size
      totalMentions: 0,
      firstPositions: [],
      sentences: [],
      count1st: 0,
      count2nd: 0,
      count3rd: 0,
      
      // Citation data
      brandCitations: 0,
      earnedCitations: 0,
      socialCitations: 0,
      totalCitations: 0,
      citationCount: 0, // Number of tests with citations
      
      // Sentiment data
      sentimentScores: [],
      sentimentCounts: {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0
      },
      
      // ✅ Track unique prompts (not tests)
      uniquePromptIds: new Set()
    };

    // Store total words in ALL responses for depth calculation denominator
    let totalWordsAllResponses = 0;
    tests.forEach(test => {
      totalWordsAllResponses += test.responseMetadata?.totalWords || 0;
    });

    // Extract data from each test
    tests.forEach(test => {
      const brandMetric = test.brandMetrics?.find(bm => bm.brandName === brandName);

      if (brandMetric && brandMetric.mentioned) {
        // ✅ Track unique prompts (same prompt tested on different platforms counts as 1)
        if (test.promptId) {
          brandData.uniquePromptIds.add(test.promptId.toString());
        }
        
        brandData.totalMentions += brandMetric.mentionCount || 0;

        // First positions
        if (brandMetric.firstPosition) {
          brandData.firstPositions.push(brandMetric.firstPosition);
        }

        // Sentences for depth calculation (with test metadata for position normalization)
        if (brandMetric.sentences && brandMetric.sentences.length > 0) {
          const totalSentences = test.responseMetadata?.totalSentences || 1;
          brandMetric.sentences.forEach(sent => {
            brandData.sentences.push({
              ...sent,
              totalSentences // Pass total sentences for normalization
            });
          });
        }

        // Position distribution (rank among brands)
        if (brandMetric.rankPosition === 1) brandData.count1st++;
        else if (brandMetric.rankPosition === 2) brandData.count2nd++;
        else if (brandMetric.rankPosition === 3) brandData.count3rd++;
        
        // Citation data
        brandData.brandCitations += test.scorecard?.brandCitations || 0;
        brandData.earnedCitations += test.scorecard?.earnedCitations || 0;
        brandData.socialCitations += test.scorecard?.socialCitations || 0;
        brandData.totalCitations += test.scorecard?.totalCitations || 0;
        if (test.scorecard?.totalCitations > 0) {
          brandData.citationCount++;
        }
        
        // Sentiment data
        if (brandMetric.sentimentScore !== undefined && brandMetric.sentimentScore !== null) {
          brandData.sentimentScores.push(brandMetric.sentimentScore);
        }
        if (brandMetric.sentiment) {
          brandData.sentimentCounts[brandMetric.sentiment]++;
        }
      }
    });

    // ✅ Set totalAppearances to count of unique prompts
    brandData.totalAppearances = brandData.uniquePromptIds.size;
    
    console.log(`     ✅ Total unique prompts where ${brandName} appears: ${brandData.totalAppearances}`);
    console.log(`     📊 Total mentions across all tests: ${brandData.totalMentions}`);

    // Calculate total unique prompts in the dataset (for visibility score denominator)
    const totalPrompts = new Set(tests.map(t => t.promptId?.toString()).filter(Boolean)).size;

    // 1. Visibility Score = (# of prompts where brand appears / total prompts) × 100
    // Formula: VisibilityScore(b) = (# of prompts where Brand b appears / Total prompts) × 100
    const visibilityScore = totalPrompts > 0
      ? parseFloat(((brandData.totalAppearances / totalPrompts) * 100).toFixed(2))
      : 0;
    
    console.log(`     📈 Visibility Score: ${visibilityScore}% (${brandData.totalAppearances} / ${totalPrompts} unique prompts)`);

    // 2. Average Position = Sum of positions / Count of appearances
    // Formula: AvgPos(b) = (Σ positions of Brand b) / (# of tests where Brand b appears)
    const avgPosition = brandData.firstPositions.length > 0
      ? parseFloat((brandData.firstPositions.reduce((a, b) => a + b, 0) / brandData.firstPositions.length).toFixed(2))
      : 0;

    // 3. Depth of Mention = Weighted word count with exponential decay
    // Formula: Depth(b) = (Σ [words in Brand b sentences × exp(− pos(sentence)/totalSentences)] / (Σ words in all responses) × 100
    let depthOfMention = 0;
    if (brandData.sentences.length > 0 && totalWordsAllResponses > 0) {
      let weightedWordCount = 0;

      brandData.sentences.forEach(sent => {
        const totalSentences = sent.totalSentences || 1;
        const normalizedPosition = sent.position / totalSentences; // Normalize 0-1
        const decay = Math.exp(-normalizedPosition); // Exponential decay
        weightedWordCount += sent.wordCount * decay;
      });

      depthOfMention = parseFloat(((weightedWordCount / totalWordsAllResponses) * 100).toFixed(4));
    }

    // 4. Citation Share = Will be calculated later in assignRanks()
    // Formula: CitationShare(b) = (Total citations of Brand b / Total citations of all brands) × 100
    const citationShare = 0; // Placeholder, calculated in assignRanks()

    // 5. Sentiment Score = Average sentiment score
    const sentimentScore = brandData.sentimentScores.length > 0
      ? parseFloat((brandData.sentimentScores.reduce((a, b) => a + b, 0) / brandData.sentimentScores.length).toFixed(2))
      : 0;

    // 6. Sentiment Share = % positive mentions
    const totalSentimentCounts = Object.values(brandData.sentimentCounts).reduce((a, b) => a + b, 0);
    const sentimentShare = totalSentimentCounts > 0
      ? parseFloat(((brandData.sentimentCounts.positive / totalSentimentCounts) * 100).toFixed(2))
      : 0;

    // 7. Share of Voice = (brand mentions / total mentions) × 100
    // Will be calculated after we know total mentions across all brands

    return {
      brandId: brandData.brandId,
      brandName: brandData.brandName,

      // Visibility Score (primary metric)
      visibilityScore,
      visibilityRank: 0, // Assigned later

      // Total mentions metric
      totalMentions: brandData.totalMentions,
      mentionRank: 0, // Assigned later

      shareOfVoice: 0, // Calculated after total mentions known
      shareOfVoiceRank: 0,

      avgPosition,
      avgPositionRank: 0, // Assigned later

      depthOfMention,
      depthRank: 0, // Assigned later

      // Citation metrics
      citationShare,
      citationShareRank: 0, // Assigned later
      brandCitationsTotal: brandData.brandCitations,
      earnedCitationsTotal: brandData.earnedCitations,
      socialCitationsTotal: brandData.socialCitations,
      totalCitations: brandData.totalCitations,

      // Sentiment metrics
      sentimentScore,
      sentimentBreakdown: {
        positive: brandData.sentimentCounts.positive,
        neutral: brandData.sentimentCounts.neutral,
        negative: brandData.sentimentCounts.negative,
        mixed: brandData.sentimentCounts.mixed
      },
      sentimentShare,

      count1st: brandData.count1st,
      count2nd: brandData.count2nd,
      count3rd: brandData.count3rd,
      rank1st: 0, // Assigned later
      rank2nd: 0,
      rank3rd: 0,

      totalAppearances: brandData.totalAppearances
    };
  }

  /**
   * Assign ranks to all brands for each metric
   */
  assignRanks(brandMetrics) {
    // Calculate Share of Voice first (needs total mentions)
    const totalMentions = brandMetrics.reduce((sum, b) => sum + b.totalMentions, 0);

    brandMetrics.forEach(b => {
      b.shareOfVoice = totalMentions > 0
        ? parseFloat(((b.totalMentions / totalMentions) * 100).toFixed(2))
        : 0;
    });

    // Calculate Citation Share (needs total citations across all brands)
    // Formula: CitationShare(b) = (Total citations of Brand b / Total citations of all brands) × 100
    const totalCitations = brandMetrics.reduce((sum, b) => sum + (b.totalCitations || 0), 0);
    
    brandMetrics.forEach(b => {
      b.citationShare = totalCitations > 0
        ? parseFloat(((b.totalCitations / totalCitations) * 100).toFixed(2))
        : 0;
    });

    // Assign ranks for each metric
    // Higher is better: visibility, mentions, depth, share of voice, citation share
    // Lower is better: average position

    this.assignRanksByMetric(brandMetrics, 'visibilityScore', 'visibilityRank', true);
    this.assignRanksByMetric(brandMetrics, 'totalMentions', 'mentionRank', true);
    this.assignRanksByMetric(brandMetrics, 'depthOfMention', 'depthRank', true);
    this.assignRanksByMetric(brandMetrics, 'shareOfVoice', 'shareOfVoiceRank', true);
    this.assignRanksByMetric(brandMetrics, 'avgPosition', 'avgPositionRank', false);
    this.assignRanksByMetric(brandMetrics, 'citationShare', 'citationShareRank', true);

    // Position distribution ranks
    this.assignRanksByMetric(brandMetrics, 'count1st', 'rank1st', true);
    this.assignRanksByMetric(brandMetrics, 'count2nd', 'rank2nd', true);
    this.assignRanksByMetric(brandMetrics, 'count3rd', 'rank3rd', true);
  }

  /**
   * Helper to assign ranks based on a metric
   * @param {Array} brands - Array of brand metrics
   * @param {String} metricKey - Key of metric to rank by
   * @param {String} rankKey - Key to store rank in
   * @param {Boolean} higherIsBetter - true if higher values get rank 1
   */
  assignRanksByMetric(brands, metricKey, rankKey, higherIsBetter) {
    // Create mapping of brandName to brand object for faster lookup
    const brandMap = {};
    brands.forEach(b => {
      brandMap[b.brandName] = b;
    });

    // Sort by metric (copy array so we don't mutate original order)
    const sorted = [...brands].sort((a, b) => {
      const aVal = a[metricKey] || 0;
      const bVal = b[metricKey] || 0;

      return higherIsBetter
        ? bVal - aVal  // Descending (higher is better)
        : aVal - bVal; // Ascending (lower is better)
    });

    // Assign ranks directly to the brand objects via the map
    sorted.forEach((sortedBrand, index) => {
      const brand = brandMap[sortedBrand.brandName];
      if (brand) {
        brand[rankKey] = index + 1;
      }
    });
  }
}

module.exports = new MetricsAggregationService();

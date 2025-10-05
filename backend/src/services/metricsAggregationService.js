/**
 * Metrics Aggregation Service
 *
 * Calculates and stores aggregated metrics across different scopes:
 * - Overall (all prompts)
 * - Platform level (per LLM)
 * - Topic level
 * - Persona level
 * - Prompt level
 */

const PromptTest = require('../models/PromptTest');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const UrlAnalysis = require('../models/UrlAnalysis');
const metricsExtraction = require('./metricsExtractionService');

class MetricsAggregationService {
  constructor() {
    console.log('📊 MetricsAggregationService initialized');
  }

  /**
   * Calculate and store all metrics for a user
   * @param {string} userId - User ID
   * @param {object} options - Calculation options (dateFrom, dateTo, force refresh)
   * @returns {Promise<object>} - Aggregation results
   */
  async calculateAllMetrics(userId, options = {}) {
    const {
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      dateTo = new Date(),
      forceRefresh = false
    } = options;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 [AGGREGATION START] Calculating metrics for user: ${userId}`);
    console.log(`📅 Date range: ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Get user's brand name from URL analysis
      await this.getUserBrandName(userId);

      // Fetch all completed prompt tests in date range
      const promptTests = await PromptTest.find({
        userId,
        status: 'completed',
        testedAt: { $gte: dateFrom, $lte: dateTo }
      })
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .lean();

      if (promptTests.length === 0) {
        console.log('⚠️  [AGGREGATION] No completed tests found in date range');
        return {
          success: false,
          message: 'No test data available for aggregation'
        };
      }

      console.log(`✅ [AGGREGATION] Found ${promptTests.length} completed tests`);

      // Calculate metrics at different scopes
      const results = {
        overall: null,
        platforms: [],
        topics: [],
        personas: [],
        totalCalculations: 0
      };

      // 1. Overall metrics (across all prompts and platforms)
      console.log(`\n🌐 [OVERALL] Calculating overall metrics...`);
      results.overall = await this.calculateOverallMetrics(userId, promptTests, dateFrom, dateTo);
      results.totalCalculations++;

      // 2. Platform-level metrics (per LLM)
      console.log(`\n🤖 [PLATFORMS] Calculating platform-level metrics...`);
      const platforms = [...new Set(promptTests.map(t => t.llmProvider))];
      for (const platform of platforms) {
        const platformTests = promptTests.filter(t => t.llmProvider === platform);
        const metrics = await this.calculatePlatformMetrics(
          userId,
          platform,
          platformTests,
          dateFrom,
          dateTo
        );
        results.platforms.push(metrics);
        results.totalCalculations++;
      }

      // 3. Topic-level metrics
      console.log(`\n📚 [TOPICS] Calculating topic-level metrics...`);
      const topics = [...new Set(promptTests.map(t => t.topicId?.name).filter(Boolean))];
      for (const topic of topics) {
        const topicTests = promptTests.filter(t => t.topicId?.name === topic);
        const metrics = await this.calculateTopicMetrics(
          userId,
          topic,
          topicTests,
          dateFrom,
          dateTo
        );
        results.topics.push(metrics);
        results.totalCalculations++;
      }

      // 4. Persona-level metrics
      console.log(`\n👥 [PERSONAS] Calculating persona-level metrics...`);
      const personas = [...new Set(promptTests.map(t => t.personaId?.type).filter(Boolean))];
      for (const persona of personas) {
        const personaTests = promptTests.filter(t => t.personaId?.type === persona);
        const metrics = await this.calculatePersonaMetrics(
          userId,
          persona,
          personaTests,
          dateFrom,
          dateTo
        );
        results.personas.push(metrics);
        results.totalCalculations++;
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ [AGGREGATION COMPLETE] Calculated ${results.totalCalculations} metric sets`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        ...results
      };

    } catch (error) {
      console.error(`❌ [AGGREGATION ERROR]`, error);
      throw error;
    }
  }

  /**
   * Calculate overall metrics across all prompts and platforms
   */
  async calculateOverallMetrics(userId, promptTests, dateFrom, dateTo) {
    console.log(`   📊 Processing ${promptTests.length} tests for overall metrics...`);

    // Extract brand names from test data
    const brandNames = this.extractUniqueBrands(promptTests);
    console.log(`   🏢 Found ${brandNames.length} unique brands: ${brandNames.join(', ')}`);

    // Initialize brand accumulators
    const brandData = {};
    brandNames.forEach(brand => {
      brandData[brand] = {
        brandName: brand,
        totalAppearances: 0,
        totalMentions: 0,
        totalWordCount: 0,
        sumPositions: 0,
        weightedWordCount: 0,
        count1st: 0,
        count2nd: 0,
        count3rd: 0
      };
    });

    // Process each test and accumulate metrics
    promptTests.forEach(test => {
      if (!test.scorecard) return;

      // Use existing scorecard data for now
      // TODO: Re-extract using deterministic method
      const brandMentioned = test.scorecard.brandMentioned;
      const brandPosition = test.scorecard.brandPosition;
      const brandName = this.extractUserBrandName(test);

      if (brandMentioned && brandName && brandData[brandName]) {
        brandData[brandName].totalAppearances++;
        brandData[brandName].totalMentions += test.scorecard.brandMentionCount || 1;
        brandData[brandName].totalWordCount += test.scorecard.characterCount / 5 || 0; // Rough word estimate
        if (brandPosition > 0) {
          brandData[brandName].sumPositions += brandPosition;
        }

        // Position distribution
        if (brandPosition === 1) brandData[brandName].count1st++;
        else if (brandPosition === 2) brandData[brandName].count2nd++;
        else if (brandPosition === 3) brandData[brandName].count3rd++;
      }

      // Process competitors
      test.scorecard.competitorsMentioned?.forEach(competitor => {
        if (brandData[competitor]) {
          brandData[competitor].totalMentions++;
        }
      });
    });

    // Calculate final metrics for each brand
    const brandMetrics = brandNames.map(brand => {
      const data = brandData[brand];
      const totalPrompts = promptTests.length;

      return {
        brandId: brand.toLowerCase().replace(/\s+/g, '-'),
        brandName: brand,

        // Visibility Score
        visibilityScore: (data.totalAppearances / totalPrompts) * 100,
        visibilityRank: 0, // Will be set after sorting

        // Word Count
        wordCount: data.totalWordCount,
        wordCountRank: 0,

        // Depth of Mention
        depthOfMention: data.weightedWordCount,
        depthRank: 0,

        // Share of Voice
        shareOfVoice: 0, // Will be calculated after totals
        shareOfVoiceRank: 0,

        // Average Position
        avgPosition: data.totalAppearances > 0 ? data.sumPositions / data.totalAppearances : 0,
        avgPositionRank: 0,

        // Position Distribution
        count1st: data.count1st,
        count2nd: data.count2nd,
        count3rd: data.count3rd,
        rank1st: 0,
        rank2nd: 0,
        rank3rd: 0,

        // Raw counts
        totalAppearances: data.totalAppearances,
        totalMentions: data.totalMentions,
        totalWordCountRaw: data.totalWordCount
      };
    });

    // Calculate Share of Voice (needs total mentions across all brands)
    const totalMentionsAll = brandMetrics.reduce((sum, b) => sum + b.totalMentions, 0);
    brandMetrics.forEach(brand => {
      brand.shareOfVoice = totalMentionsAll > 0
        ? (brand.totalMentions / totalMentionsAll) * 100
        : 0;
    });

    // Assign ranks
    this.assignRanks(brandMetrics);

    console.log(`   ✅ Calculated metrics for ${brandMetrics.length} brands`);

    // Save to database
    const aggregated = new AggregatedMetrics({
      userId,
      scope: 'overall',
      dateFrom,
      dateTo,
      totalPrompts: promptTests.length,
      totalResponses: promptTests.length,
      totalBrands: brandNames.length,
      brandMetrics,
      promptTestIds: promptTests.map(t => t._id.toString())
    });

    await aggregated.save();
    console.log(`   💾 Saved overall metrics to database`);

    return aggregated;
  }

  /**
   * Calculate platform-specific metrics
   */
  async calculatePlatformMetrics(userId, platform, platformTests, dateFrom, dateTo) {
    console.log(`   🤖 [${platform}] Processing ${platformTests.length} tests...`);

    // Use same logic as overall but scoped to platform
    const brandNames = this.extractUniqueBrands(platformTests);
    const brandData = this.accumulateBrandData(platformTests, brandNames);
    const brandMetrics = this.calculateBrandMetrics(brandData, platformTests.length);
    this.assignRanks(brandMetrics);

    const aggregated = new AggregatedMetrics({
      userId,
      scope: 'platform',
      scopeValue: platform,
      dateFrom,
      dateTo,
      totalPrompts: platformTests.length,
      totalResponses: platformTests.length,
      totalBrands: brandNames.length,
      brandMetrics,
      promptTestIds: platformTests.map(t => t._id.toString())
    });

    await aggregated.save();
    console.log(`   ✅ [${platform}] Saved metrics`);

    return aggregated;
  }

  /**
   * Calculate topic-specific metrics
   */
  async calculateTopicMetrics(userId, topic, topicTests, dateFrom, dateTo) {
    console.log(`   📚 [${topic}] Processing ${topicTests.length} tests...`);

    const brandNames = this.extractUniqueBrands(topicTests);
    const brandData = this.accumulateBrandData(topicTests, brandNames);
    const brandMetrics = this.calculateBrandMetrics(brandData, topicTests.length);
    this.assignRanks(brandMetrics);

    const aggregated = new AggregatedMetrics({
      userId,
      scope: 'topic',
      scopeValue: topic,
      dateFrom,
      dateTo,
      totalPrompts: topicTests.length,
      totalResponses: topicTests.length,
      totalBrands: brandNames.length,
      brandMetrics,
      promptTestIds: topicTests.map(t => t._id.toString())
    });

    await aggregated.save();
    console.log(`   ✅ [${topic}] Saved metrics`);

    return aggregated;
  }

  /**
   * Calculate persona-specific metrics
   */
  async calculatePersonaMetrics(userId, persona, personaTests, dateFrom, dateTo) {
    console.log(`   👥 [${persona}] Processing ${personaTests.length} tests...`);

    const brandNames = this.extractUniqueBrands(personaTests);
    const brandData = this.accumulateBrandData(personaTests, brandNames);
    const brandMetrics = this.calculateBrandMetrics(brandData, personaTests.length);
    this.assignRanks(brandMetrics);

    const aggregated = new AggregatedMetrics({
      userId,
      scope: 'persona',
      scopeValue: persona,
      dateFrom,
      dateTo,
      totalPrompts: personaTests.length,
      totalResponses: personaTests.length,
      totalBrands: brandNames.length,
      brandMetrics,
      promptTestIds: personaTests.map(t => t._id.toString())
    });

    await aggregated.save();
    console.log(`   ✅ [${persona}] Saved metrics`);

    return aggregated;
  }

  /**
   * Helper: Extract unique brand names from tests
   */
  extractUniqueBrands(tests) {
    const brands = new Set();

    tests.forEach(test => {
      // Add user's brand
      const userBrand = this.extractUserBrandName(test);
      if (userBrand) brands.add(userBrand);

      // Add competitors
      test.scorecard?.competitorsMentioned?.forEach(comp => brands.add(comp));
    });

    return Array.from(brands);
  }

  /**
   * Helper: Extract user's brand name from test
   */
  extractUserBrandName() {
    // Return cached brand name if available
    if (this.userBrandName) {
      return this.userBrandName;
    }
    // Fallback to 'Your Brand' if not set
    return 'Your Brand';
  }

  /**
   * Helper: Get user's brand name from URL Analysis
   */
  async getUserBrandName(userId) {
    try {
      const urlAnalysis = await UrlAnalysis.findOne({ userId }).sort({ analysisDate: -1 }).lean();
      if (urlAnalysis && urlAnalysis.brandContext && urlAnalysis.brandContext.companyName) {
        this.userBrandName = urlAnalysis.brandContext.companyName;
        console.log(`   🏢 User brand identified: ${this.userBrandName}`);
        return this.userBrandName;
      }
      console.log(`   ⚠️  No brand context found in URL analysis`);
      return 'Your Brand';
    } catch (error) {
      console.error(`   ❌ Error fetching user brand:`, error);
      return 'Your Brand';
    }
  }

  /**
   * Helper: Accumulate brand data from tests
   */
  accumulateBrandData(tests, brandNames) {
    const brandData = {};

    brandNames.forEach(brand => {
      brandData[brand] = {
        brandName: brand,
        totalAppearances: 0,
        totalMentions: 0,
        totalWordCount: 0,
        sumPositions: 0,
        weightedWordCount: 0,
        count1st: 0,
        count2nd: 0,
        count3rd: 0
      };
    });

    tests.forEach(test => {
      if (!test.scorecard) return;

      const brandName = this.extractUserBrandName(test);
      if (test.scorecard.brandMentioned && brandName && brandData[brandName]) {
        brandData[brandName].totalAppearances++;
        brandData[brandName].totalMentions += test.scorecard.brandMentionCount || 1;
        brandData[brandName].totalWordCount += test.scorecard.characterCount / 5 || 0;
        if (test.scorecard.brandPosition > 0) {
          brandData[brandName].sumPositions += test.scorecard.brandPosition;
        }

        const pos = test.scorecard.brandPosition;
        if (pos === 1) brandData[brandName].count1st++;
        else if (pos === 2) brandData[brandName].count2nd++;
        else if (pos === 3) brandData[brandName].count3rd++;
      }
    });

    return brandData;
  }

  /**
   * Helper: Calculate metrics from accumulated data
   */
  calculateBrandMetrics(brandData, totalPrompts) {
    const brandMetrics = Object.values(brandData).map(data => {
      return {
        brandId: data.brandName.toLowerCase().replace(/\s+/g, '-'),
        brandName: data.brandName,
        visibilityScore: (data.totalAppearances / totalPrompts) * 100,
        visibilityRank: 0,
        wordCount: data.totalWordCount,
        wordCountRank: 0,
        depthOfMention: data.weightedWordCount,
        depthRank: 0,
        shareOfVoice: 0,
        shareOfVoiceRank: 0,
        avgPosition: data.totalAppearances > 0 ? data.sumPositions / data.totalAppearances : 0,
        avgPositionRank: 0,
        count1st: data.count1st,
        count2nd: data.count2nd,
        count3rd: data.count3rd,
        rank1st: 0,
        rank2nd: 0,
        rank3rd: 0,
        totalAppearances: data.totalAppearances,
        totalMentions: data.totalMentions,
        totalWordCountRaw: data.totalWordCount
      };
    });

    // Calculate Share of Voice
    const totalMentions = brandMetrics.reduce((sum, b) => sum + b.totalMentions, 0);
    brandMetrics.forEach(brand => {
      brand.shareOfVoice = totalMentions > 0 ? (brand.totalMentions / totalMentions) * 100 : 0;
    });

    return brandMetrics;
  }

  /**
   * Helper: Assign ranks to brands for all metrics
   */
  assignRanks(brandMetrics) {
    // Visibility Score (higher is better)
    const byVisibility = [...brandMetrics].sort((a, b) => b.visibilityScore - a.visibilityScore);
    byVisibility.forEach((brand, index) => {
      brand.visibilityRank = index + 1;
    });

    // Word Count (higher is better)
    const byWordCount = [...brandMetrics].sort((a, b) => b.wordCount - a.wordCount);
    byWordCount.forEach((brand, index) => {
      brand.wordCountRank = index + 1;
    });

    // Share of Voice (higher is better)
    const byShareOfVoice = [...brandMetrics].sort((a, b) => b.shareOfVoice - a.shareOfVoice);
    byShareOfVoice.forEach((brand, index) => {
      brand.shareOfVoiceRank = index + 1;
    });

    // Average Position (lower is better)
    const byAvgPosition = [...brandMetrics]
      .filter(b => b.avgPosition > 0)
      .sort((a, b) => a.avgPosition - b.avgPosition);
    byAvgPosition.forEach((brand, index) => {
      brand.avgPositionRank = index + 1;
    });

    // Position distribution ranks
    const by1st = [...brandMetrics].sort((a, b) => b.count1st - a.count1st);
    by1st.forEach((brand, index) => { brand.rank1st = index + 1; });

    const by2nd = [...brandMetrics].sort((a, b) => b.count2nd - a.count2nd);
    by2nd.forEach((brand, index) => { brand.rank2nd = index + 1; });

    const by3rd = [...brandMetrics].sort((a, b) => b.count3rd - a.count3rd);
    by3rd.forEach((brand, index) => { brand.rank3rd = index + 1; });
  }
}

module.exports = new MetricsAggregationService();

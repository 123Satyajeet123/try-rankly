#!/usr/bin/env node

/**
 * Extract Database Metrics for HDFC Bank Analysis
 * 
 * This script extracts all metrics from the MongoDB database for the
 * HDFC Bank credit cards URL analysis and formats them properly for
 * dashboard display and AI insights generation.
 * 
 * User: sj@tryrankly.com
 * UserID: 68e9892f5e894a9df4c401ce
 * URL: https://www.hdfcbank.com/personal/pay/cards/credit-cards
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const UrlAnalysis = require('./src/models/UrlAnalysis');
const AggregatedMetrics = require('./src/models/AggregatedMetrics');
const PromptTest = require('./src/models/PromptTest');
const PerformanceInsights = require('./src/models/PerformanceInsights');
const Prompt = require('./src/models/Prompt');
const Topic = require('./src/models/Topic');
const Persona = require('./src/models/Persona');
const Competitor = require('./src/models/Competitor');

// Target user information
const TARGET_USER_ID = '68e9892f5e894a9df4c401ce';
const TARGET_EMAIL = 'sj@tryrankly.com';
const TARGET_URL = 'https://www.hdfcbank.com/personal/pay/cards/credit-cards';

/**
 * Format a metric section with proper structure
 */
function formatMetricSection(title, data, indent = 0) {
  const spaces = '  '.repeat(indent);
  const line = '═'.repeat(80 - (spaces.length * 2));
  
  console.log(`\n${spaces}${line}`);
  console.log(`${spaces}${title}`);
  console.log(`${spaces}${line}\n`);
  
  if (typeof data === 'object' && data !== null) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

/**
 * Extract and format metrics for dashboard input
 */
function formatDashboardMetrics(aggregatedMetrics) {
  const dashboardInput = {
    overall: {},
    platforms: {},
    topics: {},
    personas: {}
  };

  aggregatedMetrics.forEach(metric => {
    const metricData = {
      scope: metric.scope,
      scopeValue: metric.scopeValue,
      totalBrands: metric.totalBrands,
      totalPrompts: metric.totalPrompts,
      totalResponses: metric.totalResponses,
      dateFrom: metric.dateFrom,
      dateTo: metric.dateTo,
      lastCalculated: metric.lastCalculated,
      brandMetrics: metric.brandMetrics.map(brand => ({
        brandName: brand.brandName,
        
        // Visibility Metrics
        visibilityScore: brand.visibilityScore,
        visibilityRank: brand.visibilityRank,
        totalMentions: brand.totalMentions,
        mentionRank: brand.mentionRank,
        shareOfVoice: brand.shareOfVoice,
        shareOfVoiceRank: brand.shareOfVoiceRank,
        avgPosition: brand.avgPosition,
        avgPositionRank: brand.avgPositionRank,
        depthOfMention: brand.depthOfMention,
        depthRank: brand.depthRank,
        totalAppearances: brand.totalAppearances,
        
        // Position Distribution
        count1st: brand.count1st,
        count2nd: brand.count2nd,
        count3rd: brand.count3rd,
        rank1st: brand.rank1st,
        rank2nd: brand.rank2nd,
        rank3rd: brand.rank3rd,
        
        // Citation Metrics
        citationShare: brand.citationShare,
        citationShareRank: brand.citationShareRank,
        brandCitationsTotal: brand.brandCitationsTotal,
        earnedCitationsTotal: brand.earnedCitationsTotal,
        socialCitationsTotal: brand.socialCitationsTotal,
        totalCitations: brand.totalCitations,
        
        // Sentiment Metrics
        sentimentScore: brand.sentimentScore,
        sentimentShare: brand.sentimentShare,
        sentimentBreakdown: brand.sentimentBreakdown
      }))
    };

    if (metric.scope === 'overall') {
      dashboardInput.overall = metricData;
    } else if (metric.scope === 'platform') {
      dashboardInput.platforms[metric.scopeValue] = metricData;
    } else if (metric.scope === 'topic') {
      dashboardInput.topics[metric.scopeValue] = metricData;
    } else if (metric.scope === 'persona') {
      dashboardInput.personas[metric.scopeValue] = metricData;
    }
  });

  return dashboardInput;
}

/**
 * Format metrics for AI insights generation
 */
function formatAIInsightsInput(aggregatedMetrics, promptTests) {
  const overallMetric = aggregatedMetrics.find(m => m.scope === 'overall');
  
  if (!overallMetric) {
    return null;
  }

  const userBrand = overallMetric.brandMetrics[0]; // First brand is user's brand
  const competitors = overallMetric.brandMetrics.slice(1);

  return {
    // Summary statistics
    summary: {
      totalTests: promptTests.length,
      totalBrands: overallMetric.totalBrands,
      totalPrompts: overallMetric.totalPrompts,
      dateRange: {
        from: overallMetric.dateFrom,
        to: overallMetric.dateTo
      }
    },

    // User brand performance
    userBrand: {
      name: userBrand.brandName,
      metrics: {
        visibilityScore: userBrand.visibilityScore,
        shareOfVoice: userBrand.shareOfVoice,
        avgPosition: userBrand.avgPosition,
        depthOfMention: userBrand.depthOfMention,
        citationShare: userBrand.citationShare,
        sentimentScore: userBrand.sentimentScore,
        totalMentions: userBrand.totalMentions,
        totalAppearances: userBrand.totalAppearances
      },
      rankings: {
        visibilityRank: userBrand.visibilityRank,
        shareOfVoiceRank: userBrand.shareOfVoiceRank,
        avgPositionRank: userBrand.avgPositionRank,
        depthRank: userBrand.depthRank,
        citationShareRank: userBrand.citationShareRank
      },
      positionDistribution: {
        first: userBrand.count1st,
        second: userBrand.count2nd,
        third: userBrand.count3rd
      },
      sentimentBreakdown: userBrand.sentimentBreakdown,
      citations: {
        brand: userBrand.brandCitationsTotal,
        earned: userBrand.earnedCitationsTotal,
        social: userBrand.socialCitationsTotal,
        total: userBrand.totalCitations
      }
    },

    // Competitor comparison
    competitors: competitors.map(comp => ({
      name: comp.brandName,
      shareOfVoice: comp.shareOfVoice,
      avgPosition: comp.avgPosition,
      visibilityScore: comp.visibilityScore,
      sentimentScore: comp.sentimentScore
    })),

    // Platform breakdown
    platformMetrics: aggregatedMetrics
      .filter(m => m.scope === 'platform')
      .map(platform => ({
        platform: platform.scopeValue,
        userBrandMetrics: platform.brandMetrics[0]
      })),

    // Topic breakdown
    topicMetrics: aggregatedMetrics
      .filter(m => m.scope === 'topic')
      .map(topic => ({
        topic: topic.scopeValue,
        userBrandMetrics: topic.brandMetrics[0]
      })),

    // Persona breakdown
    personaMetrics: aggregatedMetrics
      .filter(m => m.scope === 'persona')
      .map(persona => ({
        persona: persona.scopeValue,
        userBrandMetrics: persona.brandMetrics[0]
      }))
  };
}

/**
 * Main extraction function
 */
async function extractMetrics() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║        HDFC BANK METRICS EXTRACTION - DATABASE ANALYSIS                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // ========================================================================
    // STEP 1: Find User
    // ========================================================================
    formatMetricSection('📋 STEP 1: USER INFORMATION', '');
    
    const user = await User.findOne({
      $or: [
        { _id: TARGET_USER_ID },
        { email: TARGET_EMAIL }
      ]
    });

    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    const userInfo = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      hasOnboarded: user.hasOnboarded
    };

    console.log(JSON.stringify(userInfo, null, 2));

    // ========================================================================
    // STEP 2: Find URL Analysis
    // ========================================================================
    formatMetricSection('📋 STEP 2: URL ANALYSIS', '');
    
    const urlAnalysis = await UrlAnalysis.findOne({
      userId: user._id,
      url: { $regex: TARGET_URL.replace(/^https?:\/\//, ''), $options: 'i' }
    }).sort({ createdAt: -1 });

    if (!urlAnalysis) {
      console.error('❌ URL Analysis not found!');
      process.exit(1);
    }

    const analysisInfo = {
      id: urlAnalysis._id.toString(),
      url: urlAnalysis.url,
      userBrand: urlAnalysis.userBrand,
      brandName: urlAnalysis.brandName,
      industry: urlAnalysis.industry,
      status: urlAnalysis.status,
      createdAt: urlAnalysis.createdAt,
      summary: urlAnalysis.summary
    };

    console.log(JSON.stringify(analysisInfo, null, 2));

    // ========================================================================
    // STEP 3: Find Competitors
    // ========================================================================
    formatMetricSection('📋 STEP 3: COMPETITORS', '');
    
    const competitors = await Competitor.find({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    });

    const competitorInfo = competitors.map(comp => ({
      id: comp._id.toString(),
      brandName: comp.brandName,
      brandId: comp.brandId,
      domain: comp.domain
    }));

    console.log(JSON.stringify(competitorInfo, null, 2));

    // ========================================================================
    // STEP 4: Find Topics
    // ========================================================================
    formatMetricSection('📋 STEP 4: TOPICS', '');
    
    const topics = await Topic.find({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    });

    const topicInfo = topics.map(topic => ({
      id: topic._id.toString(),
      name: topic.name,
      description: topic.description
    }));

    console.log(JSON.stringify(topicInfo, null, 2));

    // ========================================================================
    // STEP 5: Find Personas
    // ========================================================================
    formatMetricSection('📋 STEP 5: PERSONAS', '');
    
    const personas = await Persona.find({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    });

    const personaInfo = personas.map(persona => ({
      id: persona._id.toString(),
      type: persona.type,
      description: persona.description
    }));

    console.log(JSON.stringify(personaInfo, null, 2));

    // ========================================================================
    // STEP 6: Find Prompts
    // ========================================================================
    formatMetricSection('📋 STEP 6: PROMPTS', '');
    
    const prompts = await Prompt.find({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    });

    const promptInfo = prompts.map(prompt => ({
      id: prompt._id.toString(),
      text: prompt.text.substring(0, 100) + '...',
      queryType: prompt.queryType,
      topicId: prompt.topicId?.toString(),
      personaId: prompt.personaId?.toString()
    }));

    console.log(JSON.stringify(promptInfo, null, 2));

    // ========================================================================
    // STEP 7: Find Prompt Tests
    // ========================================================================
    formatMetricSection('📋 STEP 7: PROMPT TESTS', '');
    
    const promptTests = await PromptTest.find({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id,
      status: 'completed'
    }).sort({ createdAt: -1 });

    console.log(`Total Prompt Tests: ${promptTests.length}\n`);

    // Group by platform
    const testsByPlatform = promptTests.reduce((acc, test) => {
      if (!acc[test.llmProvider]) {
        acc[test.llmProvider] = [];
      }
      acc[test.llmProvider].push(test);
      return acc;
    }, {});

    console.log('Tests by Platform:');
    Object.entries(testsByPlatform).forEach(([platform, tests]) => {
      console.log(`  ${platform}: ${tests.length} tests`);
    });

    // Sample test data
    if (promptTests.length > 0) {
      const sampleTest = promptTests[0];
      console.log('\nSample Test Data:');
      console.log(JSON.stringify({
        id: sampleTest._id.toString(),
        llmProvider: sampleTest.llmProvider,
        llmModel: sampleTest.llmModel,
        queryType: sampleTest.queryType,
        responseTime: sampleTest.responseTime,
        tokensUsed: sampleTest.tokensUsed,
        brandMentioned: sampleTest.scorecard?.brandMentioned,
        brandPosition: sampleTest.scorecard?.brandPosition,
        citationsTotal: sampleTest.scorecard?.totalCitations,
        sentiment: sampleTest.scorecard?.sentiment,
        brandsAnalyzed: sampleTest.brandMetrics?.length
      }, null, 2));
    }

    // ========================================================================
    // STEP 8: Find Aggregated Metrics
    // ========================================================================
    formatMetricSection('📋 STEP 8: AGGREGATED METRICS', '');
    
    const aggregatedMetrics = await AggregatedMetrics.find({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    }).sort({ lastCalculated: -1 });

    console.log(`Total Aggregated Metrics Documents: ${aggregatedMetrics.length}\n`);

    // Group by scope
    const metricsByScope = aggregatedMetrics.reduce((acc, metric) => {
      if (!acc[metric.scope]) {
        acc[metric.scope] = [];
      }
      acc[metric.scope].push(metric);
      return acc;
    }, {});

    console.log('Metrics by Scope:');
    Object.entries(metricsByScope).forEach(([scope, metrics]) => {
      console.log(`  ${scope}: ${metrics.length} documents`);
      if (scope === 'platform' || scope === 'topic' || scope === 'persona') {
        metrics.forEach(m => {
          console.log(`    - ${m.scopeValue}`);
        });
      }
    });

    // Overall metrics summary
    const overallMetric = aggregatedMetrics.find(m => m.scope === 'overall');
    if (overallMetric) {
      console.log('\n📊 Overall Metrics Summary:');
      console.log(`  Total Brands: ${overallMetric.totalBrands}`);
      console.log(`  Total Prompts: ${overallMetric.totalPrompts}`);
      console.log(`  Total Responses: ${overallMetric.totalResponses}`);
      console.log(`  Date Range: ${overallMetric.dateFrom} to ${overallMetric.dateTo}`);
      console.log(`  Last Calculated: ${overallMetric.lastCalculated}`);
      
      console.log('\n  Brand Rankings:');
      overallMetric.brandMetrics
        .sort((a, b) => a.shareOfVoiceRank - b.shareOfVoiceRank)
        .forEach(brand => {
          console.log(`    ${brand.shareOfVoiceRank}. ${brand.brandName}`);
          console.log(`       - Share of Voice: ${brand.shareOfVoice.toFixed(2)}%`);
          console.log(`       - Visibility Score: ${brand.visibilityScore?.toFixed(2) || 'N/A'}%`);
          console.log(`       - Avg Position: ${brand.avgPosition.toFixed(2)}`);
          console.log(`       - Total Mentions: ${brand.totalMentions}`);
          console.log(`       - Citation Share: ${brand.citationShare.toFixed(2)}%`);
          console.log(`       - Sentiment Score: ${brand.sentimentScore.toFixed(2)}`);
        });
    }

    // ========================================================================
    // STEP 9: Find Performance Insights
    // ========================================================================
    formatMetricSection('📋 STEP 9: PERFORMANCE INSIGHTS (AI-Generated)', '');
    
    const performanceInsights = await PerformanceInsights.findOne({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    }).sort({ generatedAt: -1 });

    if (performanceInsights) {
      console.log(`Total Insights: ${performanceInsights.insights.length}`);
      console.log(`Model: ${performanceInsights.model}`);
      console.log(`Generated At: ${performanceInsights.generatedAt}\n`);

      console.log('📈 What\'s Working:');
      performanceInsights.insights
        .filter(i => i.category === 'whats_working')
        .forEach(insight => {
          console.log(`\n  ✓ ${insight.title}`);
          console.log(`    Impact: ${insight.impact.toUpperCase()}`);
          console.log(`    Current Value: ${insight.currentValue}`);
          console.log(`    Change: ${insight.changePercent > 0 ? '+' : ''}${insight.changePercent.toFixed(2)}%`);
          console.log(`    ${insight.description}`);
        });

      console.log('\n\n⚠️  Needs Attention:');
      performanceInsights.insights
        .filter(i => i.category === 'needs_attention')
        .forEach(insight => {
          console.log(`\n  ! ${insight.title}`);
          console.log(`    Impact: ${insight.impact.toUpperCase()}`);
          console.log(`    Current Value: ${insight.currentValue}`);
          console.log(`    Change: ${insight.changePercent > 0 ? '+' : ''}${insight.changePercent.toFixed(2)}%`);
          console.log(`    ${insight.description}`);
          console.log(`    Recommendation: ${insight.recommendation}`);
        });
    } else {
      console.log('⚠️  No performance insights found. Run metrics aggregation to generate.');
    }

    // ========================================================================
    // STEP 10: Format Dashboard Input
    // ========================================================================
    formatMetricSection('📋 STEP 10: DASHBOARD INPUT FORMAT', '');
    
    const dashboardInput = formatDashboardMetrics(aggregatedMetrics);
    
    console.log('This is the exact format expected by the dashboard API:');
    console.log(JSON.stringify(dashboardInput, null, 2));

    // ========================================================================
    // STEP 11: Format AI Insights Input
    // ========================================================================
    formatMetricSection('📋 STEP 11: AI INSIGHTS GENERATION INPUT', '');
    
    const aiInsightsInput = formatAIInsightsInput(aggregatedMetrics, promptTests);
    
    if (aiInsightsInput) {
      console.log('This is the exact format expected by AI insights generation:');
      console.log(JSON.stringify(aiInsightsInput, null, 2));
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           EXTRACTION SUMMARY                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ User: ${user.email} (${user._id})`);
    console.log(`✅ URL Analysis: ${urlAnalysis.url}`);
    console.log(`✅ Brand: ${urlAnalysis.brandName || urlAnalysis.userBrand}`);
    console.log(`✅ Competitors: ${competitors.length}`);
    console.log(`✅ Topics: ${topics.length}`);
    console.log(`✅ Personas: ${personas.length}`);
    console.log(`✅ Prompts: ${prompts.length}`);
    console.log(`✅ Prompt Tests: ${promptTests.length}`);
    console.log(`✅ Aggregated Metrics: ${aggregatedMetrics.length}`);
    console.log(`✅ Performance Insights: ${performanceInsights ? 'Available' : 'Not Generated'}`);

    console.log('\n📊 Data Completeness:');
    console.log(`  - Overall Metrics: ${metricsByScope.overall ? '✅' : '❌'}`);
    console.log(`  - Platform Metrics: ${metricsByScope.platform?.length || 0} platforms`);
    console.log(`  - Topic Metrics: ${metricsByScope.topic?.length || 0} topics`);
    console.log(`  - Persona Metrics: ${metricsByScope.persona?.length || 0} personas`);

    console.log('\n📁 Output Files:');
    console.log('  All metrics have been displayed above in their proper format.');
    console.log('  You can redirect this output to a file using:');
    console.log('  node extract-hdfc-metrics.js > hdfc-metrics-output.json\n');

  } catch (error) {
    console.error('\n❌ Error extracting metrics:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

// Run the extraction
if (require.main === module) {
  extractMetrics()
    .then(() => {
      console.log('✨ Extraction complete!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { extractMetrics };


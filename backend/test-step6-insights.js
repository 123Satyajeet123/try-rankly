require('dotenv').config();
const mongoose = require('mongoose');
const insightsGenerationService = require('./src/services/insightsGenerationService');
const AggregatedMetrics = require('./src/models/AggregatedMetrics');
const PerformanceInsights = require('./src/models/PerformanceInsights');
const User = require('./src/models/User');

const TEST_EMAIL = 'satyajeetdas225@gmail.com';

async function testInsightsGeneration() {
  try {
    console.log('🧠 STEP 6: AI-POWERED PERFORMANCE INSIGHTS TEST\n');
    console.log('='.repeat(80) + '\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find test user
    const user = await User.findOne({ email: TEST_EMAIL });
    if (!user) {
      throw new Error(`Test user not found: ${TEST_EMAIL}`);
    }
    console.log(`✅ Using test user: ${user.email}\n`);

    // Find latest aggregated metrics
    const overall = await AggregatedMetrics.findOne({
      userId: user._id,
      scope: 'overall'
    }).sort({ lastCalculated: -1 }).lean();

    if (!overall) {
      throw new Error('No aggregated metrics found. Please run Steps 1-5 first.');
    }

    console.log(`✅ Found aggregated metrics from: ${overall.lastCalculated}\n`);

    // Get all aggregated metrics
    const aggregatedMetrics = {};
    
    // Overall metrics
    aggregatedMetrics.overall = overall;
    
    // Platform metrics
    const platform = await AggregatedMetrics.find({
      userId: user._id,
      urlAnalysisId: overall.urlAnalysisId,
      scope: 'platform'
    }).lean();
    aggregatedMetrics.platform = platform;
    
    // Topic metrics
    const topic = await AggregatedMetrics.find({
      userId: user._id,
      urlAnalysisId: overall.urlAnalysisId,
      scope: 'topic'
    }).lean();
    aggregatedMetrics.topic = topic;
    
    // Persona metrics
    const persona = await AggregatedMetrics.find({
      userId: user._id,
      urlAnalysisId: overall.urlAnalysisId,
      scope: 'persona'
    }).lean();
    aggregatedMetrics.persona = persona;

    console.log('📊 METRICS SUMMARY:');
    console.log(`   Overall: ${overall.brandMetrics?.length || 0} brands`);
    console.log(`   Platforms: ${platform.length} (${platform.map(p => p.scopeValue).join(', ')})`);
    console.log(`   Topics: ${topic.length} (${topic.map(t => t.scopeValue).join(', ')})`);
    console.log(`   Personas: ${persona.length} (${persona.map(p => p.scopeValue).join(', ')})\n`);

    // Show sample metrics
    if (overall.brandMetrics && overall.brandMetrics.length > 0) {
      console.log('🏆 TOP BRANDS (Overall):');
      overall.brandMetrics
        .sort((a, b) => a.mentionRank - b.mentionRank)
        .slice(0, 3)
        .forEach((brand, idx) => {
          console.log(`   ${idx + 1}. ${brand.brandName}`);
          console.log(`      Mentions: ${brand.totalMentions}`);
          console.log(`      Share of Voice: ${brand.shareOfVoice}%`);
          console.log(`      Avg Position: ${brand.avgPosition}`);
          console.log(`      Depth of Mention: ${brand.depthOfMention}%`);
          console.log(`      Citation Share: ${brand.citationShare}%`);
          console.log(`      Sentiment: ${brand.sentimentScore} (${brand.sentimentShare}% positive)\n`);
        });
    }

    // Generate insights
    console.log('🤖 GENERATING AI INSIGHTS...\n');
    
    const context = {
      brandName: 'Stripe',
      url: 'https://stripe.com',
      userId: user._id
    };

    const insightsResult = await insightsGenerationService.generateInsights(
      aggregatedMetrics,
      context
    );

    console.log('✅ INSIGHTS GENERATED!\n');
    console.log(`📊 INSIGHTS SUMMARY:`);
    console.log(`   Total Insights: ${insightsResult.insights.length}`);
    console.log(`   What's Working: ${insightsResult.summary.whatsWorkingCount}`);
    console.log(`   Needs Attention: ${insightsResult.summary.needsAttentionCount}`);
    console.log(`   High Impact: ${insightsResult.summary.highImpactCount}`);
    console.log(`   Overall Sentiment: ${insightsResult.summary.overallSentiment}\n`);

    // Display all insights
    console.log('🎯 GENERATED INSIGHTS:\n');
    
    insightsResult.insights.forEach((insight, idx) => {
      console.log(`${idx + 1}. ${insight.title}`);
      console.log(`   📝 ${insight.description}`);
      console.log(`   📂 Category: ${insight.category === 'whats_working' ? '✅ What\'s Working' : '⚠️ Needs Attention'}`);
      console.log(`   📊 Type: ${insight.type}`);
      console.log(`   🎯 Primary Metric: ${insight.primaryMetric}`);
      if (insight.secondaryMetrics && insight.secondaryMetrics.length > 0) {
        console.log(`   📈 Secondary Metrics: ${insight.secondaryMetrics.join(', ')}`);
      }
      
      if (insight.currentValue !== 0) {
        console.log(`   💹 Current Value: ${insight.currentValue}`);
      }
      if (insight.changePercent !== 0) {
        const changeIcon = insight.changePercent > 0 ? '📈' : '📉';
        console.log(`   ${changeIcon} Change: ${insight.changePercent > 0 ? '+' : ''}${insight.changePercent}%`);
      }
      
      console.log(`   🚀 Impact: ${insight.impact.toUpperCase()}`);
      console.log(`   🎯 Confidence: ${(insight.confidence * 100).toFixed(0)}%`);
      console.log(`   📅 Timeframe: ${insight.timeframe}`);
      
      if (insight.scope !== 'overall') {
        console.log(`   🎯 Scope: ${insight.scope} (${insight.scopeValue})`);
      }
      
      console.log(`   💡 Recommendation: ${insight.recommendation}`);
      
      if (insight.actionableSteps && insight.actionableSteps.length > 0) {
        console.log(`   📋 Action Steps:`);
        insight.actionableSteps.forEach((step, stepIdx) => {
          console.log(`      ${stepIdx + 1}. ${step}`);
        });
      }
      
      console.log('');
    });

    // Save insights to database
    console.log('💾 SAVING INSIGHTS TO DATABASE...\n');
    
    const performanceInsights = new PerformanceInsights({
      userId: user._id,
      urlAnalysisId: overall.urlAnalysisId,
      model: insightsResult.metadata.model,
      metricsSnapshot: {
        totalTests: overall.totalResponses,
        dateRange: {
          from: overall.dateFrom,
          to: overall.dateTo
        },
        platforms: platform.map(p => p.scopeValue),
        topics: topic.map(t => t.scopeValue),
        personas: persona.map(p => p.scopeValue)
      },
      insights: insightsResult.insights,
      summary: insightsResult.summary
    });

    await performanceInsights.save();
    console.log('✅ Insights saved to database');
    console.log(`   ID: ${performanceInsights._id}`);
    console.log(`   Generated: ${performanceInsights.generatedAt}\n`);

    // Test API endpoints (simulate)
    console.log('🔗 API ENDPOINTS AVAILABLE:');
    console.log('   POST /api/insights/generate - Generate new insights');
    console.log('   GET  /api/insights/latest - Get latest insights');
    console.log('   GET  /api/insights/history - Get insights history');
    console.log('   GET  /api/insights/:insightId - Get specific insight\n');

    console.log('─'.repeat(80) + '\n');
    console.log('✅ STEP 6 TEST COMPLETED SUCCESSFULLY!\n');
    console.log('🧠 AI-Powered Performance Insights System is ready!');
    console.log('   • Analyzes aggregated metrics with LLM');
    console.log('   • Generates actionable insights');
    console.log('   • Categorizes as "What\'s Working" vs "Needs Attention"');
    console.log('   • Provides specific recommendations');
    console.log('   • Stores insights with full context\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testInsightsGeneration();



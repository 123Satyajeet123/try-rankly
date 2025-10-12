#!/usr/bin/env node

/**
 * Extract Dashboard Metrics from /api/dashboard/all endpoint
 * 
 * This script simulates calling the /api/dashboard/all endpoint
 * to get the exact format used by the frontend dashboard.
 * 
 * User: sj@tryrankly.com
 * UserID: 68e9892f5e894a9df4c401ce
 * URL: https://www.hdfcbank.com/personal/pay/cards/credit-cards
 */

const mongoose = require('mongoose');
require('dotenv').config();

const AggregatedMetrics = require('./src/models/AggregatedMetrics');
const PerformanceInsights = require('./src/models/PerformanceInsights');
const UrlAnalysis = require('./src/models/UrlAnalysis');
const User = require('./src/models/User');

// Target user information
const TARGET_USER_ID = '68e9892f5e894a9df4c401ce';
const TARGET_EMAIL = 'sj@tryrankly.com';

/**
 * Get filtered metrics with optional query parameters
 */
async function getFilteredMetrics(userId, options = {}) {
  const query = { userId };
  
  if (options.scope) query.scope = options.scope;
  if (options.scopeValue) query.scopeValue = options.scopeValue;
  
  return await AggregatedMetrics.findOne(query)
    .sort({ lastCalculated: -1 })
    .lean();
}

/**
 * Main function to extract dashboard data
 */
async function extractDashboardData() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║             DASHBOARD /api/dashboard/all - DATA EXTRACTION               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get user
    const user = await User.findOne({
      $or: [{ _id: TARGET_USER_ID }, { email: TARGET_EMAIL }]
    });

    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    console.log(`📋 User: ${user.email} (${user._id})\n`);

    // Get URL Analysis for brand name
    const urlAnalysis = await UrlAnalysis.findOne({
      userId: user._id
    }).sort({ createdAt: -1 });

    const userBrandName = urlAnalysis?.brandName || urlAnalysis?.userBrand || 'HDFC Bank';
    console.log(`🏢 User Brand: ${userBrandName}\n`);

    // ========================================================================
    // Simulate /api/dashboard/all endpoint
    // ========================================================================
    console.log('📊 Fetching all metrics (equivalent to GET /api/dashboard/all)...\n');

    const { dateFrom, dateTo } = {};

    // Get all metrics scopes (this is exactly what the endpoint does)
    const [overall, platforms, topics, personas] = await Promise.all([
      getFilteredMetrics(user._id.toString(), { scope: 'overall', dateFrom, dateTo }),
      AggregatedMetrics.find({ userId: user._id.toString(), scope: 'platform' }).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find({ userId: user._id.toString(), scope: 'topic' }).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find({ userId: user._id.toString(), scope: 'persona' }).sort({ lastCalculated: -1 }).lean()
    ]);

    // Get latest AI-powered Performance Insights
    let aiInsights = null;
    try {
      const latestInsights = await PerformanceInsights.findOne({
        userId: user._id
      }).sort({ generatedAt: -1 }).lean();

      if (latestInsights) {
        const whatsWorking = latestInsights.insights.filter(i => i.category === 'whats_working');
        const needsAttention = latestInsights.insights.filter(i => i.category === 'needs_attention');
        
        aiInsights = {
          whatsWorking,
          needsAttention,
          all: latestInsights.insights,
          summary: latestInsights.summary,
          metadata: {
            id: latestInsights._id,
            generatedAt: latestInsights.generatedAt,
            model: latestInsights.model,
            totalTests: latestInsights.metricsSnapshot.totalTests
          }
        };
        
        console.log(`✅ AI Insights: ${aiInsights.all.length} insights found\n`);
      }
    } catch (error) {
      console.log('⚠️ No AI insights found\n');
    }

    // Build the complete response (exactly as the API returns it)
    const dashboardResponse = {
      success: true,
      data: {
        // Core metrics (raw data)
        overall: overall,
        platforms: platforms,
        topics: topics,
        personas: personas,
        
        // AI-Powered Performance Insights
        aiInsights: aiInsights,
        
        // Raw platform data for citation analysis
        platformMetrics: platforms,
        
        lastUpdated: overall?.lastCalculated || new Date()
      }
    };

    // ========================================================================
    // Display the results
    // ========================================================================
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                      DASHBOARD DATA STRUCTURE                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('1️⃣  OVERALL METRICS (data.overall)');
    console.log('═'.repeat(80));
    if (overall) {
      console.log(`   Scope: ${overall.scope}`);
      console.log(`   Total Brands: ${overall.totalBrands}`);
      console.log(`   Total Prompts: ${overall.totalPrompts}`);
      console.log(`   Total Responses: ${overall.totalResponses}`);
      console.log(`   Date Range: ${overall.dateFrom} to ${overall.dateTo}`);
      console.log(`   Last Calculated: ${overall.lastCalculated}`);
      console.log(`\n   Brand Metrics (${overall.brandMetrics.length} brands):`);
      
      overall.brandMetrics.forEach((brand, idx) => {
        console.log(`\n   ${idx + 1}. ${brand.brandName}`);
        console.log(`      ├─ Visibility Score: ${brand.visibilityScore?.toFixed(2) || 'N/A'}% (Rank #${brand.visibilityRank})`);
        console.log(`      ├─ Share of Voice: ${brand.shareOfVoice.toFixed(2)}% (Rank #${brand.shareOfVoiceRank})`);
        console.log(`      ├─ Avg Position: ${brand.avgPosition.toFixed(2)} (Rank #${brand.avgPositionRank})`);
        console.log(`      ├─ Depth of Mention: ${brand.depthOfMention.toFixed(4)}% (Rank #${brand.depthRank})`);
        console.log(`      ├─ Total Mentions: ${brand.totalMentions}`);
        console.log(`      ├─ Total Appearances: ${brand.totalAppearances} prompts`);
        console.log(`      ├─ Position Distribution: 1st(${brand.count1st}) 2nd(${brand.count2nd}) 3rd(${brand.count3rd})`);
        console.log(`      ├─ Citation Share: ${brand.citationShare.toFixed(2)}% (Rank #${brand.citationShareRank})`);
        console.log(`      ├─ Citations: Brand(${brand.brandCitationsTotal}) Earned(${brand.earnedCitationsTotal}) Social(${brand.socialCitationsTotal}) Total(${brand.totalCitations})`);
        console.log(`      ├─ Sentiment Score: ${brand.sentimentScore.toFixed(2)}`);
        console.log(`      └─ Sentiment Breakdown: Pos(${brand.sentimentBreakdown.positive}) Neu(${brand.sentimentBreakdown.neutral}) Neg(${brand.sentimentBreakdown.negative}) Mixed(${brand.sentimentBreakdown.mixed})`);
      });
    } else {
      console.log('   ❌ No overall metrics found');
    }

    console.log('\n\n2️⃣  PLATFORM METRICS (data.platforms)');
    console.log('═'.repeat(80));
    if (platforms && platforms.length > 0) {
      console.log(`   Total Platforms: ${platforms.length}\n`);
      
      platforms.forEach(platform => {
        console.log(`   📱 Platform: ${platform.scopeValue.toUpperCase()}`);
        console.log(`      Total Prompts: ${platform.totalPrompts}`);
        console.log(`      Total Responses: ${platform.totalResponses}`);
        
        const userBrand = platform.brandMetrics[0];
        if (userBrand) {
          console.log(`      User Brand (${userBrand.brandName}):`);
          console.log(`        ├─ Visibility: ${userBrand.visibilityScore?.toFixed(2) || 'N/A'}%`);
          console.log(`        ├─ Share of Voice: ${userBrand.shareOfVoice.toFixed(2)}%`);
          console.log(`        ├─ Avg Position: ${userBrand.avgPosition.toFixed(2)}`);
          console.log(`        ├─ Citations: ${userBrand.totalCitations}`);
          console.log(`        └─ Sentiment: ${userBrand.sentimentScore.toFixed(2)}`);
        }
        console.log('');
      });
    } else {
      console.log('   ❌ No platform metrics found');
    }

    console.log('\n3️⃣  TOPIC METRICS (data.topics)');
    console.log('═'.repeat(80));
    if (topics && topics.length > 0) {
      console.log(`   Total Topics: ${topics.length}\n`);
      
      topics.forEach(topic => {
        console.log(`   📚 Topic: ${topic.scopeValue}`);
        console.log(`      Total Prompts: ${topic.totalPrompts}`);
        
        const userBrand = topic.brandMetrics[0];
        if (userBrand) {
          console.log(`      User Brand Performance:`);
          console.log(`        ├─ Visibility: ${userBrand.visibilityScore?.toFixed(2) || 'N/A'}%`);
          console.log(`        ├─ Share of Voice: ${userBrand.shareOfVoice.toFixed(2)}%`);
          console.log(`        ├─ Avg Position: ${userBrand.avgPosition.toFixed(2)}`);
          console.log(`        └─ Sentiment: ${userBrand.sentimentScore.toFixed(2)}`);
        }
        console.log('');
      });
    } else {
      console.log('   ❌ No topic metrics found');
    }

    console.log('\n4️⃣  PERSONA METRICS (data.personas)');
    console.log('═'.repeat(80));
    if (personas && personas.length > 0) {
      console.log(`   Total Personas: ${personas.length}\n`);
      
      personas.forEach(persona => {
        console.log(`   👥 Persona: ${persona.scopeValue}`);
        console.log(`      Total Prompts: ${persona.totalPrompts}`);
        
        const userBrand = persona.brandMetrics[0];
        if (userBrand) {
          console.log(`      User Brand Performance:`);
          console.log(`        ├─ Visibility: ${userBrand.visibilityScore?.toFixed(2) || 'N/A'}%`);
          console.log(`        ├─ Share of Voice: ${userBrand.shareOfVoice.toFixed(2)}%`);
          console.log(`        ├─ Avg Position: ${userBrand.avgPosition.toFixed(2)}`);
          console.log(`        └─ Sentiment: ${userBrand.sentimentScore.toFixed(2)}`);
        }
        console.log('');
      });
    } else {
      console.log('   ❌ No persona metrics found');
    }

    console.log('\n5️⃣  AI-POWERED PERFORMANCE INSIGHTS (data.aiInsights)');
    console.log('═'.repeat(80));
    if (aiInsights) {
      console.log(`   Model: ${aiInsights.metadata.model}`);
      console.log(`   Generated: ${new Date(aiInsights.metadata.generatedAt).toLocaleString()}`);
      console.log(`   Total Tests: ${aiInsights.metadata.totalTests}\n`);

      console.log(`   📈 WHAT'S WORKING (${aiInsights.whatsWorking.length} insights):\n`);
      aiInsights.whatsWorking.forEach((insight, idx) => {
        console.log(`   ${idx + 1}. ${insight.title}`);
        console.log(`      Impact: ${insight.impact.toUpperCase()}`);
        console.log(`      Current: ${insight.currentValue}`);
        console.log(`      Change: ${insight.changePercent > 0 ? '+' : ''}${insight.changePercent.toFixed(2)}%`);
        console.log(`      📝 ${insight.description}`);
        console.log(`      💡 ${insight.recommendation}\n`);
      });

      console.log(`   ⚠️  NEEDS ATTENTION (${aiInsights.needsAttention.length} insights):\n`);
      aiInsights.needsAttention.forEach((insight, idx) => {
        console.log(`   ${idx + 1}. ${insight.title}`);
        console.log(`      Impact: ${insight.impact.toUpperCase()}`);
        console.log(`      Current: ${insight.currentValue}`);
        console.log(`      Change: ${insight.changePercent > 0 ? '+' : ''}${insight.changePercent.toFixed(2)}%`);
        console.log(`      📝 ${insight.description}`);
        console.log(`      💡 ${insight.recommendation}\n`);
      });

      console.log(`   📊 Summary:`);
      console.log(`      ├─ What's Working: ${aiInsights.summary.whatsWorkingCount}`);
      console.log(`      ├─ Needs Attention: ${aiInsights.summary.needsAttentionCount}`);
      console.log(`      ├─ High Impact: ${aiInsights.summary.highImpactCount}`);
      console.log(`      ├─ Top Insight: ${aiInsights.summary.topInsight}`);
      console.log(`      └─ Overall Sentiment: ${aiInsights.summary.overallSentiment}`);
    } else {
      console.log('   ⚠️  No AI insights available. Run metrics aggregation to generate.');
    }

    // ========================================================================
    // Output full JSON for programmatic use
    // ========================================================================
    console.log('\n\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        FULL JSON OUTPUT                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('This is the EXACT JSON returned by GET /api/dashboard/all:\n');
    console.log(JSON.stringify(dashboardResponse, null, 2));

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           EXTRACTION SUMMARY                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ User: ${user.email}`);
    console.log(`✅ Brand: ${userBrandName}`);
    console.log(`✅ Overall Metrics: ${overall ? 'Available' : 'Not Available'}`);
    console.log(`✅ Platform Metrics: ${platforms.length} platforms`);
    console.log(`✅ Topic Metrics: ${topics.length} topics`);
    console.log(`✅ Persona Metrics: ${personas.length} personas`);
    console.log(`✅ AI Insights: ${aiInsights ? 'Available' : 'Not Available'}`);
    
    if (overall) {
      console.log(`\n📊 Key Metrics:`);
      const userBrand = overall.brandMetrics[0];
      console.log(`   ├─ Visibility Score: ${userBrand.visibilityScore?.toFixed(2) || 'N/A'}%`);
      console.log(`   ├─ Share of Voice: ${userBrand.shareOfVoice.toFixed(2)}%`);
      console.log(`   ├─ Average Position: ${userBrand.avgPosition.toFixed(2)}`);
      console.log(`   ├─ Total Mentions: ${userBrand.totalMentions}`);
      console.log(`   ├─ Citation Share: ${userBrand.citationShare.toFixed(2)}%`);
      console.log(`   └─ Sentiment Score: ${userBrand.sentimentScore.toFixed(2)}`);
    }

    console.log('\n📁 To save this output:');
    console.log('   node extract-dashboard-all-data.js > dashboard-data-output.json\n');

  } catch (error) {
    console.error('\n❌ Error extracting dashboard data:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the extraction
if (require.main === module) {
  extractDashboardData()
    .then(() => {
      console.log('✨ Extraction complete!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { extractDashboardData };



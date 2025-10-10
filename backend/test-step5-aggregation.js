/**
 * Test Script: Step 5 - Metrics Aggregation
 * 
 * Tests the complete metrics aggregation at three levels:
 * 1. Overall (all tests combined)
 * 2. Platform (per LLM: OpenAI, Gemini, Claude, Perplexity)
 * 3. Topic (per topic: Payment Processing, API Integration, etc.)
 * 4. Persona (per persona type: Technical, Business, etc.)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const UrlAnalysis = require('./src/models/UrlAnalysis');
const PromptTest = require('./src/models/PromptTest');
const AggregatedMetrics = require('./src/models/AggregatedMetrics');
const metricsAggregationService = require('./src/services/metricsAggregationService');

async function testMetricsAggregation() {
  try {
    console.log('\n🚀 STEP 5: METRICS AGGREGATION TEST\n');
    console.log('=' .repeat(80));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get test user (the one with Stripe analysis)
    const user = await User.findOne({ email: 'test@simplified.com' });
    if (!user) {
      throw new Error('Test user not found. Please run step 1 first.');
    }

    // Get Stripe URL analysis
    const urlAnalysis = await UrlAnalysis.findOne({ 
      userId: user._id,
      url: 'https://stripe.com'
    });

    if (!urlAnalysis) {
      throw new Error('No URL analysis found. Please run step 1 first.');
    }

    console.log('📊 USER & DATA INFO:');
    console.log(`   User: ${user.email}`);
    console.log(`   Brand: ${urlAnalysis.brandContext?.companyName || 'N/A'}`);
    console.log(`   URL: ${urlAnalysis.url}`);
    console.log(`   Analysis ID: ${urlAnalysis._id}`);
    console.log('\n' + '─'.repeat(80) + '\n');

    // Count tests
    const totalTests = await PromptTest.countDocuments({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id,
      status: 'completed'
    });

    console.log(`📈 FOUND ${totalTests} COMPLETED TESTS\n`);

    if (totalTests === 0) {
      throw new Error('No completed tests found. Please run step 4 first.');
    }

    // Clear old aggregated metrics
    console.log('🧹 Cleaning old aggregated metrics...');
    await AggregatedMetrics.deleteMany({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    });
    console.log('✅ Old metrics cleared\n');

    console.log('=' .repeat(80));
    console.log('🔄 RUNNING METRICS AGGREGATION...\n');
    console.log('=' .repeat(80) + '\n');

    // Run aggregation
    const startTime = Date.now();
    const results = await metricsAggregationService.calculateMetrics(user._id, {
      urlAnalysisId: urlAnalysis._id
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!results.success) {
      throw new Error(results.message || 'Aggregation failed');
    }

    console.log(`\n✅ AGGREGATION COMPLETE in ${duration}s\n`);
    console.log('=' .repeat(80) + '\n');

    // ========================================================================
    // DISPLAY RESULTS
    // ========================================================================

    console.log('📊 AGGREGATION SUMMARY:\n');
    console.log(`   ✅ Overall metrics: ${results.results.overall ? 'Saved' : 'Skipped'}`);
    console.log(`   ✅ Platform metrics: ${results.results.platform.length} saved`);
    console.log(`   ✅ Topic metrics: ${results.results.topic.length} saved`);
    console.log(`   ✅ Persona metrics: ${results.results.persona.length} saved`);
    console.log('\n' + '=' .repeat(80) + '\n');

    // ========================================================================
    // LEVEL 1: OVERALL METRICS
    // ========================================================================

    console.log('📈 LEVEL 1: OVERALL METRICS (All Tests Combined)\n');
    console.log('=' .repeat(80) + '\n');

    if (results.results.overall) {
      const overall = results.results.overall;
      console.log(`Total Prompts: ${overall.totalPrompts}`);
      console.log(`Total Responses: ${overall.totalResponses}`);
      console.log(`Total Brands: ${overall.totalBrands}`);
      console.log(`\n${'─'.repeat(80)}\n`);

      // Display brand rankings
      console.log('🏆 BRAND RANKINGS (Overall):\n');

      const sortedBrands = [...overall.brandMetrics].sort((a, b) => 
        a.mentionRank - b.mentionRank
      );

      sortedBrands.forEach((brand, idx) => {
        console.log(`${idx + 1}. ${brand.brandName.toUpperCase()}`);
        console.log(`   Rank: #${brand.mentionRank}`);
        console.log(`   Total Mentions: ${brand.totalMentions}`);
        console.log(`   Share of Voice: ${brand.shareOfVoice}%`);
        console.log(`   Avg Position: ${brand.avgPosition}`);
        console.log(`   Depth of Mention: ${brand.depthOfMention}%`);
        console.log(`   Citation Share: ${brand.citationShare}%`);
        console.log(`   Citations: Brand=${brand.brandCitationsTotal}, Earned=${brand.earnedCitationsTotal}, Social=${brand.socialCitationsTotal}`);
        console.log(`   Sentiment: Score=${brand.sentimentScore}, Share=${brand.sentimentShare}%`);
        console.log(`   Sentiment Breakdown: +${brand.sentimentBreakdown.positive} =${brand.sentimentBreakdown.neutral} -${brand.sentimentBreakdown.negative} ±${brand.sentimentBreakdown.mixed}`);
        console.log('');
      });

      console.log('─'.repeat(80) + '\n');
    }

    // ========================================================================
    // LEVEL 2: PLATFORM METRICS
    // ========================================================================

    console.log('📈 LEVEL 2: PLATFORM METRICS (Per LLM)\n');
    console.log('=' .repeat(80) + '\n');

    if (results.results.platform && results.results.platform.length > 0) {
      results.results.platform.forEach(platformMetrics => {
        console.log(`🤖 ${platformMetrics.scopeValue.toUpperCase()}`);
        console.log(`   Responses: ${platformMetrics.totalResponses}`);
        console.log(`   Brands: ${platformMetrics.totalBrands}`);
        console.log('');

        // Top 3 brands on this platform
        const topBrands = [...platformMetrics.brandMetrics]
          .sort((a, b) => a.mentionRank - b.mentionRank)
          .slice(0, 3);

        topBrands.forEach((brand, idx) => {
          console.log(`   ${idx + 1}. ${brand.brandName} - ${brand.totalMentions} mentions (${brand.shareOfVoice}% voice)`);
        });

        console.log('\n' + '─'.repeat(80) + '\n');
      });
    }

    // ========================================================================
    // LEVEL 3: TOPIC METRICS
    // ========================================================================

    console.log('📈 LEVEL 3: TOPIC METRICS\n');
    console.log('=' .repeat(80) + '\n');

    if (results.results.topic && results.results.topic.length > 0) {
      results.results.topic.forEach(topicMetrics => {
        console.log(`📚 ${topicMetrics.scopeValue}`);
        console.log(`   Responses: ${topicMetrics.totalResponses}`);
        console.log(`   Brands: ${topicMetrics.totalBrands}`);
        console.log('');

        // Top 3 brands for this topic
        const topBrands = [...topicMetrics.brandMetrics]
          .sort((a, b) => a.mentionRank - b.mentionRank)
          .slice(0, 3);

        topBrands.forEach((brand, idx) => {
          console.log(`   ${idx + 1}. ${brand.brandName} - ${brand.totalMentions} mentions (${brand.shareOfVoice}% voice, Pos: ${brand.avgPosition})`);
        });

        console.log('\n' + '─'.repeat(80) + '\n');
      });
    }

    // ========================================================================
    // LEVEL 4: PERSONA METRICS
    // ========================================================================

    console.log('📈 LEVEL 4: PERSONA METRICS\n');
    console.log('=' .repeat(80) + '\n');

    if (results.results.persona && results.results.persona.length > 0) {
      results.results.persona.forEach(personaMetrics => {
        console.log(`👤 ${personaMetrics.scopeValue}`);
        console.log(`   Responses: ${personaMetrics.totalResponses}`);
        console.log(`   Brands: ${personaMetrics.totalBrands}`);
        console.log('');

        // Top 3 brands for this persona
        const topBrands = [...personaMetrics.brandMetrics]
          .sort((a, b) => a.mentionRank - b.mentionRank)
          .slice(0, 3);

        topBrands.forEach((brand, idx) => {
          console.log(`   ${idx + 1}. ${brand.brandName} - ${brand.totalMentions} mentions (${brand.shareOfVoice}% voice, Sentiment: ${brand.sentimentScore})`);
        });

        console.log('\n' + '─'.repeat(80) + '\n');
      });
    }

    // ========================================================================
    // VERIFICATION
    // ========================================================================

    console.log('✅ VERIFICATION:\n');
    console.log('=' .repeat(80) + '\n');

    const savedMetrics = await AggregatedMetrics.find({
      userId: user._id,
      urlAnalysisId: urlAnalysis._id
    });

    console.log(`Total saved metric documents: ${savedMetrics.length}`);
    console.log('');
    console.log('Breakdown by scope:');
    const scopeCounts = {};
    savedMetrics.forEach(m => {
      scopeCounts[m.scope] = (scopeCounts[m.scope] || 0) + 1;
    });
    Object.entries(scopeCounts).forEach(([scope, count]) => {
      console.log(`   ${scope}: ${count}`);
    });

    console.log('\n' + '=' .repeat(80));
    console.log('✅ STEP 5: METRICS AGGREGATION COMPLETE!');
    console.log('=' .repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testMetricsAggregation();


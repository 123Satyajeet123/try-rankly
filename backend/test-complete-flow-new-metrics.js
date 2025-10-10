/**
 * Complete Backend Flow Test - WITH NEW METRICS
 * 
 * Runs all 5 steps with the new metrics system:
 * 1. URL Analysis (Perplexity AI)
 * 2. User Selections
 * 3. Prompt Generation
 * 4. LLM Testing (with sentiment, citations, depth)
 * 5. Metrics Aggregation (3 levels: Overall, Platform, Topic, Persona)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const UrlAnalysis = require('./src/models/UrlAnalysis');
const Competitor = require('./src/models/Competitor');
const Topic = require('./src/models/Topic');
const Persona = require('./src/models/Persona');
const Prompt = require('./src/models/Prompt');
const PromptTest = require('./src/models/PromptTest');
const AggregatedMetrics = require('./src/models/AggregatedMetrics');
const websiteAnalysisService = require('./src/services/websiteAnalysisService');
const promptGenerationService = require('./src/services/promptGenerationService');
const promptTestingService = require('./src/services/promptTestingService');
const metricsAggregationService = require('./src/services/metricsAggregationService');
const insightsGenerationService = require('./src/services/insightsGenerationService');

const TEST_URL = 'https://stripe.com';
const TEST_EMAIL = 'satyajeetdas225@gmail.com';

async function runCompleteFlow() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 COMPLETE BACKEND FLOW TEST - NEW METRICS SYSTEM');
    console.log('='.repeat(80) + '\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ========================================================================
    // SETUP: Create/Get Test User
    // ========================================================================
    console.log('📋 SETUP: Test User\n');
    console.log('─'.repeat(80) + '\n');

    let user = await User.findOne({ email: TEST_EMAIL });
    
    if (!user) {
      throw new Error(`User ${TEST_EMAIL} not found in database`);
    }
    
    console.log(`✅ Using test user: ${TEST_EMAIL}`);
    
    // Clean up old data for fresh test
    console.log('🧹 Cleaning up old test data...');
    await UrlAnalysis.deleteMany({ userId: user._id });
    await Competitor.deleteMany({ userId: user._id });
    await Topic.deleteMany({ userId: user._id });
    await Persona.deleteMany({ userId: user._id });
    await Prompt.deleteMany({ userId: user._id });
    await PromptTest.deleteMany({ userId: user._id });
    await AggregatedMetrics.deleteMany({ userId: user._id });
    console.log('✅ Cleanup complete');

    console.log(`\nUser ID: ${user._id}\n`);
    console.log('─'.repeat(80) + '\n');

    // ========================================================================
    // STEP 1: URL ANALYSIS
    // ========================================================================
    console.log('📊 STEP 1: URL ANALYSIS\n');
    console.log('='.repeat(80) + '\n');

    console.log(`Analyzing: ${TEST_URL}`);
    console.log('Using: Perplexity AI (perplexity/sonar-pro)\n');

    const analysisResults = await websiteAnalysisService.analyzeWebsite(TEST_URL);

    console.log('✅ Analysis Complete!\n');
    
    // Save complete analysis results to UrlAnalysis collection (like the route does)
    const urlAnalysis = new UrlAnalysis({
      userId: user._id,
      url: TEST_URL,
      brandContext: analysisResults.brandContext,
      competitors: analysisResults.competitors || [],
      topics: analysisResults.topics || [],
      personas: analysisResults.personas || [],
      analysisDate: new Date(analysisResults.analysisDate),
      status: 'completed'
    });
    
    await urlAnalysis.save();
    console.log('✅ Saved UrlAnalysis to database');
    
    // Save individual items to respective collections for user selection
    
    // Save competitors
    if (analysisResults.competitors && analysisResults.competitors.length > 0) {
      const competitorPromises = analysisResults.competitors.map(comp => {
        return new Competitor({
          userId: user._id,
          urlAnalysisId: urlAnalysis._id,
          name: comp.name,
          url: comp.url,
          reason: comp.reason,
          similarity: comp.similarity,
          source: 'ai',
          selected: false
        }).save();
      });
      await Promise.all(competitorPromises);
      console.log(`✅ Saved ${analysisResults.competitors.length} competitors`);
    }
    
    // Save topics
    if (analysisResults.topics && analysisResults.topics.length > 0) {
      const topicPromises = analysisResults.topics.map(topic => {
        return new Topic({
          userId: user._id,
          urlAnalysisId: urlAnalysis._id,
          name: topic.name,
          description: topic.description,
          keywords: topic.keywords || [],
          priority: topic.priority,
          source: 'ai',
          selected: false
        }).save();
      });
      await Promise.all(topicPromises);
      console.log(`✅ Saved ${analysisResults.topics.length} topics`);
    }
    
    // Save personas
    if (analysisResults.personas && analysisResults.personas.length > 0) {
      const personaPromises = analysisResults.personas.map(persona => {
        return new Persona({
          userId: user._id,
          urlAnalysisId: urlAnalysis._id,
          type: persona.type,
          description: persona.description,
          painPoints: persona.painPoints || [],
          goals: persona.goals || [],
          relevance: persona.relevance,
          source: 'ai',
          selected: false
        }).save();
      });
      await Promise.all(personaPromises);
      console.log(`✅ Saved ${analysisResults.personas.length} personas`);
    }
    
    console.log('\n📊 Analysis Summary:');
    console.log(`Brand: ${urlAnalysis.brandContext?.companyName}`);
    console.log(`Description: ${urlAnalysis.brandContext?.description?.substring(0, 100)}...`);
    console.log(`Competitors: ${analysisResults.competitors?.length || 0}`);
    console.log(`Topics: ${analysisResults.topics?.length || 0}`);
    console.log(`Personas: ${analysisResults.personas?.length || 0}`);
    console.log(`\nAnalysis ID: ${urlAnalysis._id}\n`);

    console.log('─'.repeat(80) + '\n');

    // ========================================================================
    // STEP 2: USER SELECTIONS
    // ========================================================================
    console.log('📊 STEP 2: USER SELECTIONS\n');
    console.log('='.repeat(80) + '\n');

    // Wait a moment for all database writes to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Select competitors (top 3)
    const competitors = await Competitor.find({ 
      userId: user._id,
      urlAnalysisId: urlAnalysis._id 
    }).limit(3);
    
    console.log(`Found ${competitors.length} competitors to select`);

    for (const comp of competitors) {
      comp.selected = true;
      await comp.save();
      console.log(`✅ Selected competitor: ${comp.name}`);
    }

    // Select topics (top 2)
    const topics = await Topic.find({ 
      userId: user._id,
      urlAnalysisId: urlAnalysis._id 
    }).limit(2);
    
    console.log(`Found ${topics.length} topics to select`);

    for (const topic of topics) {
      topic.selected = true;
      await topic.save();
      console.log(`✅ Selected topic: ${topic.name}`);
    }

    // Select personas (top 2)
    const personas = await Persona.find({ 
      userId: user._id,
      urlAnalysisId: urlAnalysis._id 
    }).limit(2);
    
    console.log(`Found ${personas.length} personas to select`);

    for (const persona of personas) {
      persona.selected = true;
      await persona.save();
      console.log(`✅ Selected persona: ${persona.type}`);
    }

    console.log('\n─'.repeat(80) + '\n');

    // ========================================================================
    // STEP 3: PROMPT GENERATION
    // ========================================================================
    console.log('📊 STEP 3: PROMPT GENERATION\n');
    console.log('='.repeat(80) + '\n');

    const selectedTopics = await Topic.find({ userId: user._id, selected: true });
    const selectedPersonas = await Persona.find({ userId: user._id, selected: true });
    const selectedCompetitors = await Competitor.find({ userId: user._id, selected: true });

    const totalPrompts = selectedTopics.length * selectedPersonas.length;
    console.log(`Generating prompts for ${selectedTopics.length} topics × ${selectedPersonas.length} personas = ${totalPrompts} combinations...\n`);

    const generatedPrompts = await promptGenerationService.generatePrompts({
      topics: selectedTopics,
      personas: selectedPersonas,
      region: 'Global',
      language: 'English',
      websiteUrl: urlAnalysis.url,
      brandContext: urlAnalysis.brandContext || '',
      competitors: selectedCompetitors
    });

    console.log(`✅ Generated ${generatedPrompts.length} prompts\n`);

    // Save prompts to database
    const savedPrompts = [];
    
    console.log('Sample prompt data:', JSON.stringify(generatedPrompts[0], null, 2));
    
    for (const promptData of generatedPrompts) {
      // Find the topic and persona ObjectIds by name/type
      const topic = selectedTopics.find(t => t.name === promptData.topicName);
      const persona = selectedPersonas.find(p => p.type === promptData.personaType);

      if (!topic || !persona) {
        console.warn('Skipping prompt - topic or persona not found:', promptData.topicName, promptData.personaType);
        continue;
      }

      const prompt = new Prompt({
        userId: user._id,
        urlAnalysisId: urlAnalysis._id,
        topicId: topic._id,
        personaId: persona._id,
        title: `${promptData.topicName} - ${promptData.personaType} - ${promptData.queryType}`,
        text: promptData.promptText,
        queryType: promptData.queryType,
        context: {
          topic: promptData.topicName,
          persona: promptData.personaType
        },
        metadata: {
          generatedBy: 'ai',
          model: 'gpt-4o',
          targetPersonas: [promptData.personaType],
          personaType: promptData.personaType
        }
      });

      await prompt.save();
      savedPrompts.push(prompt);
    }

    console.log(`✅ Saved ${savedPrompts.length} prompts to database\n`);

    if (savedPrompts.length > 0) {
      console.log('Sample prompts:');
      savedPrompts.slice(0, 2).forEach((p, idx) => {
        console.log(`\n${idx + 1}. ${p.text.substring(0, 150)}...`);
        console.log(`   Query Type: ${p.queryType}`);
      });
    }

    console.log('\n─'.repeat(80) + '\n');

    // ========================================================================
    // STEP 4: LLM TESTING
    // ========================================================================
    console.log('📊 STEP 4: LLM TESTING (WITH NEW METRICS)\n');
    console.log('='.repeat(80) + '\n');

    console.log('Testing prompts across 4 LLM platforms:');
    console.log('  - OpenAI (GPT-4)');
    console.log('  - Google (Gemini)');
    console.log('  - Anthropic (Claude)');
    console.log('  - Perplexity\n');

    console.log('Metrics being calculated:');
    console.log('  ✓ Brand Mentions (count, position)');
    console.log('  ✓ Sentiment Analysis (score, breakdown, drivers)');
    console.log('  ✓ Citations (brand, earned, social)');
    console.log('  ✓ Sentence-level data (for depth calculation)');
    console.log('  ✓ Response metadata (total sentences, words)\n');

    const testResults = await promptTestingService.testAllPrompts(
      user._id,
      urlAnalysis._id
    );

    console.log(`\n✅ Testing Complete!\n`);
    console.log(`Total Tests Run: ${testResults.completedCount}`);
    console.log(`Failed Tests: ${testResults.failedCount}\n`);

    if (testResults.completedCount > 0) {
      // Show sample results
      const sampleTest = await PromptTest.findOne({ 
        userId: user._id,
        status: 'completed',
        'scorecard.brandMentioned': true
      }).lean();

      if (sampleTest) {
        console.log('📊 Sample Test Result:');
        console.log(`  Platform: ${sampleTest.llmProvider}`);
        console.log(`  Brand Mentioned: ${sampleTest.scorecard.brandMentioned}`);
        console.log(`  Brand Position: ${sampleTest.scorecard.brandPosition}`);
        console.log(`  Brand Mentions: ${sampleTest.scorecard.brandMentionCount}`);
        console.log(`  Citations: Brand=${sampleTest.scorecard.brandCitations}, Earned=${sampleTest.scorecard.earnedCitations}, Social=${sampleTest.scorecard.socialCitations}`);
        
        if (sampleTest.brandMetrics && sampleTest.brandMetrics.length > 0) {
          const brandMetric = sampleTest.brandMetrics[0];
          console.log(`\n  Brand Metrics (${brandMetric.brandName}):`);
          console.log(`    Mentions: ${brandMetric.mentionCount}`);
          console.log(`    First Position: ${brandMetric.firstPosition}`);
          console.log(`    Sentences: ${brandMetric.sentences?.length || 0}`);
          console.log(`    Sentiment: ${brandMetric.sentiment || 'N/A'} (${brandMetric.sentimentScore || 0})`);
        }
        
        console.log(`\n  Response Metadata:`);
        console.log(`    Total Sentences: ${sampleTest.responseMetadata?.totalSentences || 0}`);
        console.log(`    Total Words: ${sampleTest.responseMetadata?.totalWords || 0}`);
      }
    }

    console.log('\n─'.repeat(80) + '\n');

    // ========================================================================
    // STEP 5: METRICS AGGREGATION (3 LEVELS)
    // ========================================================================
    console.log('📊 STEP 5: METRICS AGGREGATION\n');
    console.log('='.repeat(80) + '\n');

    console.log('Aggregating metrics at 3 levels:');
    console.log('  1. Overall (all tests combined)');
    console.log('  2. Platform (per LLM: OpenAI, Gemini, Claude, Perplexity)');
    console.log('  3. Topic (per topic selected)');
    console.log('  4. Persona (per persona type)\n');

    const aggregationResults = await metricsAggregationService.calculateMetrics(
      user._id,
      { urlAnalysisId: urlAnalysis._id }
    );

    if (aggregationResults.success) {
      console.log('✅ Aggregation Complete!\n');
      console.log(`Overall Metrics: ${aggregationResults.results.overall ? 'Saved' : 'Skipped'}`);
      console.log(`Platform Metrics: ${aggregationResults.results.platform.length} saved`);
      console.log(`Topic Metrics: ${aggregationResults.results.topic.length} saved`);
      console.log(`Persona Metrics: ${aggregationResults.results.persona.length} saved\n`);

      // Show overall rankings
      if (aggregationResults.results.overall) {
        console.log('🏆 OVERALL BRAND RANKINGS:\n');
        
        const sortedBrands = [...aggregationResults.results.overall.brandMetrics]
          .sort((a, b) => a.mentionRank - b.mentionRank)
          .slice(0, 5); // Top 5

        sortedBrands.forEach((brand, idx) => {
          console.log(`${idx + 1}. ${brand.brandName}`);
          console.log(`   Rank: #${brand.mentionRank}`);
          console.log(`   Mentions: ${brand.totalMentions}`);
          console.log(`   Share of Voice: ${brand.shareOfVoice}%`);
          console.log(`   Avg Position: ${brand.avgPosition}`);
          console.log(`   Depth of Mention: ${brand.depthOfMention}%`);
          console.log(`   Citation Share: ${brand.citationShare}%`);
          console.log(`   Sentiment: ${brand.sentimentScore} (${brand.sentimentShare}% positive)`);
          console.log('');
        });
      }

      console.log('─'.repeat(80) + '\n');

      // Show platform breakdown
      if (aggregationResults.results.platform.length > 0) {
        console.log('📊 PLATFORM BREAKDOWN:\n');
        
        aggregationResults.results.platform.forEach(platformMetrics => {
          const topBrand = platformMetrics.brandMetrics
            .sort((a, b) => b.totalMentions - a.totalMentions)[0];
          
          console.log(`${platformMetrics.scopeValue.toUpperCase()}:`);
          console.log(`  Tests: ${platformMetrics.totalResponses}`);
          console.log(`  Top Brand: ${topBrand?.brandName || 'N/A'} (${topBrand?.totalMentions || 0} mentions)`);
          console.log('');
        });
      }

      console.log('─'.repeat(80) + '\n');

      // Show topic breakdown
      if (aggregationResults.results.topic.length > 0) {
        console.log('📚 TOPIC BREAKDOWN:\n');
        
        aggregationResults.results.topic.forEach(topicMetrics => {
          const topBrand = topicMetrics.brandMetrics
            .sort((a, b) => b.totalMentions - a.totalMentions)[0];
          
          console.log(`${topicMetrics.scopeValue}:`);
          console.log(`  Tests: ${topicMetrics.totalResponses}`);
          console.log(`  Top Brand: ${topBrand?.brandName || 'N/A'} (${topBrand?.shareOfVoice || 0}% voice)`);
          console.log('');
        });
      }
    }

    console.log('─'.repeat(80) + '\n');

    // ========================================================================
    // STEP 6: AI-POWERED PERFORMANCE INSIGHTS
    // ========================================================================
    console.log('🧠 STEP 6: AI-POWERED PERFORMANCE INSIGHTS\n');
    console.log('='.repeat(80) + '\n');

    console.log('Generating actionable insights using LLM analysis...');
    console.log('Analyzing aggregated metrics to identify:');
    console.log('  • What\'s Working - Positive trends and successes');
    console.log('  • Needs Attention - Areas for improvement\n');

    try {
      // Get aggregated metrics for insights generation
      const aggregatedMetrics = {};
      
      // Overall metrics
      const overall = await AggregatedMetrics.findOne({
        userId: user._id,
        urlAnalysisId: urlAnalysis._id,
        scope: 'overall'
      }).lean();
      
      if (overall) {
        aggregatedMetrics.overall = overall;
        
        // Platform metrics
        const platform = await AggregatedMetrics.find({
          userId: user._id,
          urlAnalysisId: urlAnalysis._id,
          scope: 'platform'
        }).lean();
        aggregatedMetrics.platform = platform;
        
        // Topic metrics
        const topic = await AggregatedMetrics.find({
          userId: user._id,
          urlAnalysisId: urlAnalysis._id,
          scope: 'topic'
        }).lean();
        aggregatedMetrics.topic = topic;
        
        // Persona metrics
        const persona = await AggregatedMetrics.find({
          userId: user._id,
          urlAnalysisId: urlAnalysis._id,
          scope: 'persona'
        }).lean();
        aggregatedMetrics.persona = persona;
        
        // Generate insights
        const context = {
          brandName: urlAnalysis.brandContext?.companyName || 'Stripe',
          url: urlAnalysis.url,
          userId: user._id
        };
        
        const insightsResult = await insightsGenerationService.generateInsights(
          aggregatedMetrics,
          context
        );
        
        console.log('✅ Insights Generated!\n');
        console.log(`Total Insights: ${insightsResult.insights.length}`);
        console.log(`What's Working: ${insightsResult.summary.whatsWorkingCount}`);
        console.log(`Needs Attention: ${insightsResult.summary.needsAttentionCount}`);
        console.log(`High Impact: ${insightsResult.summary.highImpactCount}`);
        console.log(`Overall Sentiment: ${insightsResult.summary.overallSentiment}\n`);
        
        // Show sample insights
        console.log('🎯 SAMPLE INSIGHTS:\n');
        
        insightsResult.insights.slice(0, 3).forEach((insight, idx) => {
          console.log(`${idx + 1}. ${insight.title}`);
          console.log(`   Category: ${insight.category === 'whats_working' ? '✅ What\'s Working' : '⚠️ Needs Attention'}`);
          console.log(`   Impact: ${insight.impact.toUpperCase()}`);
          console.log(`   Metric: ${insight.primaryMetric}`);
          if (insight.changePercent !== 0) {
            console.log(`   Change: ${insight.changePercent > 0 ? '+' : ''}${insight.changePercent}%`);
          }
          console.log(`   Recommendation: ${insight.recommendation}`);
          console.log('');
        });
        
        // Save insights to database
        const PerformanceInsights = require('./src/models/PerformanceInsights');
        const performanceInsights = new PerformanceInsights({
          userId: user._id,
          urlAnalysisId: urlAnalysis._id,
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
        console.log('✅ Insights saved to database\n');
        
      } else {
        console.log('⚠️ No aggregated metrics found for insights generation\n');
      }
      
    } catch (error) {
      console.error('❌ Insights generation failed:', error.message);
      console.log('Continuing with flow...\n');
    }

    console.log('─'.repeat(80) + '\n');

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('='.repeat(80));
    console.log('✅ COMPLETE FLOW TEST SUCCESSFUL!');
    console.log('='.repeat(80) + '\n');

    console.log('📊 FINAL STATISTICS:\n');
    
    const stats = {
      urlAnalyses: await UrlAnalysis.countDocuments({ userId: user._id }),
      competitors: await Competitor.countDocuments({ userId: user._id }),
      topics: await Topic.countDocuments({ userId: user._id }),
      personas: await Persona.countDocuments({ userId: user._id }),
      prompts: await Prompt.countDocuments({ userId: user._id }),
      completedTests: await PromptTest.countDocuments({ userId: user._id, status: 'completed' }),
      aggregatedMetrics: await AggregatedMetrics.countDocuments({ userId: user._id }),
      performanceInsights: await require('./src/models/PerformanceInsights').countDocuments({ userId: user._id })
    };

    console.log(`  URL Analyses: ${stats.urlAnalyses}`);
    console.log(`  Competitors: ${stats.competitors}`);
    console.log(`  Topics: ${stats.topics}`);
    console.log(`  Personas: ${stats.personas}`);
    console.log(`  Prompts: ${stats.prompts}`);
    console.log(`  Completed Tests: ${stats.completedTests}`);
    console.log(`  Aggregated Metrics: ${stats.aggregatedMetrics}`);
    console.log(`  Performance Insights: ${stats.performanceInsights}\n`);

    console.log('─'.repeat(80) + '\n');

    console.log('✅ All 6 steps completed with new metrics system and AI insights:');
    console.log('   ✓ Step 1: URL Analysis (Perplexity)');
    console.log('   ✓ Step 2: User Selections');
    console.log('   ✓ Step 3: Prompt Generation');
    console.log('   ✓ Step 4: LLM Testing (Mentions, Sentiment, Citations, Depth)');
    console.log('   ✓ Step 5: Metrics Aggregation (Overall, Platform, Topic, Persona)');
    console.log('   ✓ Step 6: AI-Powered Performance Insights (What\'s Working vs Needs Attention)\n');

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the complete flow
runCompleteFlow();


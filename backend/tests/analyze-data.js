const mongoose = require('mongoose');
require('dotenv').config();

async function analyzeData() {
  await mongoose.connect(process.env.MONGODB_URI);

  const PromptTest = require('../src/models/PromptTest');
  const AggregatedMetrics = require('../src/models/AggregatedMetrics');

  console.log('\n📊 ANALYZING TEST DATA QUALITY\n');
  console.log('='.repeat(80));

  // Get latest prompt tests
  const tests = await PromptTest.find().sort({ testedAt: -1 }).limit(10).lean();

  console.log(`\n1️⃣  PROMPT TEST RESULTS (Latest 10)`);
  console.log('-'.repeat(80));

  tests.slice(0, 3).forEach((test, i) => {
    console.log(`\nTest ${i + 1}:`);
    console.log(`  LLM: ${test.llmProvider}`);
    console.log(`  Prompt: "${test.promptText.substring(0, 60)}..."`);
    console.log(`  Response Length: ${test.rawResponse?.length || 0} chars`);
    console.log(`  Response Preview: "${test.rawResponse?.substring(0, 100)}..."`);
    console.log(`  Brand Mentioned: ${test.scorecard?.brandMentioned || false}`);
    console.log(`  Brand Position: ${test.scorecard?.brandPosition || 'N/A'}`);
    console.log(`  Visibility Score: ${test.scorecard?.visibilityScore || 0}/100`);
    console.log(`  Competitors Found: ${test.scorecard?.competitorsMentioned?.length || 0}`);
    if (test.scorecard?.competitorsMentioned?.length > 0) {
      console.log(`    → ${test.scorecard.competitorsMentioned.join(', ')}`);
    }
  });

  // Get aggregated metrics
  const metrics = await AggregatedMetrics.find().sort({ lastCalculated: -1 }).limit(5).lean();

  console.log(`\n\n2️⃣  AGGREGATED METRICS (Latest 5)`);
  console.log('-'.repeat(80));

  metrics.forEach((metric, i) => {
    console.log(`\nMetric Set ${i + 1}:`);
    console.log(`  Scope: ${metric.scope}${metric.scopeValue ? ' - ' + metric.scopeValue : ''}`);
    console.log(`  Brands Tracked: ${metric.brandMetrics?.length || 0}`);
    console.log(`  Total Prompts: ${metric.totalPrompts}`);

    if (metric.brandMetrics && metric.brandMetrics.length > 0) {
      console.log(`\n  Brand Rankings:`);
      metric.brandMetrics.slice(0, 3).forEach(brand => {
        console.log(`    ${brand.brandName}:`);
        console.log(`      Visibility: ${brand.visibilityScore.toFixed(2)}% (Rank #${brand.visibilityRank})`);
        console.log(`      Share of Voice: ${brand.shareOfVoice.toFixed(2)}%`);
        console.log(`      Appearances: ${brand.totalAppearances}/${metric.totalPrompts}`);
      });
    }
  });

  console.log('\n\n3️⃣  DATA QUALITY ASSESSMENT');
  console.log('-'.repeat(80));

  const totalTests = await PromptTest.countDocuments();
  const completedTests = await PromptTest.countDocuments({ status: 'completed' });
  const failedTests = await PromptTest.countDocuments({ status: 'failed' });
  const withBrandMention = await PromptTest.countDocuments({ 'scorecard.brandMentioned': true });

  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Completed: ${completedTests} (${((completedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Brand Mentions: ${withBrandMention}/${completedTests} (${((withBrandMention/completedTests)*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis Complete\n');

  await mongoose.disconnect();
  process.exit(0);
}

analyzeData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

/**
 * STEP 4: LLM TESTING
 * 
 * Tests all prompts across 4 LLM providers:
 * 1. ChatGPT (OpenAI)
 * 2. Claude (Anthropic)
 * 3. Perplexity
 * 4. Gemini (Google)
 * 
 * For each response, extracts:
 * - Brand mentions
 * - Competitor mentions
 * - Citations/links
 * - Position/ranking
 * - Scorecard metrics
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function runStep4Test() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 STEP 4: LLM TESTING');
  console.log('='.repeat(80));

  try {
    // Load data from previous steps
    console.log('\n📁 Loading test data...');
    const step2Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-step2-data.json', 'utf8'));
    const { userId, token } = step2Data;

    console.log(`✅ User ID: ${userId}`);

    // Step 4.1: Check how many prompts we have
    console.log('\n' + '-'.repeat(80));
    console.log('Step 4.1: Checking prompts to test...');

    const promptsResponse = await axios.get(
      `${BASE_URL}/api/prompts`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const prompts = promptsResponse.data.data;
    console.log(`✅ Found ${prompts.length} prompts to test`);
    console.log(`   Expected tests: ${prompts.length} prompts × 4 LLMs = ${prompts.length * 4} total tests`);

    // Display prompt breakdown
    const byQueryType = {};
    prompts.forEach(p => {
      byQueryType[p.queryType] = (byQueryType[p.queryType] || 0) + 1;
    });

    console.log(`\n📊 Prompts by query type:`);
    Object.entries(byQueryType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Step 4.2: Run LLM testing
    console.log('\n' + '-'.repeat(80));
    console.log('Step 4.2: Testing prompts across 4 LLMs...');
    console.log('⏳ This will take 2-5 minutes depending on API speed...');
    console.log('   Testing with: ChatGPT, Claude, Perplexity, Gemini\n');

    const testStartTime = Date.now();
    
    const testResponse = await axios.post(
      `${BASE_URL}/api/prompts/test`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 600000 // 10 minute timeout for testing
      }
    );

    const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);

    if (!testResponse.data.success) {
      throw new Error('Testing failed: ' + testResponse.data.message);
    }

    const testResults = testResponse.data.data;

    console.log(`\n✅ Testing completed in ${testDuration}s (${(testDuration / 60).toFixed(2)} minutes)`);

    // Step 4.3: Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 TESTING RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 Summary:`);
    console.log(`   Total tests run: ${testResults.totalTests}`);
    console.log(`   Completed: ${testResults.completedTests}`);
    console.log(`   Failed: ${testResults.failedTests}`);
    console.log(`   Success rate: ${((testResults.completedTests / testResults.totalTests) * 100).toFixed(1)}%`);

    if (testResults.llmResults) {
      console.log(`\n🤖 LLM Performance:`);
      Object.entries(testResults.llmResults).forEach(([llm, stats]) => {
        console.log(`   ${llm}:`);
        console.log(`      Tests: ${stats.tests}`);
        console.log(`      Completed: ${stats.completed}`);
        console.log(`      Failed: ${stats.failed}`);
        console.log(`      Avg response time: ${stats.avgResponseTime}ms`);
      });
    }

    // Step 4.4: Get sample test results
    console.log('\n' + '-'.repeat(80));
    console.log('Step 4.4: Fetching detailed test results...');

    const allTestsResponse = await axios.get(
      `${BASE_URL}/api/prompts/tests/all?limit=120`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const allTests = allTestsResponse.data.data.tests;
    const stats = allTestsResponse.data.data.stats;

    console.log(`\n✅ Retrieved ${allTests.length} test results`);

    // Analyze results
    console.log('\n' + '='.repeat(80));
    console.log('📊 DETAILED ANALYSIS');
    console.log('='.repeat(80));

    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total tests: ${stats.totalTests}`);
    console.log(`   Avg visibility score: ${stats.averageVisibilityScore}`);
    console.log(`   Avg overall score: ${stats.averageOverallScore}`);
    console.log(`   Brand mention rate: ${stats.brandMentionRate}%`);

    console.log(`\n🤖 LLM Performance:`);
    Object.entries(stats.llmPerformance).forEach(([llm, perf]) => {
      console.log(`   ${llm}: Avg score ${perf.averageScore} (${perf.testCount} tests)`);
    });

    // Brand visibility analysis
    const testsWithBrand = allTests.filter(t => t.scorecard?.brandMentioned);
    const testsWithCitations = allTests.filter(t => t.scorecard?.citationPresent);

    console.log(`\n🏢 Brand Visibility:`);
    console.log(`   Brand mentioned: ${testsWithBrand.length}/${allTests.length} (${((testsWithBrand.length / allTests.length) * 100).toFixed(1)}%)`);
    console.log(`   With citations: ${testsWithCitations.length}/${allTests.length} (${((testsWithCitations.length / allTests.length) * 100).toFixed(1)}%)`);

    // Position analysis
    const positions = testsWithBrand.map(t => t.scorecard.brandPosition).filter(p => p > 0);
    if (positions.length > 0) {
      const avgPosition = positions.reduce((sum, p) => sum + p, 0) / positions.length;
      const count1st = positions.filter(p => p === 1).length;
      const count2nd = positions.filter(p => p === 2).length;
      const count3rd = positions.filter(p => p === 3).length;

      console.log(`\n📍 Brand Position:`);
      console.log(`   Average position: ${avgPosition.toFixed(2)}`);
      console.log(`   1st position: ${count1st} times (${((count1st / positions.length) * 100).toFixed(1)}%)`);
      console.log(`   2nd position: ${count2nd} times (${((count2nd / positions.length) * 100).toFixed(1)}%)`);
      console.log(`   3rd position: ${count3rd} times (${((count3rd / positions.length) * 100).toFixed(1)}%)`);
    }

    // Competitor mentions
    const competitorMentions = {};
    allTests.forEach(test => {
      if (test.scorecard?.competitorsMentioned) {
        test.scorecard.competitorsMentioned.forEach(comp => {
          competitorMentions[comp] = (competitorMentions[comp] || 0) + 1;
        });
      }
    });

    if (Object.keys(competitorMentions).length > 0) {
      console.log(`\n🏆 Competitor Mentions:`);
      Object.entries(competitorMentions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([comp, count]) => {
          console.log(`   ${comp}: ${count} times (${((count / allTests.length) * 100).toFixed(1)}%)`);
        });
    }

    // Sample test results
    console.log('\n' + '='.repeat(80));
    console.log('📝 SAMPLE TEST RESULTS (First 3)');
    console.log('='.repeat(80));

    allTests.slice(0, 3).forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.llmProvider.toUpperCase()}: ${test.promptId?.queryType || 'Unknown'}`);
      console.log(`   Prompt: "${test.promptId?.text || 'N/A'}"`);
      console.log(`   Response preview: "${test.rawResponse.substring(0, 150)}..."`);
      console.log(`   Scorecard:`);
      console.log(`      Brand mentioned: ${test.scorecard.brandMentioned ? '✅' : '❌'}`);
      console.log(`      Brand position: ${test.scorecard.brandPosition || 'N/A'}`);
      console.log(`      Visibility score: ${test.scorecard.visibilityScore}`);
      console.log(`      Citation present: ${test.scorecard.citationPresent ? '✅' : '❌'}`);
      console.log(`      Competitors: ${test.scorecard.competitorsMentioned?.join(', ') || 'None'}`);
    });

    // Save data for next step
    const step4Data = {
      userId,
      token,
      testResults: {
        totalTests: stats.totalTests,
        completedTests: testResults.completedTests,
        avgVisibilityScore: stats.averageVisibilityScore,
        brandMentionRate: stats.brandMentionRate
      },
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      __dirname + '/test-flow-step4-data.json',
      JSON.stringify(step4Data, null, 2)
    );

    console.log('\n💾 Step 4 data saved to: test-flow-step4-data.json');

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎯 STEP 4 COMPLETE - READY FOR VERIFICATION');
    console.log('='.repeat(80));
    console.log('\n📋 Please verify:');
    console.log('   ✓ All prompts tested across 4 LLMs?');
    console.log('   ✓ Brand mentions detected correctly?');
    console.log('   ✓ Citations extracted properly?');
    console.log('   ✓ Scorecards look accurate?');
    console.log('\n👉 Once verified, we\'ll proceed to STEP 5: Metrics Aggregation\n');

    return {
      success: true,
      totalTests: testResults.totalTests,
      completedTests: testResults.completedTests,
      avgVisibilityScore: stats.averageVisibilityScore
    };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.response) {
      console.error('\n📄 Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('📊 Status Code:', error.response.status);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  runStep4Test()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Step 4 test completed successfully!\n');
        process.exit(0);
      } else {
        console.log('\n❌ Step 4 test failed!\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runStep4Test;





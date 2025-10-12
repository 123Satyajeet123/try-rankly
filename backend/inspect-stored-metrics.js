/**
 * INSPECT STORED METRICS
 * Shows all metrics stored in database after Step 4
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function inspectMetrics() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 INSPECTING STORED METRICS');
  console.log('='.repeat(80));

  try {
    const step4Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-step4-data.json', 'utf8'));
    const { token } = step4Data;

    // Get all test results with full details
    console.log('\n📊 Fetching all test results from database...\n');
    
    const testsResponse = await axios.get(
      `${BASE_URL}/api/prompts/tests/all?limit=120`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const tests = testsResponse.data.data.tests;
    
    console.log(`✅ Retrieved ${tests.length} test results\n`);

    // Display structure of first test
    if (tests.length > 0) {
      const firstTest = tests[0];
      
      console.log('=' .repeat(80));
      console.log('📋 COMPLETE TEST RESULT STRUCTURE (First Test)');
      console.log('='.repeat(80));
      console.log('\n🔑 Top-level fields:');
      console.log(`   _id: ${firstTest._id}`);
      console.log(`   userId: ${firstTest.userId}`);
      console.log(`   promptId: ${firstTest.promptId?._id || 'N/A'}`);
      console.log(`   topicId: ${firstTest.topicId?._id || firstTest.topicId}`);
      console.log(`   personaId: ${firstTest.personaId?._id || firstTest.personaId}`);
      console.log(`   llmProvider: ${firstTest.llmProvider}`);
      console.log(`   queryType: ${firstTest.queryType}`);
      console.log(`   status: ${firstTest.status}`);

      console.log('\n📊 SCORECARD:');
      if (firstTest.scorecard) {
        Object.entries(firstTest.scorecard).forEach(([key, value]) => {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        });
      } else {
        console.log('   ❌ No scorecard found!');
      }

      console.log('\n🏢 BRAND METRICS (All Brands):');
      if (firstTest.brandMetrics && firstTest.brandMetrics.length > 0) {
        firstTest.brandMetrics.forEach((brand, index) => {
          console.log(`\n   ${index + 1}. ${brand.brandName}:`);
          console.log(`      Mentioned: ${brand.mentioned}`);
          console.log(`      First Position: ${brand.firstPosition || 'N/A'}`);
          console.log(`      Rank Position: ${brand.rankPosition || 'N/A'}`);
          console.log(`      Mention Count: ${brand.mentionCount}`);
          console.log(`      Total Word Count: ${brand.totalWordCount}`);
          console.log(`      Sentences: ${brand.sentences?.length || 0}`);
          console.log(`      Citations: ${brand.citations?.length || 0}`);
        });
      } else {
        console.log('   ❌ No brandMetrics array found!');
      }

      console.log('\n📄 Response Preview:');
      console.log(`   "${firstTest.rawResponse?.substring(0, 200)}..."`);
    }

    // Aggregate analysis
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 AGGREGATE METRICS ANALYSIS');
    console.log('='.repeat(80));

    // Collect all brands mentioned across all tests
    const allBrandsMap = new Map();
    
    tests.forEach(test => {
      if (test.brandMetrics) {
        test.brandMetrics.forEach(brand => {
          if (!allBrandsMap.has(brand.brandName)) {
            allBrandsMap.set(brand.brandName, {
              name: brand.brandName,
              totalMentions: 0,
              totalTests: 0,
              mentionedInTests: 0,
              totalWordCount: 0,
              positions: [],
              avgPosition: 0
            });
          }
          
          const brandData = allBrandsMap.get(brand.brandName);
          brandData.totalTests++;
          
          if (brand.mentioned) {
            brandData.mentionedInTests++;
            brandData.totalMentions += brand.mentionCount;
            brandData.totalWordCount += brand.totalWordCount;
            if (brand.rankPosition) {
              brandData.positions.push(brand.rankPosition);
            }
          }
        });
      }
    });

    // Calculate averages
    allBrandsMap.forEach((brandData, brandName) => {
      if (brandData.positions.length > 0) {
        brandData.avgPosition = (brandData.positions.reduce((sum, p) => sum + p, 0) / brandData.positions.length).toFixed(2);
      }
      brandData.shareOfVoice = ((brandData.mentionedInTests / brandData.totalTests) * 100).toFixed(1);
    });

    // Sort by share of voice
    const rankedBrands = Array.from(allBrandsMap.values())
      .sort((a, b) => parseFloat(b.shareOfVoice) - parseFloat(a.shareOfVoice));

    console.log('\n🏆 ALL BRANDS TRACKED (Sorted by Share of Voice):');
    console.log('-'.repeat(80));
    rankedBrands.forEach((brand, index) => {
      console.log(`\n${index + 1}. ${brand.name}`);
      console.log(`   Share of Voice: ${brand.shareOfVoice}% (${brand.mentionedInTests}/${brand.totalTests} tests)`);
      console.log(`   Total Mentions: ${brand.totalMentions}`);
      console.log(`   Total Words: ${brand.totalWordCount}`);
      console.log(`   Avg Position: ${brand.avgPosition || 'N/A'}`);
    });

    // Check what frontend needs
    console.log('\n\n' + '='.repeat(80));
    console.log('🎨 WHAT DATA IS AVAILABLE FOR FRONTEND');
    console.log('='.repeat(80));

    console.log('\n✅ Per-Test Data (Raw):');
    console.log('   • Brand mentions (yes/no, position, word count)');
    console.log('   • Competitor mentions (which competitors, how many times)');
    console.log('   • Citations (URLs, types)');
    console.log('   • Response metadata (sentences, words)');
    console.log('   • Scorecard (visibility score, overall score)');

    console.log('\n✅ Can Be Aggregated Into:');
    console.log('   • Overall metrics (all brands combined)');
    console.log('   • Per-platform metrics (ChatGPT vs Claude vs etc.)');
    console.log('   • Per-topic metrics');
    console.log('   • Per-persona metrics');
    console.log('   • Brand rankings (1st, 2nd, 3rd)');
    console.log('   • Share of voice comparisons');
    console.log('   • Position distributions');

    console.log('\n📊 Summary:');
    console.log(`   ✅ Total brands tracked: ${rankedBrands.length}`);
    console.log(`   ✅ Tests stored: ${tests.length}`);
    console.log(`   ✅ Metrics per test: brandMetrics array with ${rankedBrands.length} brands`);
    console.log(`   ✅ Ready for aggregation: YES`);

    console.log('\n' + '='.repeat(80));
    console.log('🎯 NEXT STEP: Metrics Aggregation');
    console.log('='.repeat(80));
    console.log('\nSTEP 5 will:');
    console.log('   1. Read all test results (brandMetrics)');
    console.log('   2. Calculate aggregate metrics per scope (overall/platform/topic/persona)');
    console.log('   3. Rank all brands (Stripe, PayPal, Adyen, Square)');
    console.log('   4. Store in AggregatedMetrics collection');
    console.log('   5. Make data ready for frontend dashboard\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

inspectMetrics();








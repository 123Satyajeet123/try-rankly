/**
 * MANUAL METRICS VERIFICATION
 * 
 * Shows actual LLM responses and verifies metrics calculations step-by-step
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function verifyMetricsManually() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 MANUAL METRICS VERIFICATION');
  console.log('='.repeat(80));
  console.log('\nLet\'s verify each metric calculation step-by-step!\n');

  try {
    const step4Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-step4-data.json', 'utf8'));
    const { token } = step4Data;

    // Get all test results
    const testsResponse = await axios.get(
      `${BASE_URL}/api/prompts/tests/all?limit=120`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const tests = testsResponse.data.data.tests;
    
    console.log(`📊 Total tests to verify: ${tests.length}\n`);
    console.log('Let\'s verify the first 3 tests in detail...\n');

    // Verify first 3 tests in detail
    for (let i = 0; i < Math.min(3, tests.length); i++) {
      await verifyOneTest(tests[i], i + 1);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\nPlease review the calculations above and confirm:');
    console.log('   ✓ Brand mentions counted correctly?');
    console.log('   ✓ Position calculations accurate?');
    console.log('   ✓ Visibility scores make sense?');
    console.log('   ✓ Competitor mentions detected?');
    console.log('\nIf everything looks good, we can proceed to Step 5! 🚀\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function verifyOneTest(test, testNumber) {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST #${testNumber} - DETAILED VERIFICATION`);
  console.log('='.repeat(80));

  console.log(`\n📋 TEST INFO:`);
  console.log(`   LLM: ${test.llmProvider.toUpperCase()}`);
  console.log(`   Query Type: ${test.queryType}`);
  console.log(`   Prompt: "${test.promptId?.text || test.promptText}"`);

  console.log(`\n📄 FULL LLM RESPONSE:`);
  console.log('-'.repeat(80));
  console.log(test.rawResponse);
  console.log('-'.repeat(80));

  // MANUAL VERIFICATION SECTION
  console.log(`\n🔍 MANUAL VERIFICATION - Let's Count Together:`);
  console.log('='.repeat(80));

  // 1. Count "Stripe" mentions
  console.log(`\n1️⃣  BRAND MENTIONS - "Stripe":`);
  const stripeMatches = test.rawResponse.match(/stripe/gi) || [];
  console.log(`   Manual count: ${stripeMatches.length} occurrences`);
  if (stripeMatches.length > 0) {
    console.log(`   Found at positions: ${stripeMatches.map((_, idx) => {
      const beforeText = test.rawResponse.slice(0, test.rawResponse.toLowerCase().indexOf('stripe', idx > 0 ? test.rawResponse.toLowerCase().indexOf('stripe') + 6 : 0));
      return `char ${beforeText.length}`;
    }).slice(0, 3).join(', ')}${stripeMatches.length > 3 ? '...' : ''}`);
  }
  console.log(`   System detected: ${test.scorecard?.brandMentioned ? 'YES' : 'NO'}`);
  console.log(`   ✅ Match: ${stripeMatches.length > 0 === test.scorecard?.brandMentioned ? 'CORRECT' : '❌ MISMATCH'}`);

  // 2. Find first mention position
  console.log(`\n2️⃣  BRAND POSITION - Where "Stripe" first appears:`);
  const sentences = test.rawResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let firstSentenceWithStripe = null;
  
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].toLowerCase().includes('stripe')) {
      firstSentenceWithStripe = i + 1; // 1-indexed
      console.log(`   First mention in sentence #${firstSentenceWithStripe}:`);
      console.log(`   "${sentences[i].trim()}"`);
      break;
    }
  }
  
  if (!firstSentenceWithStripe) {
    console.log(`   ❌ Stripe not mentioned in response`);
  }
  
  console.log(`   System calculated position: ${test.scorecard?.brandPosition || 'N/A'}`);
  console.log(`   ✅ Match: ${firstSentenceWithStripe === test.scorecard?.brandPosition ? 'CORRECT' : (firstSentenceWithStripe ? '⚠️  DIFFERENCE' : 'N/A')}`);

  // 3. Count competitor mentions
  console.log(`\n3️⃣  COMPETITOR MENTIONS:`);
  const competitors = ['PayPal', 'Square', 'Adyen'];
  const competitorCounts = {};
  
  competitors.forEach(comp => {
    const matches = test.rawResponse.match(new RegExp(comp, 'gi')) || [];
    competitorCounts[comp] = matches.length;
    console.log(`   ${comp}: ${matches.length} mentions`);
  });

  const systemCompetitors = test.scorecard?.competitorsMentioned || [];
  console.log(`   System detected: [${systemCompetitors.join(', ')}]`);
  
  const expectedCompetitors = Object.keys(competitorCounts).filter(c => competitorCounts[c] > 0);
  console.log(`   Expected: [${expectedCompetitors.join(', ')}]`);
  console.log(`   ✅ Match: ${JSON.stringify(systemCompetitors.sort()) === JSON.stringify(expectedCompetitors.sort()) ? 'CORRECT' : '⚠️  DIFFERENCE'}`);

  // 4. Check for citations
  console.log(`\n4️⃣  CITATIONS - Links in response:`);
  const urlMatches = test.rawResponse.match(/https?:\/\/[^\s)]+/gi) || [];
  const markdownLinks = test.rawResponse.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  
  console.log(`   Direct URLs found: ${urlMatches.length}`);
  if (urlMatches.length > 0) {
    urlMatches.slice(0, 3).forEach(url => console.log(`      • ${url}`));
    if (urlMatches.length > 3) console.log(`      ... and ${urlMatches.length - 3} more`);
  }
  
  console.log(`   Markdown links found: ${markdownLinks.length}`);
  if (markdownLinks.length > 0) {
    markdownLinks.slice(0, 3).forEach(link => console.log(`      • ${link}`));
  }
  
  const hasCitations = urlMatches.length > 0 || markdownLinks.length > 0;
  console.log(`   Manual check: ${hasCitations ? 'YES' : 'NO'} citations present`);
  console.log(`   System detected: ${test.scorecard?.citationPresent ? 'YES' : 'NO'}`);
  console.log(`   ✅ Match: ${hasCitations === test.scorecard?.citationPresent ? 'CORRECT' : '⚠️  DIFFERENCE'}`);

  // 5. Calculate visibility score manually
  console.log(`\n5️⃣  VISIBILITY SCORE CALCULATION:`);
  console.log(`   Formula: (mentionScore × 0.4) + (positionScore × 0.3) + (citationScore × 0.3)`);
  
  const mentionCount = stripeMatches.length;
  const mentionScore = Math.min(100, (mentionCount / 3) * 100);
  console.log(`   Mention Score: min(100, (${mentionCount} / 3) × 100) = ${mentionScore.toFixed(1)}`);
  
  const firstMentionIndex = test.rawResponse.toLowerCase().indexOf('stripe');
  const positionScore = firstMentionIndex === -1 ? 0 : 100 * (1 - (firstMentionIndex / test.rawResponse.length));
  console.log(`   Position Score: 100 × (1 - (${firstMentionIndex} / ${test.rawResponse.length})) = ${positionScore.toFixed(1)}`);
  
  const stripeCitations = urlMatches.filter(url => url.toLowerCase().includes('stripe')).length;
  const citationScore = Math.min(100, (stripeCitations / 2) * 100);
  console.log(`   Citation Score: min(100, (${stripeCitations} / 2) × 100) = ${citationScore.toFixed(1)}`);
  
  const calculatedVisibility = Math.round((mentionScore * 0.4) + (positionScore * 0.3) + (citationScore * 0.3));
  console.log(`   → Calculated: (${mentionScore.toFixed(1)} × 0.4) + (${positionScore.toFixed(1)} × 0.3) + (${citationScore.toFixed(1)} × 0.3) = ${calculatedVisibility}`);
  console.log(`   → System score: ${test.scorecard?.visibilityScore}`);
  console.log(`   ✅ Match: ${Math.abs(calculatedVisibility - (test.scorecard?.visibilityScore || 0)) <= 2 ? 'CORRECT (within ±2)' : '⚠️  DIFFERENCE'}`);

  // 6. Brand Metrics Array Verification
  console.log(`\n6️⃣  BRAND METRICS ARRAY - All Brands Tracked:`);
  if (test.brandMetrics && test.brandMetrics.length > 0) {
    console.log(`   Total brands in this test: ${test.brandMetrics.length}`);
    
    test.brandMetrics.forEach((brand, idx) => {
      console.log(`\n   ${idx + 1}. ${brand.brandName}:`);
      console.log(`      Mentioned: ${brand.mentioned ? 'YES' : 'NO'}`);
      console.log(`      Rank in response: #${brand.rankPosition || 'N/A'}`);
      console.log(`      Mention count: ${brand.mentionCount}`);
      console.log(`      Word count: ${brand.totalWordCount}`);
      console.log(`      Sentences: ${brand.sentences?.length || 0}`);
      
      // Manual verification
      const manualCount = (test.rawResponse.match(new RegExp(brand.brandName, 'gi')) || []).length;
      console.log(`      Manual count: ${manualCount}`);
      console.log(`      ✅ ${manualCount === brand.mentionCount ? 'MATCH' : '⚠️  DIFF'}`);
    });
  } else {
    console.log(`   ❌ No brandMetrics array found!`);
  }

  // Summary
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📊 TEST #${testNumber} VERIFICATION SUMMARY:`);
  console.log(`   Stripe mentioned: ${stripeMatches.length > 0 ? '✅ YES' : '❌ NO'} (${stripeMatches.length} times)`);
  console.log(`   First position: Sentence #${firstSentenceWithStripe || 'N/A'}`);
  console.log(`   Visibility score: ${test.scorecard?.visibilityScore}/100`);
  console.log(`   Competitors tracked: ${test.brandMetrics?.length || 0} brands`);
  console.log(`${'─'.repeat(80)}`);
}

if (require.main === module) {
  verifyMetricsManually()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}








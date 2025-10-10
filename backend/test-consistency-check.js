/**
 * CONSISTENCY CHECK: Test 2 different URLs
 * Ensures Perplexity returns consistent structure for ANY website
 */

const axios = require('axios');
const fs = require('fs');
const validateAnalysisResponse = require('./validate-analysis-consistency');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testMultipleUrls() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 CONSISTENCY TEST: Multiple URLs');
  console.log('='.repeat(80));

  // Read token from previous test
  const testData = JSON.parse(fs.readFileSync(__dirname + '/test-flow-data.json', 'utf8'));
  const token = testData.token;

  const testUrls = [
    'https://openai.com',
    'https://anthropic.com'
  ];

  const results = [];

  for (const url of testUrls) {
    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`🧪 Testing URL: ${url}`);
    console.log('='.repeat(80));

    try {
      const startTime = Date.now();
      
      const response = await axios.post(
        `${BASE_URL}/api/onboarding/analyze-website`,
        { url },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (response.data.success) {
        const analysis = response.data.data.analysis;
        
        console.log(`\n✅ Analysis completed in ${duration}s`);
        console.log(`\n📊 Quick Summary:`);
        console.log(`   Company: ${analysis.brandContext.companyName}`);
        console.log(`   Industry: ${analysis.brandContext.industry}`);
        console.log(`   Competitors: ${analysis.competitors.length}`);
        console.log(`   Topics: ${analysis.topics.length}`);
        console.log(`   Personas: ${analysis.personas.length}`);

        // Validate structure
        const validation = validateAnalysisResponse(analysis);
        
        results.push({
          url,
          success: true,
          valid: validation.valid,
          duration: duration,
          counts: {
            competitors: analysis.competitors.length,
            topics: analysis.topics.length,
            personas: analysis.personas.length
          },
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

    } catch (error) {
      console.error(`\n❌ Failed: ${error.message}`);
      results.push({
        url,
        success: false,
        error: error.message
      });
    }
  }

  // Final Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 CONSISTENCY TEST SUMMARY');
  console.log('='.repeat(80));

  const allValid = results.every(r => r.success && r.valid);
  const allHaveData = results.every(r => 
    r.counts && r.counts.competitors > 0 && r.counts.topics > 0 && r.counts.personas > 0
  );

  console.log(`\n✅ Tests run: ${results.length}`);
  console.log(`✅ All successful: ${results.every(r => r.success)}`);
  console.log(`✅ All valid: ${allValid}`);
  console.log(`✅ All have data: ${allHaveData}`);

  if (allValid && allHaveData) {
    console.log('\n🎉 CONSISTENCY VERIFIED!');
    console.log('   Response format is consistent across different websites!');
    console.log('   ✅ Ready to proceed to Step 2');
  } else {
    console.log('\n⚠️  Some issues detected:');
    results.forEach(r => {
      if (!r.valid || !r.success) {
        console.log(`\n   ${r.url}:`);
        if (r.errors) r.errors.forEach(e => console.log(`      ❌ ${e}`));
        if (r.warnings) r.warnings.forEach(w => console.log(`      ⚠️  ${w}`));
      }
    });
  }

  console.log('\n');
  return allValid && allHaveData;
}

if (require.main === module) {
  testMultipleUrls()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}




/**
 * COMPLETE END-TO-END FLOW TEST
 * 
 * Runs all steps in sequence:
 * Step 1: Analyze Stripe.com
 * Step 2: Select items (3 competitors, 3 topics, 2 personas)
 * Step 3: Generate prompts
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'satyajeetdas225@gmail.com',
  password: 'Satyajeet'
};

async function runCompleteFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 COMPLETE END-TO-END FLOW TEST');
  console.log('='.repeat(80));

  try {
    // LOGIN
    console.log('\n🔐 Step 0: Authenticating...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user._id;
    console.log(`✅ Logged in as ${userId}`);

    // STEP 1: ANALYZE
    console.log('\n' + '='.repeat(80));
    console.log('📊 STEP 1: Analyzing https://stripe.com with Perplexity...');
    console.log('='.repeat(80));
    
    const analysisStart = Date.now();
    const analysisResponse = await axios.post(
      `${BASE_URL}/api/onboarding/analyze-website`,
      { url: 'https://stripe.com' },
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 120000
      }
    );

    const analysisDuration = ((Date.now() - analysisStart) / 1000).toFixed(2);
    const analysis = analysisResponse.data.data.analysis;

    console.log(`✅ Analysis complete in ${analysisDuration}s`);
    console.log(`\n📊 Extracted:`);
    console.log(`   Brand: ${analysis.brandContext.companyName}`);
    console.log(`   Industry: ${analysis.brandContext.industry}`);
    console.log(`   Competitors: ${analysis.competitors.length}`);
    console.log(`   Topics: ${analysis.topics.length}`);
    console.log(`   Personas: ${analysis.personas.length}`);

    if (analysis.competitors.length === 0 || analysis.topics.length === 0 || analysis.personas.length === 0) {
      throw new Error('Analysis incomplete - some arrays are empty!');
    }

    // STEP 2: SELECT ITEMS
    console.log('\n' + '='.repeat(80));
    console.log('✅ STEP 2: Selecting items...');
    console.log('='.repeat(80));

    const selectedCompetitors = analysis.competitors.slice(0, 3).map(c => c.url);
    const selectedTopics = analysis.topics.slice(0, 3).map(t => t.name);
    const selectedPersonas = analysis.personas.slice(0, 2).map(p => p.type);

    console.log(`\n📋 Selecting:`);
    console.log(`   Competitors: ${selectedCompetitors.length}`);
    console.log(`   Topics: ${selectedTopics.length}`);
    console.log(`   Personas: ${selectedPersonas.length}`);

    await axios.post(
      `${BASE_URL}/api/onboarding/update-selections`,
      {
        competitors: selectedCompetitors,
        topics: selectedTopics,
        personas: selectedPersonas
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    console.log(`✅ Selections saved`);

    // STEP 3: GENERATE PROMPTS
    console.log('\n' + '='.repeat(80));
    console.log('🎯 STEP 3: Generating prompts...');
    console.log('='.repeat(80));

    const promptStart = Date.now();
    const generateResponse = await axios.post(
      `${BASE_URL}/api/prompts/generate`,
      {},
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 180000
      }
    );

    const promptDuration = ((Date.now() - promptStart) / 1000).toFixed(2);
    const { totalPrompts, combinations } = generateResponse.data.data;

    console.log(`✅ Prompts generated in ${promptDuration}s`);
    console.log(`\n📊 Generated:`);
    console.log(`   Total prompts: ${totalPrompts}`);
    console.log(`   Topics × Personas: ${combinations.topics} × ${combinations.personas}`);
    console.log(`   Per combination: ${combinations.promptsPerCombination}`);
    console.log(`   Expected: ${combinations.topics * combinations.personas * combinations.promptsPerCombination}`);

    // Verify prompts
    const promptsResponse = await axios.get(
      `${BASE_URL}/api/prompts`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const allPrompts = promptsResponse.data.data;
    const mentionsStripe = allPrompts.filter(p => p.text.toLowerCase().includes('stripe'));

    console.log(`\n📋 Verification:`);
    console.log(`   Prompts in database: ${allPrompts.length}`);
    console.log(`   Mention "Stripe": ${mentionsStripe.length}/${allPrompts.length}`);

    // Display samples
    console.log(`\n📝 Sample Prompts (3 different query types):`);
    
    const sampleTypes = ['Navigational', 'Commercial Investigation', 'Comparative'];
    sampleTypes.forEach(type => {
      const sample = allPrompts.find(p => p.queryType === type);
      if (sample) {
        console.log(`\n   ${type}:`);
        console.log(`   "${sample.text}"`);
      }
    });

    // FINAL SUMMARY
    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPLETE FLOW TEST - SUCCESS!');
    console.log('='.repeat(80));
    console.log(`\n📊 Final Results:`);
    console.log(`   ✅ Step 1: Analysis complete (${analysisDuration}s)`);
    console.log(`   ✅ Step 2: Selections saved`);
    console.log(`   ✅ Step 3: ${totalPrompts} prompts generated (${promptDuration}s)`);
    console.log(`   ✅ Brand context: ${analysis.brandContext.companyName}`);
    console.log(`   ✅ Stripe mentions: ${mentionsStripe.length}/${allPrompts.length} prompts`);
    
    const allValid = 
      analysis.competitors.length >= 3 &&
      analysis.topics.length >= 3 &&
      analysis.personas.length >= 2 &&
      allPrompts.length === (combinations.topics * combinations.personas * 5) &&
      mentionsStripe.length > 0;

    if (allValid) {
      console.log(`\n🎉 ALL VALIDATIONS PASSED!`);
      console.log(`   Ready for Step 4: LLM Testing\n`);
      return { success: true };
    } else {
      console.log(`\n⚠️  Some validations failed - review above\n`);
      return { success: false };
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false };
  }
}

if (require.main === module) {
  runCompleteFlow()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runCompleteFlow;



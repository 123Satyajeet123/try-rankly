/**
 * STEP 1: URL ANALYSIS TEST
 * 
 * Tests the complete URL analysis flow:
 * 1. Login with test user
 * 2. Analyze website (https://stripe.com)
 * 3. Extract brand context, competitors, topics, personas
 * 4. Display results for verification
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TEST_USER = {
  email: 'satyajeetdas225@gmail.com',
  password: 'Satyajeet'
};

const WEBSITE_URL = 'https://stripe.com';

async function runStep1Test() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 STEP 1: URL ANALYSIS TEST');
  console.log('='.repeat(80));
  console.log(`\n📍 Test User: ${TEST_USER.email}`);
  console.log(`🌐 Website URL: ${WEBSITE_URL}\n`);

  try {
    // Step 1.1: Login to get JWT token
    console.log('Step 1.1: Authenticating user...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }

    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user._id;
    
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Step 1.2: Start URL Analysis
    console.log('\n' + '-'.repeat(80));
    console.log('Step 1.2: Starting website analysis with Perplexity AI...');
    console.log('⏳ This may take 30-60 seconds as Perplexity analyzes the website...\n');

    const startTime = Date.now();
    
    const analysisResponse = await axios.post(
      `${BASE_URL}/api/onboarding/analyze-website`,
      { url: WEBSITE_URL },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minute timeout
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!analysisResponse.data.success) {
      throw new Error('Analysis failed: ' + analysisResponse.data.message);
    }

    const analysis = analysisResponse.data.data.analysis;

    // Step 1.3: Display Results
    console.log('✅ Analysis completed successfully!');
    console.log(`⏱️  Duration: ${duration} seconds\n`);

    console.log('=' .repeat(80));
    console.log('📊 ANALYSIS RESULTS');
    console.log('='.repeat(80));

    // Brand Context
    console.log('\n🏢 BRAND CONTEXT:');
    console.log('-'.repeat(80));
    console.log(`   Company Name:      ${analysis.brandContext.companyName}`);
    console.log(`   Industry:          ${analysis.brandContext.industry}`);
    console.log(`   Business Model:    ${analysis.brandContext.businessModel}`);
    console.log(`   Target Market:     ${analysis.brandContext.targetMarket}`);
    console.log(`   Value Proposition: ${analysis.brandContext.valueProposition}`);
    console.log(`   Brand Tone:        ${analysis.brandContext.brandTone}`);
    console.log(`   Market Position:   ${analysis.brandContext.marketPosition}`);
    console.log(`   Key Services:      ${analysis.brandContext.keyServices.join(', ')}`);

    // Competitors
    console.log('\n🏆 COMPETITORS FOUND: ' + analysis.competitors.length);
    console.log('-'.repeat(80));
    analysis.competitors.forEach((comp, index) => {
      console.log(`\n   ${index + 1}. ${comp.name}`);
      console.log(`      URL:        ${comp.url}`);
      console.log(`      Similarity: ${comp.similarity}`);
      console.log(`      Reason:     ${comp.reason}`);
    });

    // Topics
    console.log('\n\n📝 TOPICS EXTRACTED: ' + analysis.topics.length);
    console.log('-'.repeat(80));
    analysis.topics.forEach((topic, index) => {
      console.log(`\n   ${index + 1}. ${topic.name} (Priority: ${topic.priority})`);
      console.log(`      Description: ${topic.description}`);
      console.log(`      Keywords:    ${topic.keywords.join(', ')}`);
    });

    // Personas
    console.log('\n\n👥 PERSONAS IDENTIFIED: ' + analysis.personas.length);
    console.log('-'.repeat(80));
    analysis.personas.forEach((persona, index) => {
      console.log(`\n   ${index + 1}. ${persona.type} (Relevance: ${persona.relevance})`);
      console.log(`      Description: ${persona.description}`);
      console.log(`      Pain Points: ${persona.painPoints.join(', ')}`);
      console.log(`      Goals:       ${persona.goals.join(', ')}`);
    });

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Brand Context:  Extracted`);
    console.log(`✅ Competitors:    ${analysis.competitors.length} found`);
    console.log(`✅ Topics:         ${analysis.topics.length} extracted`);
    console.log(`✅ Personas:       ${analysis.personas.length} identified`);
    console.log(`✅ Analysis Date:  ${new Date(analysis.analysisDate).toLocaleString()}`);

    // Save for next step
    console.log('\n' + '='.repeat(80));
    console.log('💾 DATA SAVED FOR NEXT STEP');
    console.log('='.repeat(80));
    console.log(`User ID: ${userId}`);
    console.log(`Token: ${token.substring(0, 30)}...`);
    
    // Store data for next steps
    const stepData = {
      userId,
      token,
      url: WEBSITE_URL,
      analysis,
      timestamp: new Date().toISOString()
    };

    require('fs').writeFileSync(
      __dirname + '/test-flow-data.json',
      JSON.stringify(stepData, null, 2)
    );

    console.log('\n📁 Test data saved to: test-flow-data.json');

    // Next Step Instructions
    console.log('\n' + '='.repeat(80));
    console.log('🎯 STEP 1 COMPLETE - READY FOR VERIFICATION');
    console.log('='.repeat(80));
    console.log('\n📋 Please verify:');
    console.log('   ✓ Brand context is accurate for Stripe');
    console.log('   ✓ Competitors look correct (e.g., PayPal, Square, Adyen)');
    console.log('   ✓ Topics are relevant to Stripe\'s business');
    console.log('   ✓ Personas match Stripe\'s target audience');
    console.log('\n👉 Once verified, we\'ll proceed to STEP 2: User Selections\n');

    return {
      success: true,
      userId,
      token,
      analysis
    };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.response) {
      console.error('\n📄 Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('📊 Status Code:', error.response.status);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend server is not running!');
      console.error('   Please start the server with: cd backend && npm start');
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  runStep1Test()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Step 1 test completed successfully!\n');
        process.exit(0);
      } else {
        console.log('\n❌ Step 1 test failed!\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runStep1Test;




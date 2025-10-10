/**
 * Re-analyze Stripe to make it the latest analysis
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';

async function reanalyzeStripe() {
  try {
    // Load token
    const step2Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-step2-data.json', 'utf8'));
    const { token } = step2Data;

    console.log('🔄 Re-analyzing Stripe to make it the latest analysis...\n');

    const response = await axios.post(
      `${BASE_URL}/api/onboarding/analyze-website`,
      { url: 'https://stripe.com' },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    if (response.data.success) {
      console.log('✅ Stripe analysis complete!');
      console.log(`   Brand: ${response.data.data.analysis.brandContext.companyName}`);
      console.log(`   Competitors: ${response.data.data.analysis.competitors.length}`);
      console.log(`   Topics: ${response.data.data.analysis.topics.length}`);
      console.log(`   Personas: ${response.data.data.analysis.personas.length}\n`);
      return true;
    }
    return false;

  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

reanalyzeStripe().then(success => process.exit(success ? 0 : 1));



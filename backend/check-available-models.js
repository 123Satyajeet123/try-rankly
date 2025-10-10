/**
 * Check Available Models on OpenRouter
 */

const axios = require('axios');
require('dotenv').config();

async function checkModels() {
  console.log('🔍 Checking available Perplexity models on OpenRouter...\n');

  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      }
    });

    const perplexityModels = response.data.data.filter(model => 
      model.id.toLowerCase().includes('perplexity')
    );

    console.log(`Found ${perplexityModels.length} Perplexity models:\n`);
    
    perplexityModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
      console.log(`   Name: ${model.name || 'N/A'}`);
      console.log(`   Context: ${model.context_length || 'N/A'} tokens`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log('');
    });

    // Also check for sonar models
    const sonarModels = response.data.data.filter(model => 
      model.id.toLowerCase().includes('sonar')
    );

    if (sonarModels.length > 0) {
      console.log(`\nFound ${sonarModels.length} Sonar models:\n`);
      sonarModels.forEach((model, index) => {
        console.log(`${index + 1}. ${model.id}`);
        console.log(`   Name: ${model.name || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkModels();



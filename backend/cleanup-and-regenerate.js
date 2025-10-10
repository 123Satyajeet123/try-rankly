/**
 * Cleanup old prompts and regenerate with correct brand context
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function cleanupAndRegenerate() {
  console.log('\n' + '='.repeat(80));
  console.log('🧹 CLEANUP & REGENERATE');
  console.log('='.repeat(80));

  try {
    // Load auth data
    const step2Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-step2-data.json', 'utf8'));
    const { userId, token } = step2Data;

    // Step 1: Get all existing prompts
    console.log('\n📊 Getting existing prompts...');
    const promptsResponse = await axios.get(
      `${BASE_URL}/api/prompts`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const existingPrompts = promptsResponse.data.data;
    console.log(`Found ${existingPrompts.length} existing prompts`);

    // Step 2: Delete all existing prompts
    if (existingPrompts.length > 0) {
      console.log('\n🗑️  Deleting old prompts...');
      for (const prompt of existingPrompts) {
        await axios.delete(
          `${BASE_URL}/api/prompts/${prompt._id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      }
      console.log(`✅ Deleted ${existingPrompts.length} old prompts`);
    }

    // Step 3: Generate new prompts
    console.log('\n🎯 Generating fresh prompts...');
    console.log('⏳ This may take 30-60 seconds...\n');

    const startTime = Date.now();
    
    const generateResponse = await axios.post(
      `${BASE_URL}/api/prompts/generate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 180000 // 3 minutes
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!generateResponse.data.success) {
      throw new Error('Generation failed: ' + generateResponse.data.message);
    }

    const { totalPrompts, combinations } = generateResponse.data.data;

    console.log(`✅ Generation completed in ${duration}s!`);
    console.log(`\n📊 Results:`);
    console.log(`   Total prompts: ${totalPrompts}`);
    console.log(`   Topics: ${combinations.topics}`);
    console.log(`   Personas: ${combinations.personas}`);
    console.log(`   Per combination: ${combinations.promptsPerCombination}`);

    // Step 4: Verify new prompts
    console.log('\n📋 Verifying new prompts...');
    const newPromptsResponse = await axios.get(
      `${BASE_URL}/api/prompts`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const newPrompts = newPromptsResponse.data.data;
    
    // Check prompts mention Stripe (not Anthropic or other brands)
    const mentionsStripe = newPrompts.filter(p => 
      p.text.toLowerCase().includes('stripe')
    );

    const mentionsAnthropicOrOther = newPrompts.filter(p => 
      p.text.toLowerCase().includes('anthropic') || 
      p.text.toLowerCase().includes('openai')
    );

    console.log(`\n✅ Prompts in database: ${newPrompts.length}`);
    console.log(`   Mention "Stripe": ${mentionsStripe.length}`);
    console.log(`   Mention other brands: ${mentionsAnthropicOrOther.length}`);

    // Display sample
    console.log('\n📝 Sample prompts (first 3):');
    newPrompts.slice(0, 3).forEach((p, i) => {
      console.log(`\n   ${i + 1}. ${p.title}`);
      console.log(`      ${p.text}`);
    });

    console.log('\n' + '='.repeat(80));
    if (mentionsStripe.length > 0) {
      console.log('✅ CLEANUP & REGENERATION SUCCESSFUL!');
      console.log(`   All prompts now reference correct brand context`);
    } else {
      console.log('⚠️  WARNING: Prompts may not be referencing Stripe correctly');
    }
    console.log('='.repeat(80) + '\n');

    return { success: true, totalPrompts, mentionsStripe: mentionsStripe.length };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  cleanupAndRegenerate()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}



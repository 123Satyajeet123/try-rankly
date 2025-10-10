/**
 * STEP 3: PROMPT GENERATION TEST
 * 
 * Tests the prompt generation workflow:
 * 1. Load selections from Step 2
 * 2. Generate prompts (Topic × Persona × Query Type combinations)
 * 3. Verify prompts are created correctly
 * 4. Display sample prompts
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function runStep3Test() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 STEP 3: PROMPT GENERATION TEST');
  console.log('='.repeat(80));

  try {
    // Load data from Step 2
    console.log('\n📁 Loading selections from Step 2...');
    const step2Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-step2-data.json', 'utf8'));
    
    const { userId, token, selectedCompetitors, selectedTopics, selectedPersonas } = step2Data;
    
    console.log(`✅ Loaded selections:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Competitors: ${selectedCompetitors.length}`);
    console.log(`   Topics: ${selectedTopics.length}`);
    console.log(`   Personas: ${selectedPersonas.length}`);
    console.log(`   Expected prompts: ${selectedTopics.length * selectedPersonas.length * 5}`);

    // Step 3.1: Generate prompts
    console.log('\n' + '-'.repeat(80));
    console.log('Step 3.1: Generating prompts with AI...');
    console.log('⏳ This may take 15-30 seconds...\n');

    const startTime = Date.now();
    
    const generateResponse = await axios.post(
      `${BASE_URL}/api/prompts/generate`,
      {},  // No body needed - uses selected items from database
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!generateResponse.data.success) {
      throw new Error('Prompt generation failed: ' + generateResponse.data.message);
    }

    const { prompts, totalPrompts, combinations } = generateResponse.data.data;

    console.log(`✅ Prompt generation completed in ${duration}s!`);
    console.log(`\n📊 Generation Results:`);
    console.log(`   Total prompts generated: ${totalPrompts}`);
    console.log(`   Topics used: ${combinations.topics}`);
    console.log(`   Personas used: ${combinations.personas}`);
    console.log(`   Prompts per combination: ${combinations.promptsPerCombination}`);

    // Step 3.2: Verify prompts in database
    console.log('\n' + '-'.repeat(80));
    console.log('Step 3.2: Verifying prompts in database...');

    const promptsResponse = await axios.get(
      `${BASE_URL}/api/prompts`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const allPrompts = promptsResponse.data.data;
    
    console.log(`✅ Found ${allPrompts.length} prompts in database`);

    // Group by query type
    const byQueryType = {};
    allPrompts.forEach(prompt => {
      if (!byQueryType[prompt.queryType]) {
        byQueryType[prompt.queryType] = [];
      }
      byQueryType[prompt.queryType].push(prompt);
    });

    // Group by topic
    const byTopic = {};
    allPrompts.forEach(prompt => {
      const topicName = prompt.topicId?.name || 'Unknown';
      if (!byTopic[topicName]) {
        byTopic[topicName] = [];
      }
      byTopic[topicName].push(prompt);
    });

    // Display breakdown
    console.log('\n' + '='.repeat(80));
    console.log('📊 PROMPT BREAKDOWN');
    console.log('='.repeat(80));

    console.log('\n📈 By Query Type:');
    Object.entries(byQueryType).forEach(([type, prompts]) => {
      console.log(`   ${type}: ${prompts.length} prompts`);
    });

    console.log('\n📝 By Topic:');
    Object.entries(byTopic).forEach(([topic, prompts]) => {
      console.log(`   ${topic}: ${prompts.length} prompts`);
    });

    // Display sample prompts
    console.log('\n' + '='.repeat(80));
    console.log('📝 SAMPLE PROMPTS (First 5)');
    console.log('='.repeat(80));

    allPrompts.slice(0, 5).forEach((prompt, index) => {
      console.log(`\n${index + 1}. ${prompt.title}`);
      console.log(`   Topic: ${prompt.topicId?.name || 'Unknown'}`);
      console.log(`   Query Type: ${prompt.queryType}`);
      console.log(`   Text: ${prompt.text}`);
      console.log(`   Status: ${prompt.status}`);
    });

    // Validate prompt structure
    console.log('\n' + '-'.repeat(80));
    console.log('Step 3.3: Validating prompt structure...');

    const validationResults = {
      allHaveTopicId: allPrompts.every(p => p.topicId),
      allHavePersonaId: allPrompts.every(p => p.personaId),
      allHaveText: allPrompts.every(p => p.text && p.text.length > 10),
      allHaveQueryType: allPrompts.every(p => p.queryType),
      allHaveStatus: allPrompts.every(p => p.status === 'active')
    };

    console.log('\n✅ Structure validation:');
    console.log(`   All have topicId: ${validationResults.allHaveTopicId ? '✅' : '❌'}`);
    console.log(`   All have personaId: ${validationResults.allHavePersonaId ? '✅' : '❌'}`);
    console.log(`   All have text: ${validationResults.allHaveText ? '✅' : '❌'}`);
    console.log(`   All have queryType: ${validationResults.allHaveQueryType ? '✅' : '❌'}`);
    console.log(`   All active status: ${validationResults.allHaveStatus ? '✅' : '❌'}`);

    const allValid = Object.values(validationResults).every(v => v === true);

    // Save data for next step
    const step3Data = {
      userId,
      token,
      url: step2Data.url,
      promptsGenerated: totalPrompts,
      prompts: allPrompts.map(p => ({
        id: p._id,
        topicId: p.topicId._id,
        personaId: p.personaId,
        title: p.title,
        text: p.text,
        queryType: p.queryType
      })),
      selectedCompetitors: selectedCompetitors.map(c => c.name),
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      __dirname + '/test-flow-step3-data.json',
      JSON.stringify(step3Data, null, 2)
    );

    console.log('\n💾 Step 3 data saved to: test-flow-step3-data.json');

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 STEP 3 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Prompts generated: ${totalPrompts}`);
    console.log(`✅ All prompts have valid structure: ${allValid ? 'YES' : 'NO'}`);
    console.log(`✅ Query types: ${Object.keys(byQueryType).length}`);
    console.log(`✅ Topics covered: ${Object.keys(byTopic).length}`);
    console.log(`\n📊 Breakdown:`);
    console.log(`   3 topics × 2 personas × 5 query types = 30 prompts`);

    // Next Step Instructions
    console.log('\n' + '='.repeat(80));
    console.log('🎯 STEP 3 COMPLETE - READY FOR VERIFICATION');
    console.log('='.repeat(80));
    console.log('\n📋 Please verify:');
    console.log('   ✓ Total prompts generated: 30?');
    console.log('   ✓ Prompts cover all topics and personas?');
    console.log('   ✓ Query types are varied?');
    console.log('   ✓ Prompt text looks natural and relevant?');
    console.log('\n👉 Once verified, we\'ll proceed to STEP 4: LLM Testing\n');

    return {
      success: true,
      totalPrompts,
      allValid,
      breakdown: {
        byQueryType,
        byTopic
      }
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
  runStep3Test()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Step 3 test completed successfully!\n');
        process.exit(0);
      } else {
        console.log('\n❌ Step 3 test failed!\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runStep3Test;




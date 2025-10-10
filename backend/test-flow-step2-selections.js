/**
 * STEP 2: USER SELECTIONS TEST
 * 
 * Tests the selection workflow:
 * 1. Load analysis data from Step 1
 * 2. Display all available options
 * 3. Update user selections
 * 4. Verify selections saved correctly
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function runStep2Test() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 STEP 2: USER SELECTIONS TEST');
  console.log('='.repeat(80));

  try {
    // Load data from Step 1
    console.log('\n📁 Loading data from Step 1...');
    const step1Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-data.json', 'utf8'));
    
    const { userId, token, analysis } = step1Data;
    
    console.log(`✅ Loaded data:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Available competitors: ${analysis.competitors.length}`);
    console.log(`   Available topics: ${analysis.topics.length}`);
    console.log(`   Available personas: ${analysis.personas.length}`);

    // Step 2.1: Get current selections (should show AI-generated items)
    console.log('\n' + '-'.repeat(80));
    console.log('Step 2.1: Getting available items from database...');
    
    const latestAnalysisResponse = await axios.get(
      `${BASE_URL}/api/onboarding/latest-analysis`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!latestAnalysisResponse.data.success) {
      throw new Error('Failed to get latest analysis');
    }

    const availableItems = latestAnalysisResponse.data.data.availableItems;
    
    console.log('✅ Available items retrieved:');
    console.log(`   Competitors in DB: ${availableItems.competitors.length}`);
    console.log(`   Topics in DB: ${availableItems.topics.length}`);
    console.log(`   Personas in DB: ${availableItems.personas.length}`);

    // Display available options
    console.log('\n' + '='.repeat(80));
    console.log('📋 AVAILABLE OPTIONS FOR SELECTION');
    console.log('='.repeat(80));

    console.log('\n🏆 COMPETITORS:');
    availableItems.competitors.forEach((comp, index) => {
      console.log(`   ${index + 1}. ${comp.name} (${comp.url})`);
      console.log(`      Selected: ${comp.selected ? '✅' : '❌'} | Source: ${comp.source}`);
    });

    console.log('\n📝 TOPICS:');
    availableItems.topics.forEach((topic, index) => {
      console.log(`   ${index + 1}. ${topic.name}`);
      console.log(`      Selected: ${topic.selected ? '✅' : '❌'} | Source: ${topic.source}`);
    });

    console.log('\n👥 PERSONAS:');
    availableItems.personas.forEach((persona, index) => {
      console.log(`   ${index + 1}. ${persona.type}`);
      console.log(`      Selected: ${persona.selected ? '✅' : '❌'} | Source: ${persona.source}`);
    });

    // Step 2.2: Make selections (select first 3 competitors, first 3 topics, first 2 personas)
    console.log('\n' + '-'.repeat(80));
    console.log('Step 2.2: Updating selections...');
    console.log('\nSelecting:');
    
    const selectedCompetitors = availableItems.competitors.slice(0, 3).map(c => c.url);
    const selectedTopics = availableItems.topics.slice(0, 3).map(t => t.name);
    const selectedPersonas = availableItems.personas.slice(0, 2).map(p => p.type);

    console.log(`   Competitors: ${selectedCompetitors.join(', ')}`);
    console.log(`   Topics: ${selectedTopics.join(', ')}`);
    console.log(`   Personas: ${selectedPersonas.join(', ')}`);

    const selectionsResponse = await axios.post(
      `${BASE_URL}/api/onboarding/update-selections`,
      {
        competitors: selectedCompetitors,
        topics: selectedTopics,
        personas: selectedPersonas
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!selectionsResponse.data.success) {
      throw new Error('Failed to update selections');
    }

    console.log('\n✅ Selections updated:');
    console.log(`   Competitors selected: ${selectionsResponse.data.data.competitorsSelected}`);
    console.log(`   Topics selected: ${selectionsResponse.data.data.topicsSelected}`);
    console.log(`   Personas selected: ${selectionsResponse.data.data.personasSelected}`);

    // Step 2.3: Verify selections were saved
    console.log('\n' + '-'.repeat(80));
    console.log('Step 2.3: Verifying selections in database...');

    const [competitorsCheck, topicsCheck, personasCheck] = await Promise.all([
      axios.get(`${BASE_URL}/api/competitors`, { headers: { 'Authorization': `Bearer ${token}` } }),
      axios.get(`${BASE_URL}/api/topics`, { headers: { 'Authorization': `Bearer ${token}` } }),
      axios.get(`${BASE_URL}/api/personas`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const selectedCompsInDb = competitorsCheck.data.data.filter(c => c.selected);
    const selectedTopicsInDb = topicsCheck.data.data.filter(t => t.selected);
    const selectedPersonasInDb = personasCheck.data.data.filter(p => p.selected);

    console.log('\n✅ Verified selections in database:');
    console.log(`   Selected competitors: ${selectedCompsInDb.length}`);
    console.log(`   Selected topics: ${selectedTopicsInDb.length}`);
    console.log(`   Selected personas: ${selectedPersonasInDb.length}`);

    // Display selected items
    console.log('\n' + '='.repeat(80));
    console.log('✅ FINAL SELECTIONS (What will be used for prompts)');
    console.log('='.repeat(80));

    console.log('\n🏆 SELECTED COMPETITORS:');
    selectedCompsInDb.forEach((comp, index) => {
      console.log(`   ${index + 1}. ${comp.name}`);
      console.log(`      URL: ${comp.url}`);
    });

    console.log('\n📝 SELECTED TOPICS:');
    selectedTopicsInDb.forEach((topic, index) => {
      console.log(`   ${index + 1}. ${topic.name}`);
      console.log(`      Description: ${topic.description.substring(0, 80)}...`);
    });

    console.log('\n👥 SELECTED PERSONAS:');
    selectedPersonasInDb.forEach((persona, index) => {
      console.log(`   ${index + 1}. ${persona.type}`);
      console.log(`      Description: ${persona.description.substring(0, 80)}...`);
    });

    // Save data for next step
    const step2Data = {
      userId,
      token,
      url: step1Data.url,
      selectedCompetitors: selectedCompsInDb,
      selectedTopics: selectedTopicsInDb,
      selectedPersonas: selectedPersonasInDb,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      __dirname + '/test-flow-step2-data.json',
      JSON.stringify(step2Data, null, 2)
    );

    console.log('\n💾 Step 2 data saved to: test-flow-step2-data.json');

    // Calculate expected prompts
    const expectedPrompts = selectedTopicsInDb.length * selectedPersonasInDb.length * 5; // 5 query types per combo
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 STEP 2 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Selections saved successfully`);
    console.log(`✅ ${selectedCompsInDb.length} competitors selected`);
    console.log(`✅ ${selectedTopicsInDb.length} topics selected`);
    console.log(`✅ ${selectedPersonasInDb.length} personas selected`);
    console.log(`\n📈 Expected prompts to generate: ${expectedPrompts}`);
    console.log(`   (${selectedTopicsInDb.length} topics × ${selectedPersonasInDb.length} personas × 5 query types)`);

    // Next Step Instructions
    console.log('\n' + '='.repeat(80));
    console.log('🎯 STEP 2 COMPLETE - READY FOR VERIFICATION');
    console.log('='.repeat(80));
    console.log('\n📋 Please verify:');
    console.log('   ✓ Selected competitors look good?');
    console.log('   ✓ Selected topics are relevant?');
    console.log('   ✓ Selected personas match target audience?');
    console.log('\n👉 Once verified, we\'ll proceed to STEP 3: Prompt Generation\n');

    return {
      success: true,
      selectedCompetitors: selectedCompsInDb.length,
      selectedTopics: selectedTopicsInDb.length,
      selectedPersonas: selectedPersonasInDb.length,
      expectedPrompts
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
  runStep2Test()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Step 2 test completed successfully!\n');
        process.exit(0);
      } else {
        console.log('\n❌ Step 2 test failed!\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runStep2Test;




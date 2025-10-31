#!/usr/bin/env node

/**
 * Script to test prompt generation flow
 * 1. Analyze URL
 * 2. Generate 80 prompts
 * 3. Display results
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const TARGET_URL = 'https://www.americanexpress.com/in/credit-cards/smart-earn-credit-card/?intlink=in-acq-creditcards-smartearn';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeUrl() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 STEP 1: Analyzing URL');
  console.log('='.repeat(70));
  console.log(`URL: ${TARGET_URL}\n`);

  try {
    const response = await axios.post(`${API_BASE}/api/onboarding/analyze-website`, {
      url: TARGET_URL
    });

    if (response.data.success) {
      console.log('✅ URL analysis completed successfully');
      console.log(`   Brand: ${response.data.data?.brandContext?.companyName || 'Unknown'}`);
      console.log(`   Topics found: ${response.data.data?.topics?.length || 0}`);
      console.log(`   Personas found: ${response.data.data?.personas?.length || 0}`);
      console.log(`   Competitors found: ${response.data.data?.competitors?.length || 0}`);
      
      // Get URL analysis ID from the response or fetch latest
      const analysisListResponse = await axios.get(`${API_BASE}/api/url-analysis/list`);
      if (analysisListResponse.data.success && analysisListResponse.data.data.length > 0) {
        const latestAnalysis = analysisListResponse.data.data[0];
        return latestAnalysis.id;
      }
      return null;
    } else {
      console.error('❌ URL analysis failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error analyzing URL:', error.response?.data || error.message);
    return null;
  }
}

async function ensureTopicsAndPersonasSelected(urlAnalysisId) {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 STEP 2: Ensuring topics and personas are selected');
  console.log('='.repeat(70));

  try {
    // Get topics
    const topicsResponse = await axios.get(`${API_BASE}/api/topics?urlAnalysisId=${urlAnalysisId}`);
    const topics = topicsResponse.data.data || [];

    // Get personas
    const personasResponse = await axios.get(`${API_BASE}/api/personas?urlAnalysisId=${urlAnalysisId}`);
    const personas = personasResponse.data.data || [];

    console.log(`Found ${topics.length} topics, ${personas.length} personas`);

    // Select all topics and personas
    let selectedCount = 0;
    for (const topic of topics) {
      if (!topic.selected) {
        await axios.put(`${API_BASE}/api/topics/${topic._id}`, { selected: true });
        selectedCount++;
      }
    }
    for (const persona of personas) {
      if (!persona.selected) {
        await axios.put(`${API_BASE}/api/personas/${persona._id}`, { selected: true });
        selectedCount++;
      }
    }

    if (selectedCount > 0) {
      console.log(`✅ Selected ${selectedCount} topics/personas`);
    } else {
      console.log('✅ All topics and personas already selected');
    }

    return { topics: topics.length, personas: personas.length };
  } catch (error) {
    console.error('❌ Error selecting topics/personas:', error.response?.data || error.message);
    return null;
  }
}

async function generatePrompts() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 STEP 3: Generating 80 prompts');
  console.log('='.repeat(70) + '\n');
  console.log('⏳ This may take several minutes...\n');

  try {
    const response = await axios.post(`${API_BASE}/api/prompts/generate`, {}, {
      timeout: 300000 // 5 minutes timeout
    });

    if (response.data.success) {
      console.log('✅ Prompt generation completed successfully');
      console.log(`   Total prompts generated: ${response.data.data.totalPrompts}`);
      console.log(`   Combinations: ${response.data.data.combinations?.topics || 0} topics × ${response.data.data.combinations?.personas || 0} personas`);
      
      return response.data.data;
    } else {
      console.error('❌ Prompt generation failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating prompts:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function displayPrompts() {
  console.log('\n' + '='.repeat(70));
  console.log('📋 STEP 4: Fetching generated prompts');
  console.log('='.repeat(70));

  try {
    const response = await axios.get(`${API_BASE}/api/prompts`);

    if (response.data.success) {
      const prompts = response.data.data || [];
      console.log(`\n✅ Found ${prompts.length} prompts total\n`);

      // Group by topic-persona
      const grouped = {};
      prompts.forEach(prompt => {
        const topicName = prompt.topicId?.name || 'Unknown';
        const personaType = prompt.personaId?.type || 'Unknown';
        const key = `${topicName} × ${personaType}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(prompt);
      });

      console.log('📊 Prompts by Topic × Persona:\n');
      Object.entries(grouped).forEach(([key, groupPrompts]) => {
        console.log(`  ${key}: ${groupPrompts.length} prompts`);
      });

      console.log('\n📝 Sample prompts (first 20):\n');
      prompts.slice(0, 20).forEach((prompt, index) => {
        console.log(`  ${index + 1}. [${prompt.queryType}] ${prompt.text}`);
      });

      if (prompts.length > 20) {
        console.log(`\n  ... and ${prompts.length - 20} more prompts`);
      }

      return prompts;
    } else {
      console.error('❌ Failed to fetch prompts:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching prompts:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('\n🎯 Testing Prompt Generation Flow');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Target URL: ${TARGET_URL}`);

  // Step 1: Analyze URL
  const urlAnalysisId = await analyzeUrl();
  if (!urlAnalysisId) {
    console.error('\n❌ Failed to analyze URL. Exiting.');
    process.exit(1);
  }

  // Wait a bit for data to be saved
  await sleep(2000);

  // Step 2: Ensure topics and personas are selected
  const selectionResult = await ensureTopicsAndPersonasSelected(urlAnalysisId);
  if (!selectionResult) {
    console.error('\n❌ Failed to select topics/personas. Exiting.');
    process.exit(1);
  }

  // Wait a bit
  await sleep(1000);

  // Step 3: Generate prompts
  const generationResult = await generatePrompts();
  if (!generationResult) {
    console.error('\n❌ Failed to generate prompts. Exiting.');
    process.exit(1);
  }

  // Step 4: Display prompts
  const prompts = await displayPrompts();

  console.log('\n' + '='.repeat(70));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total prompts generated: ${prompts?.length || 0}`);
  console.log('='.repeat(70) + '\n');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});


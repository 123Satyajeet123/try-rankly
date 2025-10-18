/**
 * Test script for Insights Service
 * 
 * This script helps test the insights generation system step by step.
 * Run with: node test-insights.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
const TEST_USER_ID = '68f26e5f1d46fc82201322f1'; // Actual user ID from your database

async function testInsightsService() {
  console.log('🧪 Starting Insights Service Test\n');

  try {
    // Step 1: Test data collection
    console.log('📊 Step 1: Testing data collection...');
    const dataResponse = await axios.get(`${API_BASE_URL}/insights/test/data-collection`, {
      params: {
        tabType: 'visibility',
        urlAnalysisId: null // Will use latest analysis
      },
      headers: {
        'x-user-id': TEST_USER_ID // Dev auth header
      }
    });

    if (dataResponse.data.success) {
      console.log('✅ Data collection successful');
      console.log('📋 Collected data structure:');
      console.log(JSON.stringify(dataResponse.data.data, null, 2));
    } else {
      console.log('❌ Data collection failed:', dataResponse.data.message);
      return;
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 2: Test prompt generation
    console.log('📝 Step 2: Testing prompt generation...');
    const promptResponse = await axios.get(`${API_BASE_URL}/insights/test/prompt`, {
      params: {
        tabType: 'visibility',
        urlAnalysisId: null
      },
      headers: {
        'x-user-id': TEST_USER_ID
      }
    });

    if (promptResponse.data.success) {
      console.log('✅ Prompt generation successful');
      console.log('📋 Generated prompt:');
      console.log(promptResponse.data.data.prompt);
    } else {
      console.log('❌ Prompt generation failed:', promptResponse.data.message);
      return;
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 3: Test insights generation (this will call OpenRouter)
    console.log('🤖 Step 3: Testing insights generation...');
    console.log('⚠️  This will make a real API call to OpenRouter (GPT-4o mini)');
    
    const insightsResponse = await axios.post(`${API_BASE_URL}/insights/generate`, {
      tabType: 'visibility',
      urlAnalysisId: null
    }, {
      headers: {
        'x-user-id': TEST_USER_ID,
        'Content-Type': 'application/json'
      }
    });

    if (insightsResponse.data.success) {
      console.log('✅ Insights generation successful');
      console.log('📋 Generated insights:');
      console.log(JSON.stringify(insightsResponse.data.data, null, 2));
    } else {
      console.log('❌ Insights generation failed:', insightsResponse.data.message);
      return;
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 4: Test retrieving stored insights
    console.log('💾 Step 4: Testing insights retrieval...');
    const retrieveResponse = await axios.get(`${API_BASE_URL}/insights/visibility`, {
      headers: {
        'x-user-id': TEST_USER_ID
      }
    });

    if (retrieveResponse.data.success) {
      console.log('✅ Insights retrieval successful');
      console.log('📋 Retrieved insights:');
      console.log(JSON.stringify(retrieveResponse.data.data, null, 2));
    } else {
      console.log('❌ Insights retrieval failed:', retrieveResponse.data.message);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Tip: Make sure you have:');
      console.log('1. Backend server running on port 5000');
      console.log('2. Valid user data in the database');
      console.log('3. AggregatedMetrics records for the test user');
      console.log('4. OPENROUTER_API_KEY environment variable set');
    }
  }
}

// Helper function to test with specific user ID
async function testWithUser(userId) {
  console.log(`🧪 Testing with user ID: ${userId}\n`);
  TEST_USER_ID = userId;
  await testInsightsService();
}

// Run the test
if (require.main === module) {
  testInsightsService();
}

module.exports = { testInsightsService, testWithUser };

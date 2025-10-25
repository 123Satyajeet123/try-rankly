#!/usr/bin/env node

/**
 * Script to trigger performance insights generation for all tabs
 * This will generate fresh insights with the updated analysis
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'dev-token'; // You may need to update this

// Tab types to generate insights for
const TAB_TYPES = ['visibility', 'prompts', 'sentiment', 'citations'];

async function triggerInsightsGeneration() {
  console.log('🧠 Starting performance insights generation for all tabs...\n');
  
  const results = [];
  
  for (const tabType of TAB_TYPES) {
    try {
      console.log(`🔄 Generating insights for ${tabType} tab...`);
      
      const response = await axios.post(`${API_BASE_URL}/insights/generate`, {
        tabType: tabType,
        urlAnalysisId: null // Use latest analysis
      }, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ ${tabType} insights generated successfully`);
        console.log(`   - Cached: ${response.data.cached ? 'Yes' : 'No'}`);
        console.log(`   - Message: ${response.data.message}`);
        
        results.push({
          tabType,
          success: true,
          cached: response.data.cached,
          message: response.data.message
        });
      } else {
        console.log(`❌ ${tabType} insights generation failed: ${response.data.message}`);
        results.push({
          tabType,
          success: false,
          error: response.data.message
        });
      }
      
    } catch (error) {
      console.log(`❌ Error generating ${tabType} insights:`, error.message);
      results.push({
        tabType,
        success: false,
        error: error.message
      });
    }
    
    console.log(''); // Add spacing between tabs
  }
  
  // Summary
  console.log('📊 INSIGHTS GENERATION SUMMARY:');
  console.log('================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${TAB_TYPES.length}`);
  console.log(`❌ Failed: ${failed.length}/${TAB_TYPES.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL GENERATIONS:');
    successful.forEach(result => {
      console.log(`   - ${result.tabType}: ${result.cached ? 'Cached' : 'Generated'} - ${result.message}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED GENERATIONS:');
    failed.forEach(result => {
      console.log(`   - ${result.tabType}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Visit your dashboard to see the new insights');
  console.log('2. Check each tab for updated performance insights');
  console.log('3. Look for specific competitor comparisons and actionable recommendations');
  
  return results;
}

// Run the insights generation
if (require.main === module) {
  triggerInsightsGeneration()
    .then(results => {
      console.log('\n🏁 Insights generation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { triggerInsightsGeneration };

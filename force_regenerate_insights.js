#!/usr/bin/env node

/**
 * Script to force regenerate performance insights for all tabs
 * This clears the cache and generates fresh insights with updated analysis
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'dev-token';

// Tab types to generate insights for
const TAB_TYPES = ['visibility', 'prompts', 'sentiment', 'citations'];

async function clearInsightsCache() {
  console.log('🧹 Clearing insights cache...\n');
  
  for (const tabType of TAB_TYPES) {
    try {
      console.log(`🗑️ Clearing cache for ${tabType} tab...`);
      
      const response = await axios.delete(`${API_BASE_URL}/insights/${tabType}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ ${tabType} cache cleared successfully`);
      } else {
        console.log(`⚠️ ${tabType} cache clear response: ${response.data.message}`);
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`ℹ️ ${tabType} cache was already empty`);
      } else {
        console.log(`❌ Error clearing ${tabType} cache: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Cache clearing completed!\n');
}

async function forceRegenerateInsights() {
  console.log('🧠 Force regenerating performance insights for all tabs...\n');
  
  const results = [];
  
  for (const tabType of TAB_TYPES) {
    try {
      console.log(`🔄 Force generating insights for ${tabType} tab...`);
      
      // Add a timestamp to force regeneration
      const response = await axios.post(`${API_BASE_URL}/insights/generate`, {
        tabType: tabType,
        urlAnalysisId: null,
        forceRegenerate: true,
        timestamp: Date.now()
      }, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ ${tabType} insights force generated successfully`);
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
      if (error.response?.data) {
        console.log(`   Response:`, error.response.data);
      }
      results.push({
        tabType,
        success: false,
        error: error.message
      });
    }
    
    console.log(''); // Add spacing between tabs
  }
  
  // Summary
  console.log('📊 FORCE REGENERATION SUMMARY:');
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
  console.log('1. Visit your dashboard to see the fresh insights');
  console.log('2. Check each tab for updated performance insights with new analysis');
  console.log('3. Look for specific competitor comparisons and actionable recommendations');
  console.log('4. Insights should now reflect your latest analysis data');
  
  return results;
}

async function main() {
  try {
    // Step 1: Clear cache
    await clearInsightsCache();
    
    // Step 2: Force regenerate
    await forceRegenerateInsights();
    
    console.log('\n🏁 Force regeneration completed!');
    console.log('Your dashboard should now show fresh insights with the updated analysis.');
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the force regeneration
if (require.main === module) {
  main();
}

module.exports = { clearInsightsCache, forceRegenerateInsights };



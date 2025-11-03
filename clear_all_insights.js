#!/usr/bin/env node

/**
 * Script to clear ALL cached performance insights for all tabs
 * This will force fresh insight generation on next request
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'dev-token';
const USER_ID = process.env.USER_ID; // Optional: specific user ID, if not provided uses auth token's user

// Tab types
const TAB_TYPES = ['visibility', 'prompts', 'sentiment', 'citations'];

async function clearAllInsights() {
  console.log('🧹 Clearing ALL performance insights cache...\n');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`🔑 Using Auth Token: ${AUTH_TOKEN ? 'YES' : 'NO'}\n`);

  try {
    // Try to clear all at once using the /clear/all endpoint
    console.log('🗑️ Attempting to clear all insights at once...');
    
    const response = await axios.delete(`${API_BASE_URL}/insights/clear/all`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ Successfully cleared ${response.data.deletedCount} insights across all tabs`);
      console.log(`📊 Message: ${response.data.message}\n`);
      return { success: true, deletedCount: response.data.deletedCount };
    } else {
      console.log(`⚠️ Clear all endpoint returned: ${response.data.message}`);
    }

  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️ /clear/all endpoint not found, clearing tab by tab...\n');
    } else {
      console.log(`⚠️ Error with /clear/all endpoint: ${error.message}`);
      console.log('🔄 Falling back to tab-by-tab clearing...\n');
    }

    // Fallback: clear tab by tab
    let totalDeleted = 0;
    const results = [];

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
          const deletedCount = response.data.deletedCount || 0;
          totalDeleted += deletedCount;
          console.log(`✅ ${tabType} cache cleared: ${deletedCount} insights deleted`);
          results.push({ tabType, success: true, deletedCount });
        } else {
          console.log(`⚠️ ${tabType} cache clear response: ${response.data.message}`);
          results.push({ tabType, success: false, message: response.data.message });
        }
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`ℹ️ ${tabType} cache was already empty`);
          results.push({ tabType, success: true, deletedCount: 0, message: 'Already empty' });
        } else {
          console.log(`❌ Error clearing ${tabType} cache: ${error.message}`);
          results.push({ tabType, success: false, error: error.message });
        }
      }
    }

    // Summary
    console.log('\n📊 CLEAR SUMMARY:');
    console.log('================================');
    console.log(`✅ Total insights deleted: ${totalDeleted}`);
    console.log(`📋 Tab results:`);
    results.forEach(r => {
      if (r.success) {
        console.log(`   ✅ ${r.tabType}: ${r.deletedCount || 0} deleted`);
      } else {
        console.log(`   ❌ ${r.tabType}: Failed - ${r.error || r.message}`);
      }
    });

    return { success: true, deletedCount: totalDeleted, results };
  }
}

async function main() {
  try {
    const result = await clearAllInsights();
    
    console.log('\n🏁 Cache clearing completed!');
    console.log(`📊 Total insights removed: ${result.deletedCount || 0}`);
    console.log('✨ Next time you visit any tab, fresh insights will be generated with the updated prompts.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the cache clearing
if (require.main === module) {
  main();
}

module.exports = { clearAllInsights };



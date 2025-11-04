#!/usr/bin/env node

/**
 * Script to generate a JWT token and clear all insights via API
 * This will login first to get a valid token, then use it to clear insights
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // This should match backend
const DEV_USER_ID = process.env.DEV_USER_ID || '69027b7270fb65c760d81897';

// Generate a token directly if JWT_SECRET is available
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '1h'
  });
}

async function clearAllInsightsWithToken() {
  console.log('🔑 Generating authentication token...\n');
  
  // Try to login first to get a real token
  let token = null;
  
  // Option 1: Try to login (requires email/password)
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;
  
  if (loginEmail && loginPassword) {
    try {
      console.log('🔐 Attempting login to get token...');
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: loginEmail,
        password: loginPassword
      });
      
      if (loginResponse.data.success && loginResponse.data.data?.token) {
        token = loginResponse.data.data.token;
        console.log('✅ Login successful, obtained token\n');
      }
    } catch (error) {
      console.log('⚠️ Login failed, will try generating token directly...\n');
    }
  }
  
  // Option 2: Generate token directly (if JWT_SECRET is available)
  if (!token && JWT_SECRET && JWT_SECRET !== 'your-secret-key') {
    console.log('🔑 Generating token directly using JWT_SECRET...');
    token = generateToken(DEV_USER_ID);
    console.log(`✅ Token generated for user: ${DEV_USER_ID}\n`);
  }
  
  if (!token) {
    console.error('❌ Could not obtain token. Please:');
    console.error('   1. Set LOGIN_EMAIL and LOGIN_PASSWORD environment variables, or');
    console.error('   2. Set JWT_SECRET environment variable to match backend');
    console.error('   3. Or use the MongoDB script: node backend/scripts/clearAllInsights.js\n');
    process.exit(1);
  }

  console.log('🧹 Clearing ALL performance insights cache...\n');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`🔑 Using generated token\n`);

  try {
    // Try to clear all at once using the /clear/all endpoint
    console.log('🗑️ Attempting to clear all insights at once...');
    
    const response = await axios.delete(`${API_BASE_URL}/insights/clear/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
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
    if (error.response?.status === 401) {
      console.log('❌ Authentication failed. Token may be invalid.');
      console.log('💡 Try using the MongoDB script instead: node backend/scripts/clearAllInsights.js\n');
      process.exit(1);
    }
    
    if (error.response?.status === 404) {
      console.log('ℹ️ /clear/all endpoint not found, clearing tab by tab...\n');
    } else {
      console.log(`⚠️ Error with /clear/all endpoint: ${error.message}`);
      console.log('🔄 Falling back to tab-by-tab clearing...\n');
    }

    // Fallback: clear tab by tab
    const TAB_TYPES = ['visibility', 'prompts', 'sentiment', 'citations'];
    let totalDeleted = 0;
    const results = [];

    for (const tabType of TAB_TYPES) {
      try {
        console.log(`🗑️ Clearing cache for ${tabType} tab...`);
        
        const response = await axios.delete(`${API_BASE_URL}/insights/${tabType}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
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
        } else if (error.response?.status === 401) {
          console.log(`❌ ${tabType}: Authentication failed`);
          results.push({ tabType, success: false, error: 'Authentication failed' });
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
    const result = await clearAllInsightsWithToken();
    
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

if (require.main === module) {
  main();
}

module.exports = { clearAllInsightsWithToken };





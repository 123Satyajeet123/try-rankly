/**
 * Test all analytics endpoints
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';
let authToken = null;
let userId = null;

async function getAuthToken() {
  // Get the most recent user
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('../src/models/User');
  const user = await User.findOne().sort({ createdAt: -1 });

  if (!user) {
    throw new Error('No users found. Run simplified-e2e-test.js first.');
  }

  userId = user._id.toString();

  // Generate token
  const jwt = require('jsonwebtoken');
  authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  await mongoose.disconnect();

  console.log(`✅ Using user: ${user.email} (ID: ${userId})`);
  return authToken;
}

async function testEndpoint(name, endpoint) {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log(`\n✅ ${name}`);
    console.log(`   Endpoint: GET ${endpoint}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Data Keys: ${Object.keys(response.data.data || {}).join(', ')}`);

    // Show sample data
    const data = response.data.data;
    if (data.overall) {
      console.log(`   Overall metrics: ${Object.keys(data.overall).join(', ')}`);
    }
    if (data.platforms) {
      console.log(`   Platforms: ${data.platforms.length} items`);
    }
    if (data.topics) {
      console.log(`   Topics: ${data.topics.length} items`);
    }
    if (data.prompts) {
      console.log(`   Prompts: ${data.prompts.length} items`);
    }
    if (data.brands) {
      console.log(`   Brands: ${data.brands.length} items`);
      console.log(`   Top 3 brands:`);
      data.brands.slice(0, 3).forEach((b, i) => {
        console.log(`     ${i+1}. ${b.name} - Visibility: ${b.visibilityScore?.toFixed(2)}%`);
      });
    }
    if (data.userBrand) {
      console.log(`   User Brand: ${data.userBrand.name}`);
      console.log(`     Visibility: ${data.userBrand.visibilityScore?.toFixed(2)}%`);
      console.log(`     Rank: #${data.userBrand.visibilityRank}`);
    }

    return true;
  } catch (error) {
    console.log(`\n❌ ${name}`);
    console.log(`   Endpoint: GET ${endpoint}`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║              ANALYTICS ENDPOINTS TEST SUITE                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  // Get auth token
  await getAuthToken();

  let passed = 0;
  let failed = 0;

  // Test all endpoints
  const endpoints = [
    ['Summary', '/analytics/summary'],
    ['Visibility', '/analytics/visibility'],
    ['Prompts', '/analytics/prompts'],
    ['Sentiment', '/analytics/sentiment'],
    ['Citations', '/analytics/citations'],
    ['Competitors', '/analytics/competitors']
  ];

  for (const [name, endpoint] of endpoints) {
    if (await testEndpoint(name, endpoint)) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(78));
  console.log('RESULTS');
  console.log('='.repeat(78));
  console.log(`\nTotal Endpoints: ${endpoints.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed/endpoints.length)*100).toFixed(1)}%\n`);

  if (passed === endpoints.length) {
    console.log('🎉 ALL ANALYTICS ENDPOINTS WORKING! 🎉\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

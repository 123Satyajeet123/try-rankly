/**
 * Simplified End-to-End Test
 *
 * Skips website analysis and creates test data directly
 * Tests the core flow:
 * 1. User Registration
 * 2. Create Test Data (competitors, topics, personas, prompts)
 * 3. Test Prompts (4 LLMs)
 * 4. Calculate Metrics
 * 5. Retrieve Dashboard Data
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testData = {
  authToken: null,
  userId: null,
  competitorIds: [],
  topicIds: [],
  personaIds: [],
  promptIds: []
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

async function apiCall(method, endpoint, data = null, useAuth = false) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: { 'Content-Type': 'application/json' }
  };

  if (useAuth && testData.authToken) {
    config.headers['Authorization'] = `Bearer ${testData.authToken}`;
  }

  if (data) config.data = data;

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

async function directDBCreate() {
  // Connect to MongoDB directly
  await mongoose.connect(process.env.MONGODB_URI);

  const User = require('../src/models/User');
  const Competitor = require('../src/models/Competitor');
  const Topic = require('../src/models/Topic');
  const Persona = require('../src/models/Persona');
  const Prompt = require('../src/models/Prompt');

  const user = await User.findById(testData.userId);

  // Create competitors
  const competitors = await Competitor.create([
    { userId: testData.userId, name: 'Unbounce', url: 'https://unbounce.com', selected: true },
    { userId: testData.userId, name: 'Instapage', url: 'https://instapage.com', selected: true }
  ]);
  testData.competitorIds = competitors.map(c => c._id);

  // Create topics
  const topics = await Topic.create([
    { userId: testData.userId, name: 'Landing Page Optimization', description: 'Best practices for landing pages', selected: true },
    { userId: testData.userId, name: 'A/B Testing', description: 'Testing and optimization', selected: true }
  ]);
  testData.topicIds = topics.map(t => t._id);

  // Create personas
  const personas = await Persona.create([
    { userId: testData.userId, type: 'Marketing Manager', description: 'Manages digital marketing', selected: true },
    { userId: testData.userId, type: 'Startup Founder', description: 'Runs a startup', selected: true }
  ]);
  testData.personaIds = personas.map(p => p._id);

  // Create prompts
  const prompts = await Prompt.create([
    {
      userId: testData.userId,
      topicId: topics[0]._id,
      personaId: personas[0]._id,
      title: 'Landing Page Tools',
      text: 'What are the best landing page builders for marketing campaigns?',
      queryType: 'Commercial Investigation',
      status: 'active'
    },
    {
      userId: testData.userId,
      topicId: topics[1]._id,
      personaId: personas[1]._id,
      title: 'A/B Testing Tools',
      text: 'Which A/B testing tools are recommended for startups?',
      queryType: 'Commercial Investigation',
      status: 'active'
    }
  ]);
  testData.promptIds = prompts.map(p => p._id);

  await mongoose.disconnect();

  log(`✅ Created test data directly in database`, colors.green);
  log(`  Competitors: ${testData.competitorIds.length}`);
  log(`  Topics: ${testData.topicIds.length}`);
  log(`  Personas: ${testData.personaIds.length}`);
  log(`  Prompts: ${testData.promptIds.length}`);
}

async function runTest() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════════════════╗', colors.bright);
  log('║              SIMPLIFIED END-TO-END TEST SUITE                          ║', colors.bright);
  log('╚════════════════════════════════════════════════════════════════════════╝', colors.bright);

  const startTime = Date.now();
  let passed = 0, failed = 0;

  try {
    // Step 1: Register
    log('\n[1/5] User Registration...', colors.cyan);
    const regResult = await apiCall('POST', '/auth/register', {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company'
    });

    if (regResult.success) {
      testData.authToken = regResult.data.data?.token;
      testData.userId = regResult.data.data?.user?._id;
      log(`✅ User registered: ${testData.userId}`, colors.green);
      passed++;
    } else {
      log(`❌ Registration failed: ${regResult.error}`, colors.red);
      failed++;
      throw new Error('Cannot continue');
    }

    // Step 2: Create test data directly in DB
    log('\n[2/5] Creating test data...', colors.cyan);
    await directDBCreate();
    passed++;

    // Step 3: Test prompts
    log('\n[3/5] Testing prompts across 4 LLMs...', colors.cyan);
    log('⏱️  This will take 2-5 minutes...', colors.yellow);

    const testResult = await apiCall('POST', '/prompts/test', {}, true);

    if (testResult.success) {
      const summary = testResult.data.data?.summary || {};
      log(`✅ Prompt testing complete!`, colors.green);
      log(`  Total Tests: ${testResult.data.data?.totalTests || 0}`);
      log(`  Completed: ${testResult.data.data?.completedTests || 0}`);
      log(`  Avg Visibility: ${summary.averageVisibilityScore || 0}%`);
      log(`  Brand Mention Rate: ${summary.brandMentionRate || 0}%`);
      log(`  Best LLM: ${summary.bestPerformingLLM || 'N/A'}`);
      passed++;
    } else {
      log(`❌ Prompt testing failed: ${testResult.error}`, colors.red);
      failed++;
      throw new Error('Cannot continue');
    }

    // Step 4: Calculate metrics
    log('\n[4/5] Calculating aggregated metrics...', colors.cyan);

    const metricsResult = await apiCall('POST', '/metrics/calculate', {
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      dateTo: new Date().toISOString()
    }, true);

    if (metricsResult.success) {
      const data = metricsResult.data.data || {};
      log(`✅ Metrics calculated!`, colors.green);
      log(`  Total Calculations: ${data.totalCalculations || 0}`);
      log(`  Platforms: ${data.platforms?.length || 0}`);
      log(`  Topics: ${data.topics?.length || 0}`);
      log(`  Personas: ${data.personas?.length || 0}`);

      // Show top brand
      if (data.overall?.brandMetrics?.length > 0) {
        const topBrand = data.overall.brandMetrics[0];
        log(`\n  Top Brand: ${topBrand.brandName}`);
        log(`    Visibility: ${topBrand.visibilityScore.toFixed(2)}% (Rank #${topBrand.visibilityRank})`);
        log(`    Share of Voice: ${topBrand.shareOfVoice.toFixed(2)}%`);
      }

      passed++;
    } else {
      log(`❌ Metrics calculation failed: ${metricsResult.error}`, colors.red);
      failed++;
    }

    // Step 5: Get dashboard data
    log('\n[5/5] Retrieving dashboard data...', colors.cyan);

    const dashResult = await apiCall('GET', '/metrics/dashboard', null, true);

    if (dashResult.success) {
      const data = dashResult.data.data || {};
      log(`✅ Dashboard data retrieved!`, colors.green);
      log(`  Overall Metrics: ${data.overall ? '✅' : '❌'}`);
      log(`  Platform Metrics: ${data.platforms?.length || 0}`);

      if (data.overall?.summary?.userBrand) {
        const brand = data.overall.summary.userBrand;
        log(`\n  Your Brand: ${brand.name || 'Unknown'}`);
        log(`    Visibility Score: ${brand.visibilityScore?.toFixed(2) || 0}%`);
        log(`    Rank: #${brand.visibilityRank || 'N/A'}`);
      }

      passed++;
    } else {
      log(`❌ Dashboard data failed: ${dashResult.error}`, colors.red);
      failed++;
    }

  } catch (error) {
    log(`\n❌ Test aborted: ${error.message}`, colors.red);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = 5;

  log('\n' + '='.repeat(76), colors.bright);
  log('FINAL RESULTS', colors.bright + colors.cyan);
  log('='.repeat(76), colors.bright);

  log(`\n⏱️  Duration: ${duration}s`);
  log(`📊 Tests: ${total}`);
  log(`✅ Passed: ${passed}/${total}`, colors.green);
  if (failed > 0) log(`❌ Failed: ${failed}/${total}`, colors.red);

  const successRate = ((passed / total) * 100).toFixed(1);
  log(`\n🎯 Success Rate: ${successRate}%`);

  if (passed === total) {
    log('\n🎉 ALL TESTS PASSED! System is working! 🎉', colors.bright + colors.green);
  } else if (passed >= 3) {
    log('\n⚠️  PARTIAL SUCCESS', colors.yellow);
  } else {
    log('\n❌ TESTS FAILED', colors.red);
  }

  log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTest().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

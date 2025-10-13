/**
 * End-to-End Test Script
 *
 * Tests the complete flow:
 * 1. User Registration
 * 2. Website Analysis
 * 3. Competitor Selection
 * 4. Topic Selection
 * 5. Persona Selection
 * 6. Prompt Generation
 * 7. Prompt Testing (4 LLMs)
 * 8. Metrics Calculation
 * 9. Dashboard Data Retrieval
 */

const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  user: {
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Company'
  },
  website: {
    url: 'https://www.fibr.ai'
  }
};

// Store test data
const testData = {
  authToken: null,
  userId: null,
  urlAnalysisId: null,
  competitorIds: [],
  topicIds: [],
  personaIds: [],
  promptIds: [],
  testResults: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, title) {
  console.log('\n' + '='.repeat(80));
  log(`STEP ${step}: ${title}`, colors.bright + colors.cyan);
  console.log('='.repeat(80));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function apiCall(method, endpoint, data = null, useAuth = false) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (useAuth && testData.authToken) {
    config.headers['Authorization'] = `Bearer ${testData.authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Steps

async function step1_register() {
  logStep(1, 'User Registration');

  const result = await apiCall('POST', '/auth/register', {
    email: TEST_CONFIG.user.email,
    password: TEST_CONFIG.user.password,
    firstName: TEST_CONFIG.user.firstName,
    lastName: TEST_CONFIG.user.lastName,
    companyName: TEST_CONFIG.user.companyName
  });

  if (result.success) {
    testData.authToken = result.data.data?.token;
    testData.userId = result.data.data?.user?._id;
    logSuccess(`User registered: ${TEST_CONFIG.user.email}`);
    logInfo(`User ID: ${testData.userId}`);
    logInfo(`Auth Token: ${testData.authToken?.substring(0, 20)}...`);
    return true;
  } else {
    logError(`Registration failed: ${result.error}`);
    return false;
  }
}

async function step2_analyzeWebsite() {
  logStep(2, 'Website Analysis');

  logInfo(`Analyzing website: ${TEST_CONFIG.website.url}`);
  logWarning('This step may take 30-60 seconds...');

  const result = await apiCall('POST', '/onboarding/analyze-website', {
    url: TEST_CONFIG.website.url
  }, true);

  if (result.success) {
    testData.urlAnalysisId = result.data.data?._id;
    logSuccess('Website analysis complete!');
    logInfo(`Analysis ID: ${testData.urlAnalysisId}`);
    logInfo(`Brand: ${result.data.data?.brandContext?.companyName || 'N/A'}`);
    logInfo(`Industry: ${result.data.data?.brandContext?.industry || 'N/A'}`);

    // Log some competitors found
    const competitors = result.data.data?.competitors || [];
    logInfo(`Found ${competitors.length} potential competitors`);
    competitors.slice(0, 3).forEach((comp, i) => {
      console.log(`  ${i + 1}. ${comp.name} - ${comp.url}`);
    });

    return true;
  } else {
    logError(`Website analysis failed: ${result.error}`);
    return false;
  }
}

async function step3_getAndSelectCompetitors() {
  logStep(3, 'Get and Select Competitors');

  // Get competitors
  const getResult = await apiCall('GET', '/competitors', null, true);

  if (!getResult.success) {
    logError(`Failed to get competitors: ${getResult.error}`);
    return false;
  }

  const competitors = getResult.data.data || [];
  logInfo(`Found ${competitors.length} competitors`);

  if (competitors.length === 0) {
    logWarning('No competitors found. Skipping selection.');
    return true;
  }

  // Select first 3 competitors
  const competitorsToSelect = competitors.slice(0, Math.min(3, competitors.length));

  for (const competitor of competitorsToSelect) {
    const selectResult = await apiCall('PUT', `/competitors/${competitor._id}`, {
      selected: true
    }, true);

    if (selectResult.success) {
      testData.competitorIds.push(competitor._id);
      logSuccess(`Selected: ${competitor.name}`);
    } else {
      logError(`Failed to select ${competitor.name}: ${selectResult.error}`);
    }
  }

  logInfo(`Total competitors selected: ${testData.competitorIds.length}`);
  return testData.competitorIds.length > 0;
}

async function step4_getAndSelectTopics() {
  logStep(4, 'Get and Select Topics');

  // Get topics
  const getResult = await apiCall('GET', '/topics', null, true);

  if (!getResult.success) {
    logError(`Failed to get topics: ${getResult.error}`);
    return false;
  }

  const topics = getResult.data.data || [];
  logInfo(`Found ${topics.length} topics`);

  if (topics.length === 0) {
    logWarning('No topics found. Skipping selection.');
    return true;
  }

  // Select first 2 topics
  const topicsToSelect = topics.slice(0, Math.min(2, topics.length));

  for (const topic of topicsToSelect) {
    const selectResult = await apiCall('PUT', `/topics/${topic._id}`, {
      selected: true
    }, true);

    if (selectResult.success) {
      testData.topicIds.push(topic._id);
      logSuccess(`Selected: ${topic.name}`);
      console.log(`  Description: ${topic.description || 'N/A'}`);
    } else {
      logError(`Failed to select ${topic.name}: ${selectResult.error}`);
    }
  }

  logInfo(`Total topics selected: ${testData.topicIds.length}`);
  return testData.topicIds.length > 0;
}

async function step5_getAndSelectPersonas() {
  logStep(5, 'Get and Select Personas');

  // Get personas
  const getResult = await apiCall('GET', '/personas', null, true);

  if (!getResult.success) {
    logError(`Failed to get personas: ${getResult.error}`);
    return false;
  }

  const personas = getResult.data.data || [];
  logInfo(`Found ${personas.length} personas`);

  if (personas.length === 0) {
    logWarning('No personas found. Skipping selection.');
    return true;
  }

  // Select first 2 personas
  const personasToSelect = personas.slice(0, Math.min(2, personas.length));

  for (const persona of personasToSelect) {
    const selectResult = await apiCall('PUT', `/personas/${persona._id}`, {
      selected: true
    }, true);

    if (selectResult.success) {
      testData.personaIds.push(persona._id);
      logSuccess(`Selected: ${persona.type}`);
      console.log(`  Description: ${persona.description || 'N/A'}`);
    } else {
      logError(`Failed to select ${persona.type}: ${selectResult.error}`);
    }
  }

  logInfo(`Total personas selected: ${testData.personaIds.length}`);
  return testData.personaIds.length > 0;
}

async function step6_generatePrompts() {
  logStep(6, 'Generate Prompts');

  logWarning('Generating prompts with AI... This may take 30-60 seconds');

  const result = await apiCall('POST', '/prompts/generate', {}, true);

  if (result.success) {
    const prompts = result.data.data?.prompts || [];
    testData.promptIds = prompts.map(p => p.id);

    logSuccess(`Generated ${prompts.length} prompts!`);
    logInfo(`Topics: ${result.data.data?.combinations?.topics || 0}`);
    logInfo(`Personas: ${result.data.data?.combinations?.personas || 0}`);
    logInfo(`Prompts per combination: ${result.data.data?.combinations?.promptsPerCombination || 0}`);

    // Show first 3 prompts
    prompts.slice(0, 3).forEach((prompt, i) => {
      console.log(`\n  Prompt ${i + 1}:`);
      console.log(`    Topic: ${prompt.topicName}`);
      console.log(`    Persona: ${prompt.personaType}`);
      console.log(`    Text: "${prompt.promptText.substring(0, 80)}..."`);
    });

    return true;
  } else {
    logError(`Prompt generation failed: ${result.error}`);
    return false;
  }
}

async function step7_testPrompts() {
  logStep(7, 'Test Prompts Across 4 LLMs');

  logWarning('Testing prompts across ChatGPT, Claude, Perplexity, and Gemini...');
  logWarning('This will take 2-5 minutes depending on API response times');

  const result = await apiCall('POST', '/prompts/test', {}, true);

  if (result.success) {
    const summary = result.data.data?.summary || {};

    logSuccess('Prompt testing complete!');
    console.log('\n📊 Test Summary:');
    console.log(`  Total Tests: ${result.data.data?.totalTests || 0}`);
    console.log(`  Completed: ${result.data.data?.completedTests || 0}`);
    console.log(`  Failed: ${result.data.data?.failedTests || 0}`);
    console.log(`  Avg Visibility Score: ${summary.averageVisibilityScore || 0}%`);
    console.log(`  Brand Mention Rate: ${summary.brandMentionRate || 0}%`);
    console.log(`  Best Performing LLM: ${summary.bestPerformingLLM || 'N/A'}`);

    // Show LLM performance breakdown
    if (summary.llmPerformance) {
      console.log('\n📈 LLM Performance:');
      Object.entries(summary.llmPerformance).forEach(([llm, score]) => {
        console.log(`  ${llm}: ${score.toFixed(1)}`);
      });
    }

    return true;
  } else {
    logError(`Prompt testing failed: ${result.error}`);
    return false;
  }
}

async function step8_calculateMetrics() {
  logStep(8, 'Calculate Aggregated Metrics');

  logInfo('Calculating metrics across all dimensions...');

  const result = await apiCall('POST', '/metrics/calculate', {
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString()
  }, true);

  if (result.success) {
    const data = result.data.data || {};

    logSuccess('Metrics calculation complete!');
    console.log('\n📊 Aggregation Summary:');
    console.log(`  Total Calculations: ${data.totalCalculations || 0}`);
    console.log(`  Overall Metrics: ${data.overall ? '✅' : '❌'}`);
    console.log(`  Platform Metrics: ${data.platforms?.length || 0} platforms`);
    console.log(`  Topic Metrics: ${data.topics?.length || 0} topics`);
    console.log(`  Persona Metrics: ${data.personas?.length || 0} personas`);

    // Show overall metrics summary
    if (data.overall) {
      console.log('\n🌐 Overall Metrics:');
      console.log(`  Total Prompts: ${data.overall.totalPrompts}`);
      console.log(`  Total Brands: ${data.overall.totalBrands}`);

      const topBrands = data.overall.brandMetrics.slice(0, 3);
      console.log('\n  Top 3 Brands by Visibility:');
      topBrands.forEach((brand, i) => {
        console.log(`    ${i + 1}. ${brand.brandName}`);
        console.log(`       Visibility Score: ${brand.visibilityScore.toFixed(2)}% (Rank #${brand.visibilityRank})`);
        console.log(`       Share of Voice: ${brand.shareOfVoice.toFixed(2)}%`);
        console.log(`       Avg Position: ${brand.avgPosition.toFixed(2)}`);
      });
    }

    return true;
  } else {
    logError(`Metrics calculation failed: ${result.error}`);
    return false;
  }
}

async function step9_getDashboardData() {
  logStep(9, 'Retrieve Dashboard Data');

  const result = await apiCall('GET', '/dashboard/all', null, true);

  if (result.success) {
    const data = result.data.data || {};

    logSuccess('Dashboard data retrieved!');
    console.log('\n📊 Dashboard Data Summary:');
    console.log(`  Last Updated: ${data.lastUpdated || 'N/A'}`);
    console.log(`  Overall Metrics: ${data.overall ? '✅' : '❌'}`);
    console.log(`  Platform Metrics: ${data.platforms?.length || 0}`);
    console.log(`  Topic Metrics: ${data.topics?.length || 0}`);
    console.log(`  Persona Metrics: ${data.personas?.length || 0}`);

    if (data.overall?.summary) {
      const summary = data.overall.summary;
      console.log('\n🎯 User Brand Performance:');
      console.log(`  Brand: ${summary.userBrand?.name || 'N/A'}`);
      console.log(`  Visibility Score: ${summary.userBrand?.visibilityScore?.toFixed(2) || 0}%`);
      console.log(`  Visibility Rank: #${summary.userBrand?.visibilityRank || 'N/A'}`);
      console.log(`  Share of Voice: ${summary.userBrand?.shareOfVoice?.toFixed(2) || 0}%`);
      console.log(`  Avg Position: ${summary.userBrand?.avgPosition?.toFixed(2) || 'N/A'}`);
    }

    // Show platform breakdown
    if (data.platforms && data.platforms.length > 0) {
      console.log('\n🤖 Platform Breakdown:');
      data.platforms.forEach(platform => {
        const userBrand = platform.summary?.userBrand;
        console.log(`  ${platform.scopeValue}:`);
        console.log(`    Visibility: ${userBrand?.visibilityScore?.toFixed(2) || 0}%`);
        console.log(`    Rank: #${userBrand?.visibilityRank || 'N/A'}`);
      });
    }

    return true;
  } else {
    logError(`Dashboard data retrieval failed: ${result.error}`);
    return false;
  }
}

// Main test execution
async function runE2ETest() {
  console.clear();
  log('\n╔══════════════════════════════════════════════════════════════════════════════╗', colors.bright);
  log('║                         END-TO-END TEST SUITE                                ║', colors.bright);
  log('╚══════════════════════════════════════════════════════════════════════════════╝', colors.bright);

  logInfo(`API Base URL: ${API_BASE_URL}`);
  logInfo(`Test Website: ${TEST_CONFIG.website.url}`);
  logInfo(`Test User: ${TEST_CONFIG.user.email}`);

  const startTime = Date.now();
  const results = {
    total: 9,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // Step 1: Register
    if (await step1_register()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Registration failed - cannot continue');
    }

    await sleep(1000);

    // Step 2: Analyze Website
    if (await step2_analyzeWebsite()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Website analysis failed - cannot continue');
    }

    await sleep(1000);

    // Step 3: Get and Select Competitors
    if (await step3_getAndSelectCompetitors()) {
      results.passed++;
    } else {
      results.failed++;
      logWarning('Competitor selection failed - continuing anyway');
    }

    await sleep(1000);

    // Step 4: Get and Select Topics
    if (await step4_getAndSelectTopics()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Topic selection failed - cannot continue');
    }

    await sleep(1000);

    // Step 5: Get and Select Personas
    if (await step5_getAndSelectPersonas()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Persona selection failed - cannot continue');
    }

    await sleep(1000);

    // Step 6: Generate Prompts
    if (await step6_generatePrompts()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Prompt generation failed - cannot continue');
    }

    await sleep(2000);

    // Step 7: Test Prompts
    if (await step7_testPrompts()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Prompt testing failed - cannot continue');
    }

    await sleep(2000);

    // Step 8: Calculate Metrics
    if (await step8_calculateMetrics()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Metrics calculation failed - cannot continue');
    }

    await sleep(1000);

    // Step 9: Get Dashboard Data
    if (await step9_getDashboardData()) {
      results.passed++;
    } else {
      results.failed++;
      logWarning('Dashboard data retrieval failed - test incomplete');
    }

  } catch (error) {
    logError(`\nTest suite aborted: ${error.message}`);
  }

  // Final Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(80));
  log('FINAL RESULTS', colors.bright + colors.cyan);
  console.log('='.repeat(80));

  console.log(`\n⏱️  Total Duration: ${duration}s`);
  console.log(`📊 Tests: ${results.total}`);
  logSuccess(`Passed: ${results.passed}/${results.total}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}/${results.total}`);
  }
  if (results.skipped > 0) {
    logWarning(`Skipped: ${results.skipped}/${results.total}`);
  }

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\n🎯 Success Rate: ${successRate}%`);

  if (results.passed === results.total) {
    log('\n🎉 ALL TESTS PASSED! System is ready for frontend integration! 🎉', colors.bright + colors.green);
  } else if (results.passed >= results.total * 0.7) {
    log('\n⚠️  PARTIAL SUCCESS - Some components need attention', colors.yellow);
  } else {
    log('\n❌ TESTS FAILED - Critical issues need to be fixed', colors.red);
  }

  console.log('\n' + '='.repeat(80));

  // Test data summary
  console.log('\n📋 Test Data Summary:');
  console.log(`  User ID: ${testData.userId || 'N/A'}`);
  console.log(`  Auth Token: ${testData.authToken ? 'Generated' : 'N/A'}`);
  console.log(`  Competitors Selected: ${testData.competitorIds.length}`);
  console.log(`  Topics Selected: ${testData.topicIds.length}`);
  console.log(`  Personas Selected: ${testData.personaIds.length}`);
  console.log(`  Prompts Generated: ${testData.promptIds.length}`);

  console.log('\n');
}

// Run the test
runE2ETest().catch(error => {
  logError(`\nUnexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

const axios = require('axios');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green : type === 'error' ? colors.red : type === 'warning' ? colors.yellow : colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

async function testBackend() {
  log('\n🧪 Testing GA4 Backend Integration\n', 'info');

  const baseURL = 'http://localhost:5000';

  // Test 1: Health Check
  log('Test 1: Health Check', 'info');
  try {
    const response = await axios.get(`${baseURL}/health`);
    if (response.data.status === 'OK') {
      log('✅ Health check passed', 'success');
    } else {
      log('❌ Health check failed', 'error');
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'error');
  }

  // Test 2: API Info
  log('\nTest 2: API Info', 'info');
  try {
    const response = await axios.get(`${baseURL}/api`);
    if (response.data.endpoints.ga4Auth && response.data.endpoints.ga4) {
      log('✅ GA4 endpoints registered', 'success');
      log(`   GA4 Auth: ${response.data.endpoints.ga4Auth}`, 'info');
      log(`   GA4 Data: ${response.data.endpoints.ga4}`, 'info');
    } else {
      log('❌ GA4 endpoints not found', 'error');
    }
  } catch (error) {
    log(`❌ API info error: ${error.message}`, 'error');
  }

  // Test 3: GA4 OAuth Initiation (should redirect to Google)
  log('\nTest 3: GA4 OAuth Initiation', 'info');
  try {
    const response = await axios.get(`${baseURL}/api/auth/ga4`, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    if (response.status === 302 || response.status === 301) {
      log('✅ GA4 OAuth initiates correctly', 'success');
      log(`   Redirects to: ${response.headers.location}`, 'info');
    } else {
      log(`⚠️ Unexpected status: ${response.status}`, 'warning');
    }
  } catch (error) {
    if (error.response && error.response.status >= 300 && error.response.status < 400) {
      log('✅ GA4 OAuth initiates correctly (redirect caught)', 'success');
    } else {
      log(`❌ GA4 OAuth error: ${error.message}`, 'error');
    }
  }

  // Test 4: GA4 Connection Status (no session)
  log('\nTest 4: GA4 Connection Status (no session)', 'info');
  try {
    const response = await axios.get(`${baseURL}/api/ga4/connection-status`);
    if (response.data.error && response.data.error.includes('No valid GA4 session')) {
      log('✅ Connection status handles missing session correctly', 'success');
    } else {
      log(`⚠️ Unexpected response: ${JSON.stringify(response.data)}`, 'warning');
    }
  } catch (error) {
    log(`❌ Connection status error: ${error.message}`, 'error');
  }

  // Test 5: GA4 Callback with Error
  log('\nTest 5: GA4 Callback Error Handling', 'info');
  try {
    const response = await axios.get(`${baseURL}/api/auth/ga4/callback?error=test_error`, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    if (response.status === 302 || response.status === 301) {
      log('✅ GA4 callback handles errors correctly', 'success');
      log(`   Redirects to: ${response.headers.location}`, 'info');
    } else {
      log(`⚠️ Unexpected status: ${response.status}`, 'warning');
    }
  } catch (error) {
    if (error.response && error.response.status >= 300 && error.response.status < 400) {
      log('✅ GA4 callback handles errors correctly (redirect caught)', 'success');
    } else {
      log(`❌ GA4 callback error: ${error.message}`, 'error');
    }
  }

  // Test 6: MongoDB GAConnection Model
  log('\nTest 6: MongoDB GAConnection Model', 'info');
  try {
    const GAConnection = require('./src/models/GAConnection');
    log('✅ GAConnection model loaded successfully', 'success');
    log(`   Model name: ${GAConnection.modelName}`, 'info');
  } catch (error) {
    log(`❌ GAConnection model error: ${error.message}`, 'error');
  }

  // Test 7: GA4 Utilities
  log('\nTest 7: GA4 Utilities', 'info');
  try {
    const apiClient = require('./src/utils/ga4ApiClient');
    const dataTransformer = require('./src/utils/ga4DataTransformer');
    log('✅ GA4 utilities loaded successfully', 'success');
    log('   API Client: fetchAccountSummaries, runReport', 'info');
    log('   Data Transformer: transformMetricsData, transformPlatformData, etc.', 'info');
  } catch (error) {
    log(`❌ GA4 utilities error: ${error.message}`, 'error');
  }

  // Test 8: GA4 Middleware
  log('\nTest 8: GA4 Middleware', 'info');
  try {
    const ga4Session = require('./src/middleware/ga4Session');
    const ga4Connection = require('./src/middleware/ga4Connection');
    log('✅ GA4 middleware loaded successfully', 'success');
    log('   Session middleware: parseGA4Session, ga4SessionMiddleware', 'info');
    log('   Connection middleware: ga4ConnectionMiddleware', 'info');
  } catch (error) {
    log(`❌ GA4 middleware error: ${error.message}`, 'error');
  }

  // Test 9: GA4 Token Refresh Service
  log('\nTest 9: GA4 Token Refresh Service', 'info');
  try {
    const tokenRefresh = require('./src/services/ga4TokenRefresh');
    log('✅ GA4 token refresh service loaded successfully', 'success');
    log('   Functions: refreshGA4Token, ensureGA4AccessToken', 'info');
  } catch (error) {
    log(`❌ GA4 token refresh error: ${error.message}`, 'error');
  }

  log('\n✅ Backend Integration Test Complete\n', 'success');
}

// Run tests
testBackend().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'error');
  process.exit(1);
});


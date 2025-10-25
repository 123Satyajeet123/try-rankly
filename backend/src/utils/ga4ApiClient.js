const axios = require('axios');

/**
 * Centralized GA4 API client
 */

/**
 * Fetch account summaries from GA4 Admin API
 * @param {string} accessToken - GA4 access token
 * @returns {Promise<Object>} Account summaries data
 */
async function fetchAccountSummaries(accessToken) {
  try {
    const response = await axios.get(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching account summaries:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run a GA4 report
 * @param {string} accessToken - GA4 access token
 * @param {string} propertyId - GA4 property ID
 * @param {Object} reportConfig - Report configuration
 * @returns {Promise<Object>} Report data
 */
async function runReport(accessToken, propertyId, reportConfig) {
  try {
    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      reportConfig,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error running GA4 report:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Handle token refresh on 401 errors
 * This should be called from middleware or route handlers
 */
function handleTokenRefresh(error) {
  if (error.response?.status === 401) {
    // Token expired, needs refresh
    return true;
  }
  return false;
}

module.exports = {
  fetchAccountSummaries,
  runReport,
  handleTokenRefresh
};


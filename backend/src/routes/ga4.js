const express = require('express');
const { ga4SessionMiddleware } = require('../middleware/ga4Session');
const { ga4ConnectionMiddleware } = require('../middleware/ga4Connection');
const { fetchAccountSummaries, runReport } = require('../utils/ga4ApiClient');
const {
  transformMetricsData,
  transformPlatformData,
  transformToPlatformSplit,
  transformToLLMPlatforms,
  transformTrendData,
  transformGeoData,
  transformDeviceData,
  transformPagesData,
  calculateComparisonDates
} = require('../utils/ga4DataTransformer');
const GAConnection = require('../models/GAConnection');
const { getCachedData, setCachedData } = require('../services/ga4CacheService');
const GA4DataSnapshot = require('../models/GA4DataSnapshot');

const router = express.Router();

/**
 * GET /api/ga4/accounts-properties
 * Fetch GA4 accounts and properties
 */
router.get('/accounts-properties', ga4SessionMiddleware, async (req, res) => {
  try {
    const { accessToken } = req.ga4Session;

    // Fetch accounts and properties from Google Analytics Admin API
    const accountsData = await fetchAccountSummaries(accessToken);

    // Transform response
    const accounts = (accountsData.accountSummaries || []).map(account => ({
      accountId: account.account?.split('/')[1],
      accountName: account.displayName,
      properties: (account.propertySummaries || []).map(property => ({
        propertyId: property.property?.split('/')[1],
        propertyName: property.displayName
      }))
    }));

    res.json({
      success: true,
      data: {
        accounts
      }
    });
  } catch (error) {
    console.error('Error fetching accounts-properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GA4 accounts'
    });
  }
});

/**
 * POST /api/ga4/save-property
 * Save selected GA4 property
 */
router.post('/save-property', ga4SessionMiddleware, async (req, res) => {
  try {
    const { accountId, propertyId } = req.body;
    const { userId, accessToken } = req.ga4Session;

    if (!accountId || !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing accountId or propertyId'
      });
    }

    // Fetch account summaries to get names
    const accountsData = await fetchAccountSummaries(accessToken);

    // Find account and property names
    let accountName = '';
    let propertyName = '';

    for (const account of accountsData.accountSummaries || []) {
      const currentAccountId = account.account?.split('/')[1];
      if (currentAccountId === accountId) {
        accountName = account.displayName;
        for (const property of account.propertySummaries || []) {
          const currentPropertyId = property.property?.split('/')[1];
          if (currentPropertyId === propertyId) {
            propertyName = property.displayName;
            break;
          }
        }
        break;
      }
    }

    if (!accountName || !propertyName) {
      return res.status(404).json({
        success: false,
        error: 'Account or property not found'
      });
    }

    // Update GA connection
    const updatedConnection = await GAConnection.findOneAndUpdate(
      { userId, deleted: { $ne: true } },
      {
        accountId,
        propertyId,
        accountName,
        propertyName,
        isActive: true // Now connection is active!
      },
      { new: true }
    );

    console.log('✅ GA property saved:', { userId, accountId, propertyId });

    // Update session cookie with property info
    const updatedSessionData = {
      ...req.ga4Session,
      propertyId,
      accountId,
      accountName,
      propertyName
    };

    const updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');

    res.cookie('ga4_session', updatedSessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      data: {
        accountId: updatedConnection.accountId,
        propertyId: updatedConnection.propertyId,
        accountName: updatedConnection.accountName,
        propertyName: updatedConnection.propertyName
      }
    });
  } catch (error) {
    console.error('Error saving property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save property'
    });
  }
});

/**
 * GET /api/ga4/connection-status
 * Check GA4 connection status
 */
router.get('/connection-status', ga4SessionMiddleware, async (req, res) => {
  try {
    const { userId } = req.ga4Session;

    const gaConnection = await GAConnection.findOne({
      userId,
      deleted: { $ne: true }
    });

    if (!gaConnection) {
      return res.json({
        connected: false,
        isActive: false
      });
    }

    res.json({
      connected: true,
      isActive: gaConnection.isActive,
      propertyName: gaConnection.propertyName,
      accountName: gaConnection.accountName
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check connection status'
    });
  }
});

/**
 * POST /api/ga4/disconnect
 * Disconnect GA4 connection
 */
router.post('/disconnect', ga4SessionMiddleware, async (req, res) => {
  try {
    const { userId } = req.ga4Session;

    await GAConnection.findOneAndUpdate(
      { userId, deleted: { $ne: true } },
      { deleted: true }
    );

    // Clear session cookie
    res.clearCookie('ga4_session', { path: '/' });

    console.log('✅ GA4 disconnected for user:', userId);

    res.json({
      success: true,
      message: 'GA4 disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting GA4:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect GA4'
    });
  }
});

/**
 * GET /api/ga4/data
 * Fetch basic GA4 metrics
 */
router.get('/data', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;

    const reportConfig = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' }
      ]
    };

    const data = await runReport(accessToken, propertyId, reportConfig);

    const metrics = transformMetricsData(data);

    res.json({
      success: true,
      data: {
        property: {
          id: propertyId,
          name: req.ga4Connection.propertyName,
          account: req.ga4Connection.accountName
        },
        summary: metrics
      }
    });
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GA4 data'
    });
  }
});

/**
 * GET /api/ga4/llm-platforms
 * Fetch LLM platform traffic data
 */
router.get('/llm-platforms', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;
    const userId = req.session.userId;

    // Check cache first
    const cached = await getCachedData(userId, propertyId, 'llm-platforms', startDate, endDate);
    if (cached) {
      console.log('✅ Returning cached llm-platforms data');
      return res.json({ success: true, data: cached });
    }

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pageReferrer' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pageReferrer',
          stringFilter: {
            matchType: 'PARTIAL_REGEXP',
            value: '(chatgpt|claude|gemini|perplexity|copilot|bard|openai|anthropic|xai|grok|poe|character\\.ai)',
            caseSensitive: false
          }
        }
      },
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: 'conversions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000
    };

    const currentData = await runReport(accessToken, propertyId, reportConfig);
    
    // Calculate comparison date range
    const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(startDate, endDate);
    
    // Fetch comparison period data
    const comparisonConfig = {
      ...reportConfig,
      dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
    };
    
    const comparisonData = await runReport(accessToken, propertyId, comparisonConfig);
    
    // Transform with comparison
    const platforms = transformToLLMPlatforms(currentData, comparisonData);

    // Cache the result
    await setCachedData(userId, propertyId, 'llm-platforms', startDate, endDate, platforms);

    console.log('✅ LLM platforms response:', {
      platformsCount: platforms.platforms?.length || 0,
      performanceDataCount: platforms.performanceData?.length || 0,
      totalLLMSessions: platforms.summary?.totalLLMSessions || 0
    });

    res.json({
      success: true,
      data: platforms
    });
  } catch (error) {
    console.error('Error fetching LLM platforms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LLM platforms data'
    });
  }
});

/**
 * GET /api/ga4/llm-platform-trends
 * Fetch LLM platform trend data
 */
router.get('/llm-platform-trends', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;

    console.log('📈 [llm-platform-trends] Fetching data:', { propertyId, startDate, endDate });

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }],
      keepEmptyRows: false,
      limit: 10000
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    console.log('📈 [llm-platform-trends] GA4 API success:', { rowCount: data.rows?.length || 0 });

    // Transform data similar to traffic-analytics
    const transformed = transformTrendData(data);

    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    console.error('Error fetching LLM platform trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LLM platform trends'
    });
  }
});

/**
 * GET /api/ga4/platform-split
 * Fetch platform split data
 */
router.get('/platform-split', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;
    const userId = req.session.userId;

    // Check cache first
    const cached = await getCachedData(userId, propertyId, 'platform-split', startDate, endDate);
    if (cached) {
      console.log('✅ Returning cached platform-split data');
      return res.json({ success: true, data: cached });
    }

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'pageReferrer' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: 'conversions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000
    };

    const currentData = await runReport(accessToken, propertyId, reportConfig);
    
    // Calculate comparison date range
    const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(startDate, endDate);
    
    // Fetch comparison period data
    const comparisonConfig = {
      ...reportConfig,
      dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
    };
    
    const comparisonData = await runReport(accessToken, propertyId, comparisonConfig);
    
    // Transform with comparison
    const transformed = transformToPlatformSplit(currentData, comparisonData);

    // Cache the result
    await setCachedData(userId, propertyId, 'platform-split', startDate, endDate, transformed);

    console.log('✅ Platform split response:', {
      platformSplitCount: transformed.platformSplit?.length || 0,
      rankingsCount: transformed.rankings?.length || 0,
      performanceDataCount: transformed.performanceData?.length || 0,
      totalSessions: transformed.totalSessions
    });

    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    console.error('Error fetching platform split:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform split data'
    });
  }
});

/**
 * GET /api/ga4/geo
 * Fetch geographic data
 */
router.get('/geo', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' }
      ]
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    const geoData = transformGeoData(data);

    res.json({
      success: true,
      data: geoData
    });
  } catch (error) {
    console.error('Error fetching geo data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch geographic data'
    });
  }
});

/**
 * GET /api/ga4/devices
 * Fetch device data
 */
router.get('/devices', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'deviceCategory' },
        { name: 'operatingSystem' },
        { name: 'browser' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' }
      ]
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    const deviceData = transformDeviceData(data);

    res.json({
      success: true,
      data: deviceData
    });
  } catch (error) {
    console.error('Error fetching device data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device data'
    });
  }
});

/**
 * GET /api/ga4/pages
 * Fetch pages data
 */
router.get('/pages', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today', limit = 10 } = req.query;

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' }
      ],
      limit: parseInt(limit)
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    const pagesData = transformPagesData(data);

    res.json({
      success: true,
      data: pagesData
    });
  } catch (error) {
    console.error('Error fetching pages data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pages data'
    });
  }
});

/**
 * GET /api/ga4/conversion-events
 * Fetch conversion events data
 */
router.get('/conversion-events', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }]
    };

    const data = await runReport(accessToken, propertyId, reportConfig);

    res.json({
      success: true,
      data: data.rows || []
    });
  } catch (error) {
    console.error('Error fetching conversion events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion events'
    });
  }
});

/**
 * POST /api/ga4/clear-cache
 * Clear GA4 data cache for user
 */
router.post('/clear-cache', ga4SessionMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId;
    await GA4DataSnapshot.deleteMany({ userId });
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

module.exports = router;


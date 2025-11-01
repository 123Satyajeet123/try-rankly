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

    // Fetch account summaries to get names and property default URI
    const accountsData = await fetchAccountSummaries(accessToken);
    
    // Fetch property details to get default URI
    let propertyDefaultUri = null;
    try {
      const axios = require('axios');
      const propertyResponse = await axios.get(
        `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      propertyDefaultUri = propertyResponse.data?.defaultUri || null;
      console.log('🔍 [save-property] Property default URI:', propertyDefaultUri);
    } catch (uriError) {
      console.warn('⚠️ [save-property] Could not fetch property default URI:', uriError.message);
    }

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

    // Update GA connection with default URI
    const updatedConnection = await GAConnection.findOneAndUpdate(
      { userId, deleted: { $ne: true } },
      {
        accountId,
        propertyId,
        accountName,
        propertyName,
        defaultUri: propertyDefaultUri, // Store the default URI
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
    const { startDate = '7daysAgo', endDate = 'today', conversionEvent = 'conversions' } = req.query;
    const userId = req.session.userId;

    // Cache disabled for agent analytics - always fetch fresh data
    console.log('🔄 [llm-platforms] Fetching fresh data (cache disabled)');

    // Convert conversion event to valid GA4 metric name
    const conversionMetric = getConversionEventMetric(conversionEvent);
    console.log('🎯 [llm-platforms] Using conversion event:', { conversionEvent, conversionMetric });

    // Use same dimensions as platform-split to catch all LLM traffic
    // Query all traffic, then detect LLMs from source/medium/referrer (not just referrer)
    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'pageReferrer' }],
      // Remove dimension filter - we'll detect LLMs in the transformer
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: conversionMetric }, // Dynamic conversion metric
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000
    };

    let currentData;
    try {
      currentData = await runReport(accessToken, propertyId, reportConfig);
    } catch (apiError) {
      console.error('❌ [llm-platforms] GA4 API call failed:', {
        error: apiError.message,
        conversionMetric,
        reportConfig: {
          metrics: reportConfig.metrics.map(m => m.name),
          dimensions: reportConfig.dimensions.map(d => d.name)
        }
      });
      throw apiError;
    }
    
    // Log conversion data from sample rows to debug zero conversions
    const sampleRowsWithConversions = (currentData.rows || []).slice(0, 5).map(row => {
      const allMetrics = row.metricValues?.map((m, idx) => ({
        index: idx,
        value: m?.value || '0',
        name: reportConfig.metrics[idx]?.name || 'unknown'
      })) || [];
      return {
        dimensions: row.dimensionValues?.map(d => d.value) || [],
        allMetrics: allMetrics,
        conversionMetricValue: allMetrics.find(m => m.name === conversionMetric)?.value || '0'
      };
    });
    
    // Find the index of the conversion metric in the metrics array
    const conversionMetricIndex = reportConfig.metrics.findIndex(m => m.name === conversionMetric);
    console.log('🔍 [llm-platforms] Conversion metric lookup:', {
      conversionMetric,
      conversionMetricIndex,
      metricsArray: reportConfig.metrics.map((m, idx) => ({ index: idx, name: m.name })),
      metricFound: conversionMetricIndex !== -1
    });
    
    // Calculate total conversions from all rows using the correct index
    const totalConversionsInResponse = conversionMetricIndex !== -1 
      ? (currentData.rows || []).reduce((sum, row) => {
          return sum + parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0');
        }, 0)
      : 0;
    
    // Find all rows with conversions to see where they came from
    const rowsWithConversions = conversionMetricIndex !== -1
      ? (currentData.rows || [])
          .filter(row => parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0') > 0)
          .map(row => ({
            source: row.dimensionValues?.[0]?.value || '',
            medium: row.dimensionValues?.[1]?.value || '',
            referrer: row.dimensionValues?.[2]?.value?.substring(0, 80) || '',
            sessions: row.metricValues?.[0]?.value || '0',
            conversions: row.metricValues?.[conversionMetricIndex]?.value || '0',
            conversionMetricIndex: conversionMetricIndex
          }))
      : [];
    
    // Check if any conversions are from LLM platforms
    const LLM_PATTERNS = {
      'ChatGPT': /chatgpt|openai/i,
      'Claude': /claude|anthropic/i,
      'Gemini': /gemini|bard/i,
      'Perplexity': /perplexity/i,
      'Poe': /poe/i
    };
    
    const llmRowsWithConversions = rowsWithConversions.filter(row => {
      const referrer = row.referrer.toLowerCase();
      const source = row.source.toLowerCase();
      for (const [platform, pattern] of Object.entries(LLM_PATTERNS)) {
        if (pattern.test(referrer) || pattern.test(source)) {
          return true;
        }
      }
      return false;
    });
    
    // Log detailed metric information
    const firstRowMetrics = currentData.rows?.[0]?.metricValues?.map((m, idx) => ({
      index: idx,
      value: m?.value || '0',
      metricName: reportConfig.metrics[idx]?.name || 'unknown'
    })) || [];
    
    // Check if GA4 returned column headers (metadata about metrics)
    const metricHeaders = currentData.metricHeaders?.map((h, idx) => ({
      index: idx,
      name: h.name,
      type: h.type,
      expectedName: reportConfig.metrics[idx]?.name
    })) || [];
    
    console.log('📊 [llm-platforms] Current data fetched:', {
      rowCount: currentData.rows?.length || 0,
      startDate,
      endDate,
      conversionEvent,
      conversionMetric,
      conversionMetricIndex,
      totalConversionsInResponse,
      rowsWithConversionsCount: rowsWithConversions.length,
      llmRowsWithConversionsCount: llmRowsWithConversions.length,
      rowsWithConversions: rowsWithConversions.slice(0, 3), // Limit to 3 for readability
      llmRowsWithConversions: llmRowsWithConversions,
      sampleRowsWithConversions: sampleRowsWithConversions.slice(0, 2), // Limit to 2 for readability
      metricNames: reportConfig.metrics.map(m => m.name),
      metricHeaders: metricHeaders,
      firstRowMetricBreakdown: firstRowMetrics,
      hasAPIWarnings: !!(currentData.warningMessages && currentData.warningMessages.length > 0),
      apiWarnings: currentData.warningMessages || []
    });
    
    // Calculate comparison date range
    const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(startDate, endDate);
    
    // Calculate period length for logging
    let periodLength = 0;
    try {
      const end = endDate === 'today' ? new Date() : new Date(endDate);
      const start = startDate.includes('daysAgo') 
        ? new Date(Date.now() - parseInt(startDate) * 24 * 60 * 60 * 1000)
        : new Date(startDate);
      periodLength = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    } catch (e) {
      console.warn('Could not calculate period length:', e);
    }
    
    console.log('📊 [llm-platforms] Comparison dates calculated:', {
      comparisonStartDate,
      comparisonEndDate,
      currentStartDate: startDate,
      currentEndDate: endDate,
      periodLengthDays: periodLength,
      comparisonPeriod: `${comparisonStartDate} to ${comparisonEndDate}`,
      currentPeriod: `${startDate} to ${endDate}`
    });
    
    // Fetch comparison period data
    const comparisonConfig = {
      ...reportConfig,
      dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
    };
    
    const comparisonData = await runReport(accessToken, propertyId, comparisonConfig);
    console.log('📊 [llm-platforms] Comparison data fetched:', {
      rowCount: comparisonData.rows?.length || 0,
      hasData: (comparisonData.rows?.length || 0) > 0,
      comparisonStartDate,
      comparisonEndDate,
      sampleRows: comparisonData.rows?.slice(0, 5) || []
    });
    
    // Check if GA4 API returned any errors or warnings
    if (currentData.error) {
      console.error('❌ [llm-platforms] GA4 API error:', currentData.error);
    }
    if (currentData.warningMessages && currentData.warningMessages.length > 0) {
      console.warn('⚠️ [llm-platforms] GA4 API warnings:', currentData.warningMessages);
    }
    
    // Transform with comparison
    const platforms = transformToLLMPlatforms(currentData, comparisonData);

    // Cache disabled - don't save to cache
    // await setCachedData(userId, propertyId, 'llm-platforms', startDate, endDate, platforms);

    console.log('✅ [llm-platforms] LLM platforms response:', {
      platformsCount: platforms.platforms?.length || 0,
      performanceDataCount: platforms.performanceData?.length || 0,
      totalLLMSessions: platforms.summary?.totalLLMSessions || 0,
      samplePlatform: platforms.platforms?.[0] || null,
      hasComparisonData: (comparisonData.rows?.length || 0) > 0
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
    const { startDate = '7daysAgo', endDate = 'today', conversionEvent = 'conversions' } = req.query;
    const userId = req.session.userId;

    // Cache disabled for agent analytics - always fetch fresh data
    console.log('🔄 [platform-split] Fetching fresh data (cache disabled)');

    // Convert conversion event to valid GA4 metric name
    const conversionMetric = getConversionEventMetric(conversionEvent);
    console.log('🎯 [platform-split] Using conversion event:', { conversionEvent, conversionMetric });

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'pageReferrer' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: conversionMetric }, // Dynamic conversion metric
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000
    };

    let currentData;
    try {
      currentData = await runReport(accessToken, propertyId, reportConfig);
    } catch (apiError) {
      console.error('❌ [platform-split] GA4 API call failed:', {
        error: apiError.message,
        conversionMetric,
        reportConfig: {
          metrics: reportConfig.metrics.map(m => m.name),
          dimensions: reportConfig.dimensions.map(d => d.name)
        }
      });
      throw apiError;
    }
    
    // Check if GA4 API returned any errors or warnings
    if (currentData.error) {
      console.error('❌ [platform-split] GA4 API error:', currentData.error);
    }
    if (currentData.warningMessages && currentData.warningMessages.length > 0) {
      console.warn('⚠️ [platform-split] GA4 API warnings:', currentData.warningMessages);
    }
    
    // Log conversion data from sample rows
    const conversionMetricIndex = reportConfig.metrics.findIndex(m => m.name === conversionMetric);
    const totalConversionsInResponse = conversionMetricIndex !== -1 
      ? (currentData.rows || []).reduce((sum, row) => {
          return sum + parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0');
        }, 0)
      : 0;
    
    const rowsWithConversions = conversionMetricIndex !== -1
      ? (currentData.rows || [])
          .filter(row => parseFloat(row.metricValues?.[conversionMetricIndex]?.value || '0') > 0)
          .slice(0, 5)
          .map(row => ({
            source: row.dimensionValues?.[0]?.value || '',
            medium: row.dimensionValues?.[1]?.value || '',
            sessions: row.metricValues?.[0]?.value || '0',
            conversions: row.metricValues?.[conversionMetricIndex]?.value || '0'
          }))
      : [];
    
    const metricHeaders = currentData.metricHeaders?.map((h, idx) => ({
      index: idx,
      name: h.name,
      type: h.type,
      expectedName: reportConfig.metrics[idx]?.name
    })) || [];
    
    console.log('📊 [platform-split] Current data fetched:', {
      rowCount: currentData.rows?.length || 0,
      startDate,
      endDate,
      conversionEvent,
      conversionMetric,
      conversionMetricIndex,
      totalConversionsInResponse,
      rowsWithConversionsCount: rowsWithConversions.length,
      sampleRowsWithConversions: rowsWithConversions,
      metricHeaders: metricHeaders
    });
    
    // Calculate comparison date range
    const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(startDate, endDate);
    console.log('📊 [platform-split] Comparison dates calculated:', {
      comparisonStartDate,
      comparisonEndDate,
      currentStartDate: startDate,
      currentEndDate: endDate
    });
    
    // Fetch comparison period data
    const comparisonConfig = {
      ...reportConfig,
      dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
    };
    
    const comparisonData = await runReport(accessToken, propertyId, comparisonConfig);
    console.log('📊 [platform-split] Comparison data fetched:', {
      rowCount: comparisonData.rows?.length || 0,
      hasData: (comparisonData.rows?.length || 0) > 0,
      comparisonStartDate,
      comparisonEndDate
    });
    
    // Transform with comparison
    const transformed = transformToPlatformSplit(currentData, comparisonData);
    console.log('📊 [platform-split] Transformation complete:', {
      platformCount: transformed.rankings?.length || 0,
      sampleRanking: transformed.rankings?.[0] || null,
      hasComparisonData: comparisonData.rows?.length > 0
    });

    // Validate LLM sessions match llm-platforms endpoint
    // Fetch LLM platforms data for validation
    try {
      const llmPlatformsConfig = {
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
        metrics: [{ name: 'sessions' }],
        keepEmptyRows: false,
        limit: 10000
      };
      
      const llmValidationData = await runReport(accessToken, propertyId, llmPlatformsConfig);
      const llmPlatformsSessions = (llmValidationData.rows || []).reduce((sum, row) => {
        return sum + parseFloat(row.metricValues?.[0]?.value || '0');
      }, 0);
      
      const platformSplitLLMSessions = transformed.summary?.llmBreakdown?.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0;
      
      console.log('🔍 LLM Sessions Validation:', {
        llmPlatformsTotal: llmPlatformsSessions,
        platformSplitLLMTotal: platformSplitLLMSessions,
        difference: llmPlatformsSessions - platformSplitLLMSessions,
        match: Math.abs(llmPlatformsSessions - platformSplitLLMSessions) < 1
      });
      
      // If there's a mismatch, log detailed breakdown
      if (Math.abs(llmPlatformsSessions - platformSplitLLMSessions) > 1) {
        console.warn('⚠️ LLM sessions mismatch detected:', {
          llmPlatformsEndpoint: llmPlatformsSessions,
          platformSplitEndpoint: platformSplitLLMSessions,
          difference: llmPlatformsSessions - platformSplitLLMSessions,
          llmBreakdown: transformed.summary?.llmBreakdown
        });
      }
    } catch (validationError) {
      console.warn('Could not validate LLM sessions:', validationError.message);
    }

    // Cache disabled - don't save to cache
    // await setCachedData(userId, propertyId, 'platform-split', startDate, endDate, transformed);

    console.log('✅ Platform split response:', {
      platformSplitCount: transformed.platformSplit?.length || 0,
      rankingsCount: transformed.rankings?.length || 0,
      performanceDataCount: transformed.performanceData?.length || 0,
      totalSessions: transformed.totalSessions,
      llmSessions: transformed.summary?.llmBreakdown?.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0
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
 * Fetch geographic data (LLM traffic only)
 */
router.get('/geo', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;

    // Main geo report - filter for LLM traffic only
    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
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
        { name: 'conversions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 100,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    };

    const data = await runReport(accessToken, propertyId, reportConfig);
    const geoData = transformGeoData(data);

    // Also fetch platform breakdown for header display
    const platformConfig = {
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
      metrics: [{ name: 'sessions' }],
      keepEmptyRows: false,
      limit: 10
    };

    let platformBreakdown = [];
    try {
      const platformData = await runReport(accessToken, propertyId, platformConfig);
      const platformMap = new Map();
      
      for (const row of platformData.rows || []) {
        const pageReferrer = row.dimensionValues?.[0]?.value || '';
        const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
        
        // Detect platform
        let platform = 'other';
        let favicon = '';
        
        if (pageReferrer.includes('chatgpt') || pageReferrer.includes('openai')) {
          platform = 'ChatGPT';
          favicon = 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32';
        } else if (pageReferrer.includes('claude') || pageReferrer.includes('anthropic')) {
          platform = 'Claude';
          favicon = 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32';
        } else if (pageReferrer.includes('gemini') || pageReferrer.includes('bard')) {
          platform = 'Gemini';
          favicon = 'https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030456e93de685481c559f160ea06b.png';
        } else if (pageReferrer.includes('perplexity')) {
          platform = 'Perplexity';
          favicon = 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32';
        } else if (pageReferrer.includes('copilot')) {
          platform = 'Copilot';
          favicon = 'https://www.bing.com/sa/simg/favicon-trans-bg-blue-mg.ico';
        }
        
        if (platform !== 'other' && sessions > 0) {
          const existing = platformMap.get(platform);
          if (existing) {
            existing.sessions += Math.round(sessions);
          } else {
            platformMap.set(platform, {
              name: platform,
              favicon,
              sessions: Math.round(sessions)
            });
          }
        }
      }
      
      platformBreakdown = Array.from(platformMap.values()).sort((a, b) => b.sessions - a.sessions);
    } catch (platformError) {
      console.warn('Could not fetch platform breakdown:', platformError.message);
    }

    // Combine geo data with platform breakdown
    const finalData = {
      ...geoData,
      platformBreakdown
    };

    res.json({
      success: true,
      data: finalData
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
 * Fetch device data (LLM traffic only)
 */
router.get('/devices', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;
    const { startDate = '7daysAgo', endDate = 'today', conversionEvent = 'conversions' } = req.query;

    // Helper function to convert conversion event name to valid GA4 metric name
    function getConversionEventMetric(conversionEvent) {
      if (conversionEvent === 'conversions') {
        return 'conversions';
      }
      if (conversionEvent.startsWith('keyEvents:')) {
        return conversionEvent;
      }
      return `keyEvents:${conversionEvent}`;
    }

    const conversionMetric = getConversionEventMetric(conversionEvent);

    const reportConfig = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'deviceCategory' },
        { name: 'operatingSystem' },
        { name: 'browser' }
      ],
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
        { name: conversionMetric },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10000
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
 * Helper function to convert conversion event name to valid GA4 metric name
 * GA4 only accepts:
 * - 'conversions' (built-in metric)
 * - 'keyEvents:eventName' (for custom conversion events)
 * 
 * Note: GA4 uses singular forms for events (e.g., 'purchase' not 'purchases')
 */
function getConversionEventMetric(conversionEvent) {
  // 'conversions' is the only valid built-in metric
  if (conversionEvent === 'conversions') {
    return 'conversions';
  }
  
  // If already prefixed with keyEvents:, use as-is
  if (conversionEvent.startsWith('keyEvents:')) {
    return conversionEvent;
  }
  
  // Map plural event names to singular (GA4 uses singular)
  const singularMap = {
    'purchases': 'purchase',
    'addToCarts': 'add_to_cart',
    'beginCheckouts': 'begin_checkout',
    'viewItems': 'view_item',
    'searches': 'search',
    'logins': 'login',
    'signUps': 'sign_up',
    'generateLeads': 'generate_lead'
  };
  
  // Convert to singular if needed
  const eventName = singularMap[conversionEvent] || conversionEvent;
  
  // For all other events (standard or custom), prefix with keyEvents:
  return `keyEvents:${eventName}`;
}

/**
 * GET /api/ga4/pages
 * Fetch pages data with LLM platform breakdown
 */
router.get('/pages', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  let reportConfig; // Declare outside try block for error handler access
  let conversionEvent; // Declare outside try block for error handler access
  let conversionMetric; // Declare outside try block for error handler access
  let propertyId; // Declare outside try block for error handler access
  let accessToken; // Declare outside try block for error handler access
  
  try {
    ({ propertyId, accessToken } = req.ga4Connection);
    ({ startDate = '7daysAgo', endDate = 'today', limit = 10, dateRange, conversionEvent = 'conversions' } = req.query);
    const userId = req.session.userId;

    // Handle dateRange string format (e.g., "7 days", "30 days")
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    
    if (dateRange && typeof dateRange === 'string') {
      const days = parseInt(dateRange.split(' ')[0]);
      if (!isNaN(days)) {
        finalStartDate = `${days}daysAgo`;
        finalEndDate = 'yesterday'; // Use yesterday to avoid incomplete data
      }
    }

    // Convert conversion event to valid GA4 metric name
    conversionMetric = getConversionEventMetric(conversionEvent);

    // Cache disabled for agent analytics - always fetch fresh data
    console.log('🔄 [pages] Fetching fresh data (cache disabled) for conversion metric:', conversionMetric);

    reportConfig = {
      dateRanges: [{ startDate: finalStartDate, endDate: finalEndDate }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'pageReferrer' } // Add pageReferrer for accurate LLM detection (matches Platform Tab)
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'sessionSource',
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
        { name: conversionMetric }, // Use the converted metric name
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: parseInt(limit) || 10000
    };

    console.log('📄 [pages] Calling GA4 API with config:', {
      propertyId,
      startDate: finalStartDate,
      endDate: finalEndDate,
      conversionEvent,
      conversionMetric, // Log the converted metric
      dimensions: reportConfig.dimensions.map(d => d.name),
      metrics: reportConfig.metrics.map(m => m.name)
    });

    const data = await runReport(accessToken, propertyId, reportConfig);
    
    // Get default URI from connection, or fetch it if missing
    let defaultUri = req.ga4Connection.defaultUri || null;
    
    // If defaultUri is missing, try to fetch it from GA4 Admin API
    if (!defaultUri) {
      try {
        const axios = require('axios');
        const propertyResponse = await axios.get(
          `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        defaultUri = propertyResponse.data?.defaultUri || null;
        
        // Update the connection with the defaultUri for future use
        if (defaultUri) {
          await GAConnection.findOneAndUpdate(
            { userId: req.session.userId, deleted: { $ne: true } },
            { defaultUri },
            { new: true }
          );
          console.log('✅ [pages] Fetched and saved defaultUri:', defaultUri);
        } else {
          // If defaultUri is not available, try to get it from web streams
          try {
            const streamsResponse = await axios.get(
              `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );
            const streams = streamsResponse.data?.dataStreams || [];
            if (streams.length > 0 && streams[0].webStreamData?.defaultUri) {
              defaultUri = streams[0].webStreamData.defaultUri;
              await GAConnection.findOneAndUpdate(
                { userId: req.session.userId, deleted: { $ne: true } },
                { defaultUri },
                { new: true }
              );
              console.log('✅ [pages] Fetched defaultUri from web stream:', defaultUri);
            }
          } catch (streamError) {
            console.warn('⚠️ [pages] Could not fetch from web streams:', streamError.message);
          }
        }
      } catch (uriError) {
        console.warn('⚠️ [pages] Could not fetch property default URI:', uriError.message);
        // Try to extract domain from propertyName as fallback
        if (req.ga4Connection.propertyName) {
          // Property name might contain domain info, try to extract
          const domainMatch = req.ga4Connection.propertyName.match(/(https?:\/\/[^\s]+)/i);
          if (domainMatch) {
            defaultUri = domainMatch[1].replace(/\/$/, ''); // Remove trailing slash
            console.log('✅ [pages] Extracted defaultUri from propertyName:', defaultUri);
          }
        }
      }
    }
    
    // Debug: Log GA4 response structure for conversion metric
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0];
      console.log('🔍 [pages] GA4 API response sample:', {
        conversionMetric,
        totalRows: data.rows.length,
        defaultUri,
        metricNames: data.metricHeaders?.map(h => h.name) || [],
        firstRowMetrics: firstRow.metricValues?.map((m, i) => ({
          index: i,
          name: data.metricHeaders?.[i]?.name || 'unknown',
          value: m.value
        })) || []
      });
    }
    
    const pagesData = transformPagesData(data, defaultUri);

    // Fetch Platform Tab's LLM sessions total for consistency
    // Use the EXACT same logic as Platform Tab endpoint: same date range, same comparison data
    let platformLLMSessions = null;
    try {
      // Convert to same format as Platform Tab endpoint expects
      // Platform Tab uses: startDate='7daysAgo', endDate='today' which becomes '2025-10-25' to '2025-11-01'
      // For consistency, we need to match the Platform Tab's date format
      let platformStartDate = startDate;
      let platformEndDate = endDate;
      
      // Convert dateRange string to startDate/endDate if needed (matching Platform Tab logic)
      if (dateRange && typeof dateRange === 'string') {
        const days = parseInt(dateRange.split(' ')[0]);
        if (!isNaN(days)) {
          platformStartDate = `${days}daysAgo`;
          platformEndDate = 'today'; // Platform Tab uses 'today', not 'yesterday'
        }
      }
      
      const platformSplitConfig = {
        dateRanges: [{ startDate: platformStartDate, endDate: platformEndDate }],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'pageReferrer' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'engagementRate' },
          { name: conversionMetric },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'screenPageViewsPerSession' },
          { name: 'newUsers' },
          { name: 'totalUsers' }
        ],
        keepEmptyRows: false,
        limit: 10000
      };

      const platformSplitData = await runReport(accessToken, propertyId, platformSplitConfig);
      
      // Fetch comparison data to match Platform Tab's behavior exactly
      const { comparisonStartDate, comparisonEndDate } = calculateComparisonDates(platformStartDate, platformEndDate);
      const comparisonConfig = {
        ...platformSplitConfig,
        dateRanges: [{ startDate: comparisonStartDate, endDate: comparisonEndDate }]
      };
      const comparisonData = await runReport(accessToken, propertyId, comparisonConfig);
      
      // Use same transform logic as Platform Tab endpoint
      const transformedPlatformSplit = transformToPlatformSplit(platformSplitData, comparisonData);
      
      // Extract LLM sessions total from platform split - use the aggregated 'LLMs' platform
      // This matches exactly what Platform Tab shows as "Total LLM Sessions"
      const llmsPlatform = transformedPlatformSplit.performanceData?.find(p => p.name === 'LLMs');
      const llmBreakdown = transformedPlatformSplit.summary?.llmBreakdown || [];
      
      // Use LLMs platform sessions (aggregated total) - this is the authoritative source
      platformLLMSessions = llmsPlatform?.sessions || 
        llmBreakdown.reduce((sum, p) => sum + (p.sessions || 0), 0) || 0;

      console.log('✅ [pages] Fetched Platform Tab LLM sessions:', {
        total: platformLLMSessions,
        fromLLMsPlatform: llmsPlatform?.sessions || 0,
        llmBreakdownSum: llmBreakdown.reduce((s, p) => s + (p.sessions || 0), 0),
        breakdown: llmBreakdown.map(p => ({ platform: p.platform || p.name, sessions: p.sessions })),
        dateRange: `${platformStartDate} to ${platformEndDate}`,
        comparisonRange: `${comparisonStartDate} to ${comparisonEndDate}`
      });
    } catch (platformError) {
      console.warn('⚠️ [pages] Could not fetch Platform Tab LLM sessions, using calculated total:', platformError.message);
      // Fall back to calculated total if Platform Tab fetch fails
      platformLLMSessions = pagesData.summary?.totalSessions || 0;
    }

    // Use Platform Tab's LLM sessions total for consistency
    if (platformLLMSessions !== null && platformLLMSessions > 0) {
      // Recalculate avgSQS using Platform Tab's total sessions for consistency
      const totalPageSessions = pagesData.pages.reduce((sum, page) => sum + (page.sessions || 0), 0);
      const weightedSQS = pagesData.pages.reduce((sum, page) => sum + (parseFloat(page.sqs || 0) * (page.sessions || 0)), 0);
      const avgSQS = platformLLMSessions > 0 ? (weightedSQS / platformLLMSessions) : pagesData.summary.avgSQS;
      
      pagesData.summary.totalSessions = platformLLMSessions;
      pagesData.summary.avgSQS = avgSQS;
      
      console.log('✅ [pages] Updated summary with Platform Tab values:', {
        totalSessions: platformLLMSessions,
        avgSQS: avgSQS.toFixed(2),
        weightedSQS: weightedSQS.toFixed(2),
        totalPageSessions: totalPageSessions
      });
    }

    // Cache disabled - don't save to cache
    // await setCachedData(userId, propertyId, cacheKey, finalStartDate, finalEndDate, pagesData);

    console.log('✅ Pages response:', {
      pagesCount: pagesData.pages?.length || 0,
      totalSessions: pagesData.summary?.totalSessions || 0,
      platformLLMSessions: platformLLMSessions,
      conversionMetric
    });

    res.json({
      success: true,
      data: pagesData
    });
  } catch (error) {
    console.error('Error fetching pages data:', error);
    
    // Extract error message from axios error
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errorCode = error.response?.data?.error?.code || error.response?.status;
    
    console.error('📄 [pages] Error details:', {
      errorMessage,
      errorCode,
      conversionEvent,
      conversionMetric
    });
    
    // If error is about invalid metric, try falling back to conversions
    if (errorMessage.includes('not a valid metric') || errorCode === 400) {
      console.warn(`⚠️ [pages] Conversion event "${conversionEvent}" (metric: "${conversionMetric}") is not valid, falling back to "conversions"`);
      
      // If it's not already conversions, retry with conversions
      if (conversionEvent !== 'conversions') {
        try {
          const fallbackMetric = 'conversions';
          const fallbackConfig = {
            ...reportConfig,
            metrics: reportConfig.metrics.map(m => m.name === conversionMetric ? { name: fallbackMetric } : m)
          };
          
          console.log('🔄 [pages] Retrying with fallback metric "conversions"');
          const fallbackData = await runReport(accessToken, propertyId, fallbackConfig);
          const fallbackPagesData = transformPagesData(fallbackData);
          
          // Cache disabled - don't save to cache
          // const fallbackCacheKey = `pages-conversions`;
          // await setCachedData(userId, propertyId, fallbackCacheKey, finalStartDate, finalEndDate, fallbackPagesData);
          
          return res.json({
            success: true,
            data: fallbackPagesData,
            warning: `Conversion event "${conversionEvent}" is not available in GA4. Showing "conversions" instead.`
          });
        } catch (fallbackError) {
          console.error('❌ [pages] Error with fallback conversion metric:', fallbackError);
        }
      }
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * GET /api/ga4/conversion-events
 * Fetch conversion events data from GA4 Admin API
 */
router.get('/conversion-events', ga4SessionMiddleware, ga4ConnectionMiddleware, async (req, res) => {
  try {
    const { propertyId, accessToken } = req.ga4Connection;

    console.log('🎯 [conversion-events] Fetching conversion events for property:', propertyId);

    // Fetch conversion events from GA4 Admin API
    const adminApiUrl = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/conversionEvents`;
    
    const response = await fetch(adminApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 [conversion-events] GA4 Admin API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [conversion-events] GA4 Admin API error:', errorText);
      // Don't fail completely, return standard events
    }

    const data = await response.ok ? await response.json() : { conversionEvents: [] };

    console.log('🔍 [conversion-events] Raw GA4 API response:', JSON.stringify(data, null, 2));
    console.log('🔍 [conversion-events] Number of conversion events:', data.conversionEvents?.length || 0);

    // Always include 'conversions' as the default built-in metric
    const allEvents = [
      { name: 'conversions', displayName: 'Conversions', category: 'Standard', isBuiltIn: true }
    ];

    // Add all conversion events from GA4 Admin API
    // These are the actual events marked as conversions in GA4
    if (data.conversionEvents && Array.isArray(data.conversionEvents)) {
      for (const event of data.conversionEvents) {
        // event.eventName is the actual event name (e.g., 'purchase', 'view_item')
        // Use it directly with keyEvents: prefix
        const eventName = event.eventName;
        const displayName = event.displayName || event.eventName;
        
        allEvents.push({
          name: `keyEvents:${eventName}`, // Use the actual event name from GA4
          displayName: displayName,
          category: event.eventName.includes('_') ? 'Standard' : 'Custom',
          isCustom: !event.eventName.includes('_'), // Standard events usually have underscores
          originalEventName: eventName // Store original for reference
        });
      }
    }

    console.log('📋 [conversion-events] Processed events:', allEvents.map(e => ({
      name: e.name,
      displayName: e.displayName,
      originalEventName: e.originalEventName
    })));

    console.log('✅ [conversion-events] Final events:', { 
      totalEvents: allEvents.length,
      builtInEvents: allEvents.filter(e => e.isBuiltIn).length,
      customEvents: allEvents.filter(e => e.isCustom).length
    });

    res.json({
      success: true,
      data: {
        events: allEvents,
        totalEvents: allEvents.length
      }
    });
  } catch (error) {
    console.error('❌ [conversion-events] Error:', error);
    // Return just conversions even on error
    res.json({
      success: true,
      data: {
        events: [
          { name: 'conversions', displayName: 'Conversions', category: 'Standard', isBuiltIn: true }
        ],
        totalEvents: 1
      }
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
    const { dataType } = req.body; // Optional: clear specific data type
    
    const filter = { userId };
    if (dataType) {
      filter.dataType = dataType;
    }
    
    const result = await GA4DataSnapshot.deleteMany(filter);
    console.log(`🗑️ [clear-cache] Cleared ${result.deletedCount} cache entries for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: `Cache cleared (${result.deletedCount} entries)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/ga4/test-pages
 * Test endpoint to fetch fresh pages data with debug info (dev auth)
 */
router.get('/test-pages', async (req, res) => {
  try {
    // Use hardcoded dev values
    const propertyId = '417960995';
    const accessToken = process.env.GA4_TEST_TOKEN || ''; // Use environment variable for test token
    if (!accessToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Test token not configured. Set GA4_TEST_TOKEN in environment.' 
      });
    }
    const { conversionEvent = 'conversions' } = req.query;
    
    console.log('🧪 [test-pages] Testing fresh fetch for conversion event:', conversionEvent);
    
    // Clear cache for this specific conversion event
    const conversionMetric = getConversionEventMetric(conversionEvent);
    const cacheKey = `pages-${conversionMetric}`;
    await GA4DataSnapshot.deleteMany({ 
      userId: '6901f871c7ec53a22d975ef3', 
      propertyId, 
      dataType: cacheKey 
    });
    
    // Fetch fresh data - test both with and without LLM filter
    const { includeAllTraffic } = req.query;
    
    const reportConfig = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      // Only apply LLM filter if not testing all traffic
      ...(includeAllTraffic !== 'true' ? {
        dimensionFilter: {
          filter: {
            fieldName: 'sessionSource',
            stringFilter: {
              matchType: 'PARTIAL_REGEXP',
              value: '(chatgpt|claude|gemini|perplexity|copilot|bard|openai|anthropic|xai|grok|poe|character\\.ai)',
              caseSensitive: false
            }
          }
        }
      } : {}),
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: conversionMetric },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'newUsers' },
        { name: 'totalUsers' }
      ],
      keepEmptyRows: false,
      limit: 10
    };
    
    const data = await runReport(accessToken, propertyId, reportConfig);
    const pagesData = transformPagesData(data);
    
    // Check for any non-zero conversion values
    const conversionIndex = 2; // conversions is always at index 2
    const nonZeroConversions = data.rows?.filter(row => 
      parseFloat(row.metricValues?.[conversionIndex]?.value || '0') > 0
    ) || [];
    
    res.json({
      success: true,
      data: {
        conversionEvent,
        conversionMetric,
        pagesData,
        debug: {
          totalRows: data.rows?.length || 0,
          metricHeaders: data.metricHeaders?.map(h => h.name) || [],
          sampleRow: data.rows?.[0] ? {
            dimensions: data.rows[0].dimensionValues?.map(d => d.value) || [],
            metrics: data.rows[0].metricValues?.map(m => m.value) || []
          } : null,
          nonZeroConversions: nonZeroConversions.length,
          conversionValues: data.rows?.map(row => ({
            page: row.dimensionValues?.[0]?.value,
            conversions: row.metricValues?.[conversionIndex]?.value
          })).slice(0, 5) || []
        }
      }
    });
  } catch (error) {
    console.error('Error in test-pages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


const express = require('express');
const UrlAnalysis = require('../models/UrlAnalysis');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const router = express.Router();

// Development authentication middleware (bypasses JWT)
const devAuth = require('../middleware/devAuth');

/**
 * GET /api/url-analysis/list
 * Get all URL analyses for the authenticated user
 */
router.get('/list', devAuth, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📊 [API] GET /api/url-analysis/list');
    console.log(`👤 User: ${req.userId}`);
    console.log('='.repeat(70));

    const urlAnalyses = await UrlAnalysis.find({ userId: req.userId })
      .sort({ analysisDate: -1 })
      .select('_id url analysisDate brandContext.companyName status')
      .lean();

    console.log(`✅ Found ${urlAnalyses.length} URL analyses`);

    res.json({
      success: true,
      data: urlAnalyses.map(analysis => ({
        id: analysis._id,
        url: analysis.url,
        companyName: analysis.brandContext?.companyName || 'Unknown',
        analysisDate: analysis.analysisDate,
        status: analysis.status
      }))
    });

  } catch (error) {
    console.error('❌ [API ERROR] Get URL analyses failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch URL analyses'
    });
  }
});

/**
 * GET /api/url-analysis/:id
 * Get specific URL analysis details
 */
router.get('/:id', devAuth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('\n' + '='.repeat(70));
    console.log(`📊 [API] GET /api/url-analysis/${id}`);
    console.log(`👤 User: ${req.userId}`);
    console.log('='.repeat(70));

    const urlAnalysis = await UrlAnalysis.findOne({
      _id: id,
      userId: req.userId
    }).lean();

    if (!urlAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'URL analysis not found'
      });
    }

    console.log(`✅ Found URL analysis: ${urlAnalysis.url}`);

    res.json({
      success: true,
      data: urlAnalysis
    });

  } catch (error) {
    console.error('❌ [API ERROR] Get URL analysis failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch URL analysis'
    });
  }
});

/**
 * GET /api/url-analysis/:id/metrics
 * Get metrics for a specific URL analysis
 */
router.get('/:id/metrics', devAuth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('\n' + '='.repeat(70));
    console.log(`📊 [API] GET /api/url-analysis/${id}/metrics`);
    console.log(`👤 User: ${req.userId}`);
    console.log(`🔗 URL Analysis ID: ${id}`);
    console.log('='.repeat(70));

    // Get overall metrics
    let overall = await AggregatedMetrics.findOne({
      userId: req.userId,
      urlAnalysisId: id,
      scope: 'overall'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Get all platform metrics
    let platforms = await AggregatedMetrics.find({
      userId: req.userId,
      urlAnalysisId: id,
      scope: 'platform'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Get all topic metrics (deduplicated by scopeValue)
    let allTopics = await AggregatedMetrics.find({
      userId: req.userId,
      urlAnalysisId: id,
      scope: 'topic'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Deduplicate topic metrics by scopeValue (keep most recent)
    const topicMetricsMap = new Map();
    allTopics.forEach(metric => {
      if (!topicMetricsMap.has(metric.scopeValue) || 
          metric.lastCalculated > topicMetricsMap.get(metric.scopeValue).lastCalculated) {
        topicMetricsMap.set(metric.scopeValue, metric);
      }
    });
    let topics = Array.from(topicMetricsMap.values());

    // Get all persona metrics (deduplicated by scopeValue)
    let allPersonas = await AggregatedMetrics.find({
      userId: req.userId,
      urlAnalysisId: id,
      scope: 'persona'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Deduplicate persona metrics by scopeValue (keep most recent)
    const personaMetricsMap = new Map();
    allPersonas.forEach(metric => {
      if (!personaMetricsMap.has(metric.scopeValue) || 
          metric.lastCalculated > personaMetricsMap.get(metric.scopeValue).lastCalculated) {
        personaMetricsMap.set(metric.scopeValue, metric);
      }
    });
    let personas = Array.from(personaMetricsMap.values());

    console.log(`📊 [METRICS QUERY] With urlAnalysisId=${id}: Overall: ${overall ? 'Yes' : 'No'}, Platforms: ${platforms.length}, Topics: ${topics.length}, Personas: ${personas.length}`);

    // FALLBACK: If no metrics found with urlAnalysisId, try with just userId (legacy data)
    if (!overall && platforms.length === 0 && topics.length === 0 && personas.length === 0) {
      console.log(`⚠️  [FALLBACK] No metrics found with urlAnalysisId, trying userId-only query for legacy data...`);

      overall = await AggregatedMetrics.findOne({
        userId: req.userId,
        urlAnalysisId: null,
        scope: 'overall'
      })
      .sort({ lastCalculated: -1 })
      .lean();

      platforms = await AggregatedMetrics.find({
        userId: req.userId,
        urlAnalysisId: null,
        scope: 'platform'
      })
      .sort({ lastCalculated: -1 })
      .lean();

      // Get fallback topic metrics (deduplicated)
      const fallbackTopics = await AggregatedMetrics.find({
        userId: req.userId,
        urlAnalysisId: null,
        scope: 'topic'
      })
      .sort({ lastCalculated: -1 })
      .lean();

      // Deduplicate fallback topic metrics
      const fallbackTopicMap = new Map();
      fallbackTopics.forEach(metric => {
        if (!fallbackTopicMap.has(metric.scopeValue) || 
            metric.lastCalculated > fallbackTopicMap.get(metric.scopeValue).lastCalculated) {
          fallbackTopicMap.set(metric.scopeValue, metric);
        }
      });
      topics = Array.from(fallbackTopicMap.values());

      // Get fallback persona metrics (deduplicated)
      const fallbackPersonas = await AggregatedMetrics.find({
        userId: req.userId,
        urlAnalysisId: null,
        scope: 'persona'
      })
      .sort({ lastCalculated: -1 })
      .lean();

      // Deduplicate fallback persona metrics
      const fallbackPersonaMap = new Map();
      fallbackPersonas.forEach(metric => {
        if (!fallbackPersonaMap.has(metric.scopeValue) || 
            metric.lastCalculated > fallbackPersonaMap.get(metric.scopeValue).lastCalculated) {
          fallbackPersonaMap.set(metric.scopeValue, metric);
        }
      });
      personas = Array.from(fallbackPersonaMap.values());

      console.log(`📊 [FALLBACK RESULTS] Overall: ${overall ? 'Yes' : 'No'}, Platforms: ${platforms.length}, Topics: ${topics.length}, Personas: ${personas.length}`);
    }

    console.log(`✅ Final metrics count - Overall: ${overall ? 'Yes' : 'No'}, Platforms: ${platforms.length}, Topics: ${topics.length}, Personas: ${personas.length}`);

    // Format for dashboard
    const dashboardData = {
      overall: overall ? formatForDashboard(overall) : null,
      platforms: platforms.map(p => formatForDashboard(p)).filter(p => p !== null),
      topics: topics.map(t => formatForDashboard(t)).filter(t => t !== null),
      personas: personas.map(p => formatForDashboard(p)).filter(p => p !== null),
      lastUpdated: overall?.lastCalculated || null
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ [API ERROR] Get URL metrics failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch URL metrics'
    });
  }
});

/**
 * Helper: Format metrics for dashboard display
 */
function formatForDashboard(metrics) {
  if (!metrics) return null;

  // Check if brandMetrics exists and is an array
  if (!metrics.brandMetrics || !Array.isArray(metrics.brandMetrics) || metrics.brandMetrics.length === 0) {
    console.warn(`⚠️  No brandMetrics found for scope: ${metrics.scope}, scopeValue: ${metrics.scopeValue}`);
    return null;
  }

  // Find user's brand (rank 1 or specific brand)
  const userBrand = metrics.brandMetrics.find(b => b.visibilityRank === 1) || metrics.brandMetrics[0];

  return {
    scope: metrics.scope,
    scopeValue: metrics.scopeValue,
    dateRange: {
      from: metrics.dateFrom,
      to: metrics.dateTo
    },
    summary: {
      totalPrompts: metrics.totalPrompts,
      totalBrands: metrics.totalBrands,
      userBrand: {
        name: userBrand?.brandName,
        visibilityScore: userBrand?.visibilityScore,
        visibilityRank: userBrand?.visibilityRank,
        shareOfVoice: userBrand?.shareOfVoice,
        avgPosition: userBrand?.avgPosition
      }
    },
    brandMetrics: metrics.brandMetrics,
    lastCalculated: metrics.lastCalculated
  };
}

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const metricsAggregation = require('../services/metricsAggregationService');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * POST /api/metrics/calculate
 * Calculate and store aggregated metrics
 */
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📊 [API] POST /api/metrics/calculate');
    console.log(`👤 User: ${req.userId}`);
    console.log('='.repeat(70));

    const { dateFrom, dateTo, forceRefresh } = req.body;

    const results = await metricsAggregation.calculateMetrics(req.userId, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      forceRefresh
    });

    res.json({
      success: true,
      message: `Calculated ${results.totalCalculations} metric sets`,
      data: results
    });

  } catch (error) {
    console.error('❌ [API ERROR] Calculate metrics failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate metrics'
    });
  }
});

/**
 * GET /api/metrics/aggregated
 * Get aggregated metrics by scope (overall, platform, topic, persona)
 */
router.get('/aggregated', authenticateToken, async (req, res) => {
  try {
    const { scope, dateFrom, dateTo, urlAnalysisId } = req.query;

    const query = {
      userId: req.userId
    };

    if (scope) {
      query.scope = scope;
    }

    if (urlAnalysisId) {
      query.urlAnalysisId = urlAnalysisId;
    }

    if (dateFrom || dateTo) {
      query.dateFrom = { $gte: dateFrom ? new Date(dateFrom) : new Date(0) };
      query.dateTo = { $lte: dateTo ? new Date(dateTo) : new Date() };
    }

    const metrics = await AggregatedMetrics.find(query)
      .sort({ lastCalculated: -1 })
      .lean();

    if (!metrics || metrics.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No metrics found. Please run calculations first.'
      });
    }

    // If scope is specified, return single metric or array
    if (scope === 'overall') {
      const overallMetric = metrics.find(m => m.scope === 'overall');
      if (!overallMetric) {
        return res.status(404).json({
          success: false,
          message: 'No overall metrics found. Please run calculations first.'
        });
      }
      return res.json({
        success: true,
        data: overallMetric
      });
    } else {
      // Return array of metrics for the specified scope
      const scopedMetrics = metrics.filter(m => m.scope === scope);
      return res.json({
        success: true,
        data: scopedMetrics
      });
    }

  } catch (error) {
    console.error('❌ [API ERROR] Get aggregated metrics failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/metrics/overall
 * Get overall metrics (all prompts, all platforms)
 */
router.get('/overall', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const query = {
      userId: req.userId,
      scope: 'overall'
    };

    if (dateFrom || dateTo) {
      query.dateFrom = { $gte: dateFrom ? new Date(dateFrom) : new Date(0) };
      query.dateTo = { $lte: dateTo ? new Date(dateTo) : new Date() };
    }

    const metrics = await AggregatedMetrics.findOne(query)
      .sort({ lastCalculated: -1 })
      .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'No metrics found. Please run calculations first.'
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get overall metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/metrics/platform/:platform
 * Get metrics for a specific platform (e.g., chatgpt, claude)
 */
router.get('/platform/:platform', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;

    const metrics = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'platform',
      scopeValue: platform
    })
    .sort({ lastCalculated: -1 })
    .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for platform: ${platform}`
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get platform metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform metrics'
    });
  }
});

/**
 * GET /api/metrics/topic/:topic
 * Get metrics for a specific topic
 */
router.get('/topic/:topic', authenticateToken, async (req, res) => {
  try {
    const { topic } = req.params;

    const metrics = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'topic',
      scopeValue: topic
    })
    .sort({ lastCalculated: -1 })
    .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for topic: ${topic}`
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get topic metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get topic metrics'
    });
  }
});

/**
 * GET /api/metrics/persona/:persona
 * Get metrics for a specific persona
 */
router.get('/persona/:persona', authenticateToken, async (req, res) => {
  try {
    const { persona } = req.params;

    const metrics = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'persona',
      scopeValue: persona
    })
    .sort({ lastCalculated: -1 })
    .lean();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for persona: ${persona}`
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Get persona metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get persona metrics'
    });
  }
});

/**
 * GET /api/metrics/analyses
 * Get list of all analyses (URL analyses) for the user
 */
router.get('/analyses', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all URL analyses for the user
    const UrlAnalysis = require('../models/UrlAnalysis');
    const analyses = await UrlAnalysis.find({ userId })
      .select('url domain createdAt updatedAt status')
      .sort({ createdAt: -1 })
      .lean();

    // For each analysis, get the latest metrics to show summary
    const analysesWithMetrics = await Promise.all(
      analyses.map(async (analysis) => {
        const latestMetrics = await AggregatedMetrics.findOne({
          userId,
          urlAnalysisId: analysis._id,
          scope: 'overall'
        })
        .sort({ lastCalculated: -1 })
        .lean();

        return {
          id: analysis._id,
          url: analysis.url,
          domain: analysis.domain,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt,
          status: analysis.status,
          hasData: !!latestMetrics,
          totalPrompts: latestMetrics?.totalPrompts || 0,
          totalBrands: latestMetrics?.brandMetrics?.length || 0,
          lastCalculated: latestMetrics?.lastCalculated || null
        };
      })
    );

    res.json({
      success: true,
      data: analysesWithMetrics
    });

  } catch (error) {
    console.error('❌ Get analyses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analyses'
    });
  }
});

/**
 * GET /api/metrics/dashboard
 * Get all metrics formatted for dashboard display
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Get user's brand from URL analysis
    const UrlAnalysis = require('../models/UrlAnalysis');
    const urlAnalysis = await UrlAnalysis.findOne({
      userId: req.userId
    })
    .sort({ analysisDate: -1 })
    .lean();

    const userBrandName = urlAnalysis?.brandContext?.companyName?.toLowerCase() || null;

    // Get overall metrics
    const overall = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'overall'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Get all platform metrics
    const platforms = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'platform'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Get all topic metrics
    const topics = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'topic'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Get all persona metrics
    const personas = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'persona'
    })
    .sort({ lastCalculated: -1 })
    .lean();

    // Format for dashboard
    const dashboardData = {
      overall: overall ? formatForDashboard(overall, userBrandName) : null,
      platforms: platforms.map(p => formatForDashboard(p, userBrandName)),
      topics: topics.map(t => formatForDashboard(t, userBrandName)),
      personas: personas.map(p => formatForDashboard(p, userBrandName)),
      lastUpdated: overall?.lastCalculated || null
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Get dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard metrics'
    });
  }
});

/**
 * Helper: Format metrics for dashboard display
 */
function formatForDashboard(metrics, userBrandName = null) {
  if (!metrics) return null;

  // Find user's brand by matching the actual user brand name from URL analysis
  let userBrand;
  if (userBrandName) {
    userBrand = metrics.brandMetrics.find(b => 
      b.brandId === userBrandName || 
      b.brandName.toLowerCase() === userBrandName
    );
  }
  
  // Fallback to highest ranked brand if user brand not found
  if (!userBrand) {
    userBrand = metrics.brandMetrics.find(b => b.visibilityRank === 1) || 
               metrics.brandMetrics[0];
  }

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

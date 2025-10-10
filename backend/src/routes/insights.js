const express = require('express');
const jwt = require('jsonwebtoken');
const PerformanceInsights = require('../models/PerformanceInsights');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const UrlAnalysis = require('../models/UrlAnalysis');
const insightsGenerationService = require('../services/insightsGenerationService');
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

// Generate performance insights
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { urlAnalysisId } = req.body;
    
    console.log(`🧠 Generating insights for user ${req.userId}`);
    
    // Get aggregated metrics
    const aggregatedMetrics = {};
    
    // Overall metrics
    const overall = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'overall',
      ...(urlAnalysisId && { urlAnalysisId })
    }).lean();
    
    if (!overall) {
      return res.status(404).json({
        success: false,
        message: 'No aggregated metrics found. Please run metrics aggregation first.'
      });
    }
    
    aggregatedMetrics.overall = overall;
    
    // Platform metrics
    const platform = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'platform',
      ...(urlAnalysisId && { urlAnalysisId })
    }).lean();
    aggregatedMetrics.platform = platform;
    
    // Topic metrics
    const topic = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'topic',
      ...(urlAnalysisId && { urlAnalysisId })
    }).lean();
    aggregatedMetrics.topic = topic;
    
    // Persona metrics
    const persona = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'persona',
      ...(urlAnalysisId && { urlAnalysisId })
    }).lean();
    aggregatedMetrics.persona = persona;
    
    // Get brand context
    const urlAnalysis = await UrlAnalysis.findById(overall.urlAnalysisId);
    const context = {
      brandName: urlAnalysis?.brandContext?.companyName || 'Your Brand',
      url: urlAnalysis?.url || '',
      userId: req.userId
    };
    
    // Generate insights using AI
    const insightsResult = await insightsGenerationService.generateInsights(
      aggregatedMetrics, 
      context
    );
    
    // Save insights to database
    const performanceInsights = new PerformanceInsights({
      userId: req.userId,
      urlAnalysisId: overall.urlAnalysisId,
      model: insightsResult.metadata.model,
      metricsSnapshot: {
        totalTests: overall.totalResponses,
        dateRange: {
          from: overall.dateFrom,
          to: overall.dateTo
        },
        platforms: platform.map(p => p.scopeValue),
        topics: topic.map(t => t.scopeValue),
        personas: persona.map(p => p.scopeValue)
      },
      insights: insightsResult.insights,
      summary: insightsResult.summary
    });
    
    await performanceInsights.save();
    
    console.log(`✅ Insights generated and saved: ${insightsResult.insights.length} insights`);
    
    res.json({
      success: true,
      message: 'Performance insights generated successfully',
      data: {
        insights: insightsResult.insights,
        summary: insightsResult.summary,
        metadata: {
          ...insightsResult.metadata,
          id: performanceInsights._id,
          generatedAt: performanceInsights.generatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Insights generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Insights generation service temporarily unavailable'
    });
  }
});

// Get latest insights
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const { urlAnalysisId } = req.query;
    
    const query = {
      userId: req.userId,
      ...(urlAnalysisId && { urlAnalysisId })
    };
    
    const insights = await PerformanceInsights.findOne(query)
      .sort({ generatedAt: -1 })
      .lean();
    
    if (!insights) {
      return res.status(404).json({
        success: false,
        message: 'No insights found. Please generate insights first.'
      });
    }
    
    // Separate insights by category
    const whatsWorking = insights.insights.filter(i => i.category === 'whats_working');
    const needsAttention = insights.insights.filter(i => i.category === 'needs_attention');
    
    res.json({
      success: true,
      data: {
        insights: {
          whatsWorking,
          needsAttention,
          all: insights.insights
        },
        summary: insights.summary,
        metadata: {
          id: insights._id,
          generatedAt: insights.generatedAt,
          model: insights.model,
          totalTests: insights.metricsSnapshot.totalTests,
          dateRange: insights.metricsSnapshot.dateRange
        }
      }
    });
    
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insights'
    });
  }
});

// Get insights history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { urlAnalysisId, limit = 10 } = req.query;
    
    const query = {
      userId: req.userId,
      ...(urlAnalysisId && { urlAnalysisId })
    };
    
    const insightsHistory = await PerformanceInsights.find(query)
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit))
      .select('_id generatedAt summary.metadata.totalTests insights.length')
      .lean();
    
    res.json({
      success: true,
      data: {
        history: insightsHistory.map(item => ({
          id: item._id,
          generatedAt: item.generatedAt,
          totalTests: item.metricsSnapshot?.totalTests || 0,
          insightCount: item.insights?.length || 0,
          whatsWorkingCount: item.summary?.whatsWorkingCount || 0,
          needsAttentionCount: item.summary?.needsAttentionCount || 0,
          overallSentiment: item.summary?.overallSentiment || 'neutral'
        }))
      }
    });
    
  } catch (error) {
    console.error('Get insights history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insights history'
    });
  }
});

// Get specific insight details
router.get('/:insightId', authenticateToken, async (req, res) => {
  try {
    const { insightId } = req.params;
    
    const insights = await PerformanceInsights.findOne({
      userId: req.userId,
      'insights.insightId': insightId
    }).lean();
    
    if (!insights) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }
    
    const insight = insights.insights.find(i => i.insightId === insightId);
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        insight,
        context: {
          generatedAt: insights.generatedAt,
          model: insights.model,
          urlAnalysisId: insights.urlAnalysisId
        }
      }
    });
    
  } catch (error) {
    console.error('Get insight error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insight'
    });
  }
});

module.exports = router;



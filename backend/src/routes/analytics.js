const express = require('express');
const jwt = require('jsonwebtoken');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const PromptTest = require('../models/PromptTest');
const UrlAnalysis = require('../models/UrlAnalysis');
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
 * GET /api/analytics/visibility
 * Returns data for the Visibility tab
 * Includes: Visibility Score, Word Count, Depth of Mention, Share of Voice, Position metrics
 */
router.get('/visibility', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo, platforms, topics, personas, urlAnalysisId } = req.query;

    // Build query with optional urlAnalysisId
    const baseQuery = { userId: req.userId };
    if (urlAnalysisId) {
      baseQuery.urlAnalysisId = urlAnalysisId;
    }

    // Get overall metrics
    const overall = await AggregatedMetrics.findOne({
      ...baseQuery,
      scope: 'overall'
    }).sort({ lastCalculated: -1 }).lean();

    if (!overall) {
      return res.status(404).json({
        success: false,
        message: 'No metrics data found. Please run prompt tests first.'
      });
    }

    // Get platform metrics
    const platformMetrics = await AggregatedMetrics.find({
      ...baseQuery,
      scope: 'platform'
    }).sort({ lastCalculated: -1 }).lean();

    // Get topic metrics (deduplicated by scopeValue)
    const allTopicMetrics = await AggregatedMetrics.find({
      ...baseQuery,
      scope: 'topic'
    }).sort({ lastCalculated: -1 }).lean();

    // Deduplicate topic metrics by scopeValue (keep most recent)
    const topicMetricsMap = new Map();
    allTopicMetrics.forEach(metric => {
      if (!topicMetricsMap.has(metric.scopeValue) || 
          metric.lastCalculated > topicMetricsMap.get(metric.scopeValue).lastCalculated) {
        topicMetricsMap.set(metric.scopeValue, metric);
      }
    });
    const topicMetrics = Array.from(topicMetricsMap.values());

    // Get persona metrics (deduplicated by scopeValue)
    const allPersonaMetrics = await AggregatedMetrics.find({
      ...baseQuery,
      scope: 'persona'
    }).sort({ lastCalculated: -1 }).lean();

    // Deduplicate persona metrics by scopeValue (keep most recent)
    const personaMetricsMap = new Map();
    allPersonaMetrics.forEach(metric => {
      if (!personaMetricsMap.has(metric.scopeValue) || 
          metric.lastCalculated > personaMetricsMap.get(metric.scopeValue).lastCalculated) {
        personaMetricsMap.set(metric.scopeValue, metric);
      }
    });
    const personaMetrics = Array.from(personaMetricsMap.values());

    res.json({
      success: true,
      data: {
        overall: {
          visibilityScore: formatVisibilityScore(overall),
          wordCount: formatWordCount(overall),
          depthOfMention: formatDepthOfMention(overall),
          shareOfVoice: formatShareOfVoice(overall),
          avgPosition: formatAvgPosition(overall),
          positionDistribution: formatPositionDistribution(overall)
        },
        platforms: platformMetrics.map(p => ({
          name: p.scopeValue,
          visibilityScore: formatVisibilityScore(p),
          brandMetrics: p.brandMetrics
        })),
        topics: topicMetrics.map(t => ({
          name: t.scopeValue,
          rankings: formatTopicRankings(t)
        })),
        personas: personaMetrics.map(p => ({
          name: p.scopeValue,
          rankings: formatPersonaRankings(p)
        })),
        lastUpdated: overall.lastCalculated
      }
    });

  } catch (error) {
    console.error('Get visibility analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get visibility analytics'
    });
  }
});

/**
 * GET /api/analytics/prompts
 * Returns data for the Prompts tab
 * Includes: All prompts with their test results and performance
 */
router.get('/prompts', authenticateToken, async (req, res) => {
  try {
    const Prompt = require('../models/Prompt');

    // Get all prompts with their tests
    const prompts = await Prompt.find({ userId: req.userId })
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .lean();

    // For each prompt, get test results
    const promptsWithTests = await Promise.all(
      prompts.map(async (prompt) => {
        const tests = await PromptTest.find({ promptId: prompt._id })
          .sort({ testedAt: -1 })
          .lean();

        // Calculate prompt-level metrics
        const llmResults = {};
        tests.forEach(test => {
          if (!llmResults[test.llmProvider]) {
            llmResults[test.llmProvider] = {
              response: test.rawResponse,
              visibilityScore: test.scorecard?.visibilityScore || 0,
              brandMentioned: test.scorecard?.brandMentioned || false,
              brandPosition: test.scorecard?.brandPosition || null,
              competitorsMentioned: test.scorecard?.competitorsMentioned || [],
              responseTime: test.responseTime,
              testedAt: test.testedAt
            };
          }
        });

        return {
          id: prompt._id,
          text: prompt.text,
          title: prompt.title,
          queryType: prompt.queryType,
          topic: prompt.topicId?.name,
          persona: prompt.personaId?.type,
          status: prompt.status,
          llmResults,
          totalTests: tests.length,
          avgVisibility: tests.length > 0
            ? tests.reduce((sum, t) => sum + (t.scorecard?.visibilityScore || 0), 0) / tests.length
            : 0,
          createdAt: prompt.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        prompts: promptsWithTests,
        summary: {
          total: prompts.length,
          tested: promptsWithTests.filter(p => p.totalTests > 0).length,
          avgVisibility: promptsWithTests.reduce((sum, p) => sum + p.avgVisibility, 0) / prompts.length
        }
      }
    });

  } catch (error) {
    console.error('Get prompts analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prompts analytics'
    });
  }
});

/**
 * GET /api/analytics/sentiment
 * Returns data for the Sentiment tab
 * Analyzes sentiment of brand mentions across responses
 */
router.get('/sentiment', authenticateToken, async (req, res) => {
  try {
    // Get all completed tests
    const tests = await PromptTest.find({
      userId: req.userId,
      status: 'completed'
    })
    .populate('topicId', 'name')
    .lean();

    // Aggregate sentiment by topic
    const sentimentByTopic = {};

    tests.forEach(test => {
      const topic = test.topicId?.name || 'Unknown';
      if (!sentimentByTopic[topic]) {
        sentimentByTopic[topic] = {
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0
        };
      }

      // Simple sentiment analysis based on visibility score
      // TODO: Implement proper sentiment analysis
      const score = test.scorecard?.visibilityScore || 0;
      if (score > 60) sentimentByTopic[topic].positive++;
      else if (score > 20) sentimentByTopic[topic].neutral++;
      else sentimentByTopic[topic].negative++;

      sentimentByTopic[topic].total++;
    });

    res.json({
      success: true,
      data: {
        overall: {
          positive: Object.values(sentimentByTopic).reduce((sum, t) => sum + t.positive, 0),
          neutral: Object.values(sentimentByTopic).reduce((sum, t) => sum + t.neutral, 0),
          negative: Object.values(sentimentByTopic).reduce((sum, t) => sum + t.negative, 0)
        },
        byTopic: Object.entries(sentimentByTopic).map(([topic, data]) => ({
          topic,
          ...data,
          positiveRate: (data.positive / data.total * 100).toFixed(1),
          neutralRate: (data.neutral / data.total * 100).toFixed(1),
          negativeRate: (data.negative / data.total * 100).toFixed(1)
        }))
      }
    });

  } catch (error) {
    console.error('Get sentiment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sentiment analytics'
    });
  }
});

/**
 * GET /api/analytics/citations
 * Returns citation data (links/references to brand in LLM responses)
 */
router.get('/citations', authenticateToken, async (req, res) => {
  try {
    const tests = await PromptTest.find({
      userId: req.userId,
      status: 'completed'
    }).lean();

    const citations = {
      total: 0,
      byType: {
        direct_link: 0,
        reference: 0,
        mention: 0,
        none: 0
      },
      byPlatform: {}
    };

    tests.forEach(test => {
      const citationType = test.scorecard?.citationType || 'none';
      citations.byType[citationType]++;

      if (!citations.byPlatform[test.llmProvider]) {
        citations.byPlatform[test.llmProvider] = {
          total: 0,
          withCitation: 0,
          citationRate: 0
        };
      }

      citations.byPlatform[test.llmProvider].total++;
      if (test.scorecard?.citationPresent) {
        citations.byPlatform[test.llmProvider].withCitation++;
        citations.total++;
      }
    });

    // Calculate citation rates
    Object.keys(citations.byPlatform).forEach(platform => {
      const platformData = citations.byPlatform[platform];
      platformData.citationRate = (platformData.withCitation / platformData.total * 100).toFixed(1);
    });

    res.json({
      success: true,
      data: citations
    });

  } catch (error) {
    console.error('Get citations analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get citations analytics'
    });
  }
});

/**
 * GET /api/analytics/competitors
 * Returns competitor analysis data
 */
router.get('/competitors', authenticateToken, async (req, res) => {
  try {
    const overall = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'overall'
    }).sort({ lastCalculated: -1 }).lean();

    if (!overall) {
      return res.status(404).json({
        success: false,
        message: 'No metrics found'
      });
    }

    // Sort brands by visibility
    const rankedBrands = overall.brandMetrics
      .sort((a, b) => b.visibilityScore - a.visibilityScore)
      .map((brand, index) => ({
        rank: index + 1,
        name: brand.brandName,
        visibilityScore: brand.visibilityScore,
        shareOfVoice: brand.shareOfVoice,
        avgPosition: brand.avgPosition,
        appearances: brand.totalAppearances,
        totalPrompts: overall.totalPrompts,
        mentionRate: (brand.totalAppearances / overall.totalPrompts * 100).toFixed(1)
      }));

    res.json({
      success: true,
      data: {
        brands: rankedBrands,
        totalBrands: rankedBrands.length,
        totalPrompts: overall.totalPrompts
      }
    });

  } catch (error) {
    console.error('Get competitors analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get competitors analytics'
    });
  }
});

/**
 * GET /api/analytics/summary
 * Returns high-level summary for dashboard overview
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const overall = await AggregatedMetrics.findOne({
      userId: req.userId,
      scope: 'overall'
    }).sort({ lastCalculated: -1 }).lean();

    const tests = await PromptTest.countDocuments({ userId: req.userId, status: 'completed' });
    const prompts = await require('../models/Prompt').countDocuments({ userId: req.userId });

    if (!overall) {
      return res.json({
        success: true,
        data: {
          hasData: false,
          message: 'No data yet. Please run prompt tests.',
          totalPrompts: prompts,
          totalTests: tests
        }
      });
    }

    // Find user's brand (from URL analysis)
    const userBrandName = await getUserBrandName(req.userId);
    const userBrand = overall.brandMetrics.find(b =>
      b.brandName === userBrandName ||
      b.visibilityRank === 1
    ) || overall.brandMetrics[0];

    res.json({
      success: true,
      data: {
        hasData: true,
        totalPrompts: prompts,
        totalTests: tests,
        totalBrands: overall.brandMetrics.length,
        userBrand: {
          name: userBrand.brandName,
          visibilityScore: userBrand.visibilityScore,
          visibilityRank: userBrand.visibilityRank,
          shareOfVoice: userBrand.shareOfVoice,
          avgPosition: userBrand.avgPosition,
          appearances: userBrand.totalAppearances
        },
        topCompetitors: overall.brandMetrics
          .filter(b => b.brandName !== userBrand.brandName)
          .sort((a, b) => b.visibilityScore - a.visibilityScore)
          .slice(0, 5)
          .map(b => ({
            name: b.brandName,
            visibilityScore: b.visibilityScore,
            rank: b.visibilityRank
          })),
        lastUpdated: overall.lastCalculated
      }
    });

  } catch (error) {
    console.error('Get summary analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get summary analytics'
    });
  }
});

/**
 * GET /api/analytics/filters
 * Returns filter options (platforms, topics, personas) for dashboard
 */
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    // Get user's data for filters
    const [topics, personas, competitors] = await Promise.all([
      require('../models/Topic').find({ userId: req.userId }).lean(),
      require('../models/Persona').find({ userId: req.userId }).lean(),
      require('../models/Competitor').find({ userId: req.userId }).lean()
    ]);

    // Get available platforms from test results
    const platforms = await PromptTest.distinct('llmProvider', { userId: req.userId });

    res.json({
      success: true,
      data: {
        platforms: platforms.map(p => ({
          id: p,
          name: p.charAt(0).toUpperCase() + p.slice(1),
          enabled: true
        })),
        topics: topics.map(t => ({
          id: t._id.toString(),
          name: t.name,
          enabled: t.selected || false
        })),
        personas: personas.map(p => ({
          id: p._id.toString(),
          name: p.type,
          enabled: p.selected || false
        })),
        competitors: competitors.map(c => ({
          id: c._id.toString(),
          name: c.name,
          enabled: c.selected || false
        }))
      }
    });

  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filter options'
    });
  }
});

module.exports = router;

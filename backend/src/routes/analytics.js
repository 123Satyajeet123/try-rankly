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
    const { dateFrom, dateTo, platforms, topics, personas } = req.query;

    // Get overall metrics
    const overall = await AggregatedMetrics.findOne({
      userId: req.userId,
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
      userId: req.userId,
      scope: 'platform'
    }).sort({ lastCalculated: -1 }).lean();

    // Get topic metrics
    const topicMetrics = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'topic'
    }).sort({ lastCalculated: -1 }).lean();

    // Get persona metrics
    const personaMetrics = await AggregatedMetrics.find({
      userId: req.userId,
      scope: 'persona'
    }).sort({ lastCalculated: -1 }).lean();

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

/**
 * GET /api/analytics/dashboard
 * Returns complete dashboard data with filters applied
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { 
      dateFrom, 
      dateTo, 
      platforms, 
      topics, 
      personas,
      comparisonDateFrom,
      comparisonDateTo 
    } = req.query;

    // Build filter query
    const filterQuery = { userId: req.userId, status: 'completed' };
    
    if (dateFrom || dateTo) {
      filterQuery.testedAt = {};
      if (dateFrom) filterQuery.testedAt.$gte = new Date(dateFrom);
      if (dateTo) filterQuery.testedAt.$lte = new Date(dateTo);
    }

    if (platforms) {
      const platformArray = Array.isArray(platforms) ? platforms : [platforms];
      filterQuery.llmProvider = { $in: platformArray };
    }

    // Get filtered test results
    const tests = await PromptTest.find(filterQuery)
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .lean();

    // Filter by topics and personas if specified
    let filteredTests = tests;
    if (topics) {
      const topicArray = Array.isArray(topics) ? topics : [topics];
      filteredTests = filteredTests.filter(t => 
        t.topicId && topicArray.includes(t.topicId._id.toString())
      );
    }

    if (personas) {
      const personaArray = Array.isArray(personas) ? personas : [personas];
      filteredTests = filteredTests.filter(t => 
        t.personaId && personaArray.includes(t.personaId._id.toString())
      );
    }

    // Calculate metrics
    const metrics = await calculateDashboardMetrics(filteredTests, req.userId);

    // Get comparison data if requested
    let comparisonMetrics = null;
    if (comparisonDateFrom || comparisonDateTo) {
      const comparisonQuery = { ...filterQuery };
      comparisonQuery.testedAt = {};
      if (comparisonDateFrom) comparisonQuery.testedAt.$gte = new Date(comparisonDateFrom);
      if (comparisonDateTo) comparisonQuery.testedAt.$lte = new Date(comparisonDateTo);

      const comparisonTests = await PromptTest.find(comparisonQuery)
        .populate('topicId', 'name')
        .populate('personaId', 'type')
        .lean();

      comparisonMetrics = await calculateDashboardMetrics(comparisonTests, req.userId);
    }

    res.json({
      success: true,
      data: {
        metrics,
        comparison: comparisonMetrics,
        filters: {
          dateFrom,
          dateTo,
          platforms,
          topics,
          personas
        },
        summary: {
          totalTests: filteredTests.length,
          dateRange: { from: dateFrom, to: dateTo },
          lastUpdated: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard analytics'
    });
  }
});

// Helper functions to format data for frontend

/**
 * Get user's brand name from URL analysis
 */
async function getUserBrandName(userId) {
  try {
    const urlAnalysis = await UrlAnalysis.findOne({ userId }).sort({ analysisDate: -1 }).lean();
    if (urlAnalysis && urlAnalysis.brandContext && urlAnalysis.brandContext.companyName) {
      return urlAnalysis.brandContext.companyName;
    }
    return 'Your Brand';
  } catch (error) {
    console.error('Error fetching user brand:', error);
    return 'Your Brand';
  }
}

/**
 * Calculate dashboard metrics from test results
 */
async function calculateDashboardMetrics(tests, userId) {
  if (!tests || tests.length === 0) {
    return {
      visibility: null,
      shareOfVoice: null,
      averagePosition: null,
      sentiment: null,
      citations: null
    };
  }

  // Get user's brand name
  const userBrandName = await getUserBrandName(userId);

  // Group brands and calculate metrics
  const brandMetrics = {};
  const platformMetrics = {};
  const topicMetrics = {};
  const personaMetrics = {};

  tests.forEach(test => {
    const scorecard = test.scorecard || {};
    const brandName = userBrandName; // User's brand (from URL analysis)
    const platform = test.llmProvider;
    const topic = test.topicId?.name || 'Unknown';
    const persona = test.personaId?.type || 'Unknown';

    // Brand metrics
    if (!brandMetrics[brandName]) {
      brandMetrics[brandName] = {
        name: brandName,
        visibilityScore: 0,
        shareOfVoice: 0,
        avgPosition: 0,
        totalMentions: 0,
        totalTests: 0,
        brandMentioned: 0
      };
    }

    brandMetrics[brandName].totalTests++;
    if (scorecard.brandMentioned) {
      brandMetrics[brandName].brandMentioned++;
      brandMetrics[brandName].visibilityScore += scorecard.visibilityScore || 0;
      brandMetrics[brandName].avgPosition += scorecard.brandPosition || 0;
    }

    // Platform metrics
    if (!platformMetrics[platform]) {
      platformMetrics[platform] = {
        name: platform,
        visibilityScore: 0,
        totalTests: 0,
        brandMentioned: 0
      };
    }

    platformMetrics[platform].totalTests++;
    if (scorecard.brandMentioned) {
      platformMetrics[platform].brandMentioned++;
      platformMetrics[platform].visibilityScore += scorecard.visibilityScore || 0;
    }

    // Topic metrics
    if (!topicMetrics[topic]) {
      topicMetrics[topic] = {
        name: topic,
        visibilityScore: 0,
        totalTests: 0,
        brandMentioned: 0
      };
    }

    topicMetrics[topic].totalTests++;
    if (scorecard.brandMentioned) {
      topicMetrics[topic].brandMentioned++;
      topicMetrics[topic].visibilityScore += scorecard.visibilityScore || 0;
    }

    // Persona metrics
    if (!personaMetrics[persona]) {
      personaMetrics[persona] = {
        name: persona,
        visibilityScore: 0,
        totalTests: 0,
        brandMentioned: 0
      };
    }

    personaMetrics[persona].totalTests++;
    if (scorecard.brandMentioned) {
      personaMetrics[persona].brandMentioned++;
      personaMetrics[persona].visibilityScore += scorecard.visibilityScore || 0;
    }
  });

  // Calculate averages and percentages
  Object.values(brandMetrics).forEach(brand => {
    if (brand.brandMentioned > 0) {
      brand.visibilityScore = Math.round(brand.visibilityScore / brand.brandMentioned);
      brand.avgPosition = Math.round((brand.avgPosition / brand.brandMentioned) * 10) / 10;
    }
    brand.shareOfVoice = Math.round((brand.brandMentioned / brand.totalTests) * 100 * 10) / 10;
  });

  Object.values(platformMetrics).forEach(platform => {
    if (platform.brandMentioned > 0) {
      platform.visibilityScore = Math.round(platform.visibilityScore / platform.brandMentioned);
    }
    platform.brandMentionRate = Math.round((platform.brandMentioned / platform.totalTests) * 100);
  });

  Object.values(topicMetrics).forEach(topic => {
    if (topic.brandMentioned > 0) {
      topic.visibilityScore = Math.round(topic.visibilityScore / topic.brandMentioned);
    }
    topic.brandMentionRate = Math.round((topic.brandMentioned / topic.totalTests) * 100);
  });

  Object.values(personaMetrics).forEach(persona => {
    if (persona.brandMentioned > 0) {
      persona.visibilityScore = Math.round(persona.visibilityScore / persona.brandMentioned);
    }
    persona.brandMentionRate = Math.round((persona.brandMentioned / persona.totalTests) * 100);
  });

  // Calculate sentiment
  const sentiment = {
    positive: 0,
    neutral: 0,
    negative: 0,
    total: tests.length
  };

  tests.forEach(test => {
    const score = test.scorecard?.visibilityScore || 0;
    if (score > 60) sentiment.positive++;
    else if (score > 20) sentiment.neutral++;
    else sentiment.negative++;
  });

  // Calculate citations
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
        withCitation: 0
      };
    }

    citations.byPlatform[test.llmProvider].total++;
    if (test.scorecard?.citationPresent) {
      citations.byPlatform[test.llmProvider].withCitation++;
      citations.total++;
    }
  });

  return {
    visibility: {
      overall: brandMetrics[userBrandName] || null,
      platforms: Object.values(platformMetrics),
      topics: Object.values(topicMetrics),
      personas: Object.values(personaMetrics)
    },
    shareOfVoice: {
      overall: brandMetrics[userBrandName]?.shareOfVoice || 0,
      platforms: Object.values(platformMetrics).map(p => ({
        name: p.name,
        share: p.brandMentionRate
      }))
    },
    averagePosition: {
      overall: brandMetrics[userBrandName]?.avgPosition || 0,
      platforms: Object.values(platformMetrics).map(p => ({
        name: p.name,
        position: p.avgPosition || 0
      }))
    },
    sentiment: {
      overall: sentiment,
      byTopic: Object.values(topicMetrics).map(t => ({
        topic: t.name,
        positive: Math.round((t.brandMentionRate / 100) * sentiment.positive),
        neutral: Math.round((t.brandMentionRate / 100) * sentiment.neutral),
        negative: Math.round((t.brandMentionRate / 100) * sentiment.negative)
      }))
    },
    citations: {
      total: citations.total,
      byType: citations.byType,
      byPlatform: Object.entries(citations.byPlatform).map(([platform, data]) => ({
        platform,
        total: data.total,
        withCitation: data.withCitation,
        citationRate: Math.round((data.withCitation / data.total) * 100)
      }))
    }
  };
}

function formatVisibilityScore(metrics) {
  if (!metrics || !metrics.brandMetrics) return null;

  return {
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      score: b.visibilityScore,
      rank: b.visibilityRank,
      change: b.visibilityRankChange || 0
    })),
    chartData: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      value: b.visibilityScore,
      fill: getColorForBrand(b.brandName)
    }))
  };
}

function formatWordCount(metrics) {
  if (!metrics || !metrics.brandMetrics) return null;

  return {
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      wordCount: b.wordCount,
      rank: b.wordCountRank
    })),
    chartData: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      value: b.wordCount
    }))
  };
}

function formatDepthOfMention(metrics) {
  if (!metrics || !metrics.brandMetrics) return null;

  return {
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      depth: b.depthOfMention,
      rank: b.depthRank
    }))
  };
}

function formatShareOfVoice(metrics) {
  if (!metrics || !metrics.brandMetrics) return null;

  return {
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      share: b.shareOfVoice,
      rank: b.shareOfVoiceRank
    })),
    chartData: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      value: b.shareOfVoice,
      fill: getColorForBrand(b.brandName)
    }))
  };
}

function formatAvgPosition(metrics) {
  if (!metrics || !metrics.brandMetrics) return null;

  return {
    brands: metrics.brandMetrics
      .filter(b => b.avgPosition > 0)
      .map(b => ({
        name: b.brandName,
        position: b.avgPosition,
        rank: b.avgPositionRank
      }))
  };
}

function formatPositionDistribution(metrics) {
  if (!metrics || !metrics.brandMetrics) return null;

  return {
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      '1st': b.count1st,
      '2nd': b.count2nd,
      '3rd': b.count3rd
    }))
  };
}

function formatTopicRankings(topicMetrics) {
  return {
    topic: topicMetrics.scopeValue,
    brands: topicMetrics.brandMetrics
      .sort((a, b) => a.visibilityRank - b.visibilityRank)
      .slice(0, 10)
      .map(b => ({
        name: b.brandName,
        score: b.visibilityScore,
        rank: b.visibilityRank
      }))
  };
}

function formatPersonaRankings(personaMetrics) {
  return {
    persona: personaMetrics.scopeValue,
    brands: personaMetrics.brandMetrics
      .sort((a, b) => a.visibilityRank - b.visibilityRank)
      .slice(0, 10)
      .map(b => ({
        name: b.brandName,
        score: b.visibilityScore,
        rank: b.visibilityRank
      }))
  };
}

function getColorForBrand(brandName) {
  // Assign consistent colors to brands
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#8B5CF6', // purple
    '#06B6D4', // cyan
    '#10B981', // green
    '#F59E0B', // orange
    '#EC4899', // pink
    '#6366F1', // indigo
  ];

  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

module.exports = router;

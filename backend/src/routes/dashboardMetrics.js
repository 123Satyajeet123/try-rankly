/**
 * Dashboard Metrics API Routes
 * 
 * These routes provide data in the exact format needed by the Rankly Dashboard frontend.
 * All responses match the component requirements from DASHBOARD_TO_BACKEND_MAPPING.md
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const PromptTest = require('../models/PromptTest');
const PerformanceInsights = require('../models/PerformanceInsights');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
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
 * GET /api/dashboard/all
 * 
 * Get all dashboard data in one request (recommended for initial load)
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const userId = req.userId;

    // Get user's brand from URL analysis
    const UrlAnalysis = require('../models/UrlAnalysis');
    const urlAnalysis = await UrlAnalysis.findOne({
      userId: userId
    })
    .sort({ analysisDate: -1 })
    .lean();

    const userBrandName = urlAnalysis?.brandContext?.companyName || null;

    // Get all metrics scopes
    const [overall, platforms, allTopics, allPersonas] = await Promise.all([
      getFilteredMetrics(userId, { scope: 'overall', dateFrom, dateTo }),
      AggregatedMetrics.find({ userId: userId, scope: 'platform' }).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find({ userId: userId, scope: 'topic' }).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find({ userId: userId, scope: 'persona' }).sort({ lastCalculated: -1 }).lean()
    ]);

    // Get selected topics and personas from their respective collections
    const [selectedTopics, selectedPersonas] = await Promise.all([
      Topic.find({ userId: userId, selected: true }).lean(),
      Persona.find({ userId: userId, selected: true }).lean()
    ]);

    // Filter aggregated metrics to only include selected topics and personas
    const selectedTopicNames = selectedTopics.map(t => t.name);
    const selectedPersonaTypes = selectedPersonas.map(p => p.type);
    
    const topics = allTopics.filter(topic => selectedTopicNames.includes(topic.scopeValue));
    const personas = allPersonas.filter(persona => selectedPersonaTypes.includes(persona.scopeValue));

    // ✅ Get latest AI-powered Performance Insights
    let aiInsights = null;
    try {
      const latestInsights = await PerformanceInsights.findOne({
        userId: userId
      }).sort({ generatedAt: -1 }).lean();

      if (latestInsights) {
        // Separate insights by category
        const whatsWorking = latestInsights.insights.filter(i => i.category === 'whats_working');
        const needsAttention = latestInsights.insights.filter(i => i.category === 'needs_attention');
        
        aiInsights = {
          whatsWorking,
          needsAttention,
          all: latestInsights.insights,
          summary: latestInsights.summary,
          metadata: {
            id: latestInsights._id,
            generatedAt: latestInsights.generatedAt,
            model: latestInsights.model,
            totalTests: latestInsights.metricsSnapshot.totalTests
          }
        };
        
        console.log('✅ AI Insights included in dashboard response:', aiInsights.all.length, 'insights');
      } else {
        console.log('⚠️ No AI insights found for user');
      }
    } catch (error) {
      console.error('⚠️ Error fetching AI insights for dashboard:', error.message);
      // Continue without insights - non-critical
    }

    res.json({
      success: true,
      data: {
        // Core metrics
        overall: overall,
        platforms: platforms,
        topics: topics,
        personas: personas,
        
        // Formatted data for components
        visibility: formatVisibilityData(overall, userBrandName),
        depthOfMention: formatDepthData(overall, userBrandName),
        averagePosition: formatAveragePositionData(overall, userBrandName),
        topicRankings: formatTopicRankings(topics, userBrandName),
        personaRankings: formatPersonaRankings(personas, userBrandName),
        performanceInsights: formatPerformanceInsights(overall, userBrandName),
        
        // ✅ AI-Powered Performance Insights
        aiInsights: aiInsights,
        
        // Platform-level data (formatted)
        platforms: platforms.map(p => ({
          platform: p.scopeValue,
          visibility: formatVisibilityData(p, userBrandName),
          depth: formatDepthData(p, userBrandName)
        })),
        
        // ✅ Raw platform data for citation analysis
        platformMetrics: platforms,
        
        lastUpdated: overall?.lastCalculated || new Date()
      }
    });

  } catch (error) {
    console.error('❌ Get all dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
});

// ============================================================================
// Helper Functions for Data Formatting
// ============================================================================

/**
 * Get filtered metrics with optional query parameters
 */
async function getFilteredMetrics(userId, options = {}) {
  const query = { userId };
  
  if (options.scope) query.scope = options.scope;
  if (options.scopeValue) query.scopeValue = options.scopeValue;
  
  return await AggregatedMetrics.findOne(query)
    .sort({ lastCalculated: -1 })
    .lean();
}

/**
 * Format visibility score data for frontend
 */
function formatVisibilityData(metrics, userBrandName) {
  if (!metrics) return null;

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  return {
    current: {
      score: userBrand.visibilityScore,
      rank: userBrand.visibilityRank
    },
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      score: b.visibilityScore,
      rank: b.visibilityRank,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    })).sort((a, b) => a.rank - b.rank)
  };
}

/**
 * Format depth of mention data for frontend
 */
function formatDepthData(metrics, userBrandName) {
  if (!metrics) return null;

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  return {
    current: {
      score: userBrand.depthOfMention,
      rank: userBrand.depthRank
    },
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      score: b.depthOfMention,
      rank: b.depthRank,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    })).sort((a, b) => a.rank - b.rank)
  };
}

/**
 * Format average position data for frontend
 */
function formatAveragePositionData(metrics, userBrandName) {
  if (!metrics) return null;

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  return {
    current: {
      score: userBrand.avgPosition,
      rank: userBrand.avgPositionRank
    },
    brands: metrics.brandMetrics.map(b => ({
      name: b.brandName,
      score: b.avgPosition,
      rank: b.avgPositionRank,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    })).sort((a, b) => a.rank - b.rank)
  };
}

/**
 * Format topic rankings for frontend
 */
function formatTopicRankings(topicMetrics, userBrandName) {
  return topicMetrics.map(topic => {
    const userBrand = topic.brandMetrics.find(b => b.brandName === userBrandName);
    const yourRank = userBrand?.visibilityRank || 999;
    
    // Determine status
    let status, statusColor;
    if (yourRank === 1) {
      status = 'Leader';
      statusColor = 'green';
    } else if (yourRank <= 3) {
      status = 'Strong';
      statusColor = 'yellow';
    } else {
      status = 'Needs work';
      statusColor = 'red';
    }
    
    return {
      topic: topic.scopeValue,
      status,
      statusColor,
      yourRank,
      yourScore: userBrand?.visibilityScore || 0,
      rankings: topic.brandMetrics
        .sort((a, b) => a.visibilityRank - b.visibilityRank)
        .slice(0, 5)
        .map(b => ({
          rank: b.visibilityRank,
          name: b.brandName,
          score: b.visibilityScore,
          isOwner: b.brandName === userBrandName
        }))
    };
  });
}

/**
 * Format persona rankings for frontend
 */
function formatPersonaRankings(personaMetrics, userBrandName) {
  return personaMetrics.map(persona => {
    const userBrand = persona.brandMetrics.find(b => b.brandName === userBrandName);
    const yourRank = userBrand?.visibilityRank || 999;
    
    // Determine status
    let status, statusColor;
    if (yourRank === 1) {
      status = 'Leader';
      statusColor = 'green';
    } else {
      status = 'Needs work';
      statusColor = 'red';
    }
    
    return {
      persona: persona.scopeValue,
      status,
      statusColor,
      yourRank,
      yourScore: userBrand?.visibilityScore || 0,
      rankings: persona.brandMetrics
        .sort((a, b) => a.visibilityRank - b.visibilityRank)
        .slice(0, 5)
        .map(b => ({
          rank: b.visibilityRank,
          name: b.brandName,
          score: b.visibilityScore,
          isOwner: b.brandName === userBrandName
        }))
    };
  });
}

/**
 * Format performance insights (Share of Voice + Position Distribution)
 */
function formatPerformanceInsights(metrics, userBrandName) {
  if (!metrics) return null;

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Calculate position distribution percentages
  const totalAppearances = userBrand.count1st + userBrand.count2nd + userBrand.count3rd + (userBrand.countOther || 0);
  
  const positionDistribution = totalAppearances > 0 ? {
    firstRank: parseFloat(((userBrand.count1st / totalAppearances) * 100).toFixed(2)),
    secondRank: parseFloat(((userBrand.count2nd / totalAppearances) * 100).toFixed(2)),
    thirdRank: parseFloat(((userBrand.count3rd / totalAppearances) * 100).toFixed(2)),
    otherRank: parseFloat((((userBrand.countOther || 0) / totalAppearances) * 100).toFixed(2))
  } : {
    firstRank: 0,
    secondRank: 0,
    thirdRank: 0,
    otherRank: 0
  };

  return {
    shareOfVoice: {
      current: {
        percentage: userBrand.shareOfVoice,
        rank: userBrand.shareOfVoiceRank
      },
      brands: metrics.brandMetrics.map(b => ({
        name: b.brandName,
        value: b.shareOfVoice,
        rank: b.shareOfVoiceRank,
        color: getColorForBrand(b.brandName),
        isOwner: b.brandName === userBrandName
      })).sort((a, b) => a.rank - b.rank)
    },
    positionDistribution: {
      current: positionDistribution,
      brands: metrics.brandMetrics.map(b => {
        const total = b.count1st + b.count2nd + b.count3rd + (b.countOther || 0);
        return {
          name: b.brandName,
          count1st: b.count1st,
          count2nd: b.count2nd,
          count3rd: b.count3rd,
          firstRank: total > 0 ? parseFloat(((b.count1st / total) * 100).toFixed(2)) : 0,
          secondRank: total > 0 ? parseFloat(((b.count2nd / total) * 100).toFixed(2)) : 0,
          thirdRank: total > 0 ? parseFloat(((b.count3rd / total) * 100).toFixed(2)) : 0,
          rank1st: b.rank1st,
          rank2nd: b.rank2nd,
          rank3rd: b.rank3rd,
          color: getColorForBrand(b.brandName),
          isOwner: b.brandName === userBrandName
        };
      })
    }
  };
}

/**
 * Get brand color based on name (matches frontend colors)
 */
function getColorForBrand(brandName) {
  const colorMap = {
    'JPMorgan Chase': '#3B82F6',
    'Bank of America': '#EF4444',
    'Wells Fargo': '#8B5CF6',
    'Citibank': '#06B6D4',
    'US Bank': '#10B981',
    'TechCorp': '#3B82F6',
    'DataFlow': '#EF4444',
    'CloudSync': '#8B5CF6',
    'SmartAI': '#06B6D4',
    'InnovateTech': '#10B981'
  };
  return colorMap[brandName] || '#9CA3AF';
}

// Get real citation details for a specific brand and type
router.get('/citations/:brandName/:type', authenticateToken, async (req, res) => {
  try {
    const { brandName, type } = req.params;
    const userId = req.userId;

    console.log(`📊 [CITATION DETAILS] Fetching real citations for ${brandName} - ${type}`);

    // Find all prompt tests for the user
    const promptTests = await PromptTest.find({ userId })
      .populate('promptId')
      .populate('topicId')
      .populate('personaId')
      .lean();

    const citationMap = new Map();

    // Extract real citations from prompt tests and group by URL
    promptTests.forEach(test => {
      test.brandMetrics?.forEach(brandMetric => {
        if (brandMetric.brandName === brandName && brandMetric.citations) {
          brandMetric.citations.forEach(citation => {
            // Map citation types to match frontend expectations
            if ((type === 'Website' && citation.type === 'brand') ||
                (type === 'Blog' && citation.type === 'earned') ||
                (type === 'Social' && citation.type === 'social')) {
              
              // Map LLM provider to platform name
              const getPlatformName = (llmProvider, llmModel) => {
                if (llmProvider === 'openai') return 'OpenAI';
                if (llmProvider === 'claude') return 'Claude';
                if (llmProvider === 'perplexity') return 'Perplexity';
                if (llmProvider === 'gemini') return 'Gemini';
                return llmProvider || 'Unknown';
              };

              const citationData = {
                id: `${test._id}-${citation._id}`,
                url: citation.url,
                platform: getPlatformName(test.llmProvider, test.llmModel),
                context: citation.context,
                type: citation.type,
                promptId: test.promptId?._id || test.promptId,
                promptText: test.promptText || '',
                promptTitle: test.promptId?.title || 'Untitled Prompt',
                queryType: test.queryType || 'Unknown',
                topic: test.topicId?.name || 'Unknown',
                persona: test.personaId?.type || 'Unknown',
                testDate: test.createdAt,
                llmProvider: test.llmProvider,
                llmModel: test.llmModel
              };

              // Group by URL
              if (!citationMap.has(citation.url)) {
                citationMap.set(citation.url, {
                  url: citation.url,
                  context: citation.context,
                  type: citation.type,
                  platforms: new Set(),
                  prompts: new Map() // Use Map to deduplicate by promptText
                });
              }

              const groupedCitation = citationMap.get(citation.url);
              groupedCitation.platforms.add(citationData.platform);
              
              // Deduplicate prompts by promptText
              const promptKey = citationData.promptText;
              if (!groupedCitation.prompts.has(promptKey)) {
                groupedCitation.prompts.set(promptKey, {
                  promptText: citationData.promptText,
                  platforms: new Set()
                });
              }
              groupedCitation.prompts.get(promptKey).platforms.add(citationData.platform);
            }
          });
        }
      });
    });

    // Convert map to array and format platforms and prompts
    const citationDetails = Array.from(citationMap.values()).map(grouped => ({
      ...grouped,
      platforms: Array.from(grouped.platforms),
      prompts: Array.from(grouped.prompts.values()).map(prompt => ({
        ...prompt,
        platforms: Array.from(prompt.platforms)
      }))
    }));

    console.log(`✅ [CITATION DETAILS] Found ${citationDetails.length} real citations for ${brandName} - ${type}`);

    res.json({
      success: true,
      data: {
        brandName,
        type,
        details: citationDetails
      }
    });

  } catch (error) {
    console.error('❌ [CITATION DETAILS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch citation details',
      error: error.message
    });
  }
});

module.exports = router;


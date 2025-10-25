/**
 * Dashboard Metrics API Routes
 * 
 * These routes provide data in the exact format needed by the Rankly Dashboard frontend.
 * All responses match the component requirements from DASHBOARD_TO_BACKEND_MAPPING.md
 */

const express = require('express');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const PromptTest = require('../models/PromptTest');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const router = express.Router();

// Development authentication middleware (bypasses JWT)
const devAuth = require('../middleware/devAuth');

/**
 * GET /api/dashboard/all
 * 
 * Get all dashboard data in one request (recommended for initial load)
 */
router.get('/all', devAuth, async (req, res) => {
  try {
    const { dateFrom, dateTo, urlAnalysisId } = req.query;
    const userId = req.userId;

    // Get user's brand from URL analysis
    const UrlAnalysis = require('../models/UrlAnalysis');
    
    // If urlAnalysisId is provided, get that specific analysis
    // Otherwise, get the latest analysis
    let urlAnalysis;
    if (urlAnalysisId) {
      urlAnalysis = await UrlAnalysis.findOne({
        _id: urlAnalysisId,
        userId: userId
      }).lean();
      
      if (!urlAnalysis) {
        return res.status(404).json({
          success: false,
          message: 'URL analysis not found'
        });
      }
    } else {
      urlAnalysis = await UrlAnalysis.findOne({
        userId: userId
      })
      .sort({ analysisDate: -1 })
      .lean();
    }

    const userBrandName = urlAnalysis?.brandContext?.companyName || null;
    const currentUrlAnalysisId = urlAnalysis?._id;

    console.log(`📊 [DASHBOARD] User: ${userId}, URL Analysis ID: ${currentUrlAnalysisId}, Brand: ${userBrandName}`);

    // Build query with optional urlAnalysisId filtering
    const buildQuery = (scope, additionalFilters = {}) => {
      const query = { 
        userId: userId, 
        scope: scope 
      };
      
      // Only add urlAnalysisId filter if it exists and is not null
      // Otherwise, don't filter by urlAnalysisId at all to include null values
      if (currentUrlAnalysisId) {
        query.urlAnalysisId = currentUrlAnalysisId;
      }
      // Note: If currentUrlAnalysisId is null/undefined, we don't add the filter
      // This allows the query to match records where urlAnalysisId is null
      
      if (dateFrom || dateTo) {
        if (dateFrom) query.dateFrom = { $gte: new Date(dateFrom) };
        if (dateTo) query.dateTo = { $lte: new Date(dateTo) };
      }
      
      return { ...query, ...additionalFilters };
    };

    // Get all metrics scopes with proper filtering
    const overallQuery = buildQuery('overall');
    const platformQuery = buildQuery('platform');
    const topicQuery = buildQuery('topic');
    const personaQuery = buildQuery('persona');
    
    console.log(`📊 [DASHBOARD] Queries:`, {
      overall: overallQuery,
      platform: platformQuery,
      topic: topicQuery,
      persona: personaQuery
    });

    const [overall, platforms, allTopics, allPersonas] = await Promise.all([
      AggregatedMetrics.findOne(overallQuery).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find(platformQuery).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find(topicQuery).sort({ lastCalculated: -1 }).lean(),
      AggregatedMetrics.find(personaQuery).sort({ lastCalculated: -1 }).lean()
    ]);

    console.log(`📊 [DASHBOARD] Results:`, {
      overall: overall ? 'Found' : 'Not found',
      platforms: platforms?.length || 0,
      topics: allTopics?.length || 0,
      personas: allPersonas?.length || 0
    });

    // Get selected topics and personas from their respective collections
    // Filter by urlAnalysisId if available, otherwise include null values
    const selectedTopicQuery = { userId: userId, selected: true };
    const selectedPersonaQuery = { userId: userId, selected: true };
    
    // Only add urlAnalysisId filter if it exists and is not null
    if (currentUrlAnalysisId) {
      selectedTopicQuery.urlAnalysisId = currentUrlAnalysisId;
      selectedPersonaQuery.urlAnalysisId = currentUrlAnalysisId;
    }
    // Note: If currentUrlAnalysisId is null/undefined, we don't add the filter
    // This allows the query to match records where urlAnalysisId is null
    
    const [selectedTopics, selectedPersonas] = await Promise.all([
      Topic.find(selectedTopicQuery).lean(),
      Persona.find(selectedPersonaQuery).lean()
    ]);

    // Filter aggregated metrics to only include selected topics and personas
    const selectedTopicNames = selectedTopics.map(t => t.name);
    const selectedPersonaTypes = selectedPersonas.map(p => p.type);
    
    console.log(`📊 [DASHBOARD] Selected topics:`, selectedTopicNames);
    console.log(`📊 [DASHBOARD] Selected personas:`, selectedPersonaTypes);
    console.log(`📊 [DASHBOARD] Available topic metrics:`, allTopics.map(t => t.scopeValue));
    console.log(`📊 [DASHBOARD] Available persona metrics:`, allPersonas.map(p => p.scopeValue));
    
    let topics = allTopics.filter(topic => selectedTopicNames.includes(topic.scopeValue));
    let personas = allPersonas.filter(persona => selectedPersonaTypes.includes(persona.scopeValue));
    
    // ✅ Fallback: If no selected topics/personas or no matches, show all available
    if (topics.length === 0 && allTopics.length > 0) {
      console.log('⚠️ [DASHBOARD] No selected topics match available metrics, showing all topics');
      topics = allTopics;
    }
    if (personas.length === 0 && allPersonas.length > 0) {
      console.log('⚠️ [DASHBOARD] No selected personas match available metrics, showing all personas');
      personas = allPersonas;
    }
    
    console.log(`📊 [DASHBOARD] Filtered topics:`, topics.length);
    console.log(`📊 [DASHBOARD] Filtered personas:`, personas.length);


    res.json({
      success: true,
      data: {
        // URL Analysis context
        urlAnalysis: {
          id: currentUrlAnalysisId,
          url: urlAnalysis?.url,
          brandName: userBrandName,
          analysisDate: urlAnalysis?.analysisDate
        },
        
        // Core metrics
        overall: overall,
        platforms: platforms,
        topics: topics,
        personas: personas,
        
        // ✅ NEW: Frontend-compatible data structure
        metrics: {
          visibilityScore: formatVisibilityData(overall, userBrandName),
          depthOfMention: formatDepthData(overall, userBrandName),
          averagePosition: formatAveragePositionData(overall, userBrandName),
          topicRankings: formatTopicRankings(topics, userBrandName),
          personaRankings: formatPersonaRankings(personas, userBrandName),
          performanceInsights: formatPerformanceInsights(overall, userBrandName),
          competitors: formatCompetitorsData(overall, userBrandName),
          // ✅ NEW: Citation-specific data structure for Citations tab
          competitorsByCitation: formatCompetitorsByCitationData(overall, userBrandName)
        },
        
        // ✅ Keep backward compatibility
        visibility: formatVisibilityData(overall, userBrandName),
        depthOfMention: formatDepthData(overall, userBrandName),
        averagePosition: formatAveragePositionData(overall, userBrandName),
        topicRankings: formatTopicRankings(topics, userBrandName),
        personaRankings: formatPersonaRankings(personas, userBrandName),
        performanceInsights: formatPerformanceInsights(overall, userBrandName),
        competitors: formatCompetitorsData(overall, userBrandName),
        
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
 * Format visibility score data for frontend
 */
function formatVisibilityData(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatVisibilityData] No metrics or brand metrics found');
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand || typeof userBrand.visibilityScore === 'undefined') {
    console.log('⚠️ [formatVisibilityData] User brand not found or missing visibilityScore:', {
      userBrandName,
      userBrand: userBrand ? 'exists' : 'null',
      visibilityScore: userBrand?.visibilityScore
    });
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.visibilityRank || 0) - (b.visibilityRank || 0));

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.visibilityScore || 0,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      value: b.visibilityScore || 0,
      fill: getColorForBrand(b.brandName)
    })),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.visibilityScore || 0,
      rank: userBrand.visibilityRank || 0
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      score: b.visibilityScore || 0,
      rank: b.visibilityRank || 0,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format depth of mention data for frontend
 */
function formatDepthData(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatDepthData] No metrics or brand metrics found');
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand || typeof userBrand.depthOfMention === 'undefined') {
    console.log('⚠️ [formatDepthData] User brand not found or missing depthOfMention:', {
      userBrandName,
      userBrand: userBrand ? 'exists' : 'null',
      depthOfMention: userBrand?.depthOfMention
    });
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.depthRank || 0) - (b.depthRank || 0));

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.depthOfMention || 0,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      value: b.depthOfMention || 0,
      fill: getColorForBrand(b.brandName)
    })),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.depthOfMention || 0,
      rank: userBrand.depthRank || 0
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      score: b.depthOfMention || 0,
      rank: b.depthRank || 0,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format average position data for frontend
 */
function formatAveragePositionData(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatAveragePositionData] No metrics or brand metrics found');
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand || typeof userBrand.avgPosition === 'undefined') {
    console.log('⚠️ [formatAveragePositionData] User brand not found or missing avgPosition:', {
      userBrandName,
      userBrand: userBrand ? 'exists' : 'null',
      avgPosition: userBrand?.avgPosition
    });
    return {
      value: 0,
      data: [],
      current: { score: 0, rank: 0 },
      brands: []
    };
  }
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.avgPositionRank || 0) - (b.avgPositionRank || 0));

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.avgPosition || 0,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      value: b.avgPosition || 0,
      fill: getColorForBrand(b.brandName)
    })),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.avgPosition || 0,
      rank: userBrand.avgPositionRank || 0
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName || 'Unknown',
      score: b.avgPosition || 0,
      rank: b.avgPositionRank || 0,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    }))
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
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatPerformanceInsights] No metrics or brand metrics found');
    return {
      shareOfVoice: {
        current: { percentage: 0, rank: 0 },
        brands: []
      },
      positionDistribution: {
        current: { firstRank: 0, secondRank: 0, thirdRank: 0, otherRank: 0 },
        brands: []
      }
    };
  }

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Check if userBrand exists and has required properties
  if (!userBrand) {
    console.log('⚠️ [formatPerformanceInsights] User brand not found:', {
      userBrandName,
      availableBrands: metrics.brandMetrics.map(b => b.brandName)
    });
    return {
      shareOfVoice: {
        current: { percentage: 0, rank: 0 },
        brands: []
      },
      positionDistribution: {
        current: { firstRank: 0, secondRank: 0, thirdRank: 0, otherRank: 0 },
        brands: []
      }
    };
  }
  
  // Calculate position distribution percentages
  const totalAppearances = (userBrand.count1st || 0) + (userBrand.count2nd || 0) + (userBrand.count3rd || 0) + (userBrand.countOther || 0);
  
  const positionDistribution = totalAppearances > 0 ? {
    firstRank: parseFloat((((userBrand.count1st || 0) / totalAppearances) * 100).toFixed(2)),
    secondRank: parseFloat((((userBrand.count2nd || 0) / totalAppearances) * 100).toFixed(2)),
    thirdRank: parseFloat((((userBrand.count3rd || 0) / totalAppearances) * 100).toFixed(2)),
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
        percentage: userBrand.shareOfVoice || 0,
        rank: userBrand.shareOfVoiceRank || 0
      },
      brands: metrics.brandMetrics.map(b => ({
        name: b.brandName || 'Unknown',
        value: b.shareOfVoice || 0,
        rank: b.shareOfVoiceRank || 0,
        color: getColorForBrand(b.brandName),
        isOwner: b.brandName === userBrandName
      })).sort((a, b) => (a.rank || 0) - (b.rank || 0))
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
 * Format competitors data for frontend (matches Competitor interface)
 */
function formatCompetitorsData(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatCompetitorsData] No metrics or brand metrics found');
    return [];
  }

  // Sort brands by visibility rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.visibilityRank || 0) - (b.visibilityRank || 0));

  return sortedBrands.map((brand, index) => ({
    id: brand.brandId || `brand-${index}`,
    name: brand.brandName || 'Unknown',
    logo: '', // Will be handled by frontend favicon logic
    score: brand.visibilityScore || 0,
    rank: brand.visibilityRank || 0,
    change: 0, // TODO: Calculate from historical data
    trend: 'stable', // TODO: Calculate from historical data
    // Sentiment data
    sentimentScore: brand.sentimentScore || 0,
    sentimentBreakdown: brand.sentimentBreakdown || { positive: 0, neutral: 0, negative: 0, mixed: 0 },
    // Citation data
    citationShare: brand.citationShare || 0,
    citationRank: brand.citationShareRank || 0,
    brandCitationsTotal: brand.brandCitationsTotal || 0,
    earnedCitationsTotal: brand.earnedCitationsTotal || 0,
    socialCitationsTotal: brand.socialCitationsTotal || 0,
    totalCitations: brand.totalCitations || 0
  }));
}

/**
 * Format competitors data specifically for Citations tab (matches citations frontend expectations)
 */
function formatCompetitorsByCitationData(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics || metrics.brandMetrics.length === 0) {
    console.log('⚠️ [formatCompetitorsByCitationData] No metrics or brand metrics found');
    return [];
  }

  // Sort brands by citation share rank for citation-specific ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => (a.citationShareRank || 0) - (b.citationShareRank || 0));

  return sortedBrands.map((brand, index) => ({
    id: brand.brandId || `brand-${index}`,
    name: brand.brandName || 'Unknown',
    // Citation-specific fields that frontend expects
    score: brand.citationShare || 0, // Frontend expects 'score' for citation share
    rank: brand.citationShareRank || 0,
    change: 0, // TODO: Calculate from historical data
    trend: 'stable', // TODO: Calculate from historical data
    // Citation breakdown data
    citationShare: brand.citationShare || 0,
    citationRank: brand.citationShareRank || 0,
    brandCitationsTotal: brand.brandCitationsTotal || 0,
    earnedCitationsTotal: brand.earnedCitationsTotal || 0,
    socialCitationsTotal: brand.socialCitationsTotal || 0,
    totalCitations: brand.totalCitations || 0,
    // Additional citation data
    isOwner: brand.brandName === userBrandName
  }));
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
router.get('/citations/:brandName/:type', devAuth, async (req, res) => {
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

    // Helper function to extract URLs from raw response
    const extractUrlsFromResponse = (rawResponse) => {
      const urlRegex = /https?:\/\/[^\s\)\]\}]+/g;
      const urls = rawResponse.match(urlRegex) || [];
      // Clean up URLs by removing trailing punctuation
      return urls.map(url => url.replace(/[\)\]\}]+$/, ''));
    };

    // Helper function to map citation references to URLs
    const mapCitationRefToUrl = (rawResponse, citationRef) => {
      // Clean up URL if it's already a URL
      if (citationRef && citationRef.startsWith('http')) {
        return citationRef.replace(/[\)\]\}]+$/, ''); // Remove trailing punctuation
      }
      
      // Try to extract citation number from reference like "citation_2"
      const match = citationRef?.match(/citation_(\d+)/);
      if (match) {
        const citationNum = parseInt(match[1]);
        const urls = extractUrlsFromResponse(rawResponse);
        
        // Map citation number to URL index (citation_1 = first URL, citation_2 = second URL, etc.)
        if (citationNum > 0 && citationNum <= urls.length) {
          return urls[citationNum - 1];
        }
      }
      
      // Fallback to original reference
      return citationRef;
    };

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

              // Map citation reference to actual URL
              const actualUrl = mapCitationRefToUrl(test.rawResponse, citation.url);

              // Skip citations that couldn't be mapped to actual URLs
              if (!actualUrl || actualUrl.startsWith('citation_')) {
                return; // Skip this citation
              }

              const citationData = {
                id: `${test._id}-${citation._id}`,
                url: actualUrl,
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
              if (!citationMap.has(actualUrl)) {
                citationMap.set(actualUrl, {
                  url: actualUrl,
                  context: citation.context,
                  type: citation.type,
                  platforms: new Set(),
                  prompts: new Map() // Use Map to deduplicate by promptText
                });
              }

              const groupedCitation = citationMap.get(actualUrl);
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


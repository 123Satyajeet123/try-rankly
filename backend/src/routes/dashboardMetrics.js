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
  if (!metrics) return null;

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => a.visibilityRank - b.visibilityRank);

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.visibilityScore,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => ({
      name: b.brandName,
      value: b.visibilityScore,
      fill: getColorForBrand(b.brandName)
    })),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.visibilityScore,
      rank: userBrand.visibilityRank
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName,
      score: b.visibilityScore,
      rank: b.visibilityRank,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format depth of mention data for frontend
 */
function formatDepthData(metrics, userBrandName) {
  if (!metrics) return null;

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => a.depthRank - b.depthRank);

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.depthOfMention,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => ({
      name: b.brandName,
      value: b.depthOfMention,
      fill: getColorForBrand(b.brandName)
    })),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.depthOfMention,
      rank: userBrand.depthRank
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName,
      score: b.depthOfMention,
      rank: b.depthRank,
      isOwner: b.brandName === userBrandName,
      color: getColorForBrand(b.brandName)
    }))
  };
}

/**
 * Format average position data for frontend
 */
function formatAveragePositionData(metrics, userBrandName) {
  if (!metrics) return null;

  const userBrand = metrics.brandMetrics.find(b => b.brandName === userBrandName) || metrics.brandMetrics[0];
  
  // Sort brands by rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => a.avgPositionRank - b.avgPositionRank);

  return {
    // ✅ Frontend expects 'value' property for the main metric
    value: userBrand.avgPosition,
    
    // ✅ Frontend expects 'data' array for chart visualization
    data: sortedBrands.map(b => ({
      name: b.brandName,
      value: b.avgPosition,
      fill: getColorForBrand(b.brandName)
    })),
    
    // ✅ Keep existing structure for backward compatibility
    current: {
      score: userBrand.avgPosition,
      rank: userBrand.avgPositionRank
    },
    brands: sortedBrands.map(b => ({
      name: b.brandName,
      score: b.avgPosition,
      rank: b.avgPositionRank,
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
 * Format competitors data for frontend (matches Competitor interface)
 */
function formatCompetitorsData(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics) return [];

  // Sort brands by visibility rank for consistent ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => a.visibilityRank - b.visibilityRank);

  return sortedBrands.map((brand, index) => ({
    id: brand.brandId || `brand-${index}`,
    name: brand.brandName,
    logo: '', // Will be handled by frontend favicon logic
    score: brand.visibilityScore,
    rank: brand.visibilityRank,
    change: 0, // TODO: Calculate from historical data
    trend: 'stable', // TODO: Calculate from historical data
    // Sentiment data
    sentimentScore: brand.sentimentScore,
    sentimentBreakdown: brand.sentimentBreakdown,
    // Citation data
    citationShare: brand.citationShare,
    citationRank: brand.citationShareRank,
    brandCitationsTotal: brand.brandCitationsTotal,
    earnedCitationsTotal: brand.earnedCitationsTotal,
    socialCitationsTotal: brand.socialCitationsTotal,
    totalCitations: brand.totalCitations
  }));
}

/**
 * Format competitors data specifically for Citations tab (matches citations frontend expectations)
 */
function formatCompetitorsByCitationData(metrics, userBrandName) {
  if (!metrics || !metrics.brandMetrics) return [];

  // Sort brands by citation share rank for citation-specific ordering
  const sortedBrands = metrics.brandMetrics
    .sort((a, b) => a.citationShareRank - b.citationShareRank);

  return sortedBrands.map((brand, index) => ({
    id: brand.brandId || `brand-${index}`,
    name: brand.brandName,
    // Citation-specific fields that frontend expects
    score: brand.citationShare, // Frontend expects 'score' for citation share
    rank: brand.citationShareRank,
    change: 0, // TODO: Calculate from historical data
    trend: 'stable', // TODO: Calculate from historical data
    // Citation breakdown data
    citationShare: brand.citationShare,
    citationRank: brand.citationShareRank,
    brandCitationsTotal: brand.brandCitationsTotal,
    earnedCitationsTotal: brand.earnedCitationsTotal,
    socialCitationsTotal: brand.socialCitationsTotal,
    totalCitations: brand.totalCitations,
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


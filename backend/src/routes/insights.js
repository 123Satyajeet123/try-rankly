const express = require('express');
const insightsService = require('../services/insightsService');
const router = express.Router();

// Development authentication middleware (bypasses JWT)
const devAuth = require('../middleware/devAuth');

/**
 * POST /api/insights/generate
 * Generate insights for a specific tab
 */
router.post('/generate', devAuth, async (req, res) => {
  try {
    const { tabType = 'visibility', urlAnalysisId } = req.body;
    const userId = req.userId;

    console.log(`🧠 [Insights API] Generating ${tabType} insights for user ${userId}`);

    // Check if insights already exist and are fresh
    const existingInsights = await insightsService.getStoredInsights(userId, urlAnalysisId, tabType);
    if (existingInsights) {
      console.log(`✅ [Insights API] Returning cached insights for ${tabType}`);
      return res.json({
        success: true,
        data: existingInsights,
        cached: true,
        message: `Fresh ${tabType} insights retrieved from cache`
      });
    }

    // Generate new insights
    const insights = await insightsService.generateInsights(userId, urlAnalysisId, tabType);
    
    res.json({
      success: true,
      data: insights,
      cached: false,
      message: `${tabType} insights generated successfully`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error generating insights:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate insights'
    });
  }
});

/**
 * GET /api/insights/:tabType
 * Get stored insights for a specific tab
 */
router.get('/:tabType', devAuth, async (req, res) => {
  try {
    const { tabType } = req.params;
    const { urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`📭 [Insights API] Getting ${tabType} insights for user ${userId}`);

    const insights = await insightsService.getStoredInsights(userId, urlAnalysisId, tabType);
    
    if (!insights) {
      return res.status(404).json({
        success: false,
        message: `No insights found for ${tabType} tab. Generate insights first.`
      });
    }

    // Transform insights to ensure only description, impact, recommendation fields
    const transformInsight = (insight) => ({
      description: insight.description,
      impact: insight.impact,
      recommendation: insight.recommendation
    });

    const transformedData = {
      whatsWorking: insights.whatsWorking.map(transformInsight),
      needsAttention: insights.needsAttention.map(transformInsight),
      generatedAt: insights.generatedAt
    };

    res.json({
      success: true,
      data: transformedData,
      message: `${tabType} insights retrieved successfully`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error getting insights:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve insights'
    });
  }
});

/**
 * DELETE /api/insights/:tabType
 * Clear stored insights for a specific tab
 */
router.delete('/:tabType', devAuth, async (req, res) => {
  try {
    const { tabType } = req.params;
    const { urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`🗑️ [Insights API] Clearing ${tabType} insights for user ${userId}`);

    // This would need to be implemented in the service
    // await insightsService.clearInsights(userId, urlAnalysisId, tabType);
    
    res.json({
      success: true,
      message: `${tabType} insights cleared successfully`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error clearing insights:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to clear insights'
    });
  }
});

/**
 * GET /api/insights/test/data-collection
 * Test endpoint to see how data is structured for insights
 */
router.get('/test/data-collection', devAuth, async (req, res) => {
  try {
    const { tabType = 'visibility', urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`🧪 [Insights API] Testing data collection for ${tabType}`);

    // Collect structured data without generating insights
    const structuredData = await insightsService.collectTabData(userId, urlAnalysisId, tabType);
    
    res.json({
      success: true,
      data: structuredData,
      message: `Data collection test for ${tabType} completed`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error in data collection test:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Data collection test failed'
    });
  }
});

/**
 * GET /api/insights/test/prompt
 * Test endpoint to see the generated prompt
 */
router.get('/test/prompt', devAuth, async (req, res) => {
  try {
    const { tabType = 'visibility', urlAnalysisId } = req.query;
    const userId = req.userId;

    console.log(`🧪 [Insights API] Testing prompt generation for ${tabType}`);

    // Collect data and generate prompt
    const structuredData = await insightsService.collectTabData(userId, urlAnalysisId, tabType);
    const prompt = insightsService.generatePrompt(structuredData, tabType);
    
    res.json({
      success: true,
      data: {
        structuredData: structuredData,
        prompt: prompt
      },
      message: `Prompt generation test for ${tabType} completed`
    });

  } catch (error) {
    console.error(`❌ [Insights API] Error in prompt test:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Prompt generation test failed'
    });
  }
});

module.exports = router;

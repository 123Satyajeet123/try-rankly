const express = require('express');
const { body, validationResult } = require('express-validator');
const Prompt = require('../models/Prompt');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');
const UrlAnalysis = require('../models/UrlAnalysis');
const { generatePrompts } = require('../services/promptGenerationService');
const promptTestingService = require('../services/promptTestingService');
const PromptTest = require('../models/PromptTest');
const router = express.Router();

// Development authentication middleware (bypasses JWT)
const devAuth = require('../middleware/devAuth');

// Get all prompts for user
router.get('/', devAuth, async (req, res) => {
  try {
    const { topicId, status = 'active' } = req.query;
    
    let query = { userId: req.userId };
    if (topicId) query.topicId = topicId;
    if (status) query.status = status;

    const prompts = await Prompt.find(query).populate('topicId', 'name');
    
    res.json({
      success: true,
      data: prompts
    });

  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prompts'
    });
  }
});

// Create new prompt
router.post('/', devAuth, [
  body('topicId').isMongoId(),
  body('personaId').isMongoId(),
  body('queryType').isIn(['Navigational', 'Commercial Investigation', 'Transactional', 'Comparative', 'Reputational']),
  body('title').trim().notEmpty(),
  body('text').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { topicId, personaId, queryType, title, text, metadata = {} } = req.body;

    // Verify topic belongs to user
    const topic = await Topic.findOne({ _id: topicId, userId: req.userId });
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Verify persona belongs to user
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Persona not found'
      });
    }

    console.log(`✅ [CREATE PROMPT] topicId: ${topicId}, personaId: ${personaId}, queryType: ${queryType}`);

    const prompt = new Prompt({
      userId: req.userId,
      topicId,
      personaId,
      queryType,
      title,
      text,
      metadata
    });

    await prompt.save();

    // Update topic prompt count
    topic.promptCount += 1;
    await topic.save();

    res.status(201).json({
      success: true,
      message: 'Prompt created successfully',
      data: prompt
    });

  } catch (error) {
    console.error('Create prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prompt'
    });
  }
});

// Update prompt
router.put('/:id', devAuth, [
  body('title').optional().trim().notEmpty(),
  body('text').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const prompt = await Prompt.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      message: 'Prompt updated successfully',
      data: prompt
    });

  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prompt'
    });
  }
});

// Delete prompt
router.delete('/:id', devAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const prompt = await Prompt.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Update topic prompt count
    const topic = await Topic.findById(prompt.topicId);
    if (topic) {
      topic.promptCount = Math.max(0, topic.promptCount - 1);
      await topic.save();
    }

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });

  } catch (error) {
    console.error('Delete prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prompt'
    });
  }
});

// Generate prompts using AI (placeholder)
// Generate prompts for all selected topics and personas
router.post('/generate', devAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('🎯 Starting prompt generation for user:', userId);

    // Get the latest URL analysis for this user
    const latestAnalysis = await UrlAnalysis.findOne({ userId })
      .sort({ analysisDate: -1 })
      .limit(1);

    if (!latestAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No website analysis found. Please analyze your website first.'
      });
    }

    // Get selected topics (with selected: true)
    const selectedTopics = await Topic.find({ 
      userId, 
      selected: true 
    });

    // Get selected personas (with selected: true)
    const selectedPersonas = await Persona.find({ 
      userId, 
      selected: true 
    });

    // Get competitors for context
    const competitors = await Competitor.find({ 
      userId, 
      selected: true 
    });

    if (selectedTopics.length === 0 || selectedPersonas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least 1 topic and 1 persona to generate prompts'
      });
    }

    console.log(`📊 Selected: ${selectedTopics.length} topics, ${selectedPersonas.length} personas, ${competitors.length} competitors`);
    console.log(`📊 Brand context: ${latestAnalysis.brandContext.companyName || 'Unknown'}`);

    // Prepare data for prompt generation
    const topics = selectedTopics.map(t => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description || '',
      keywords: t.keywords || []
    }));

    const personas = selectedPersonas.map(p => ({
      id: p._id.toString(),
      type: p.type,
      description: p.description || '',
      painPoints: p.painPoints || [],
      goals: p.goals || []
    }));

    const competitorData = competitors.map(c => ({
      name: c.name,
      url: c.url
    }));

    // Generate prompts using AI service
    // Use centralized configuration
    const { config } = require('../config/hyperparameters');
    const promptsPerQueryType = config.prompts.perQueryType;
    
    console.log(`📊 Generating ${promptsPerQueryType} prompts per query type (${promptsPerQueryType * 5} per combination)`);
    
    const generatedPrompts = await generatePrompts({
      topics,
      personas,
      region: 'Global',
      language: 'English',
      websiteUrl: latestAnalysis.url,
      brandContext: latestAnalysis.brandContext || '',
      competitors: competitorData,
      promptsPerQueryType
    });

    console.log(`✨ Generated ${generatedPrompts.length} prompts`);

    // Save prompts to database
    const savedPrompts = [];
    for (const promptData of generatedPrompts) {
      // Find the topic and persona ObjectIds
      const topic = selectedTopics.find(t => t._id.toString() === promptData.topicId);
      const persona = selectedPersonas.find(p => p._id.toString() === promptData.personaId);

      if (!topic || !persona) {
        console.warn('Skipping prompt - topic or persona not found:', promptData);
        continue;
      }

      const prompt = new Prompt({
        userId,
        topicId: topic._id,
        personaId: persona._id,
        title: `${topic.name} × ${persona.type} - ${promptData.queryType}`,
        text: promptData.promptText,
        queryType: promptData.queryType,
        metadata: {
          generatedBy: 'ai',
          targetPersonas: [persona.type],
          targetCompetitors: competitorData.map(c => c.name)
        }
      });

      await prompt.save();
      savedPrompts.push({
        id: prompt._id,
        topicName: topic.name,
        personaType: persona.type,
        promptText: prompt.text,
        promptIndex: promptData.promptIndex
      });
    }

    // Update topic and persona prompt counts
    for (const topic of selectedTopics) {
      const count = savedPrompts.filter(p => p.topicName === topic.name).length;
      topic.promptCount = (topic.promptCount || 0) + count;
      await topic.save();
    }

    console.log(`💾 Saved ${savedPrompts.length} prompts to database`);

    res.json({
      success: true,
      message: `Successfully generated ${savedPrompts.length} prompts`,
      data: {
        totalPrompts: savedPrompts.length,
        prompts: savedPrompts,
        combinations: {
          topics: topics.length,
          personas: personas.length,
          promptsPerCombination: 5
        }
      }
    });

  } catch (error) {
    console.error('❌ Generate prompts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate prompts'
    });
  }
});

// Test all prompts with LLMs
router.post('/test', devAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { urlAnalysisId } = req.body; // Optional URL analysis ID
    
    console.log('\n' + '='.repeat(70));
    console.log('🧪 [API ENDPOINT] POST /api/prompts/test');
    console.log(`👤 User ID: ${userId}`);
    if (urlAnalysisId) {
      console.log(`🔗 URL Analysis ID: ${urlAnalysisId}`);
    }
    console.log(`⏰ Request time: ${new Date().toISOString()}`);
    console.log('='.repeat(70) + '\n');
    
    // Check if user has any prompts
    console.log('🔍 [VALIDATION] Checking for existing prompts...');
    const promptCount = await Prompt.countDocuments({ 
      userId, 
      status: 'active' 
    });
    
    console.log(`✅ [VALIDATION] Found ${promptCount} active prompts`);
    
    if (promptCount === 0) {
      console.error('❌ [VALIDATION] No prompts found - aborting test');
      return res.status(400).json({
        success: false,
        message: 'No prompts found to test. Please generate prompts first.'
      });
    }
    
    // Use centralized configuration
    const { config } = require('../config/hyperparameters');
    const maxPromptsToTest = config.prompts.maxToTest;
    
    console.log(`📊 [START] Testing prompts across 4 LLMs (limit: ${maxPromptsToTest})...`);
    const testStartTime = Date.now();
    
    // Start testing (this will take time)
    const results = await promptTestingService.testAllPrompts(userId, {
      batchSize: 5, // Process 5 prompts at a time
      testLimit: maxPromptsToTest,  // Use centralized configuration
      urlAnalysisId: urlAnalysisId  // Pass URL analysis ID if provided
    });
    
    const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ [API RESPONSE] Testing complete');
    console.log(`⏱️  Total duration: ${testDuration}s`);
    console.log(`📊 Results: ${results.completedTests}/${results.totalTests} successful`);
    console.log('='.repeat(70) + '\n');
    
    res.json({
      success: true,
      message: `Testing completed: ${results.totalTests} total tests`,
      data: results
    });
    
  } catch (error) {
    console.error('\n' + '❌'.repeat(35));
    console.error('❌ [API ERROR] Prompt testing failed');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('❌'.repeat(35) + '\n');
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test prompts'
    });
  }
});

// Get test results for a specific prompt
router.get('/:promptId/tests', devAuth, async (req, res) => {
  try {
    const { promptId } = req.params;
    const userId = req.userId;
    
    // Verify prompt belongs to user
    const prompt = await Prompt.findOne({ _id: promptId, userId });
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }
    
    // Get all test results for this prompt
    const tests = await PromptTest.find({ promptId, userId })
      .sort({ testedAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: {
        prompt: {
          id: prompt._id,
          text: prompt.text,
          queryType: prompt.queryType
        },
        tests,
        summary: {
          totalTests: tests.length,
          averageScore: tests.reduce((sum, t) => sum + t.scorecard.overallScore, 0) / tests.length || 0,
          brandMentionRate: (tests.filter(t => t.scorecard.brandMentioned).length / tests.length * 100) || 0
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Get test results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test results'
    });
  }
});

// Get all test results for user (for dashboard analytics)
router.get('/tests/all', devAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 100, llmProvider, status = 'completed' } = req.query;
    
    let query = { userId, status };
    if (llmProvider) {
      query.llmProvider = llmProvider;
    }
    
    const tests = await PromptTest.find(query)
      .sort({ testedAt: -1 })
      .limit(parseInt(limit))
      .populate('promptId', 'text queryType')
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .lean();
    
    // Calculate aggregate statistics
    const stats = {
      totalTests: tests.length,
      averageVisibilityScore: 0,
      averageOverallScore: 0,
      brandMentionRate: 0,
      llmPerformance: {}
    };
    
    if (tests.length > 0) {
      stats.averageVisibilityScore = Math.round(
        tests.reduce((sum, t) => sum + t.scorecard.visibilityScore, 0) / tests.length
      );
      stats.averageOverallScore = Math.round(
        tests.reduce((sum, t) => sum + t.scorecard.overallScore, 0) / tests.length
      );
      stats.brandMentionRate = Math.round(
        (tests.filter(t => t.scorecard.brandMentioned).length / tests.length) * 100
      );
      
      // Calculate per-LLM performance
      const llmGroups = {};
      tests.forEach(t => {
        if (!llmGroups[t.llmProvider]) {
          llmGroups[t.llmProvider] = [];
        }
        llmGroups[t.llmProvider].push(t.scorecard.overallScore);
      });
      
      for (const [llm, scores] of Object.entries(llmGroups)) {
        stats.llmPerformance[llm] = {
          averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          testCount: scores.length
        };
      }
    }

    res.json({
      success: true,
      data: {
        tests,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Get all tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test results'
    });
  }
});

// Get prompts tab data with topics/personas and individual prompts
router.get('/dashboard', devAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { urlAnalysisId } = req.query; // Get analysis ID from query parameter
    
    console.log('📊 [PROMPTS DASHBOARD] Fetching prompts tab data for user:', userId);
    console.log('📊 [PROMPTS DASHBOARD] Requested analysis ID:', urlAnalysisId);
    
    // Get the specific analysis or fallback to latest
    let analysis;
    if (urlAnalysisId) {
      analysis = await UrlAnalysis.findOne({ userId, _id: urlAnalysisId });
      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not found'
        });
      }
    } else {
      // Fallback to latest analysis if no ID provided
      analysis = await UrlAnalysis.findOne({ userId })
        .sort({ analysisDate: -1 })
        .limit(1);
    }
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'No analysis found'
      });
    }
    
    const brandName = analysis?.brandContext?.companyName || 'Unknown Brand';
    const brandId = brandName.toLowerCase().replace(/[^a-z0-9®]/g, '-').replace(/-+/g, '-').replace(/-$/, '');
    
    console.log(`✅ [PROMPTS DASHBOARD] Brand name: ${brandName}, brandId: ${brandId}`);
    
    // Helper functions for mathematical calculations with edge case handling
    const calculateResponseLevelMetrics = (test) => {
      // Calculate visibility score for this response (brand mentioned = 100%, not mentioned = 0%)
      const visibilityScore = test.scorecard?.brandMentioned ? 100 : 0;
      
      // Calculate depth of mention from brandMetrics data
      let depthOfMention = 0;
      if (test.brandMetrics && test.brandMetrics.length > 0 && test.responseMetadata) {
        const brandMetric = test.brandMetrics.find(bm => bm.brandName === brandName);
        if (brandMetric && brandMetric.totalWordCount && test.responseMetadata.totalWords) {
          // Edge case: prevent division by zero
          depthOfMention = test.responseMetadata.totalWords > 0 
            ? (brandMetric.totalWordCount / test.responseMetadata.totalWords) * 100 
            : 0;
        }
      }
      
      // Calculate average position (brand position from scorecard)
      const avgPosition = test.scorecard?.brandPosition || 0;
      
      // Calculate citation share for this response
      let citationShare = 0;
      if (test.scorecard?.totalCitations && test.scorecard?.totalCitations > 0) {
        citationShare = (test.scorecard.brandCitations / test.scorecard.totalCitations) * 100;
      }
      
      return {
        visibilityScore,
        depthOfMention,
        avgPosition,
        citationShare,
        totalCitations: test.scorecard?.totalCitations || 0,
        brandCitations: test.scorecard?.brandCitations || 0
      };
    };
    
    const calculateAverage = (values) => {
      // Edge case: empty array
      if (!values || values.length === 0) return 0;
      
      // Filter out invalid values (null, undefined, NaN)
      const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
      
      // Edge case: no valid values
      if (validValues.length === 0) return 0;
      
      const sum = validValues.reduce((acc, val) => acc + val, 0);
      return Math.round((sum / validValues.length) * 100) / 100; // Round to 2 decimal places
    };
    
    const calculateBrandMentionRate = (responseMetrics) => {
      // Edge case: empty array
      if (!responseMetrics || responseMetrics.length === 0) return 0;
      
      const mentionedCount = responseMetrics.filter(rm => rm.visibilityScore > 0).length;
      return Math.round((mentionedCount / responseMetrics.length) * 100);
    };

    const calculatePromptRanks = (prompts) => {
      if (!prompts || prompts.length === 0) return prompts;
      
      // Sort prompts by different metrics to calculate ranks
      const sortedByVisibility = [...prompts].sort((a, b) => b.metrics.visibilityScore - a.metrics.visibilityScore);
      const sortedByDepth = [...prompts].sort((a, b) => b.metrics.depthOfMention - a.metrics.depthOfMention);
      const sortedByPosition = [...prompts].sort((a, b) => a.metrics.avgPosition - b.metrics.avgPosition);
      const sortedByCitation = [...prompts].sort((a, b) => b.metrics.citationShare - a.metrics.citationShare);
      
      // Add ranks to each prompt
      return prompts.map(prompt => {
        const visibilityRank = sortedByVisibility.findIndex(p => p.id === prompt.id) + 1;
        const depthRank = sortedByDepth.findIndex(p => p.id === prompt.id) + 1;
        const positionRank = sortedByPosition.findIndex(p => p.id === prompt.id) + 1;
        const citationRank = sortedByCitation.findIndex(p => p.id === prompt.id) + 1;
        
        return {
          ...prompt,
          metrics: {
            ...prompt.metrics,
            visibilityRank,
            depthRank,
            avgPositionRank: positionRank,
            citationShareRank: citationRank
          }
        };
      });
    };
    
    // Get only SELECTED topics and personas for the specified analysis
    const topics = await Topic.find({ userId, urlAnalysisId: analysis._id, selected: true }).lean();
    const personas = await Persona.find({ userId, urlAnalysisId: analysis._id, selected: true }).lean();
    
    // Get aggregated metrics for topics and personas for the specified analysis
    const AggregatedMetrics = require('../models/AggregatedMetrics');
    const topicMetrics = await AggregatedMetrics.find({ 
      userId, 
      scope: 'topic',
      urlAnalysisId: analysis._id
    }).lean();
    
    const personaMetrics = await AggregatedMetrics.find({ 
      userId, 
      scope: 'persona',
      urlAnalysisId: analysis._id
    }).lean();
    
    // Get individual prompt test results for metrics for the specified analysis
    const promptTests = await PromptTest.find({ 
      userId, 
      status: 'completed',
      urlAnalysisId: analysis._id
    })
    .populate('promptId', 'text queryType topicId personaId')
    .populate('topicId', 'name')
    .populate('personaId', 'type')
    .lean();
    
    // Process topics data using existing calculated metrics from aggregatedmetrics
    const processedTopics = topics.map(topic => {
      // Find the aggregated metrics for this topic (scope: 'topic')
      const topicAggregatedMetrics = topicMetrics.find(m => m.scopeValue === topic.name);
      const brandMetrics = topicAggregatedMetrics?.brandMetrics?.find(bm => bm.brandId === brandId);
      
      // Get all prompt tests for this topic to group by prompt
      const topicPromptTests = promptTests.filter(test => 
        test.topicId && test.topicId.name === topic.name
      );
      
      // Group by prompt ID to aggregate response-level metrics across LLMs
      const promptGroups = {};
      topicPromptTests.forEach(test => {
        const promptId = test.promptId?._id?.toString();
        if (!promptId) return;
        
        if (!promptGroups[promptId]) {
          promptGroups[promptId] = {
            prompt: test.promptId,
            tests: [],
            responseMetrics: []
          };
        }
        
        promptGroups[promptId].tests.push(test);
        
        // Calculate response-level metrics for this LLM test
        const responseMetrics = calculateResponseLevelMetrics(test);
        promptGroups[promptId].responseMetrics.push(responseMetrics);
      });
      
      // Calculate aggregated metrics for each unique prompt
      const aggregatedPrompts = Object.values(promptGroups).map(group => {
        const responseMetrics = group.responseMetrics;
        
        // Calculate averages across all LLM responses for this prompt
        const avgVisibilityScore = calculateAverage(responseMetrics.map(rm => rm.visibilityScore));
        const avgDepthOfMention = calculateAverage(responseMetrics.map(rm => rm.depthOfMention));
        const avgPosition = calculateAverage(responseMetrics.map(rm => rm.avgPosition));
        const avgCitationShare = calculateAverage(responseMetrics.map(rm => rm.citationShare));
        const brandMentionRate = calculateBrandMentionRate(responseMetrics);
        
        return {
          id: group.prompt._id,
          text: group.prompt.text || 'N/A',
          queryType: group.prompt.queryType || 'N/A',
          totalTests: responseMetrics.length,
          metrics: {
            visibilityScore: avgVisibilityScore,
            depthOfMention: avgDepthOfMention,
            avgPosition: avgPosition,
            brandMentioned: brandMentionRate > 0,
            brandMentionRate: brandMentionRate,
            citationShare: avgCitationShare,
            totalCitations: responseMetrics.reduce((sum, rm) => sum + rm.totalCitations, 0),
            brandCitations: responseMetrics.reduce((sum, rm) => sum + rm.brandCitations, 0)
          }
        };
      });
      
      // Calculate ranks for individual prompts within this topic
      const rankedPrompts = calculatePromptRanks(aggregatedPrompts);
      
      return {
        id: topic._id,
        name: topic.name,
        type: 'topic',
        totalPrompts: rankedPrompts.length,
        metrics: {
          visibilityScore: brandMetrics?.visibilityScore || 0,
          visibilityRank: brandMetrics?.visibilityRank || 0,
          depthOfMention: brandMetrics?.depthOfMention || 0,
          depthRank: brandMetrics?.depthRank || 0,
          avgPosition: brandMetrics?.avgPosition || 0,
          avgPositionRank: brandMetrics?.avgPositionRank || 0,
          citationShare: brandMetrics?.citationShare || 0,
          citationShareRank: brandMetrics?.citationShareRank || 0
        },
        prompts: rankedPrompts
      };
    });
    
    // Process personas data using existing calculated metrics from aggregatedmetrics
    const processedPersonas = personas.map(persona => {
      // Find the aggregated metrics for this persona (scope: 'persona')
      const personaAggregatedMetrics = personaMetrics.find(m => m.scopeValue === persona.type);
      const brandMetrics = personaAggregatedMetrics?.brandMetrics?.find(bm => bm.brandId === brandId);
      
      // Get all prompt tests for this persona to group by prompt
      const personaPromptTests = promptTests.filter(test => 
        test.personaId && test.personaId.type === persona.type
      );
      
      // Group by prompt ID to aggregate response-level metrics across LLMs
      const promptGroups = {};
      personaPromptTests.forEach(test => {
        const promptId = test.promptId?._id?.toString();
        if (!promptId) return;
        
        if (!promptGroups[promptId]) {
          promptGroups[promptId] = {
            prompt: test.promptId,
            tests: [],
            responseMetrics: []
          };
        }
        
        promptGroups[promptId].tests.push(test);
        
        // Calculate response-level metrics for this LLM test
        const responseMetrics = calculateResponseLevelMetrics(test);
        promptGroups[promptId].responseMetrics.push(responseMetrics);
      });
      
      // Calculate aggregated metrics for each unique prompt
      const aggregatedPrompts = Object.values(promptGroups).map(group => {
        const responseMetrics = group.responseMetrics;
        
        // Calculate averages across all LLM responses for this prompt
        const avgVisibilityScore = calculateAverage(responseMetrics.map(rm => rm.visibilityScore));
        const avgDepthOfMention = calculateAverage(responseMetrics.map(rm => rm.depthOfMention));
        const avgPosition = calculateAverage(responseMetrics.map(rm => rm.avgPosition));
        const avgCitationShare = calculateAverage(responseMetrics.map(rm => rm.citationShare));
        const brandMentionRate = calculateBrandMentionRate(responseMetrics);
        
        return {
          id: group.prompt._id,
          text: group.prompt.text || 'N/A',
          queryType: group.prompt.queryType || 'N/A',
          totalTests: responseMetrics.length,
          metrics: {
            visibilityScore: avgVisibilityScore,
            depthOfMention: avgDepthOfMention,
            avgPosition: avgPosition,
            brandMentioned: brandMentionRate > 0,
            brandMentionRate: brandMentionRate,
            citationShare: avgCitationShare,
            totalCitations: responseMetrics.reduce((sum, rm) => sum + rm.totalCitations, 0),
            brandCitations: responseMetrics.reduce((sum, rm) => sum + rm.brandCitations, 0)
          }
        };
      });
      
      // Calculate ranks for individual prompts within this persona
      const rankedPrompts = calculatePromptRanks(aggregatedPrompts);
      
      return {
        id: persona._id,
        name: persona.type,
        type: 'persona',
        totalPrompts: rankedPrompts.length,
        metrics: {
          visibilityScore: brandMetrics?.visibilityScore || 0,
          visibilityRank: brandMetrics?.visibilityRank || 0,
          depthOfMention: brandMetrics?.depthOfMention || 0,
          depthRank: brandMetrics?.depthRank || 0,
          avgPosition: brandMetrics?.avgPosition || 0,
          avgPositionRank: brandMetrics?.avgPositionRank || 0,
          citationShare: brandMetrics?.citationShare || 0,
          citationShareRank: brandMetrics?.citationShareRank || 0
        },
        prompts: rankedPrompts
      };
    });
    
    // Combine and sort all items
    const allItems = [...processedTopics, ...processedPersonas]
      .filter(item => item.totalPrompts > 0) // Only show items with prompts
      .sort((a, b) => b.metrics.visibilityScore - a.metrics.visibilityScore);
    
    const totalPrompts = allItems.reduce((sum, item) => sum + item.totalPrompts, 0);
    
    console.log(`✅ [PROMPTS DASHBOARD] Found ${allItems.length} items with ${totalPrompts} total prompts`);
    
    res.json({
      success: true,
      data: {
        items: allItems,
        summary: {
          totalPrompts,
          totalTopics: processedTopics.filter(t => t.totalPrompts > 0).length,
          totalPersonas: processedPersonas.filter(p => p.totalPrompts > 0).length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [PROMPTS DASHBOARD] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prompts dashboard data'
    });
  }
});

// Get detailed prompt analysis with LLM responses
router.get('/details/:promptId', devAuth, async (req, res) => {
  try {
    const { promptId } = req.params;
    const userId = req.userId;

    console.log(`📊 [PROMPT DETAILS] Fetching prompt details for ${promptId}`);

    // Find the prompt with populated topic
    const prompt = await Prompt.findById(promptId).populate('topicId');
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Get the brand name from the latest URL analysis for this user
    const latestAnalysis = await UrlAnalysis.findOne({ userId })
      .sort({ analysisDate: -1 })
      .limit(1);
    
    const brandName = latestAnalysis?.brandContext?.companyName || 'Unknown Brand';
    const brandId = brandName.toLowerCase().replace(/[^a-z0-9®]/g, '-').replace(/-+/g, '-').replace(/-$/, '');

    console.log(`✅ [PROMPT DETAILS] Brand name: ${brandName}, brandId: ${brandId}`);

    // Find all prompt tests for this prompt
    const promptTests = await PromptTest.find({ 
      userId, 
      promptId 
    })
    .populate('topicId')
    .populate('personaId')
    .lean();

    console.log(`✅ [PROMPT DETAILS] Found ${promptTests.length} tests for prompt: ${prompt.text}`);

    // Group responses by platform
    const platformResponses = {};
    const platformNames = {
      'openai': 'OpenAI',
      'claude': 'Claude', 
      'perplexity': 'Perplexity',
      'gemini': 'Gemini'
    };

    promptTests.forEach(test => {
      const platformName = platformNames[test.llmProvider] || test.llmProvider;
      
      if (!platformResponses[platformName]) {
        platformResponses[platformName] = {
          platform: platformName,
          response: test.rawResponse || 'No response available',
          llmProvider: test.llmProvider,
          llmModel: test.llmModel,
          responseTime: test.responseTime,
          tokensUsed: test.tokensUsed,
          cost: test.cost,
          createdAt: test.createdAt,
          metrics: test.scorecard || {}
        };
      }
    });

    // Calculate aggregated metrics for this prompt
    const aggregatedMetrics = {
      visibilityScore: 0,
      depthOfMention: 0,
      avgPosition: 0,
      brandMentioned: false,
      brandMentionRate: 0,
      citationShare: 0,
      totalCitations: 0,
      brandCitations: 0
    };

    // Aggregate metrics from all tests
    if (promptTests.length > 0) {
      const totalTests = promptTests.length;
      let brandMentionCount = 0;
      let totalCitations = 0;
      let brandCitations = 0;

      promptTests.forEach(test => {
        if (test.scorecard) {
          aggregatedMetrics.visibilityScore += (test.scorecard.brandMentioned ? 100 : 0);
          aggregatedMetrics.depthOfMention += (test.scorecard.depthOfMention || 0);
          aggregatedMetrics.avgPosition += (test.scorecard.averagePosition || 0);
          
          if (test.scorecard.brandMentioned) {
            brandMentionCount++;
          }
          
          totalCitations += (test.scorecard.totalCitations || 0);
          brandCitations += (test.scorecard.brandCitations || 0);
        }
      });

      // Calculate averages
      aggregatedMetrics.visibilityScore = Math.round(aggregatedMetrics.visibilityScore / totalTests);
      aggregatedMetrics.depthOfMention = Math.round(aggregatedMetrics.depthOfMention / totalTests);
      aggregatedMetrics.avgPosition = Math.round(aggregatedMetrics.avgPosition / totalTests);
      aggregatedMetrics.brandMentionRate = Math.round((brandMentionCount / totalTests) * 100);
      aggregatedMetrics.totalCitations = totalCitations;
      aggregatedMetrics.brandCitations = brandCitations;
      aggregatedMetrics.citationShare = totalCitations > 0 ? Math.round((brandCitations / totalCitations) * 100) : 0;
      aggregatedMetrics.brandMentioned = brandMentionCount > 0;
    }

    const response = {
      success: true,
      data: {
        prompt: {
          id: prompt._id,
          text: prompt.text,
          queryType: prompt.queryType || 'General',
          createdAt: prompt.createdAt
        },
        topic: promptTests[0]?.topicId?.name || 'Unknown',
        persona: promptTests[0]?.personaId?.type || 'Unknown',
        brandName: brandName,
        platformResponses,
        aggregatedMetrics,
        totalTests: promptTests.length
      }
    };

    console.log(`✅ [PROMPT DETAILS] Returning prompt details with ${Object.keys(platformResponses).length} platforms`);

    res.json(response);

  } catch (error) {
    console.error('❌ [PROMPT DETAILS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prompt details',
      error: error.message
    });
  }
});

module.exports = router;


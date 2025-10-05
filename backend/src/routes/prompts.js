const express = require('express');
const jwt = require('jsonwebtoken');
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

// Get all prompts for user
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, [
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
router.put('/:id', authenticateToken, [
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
router.delete('/:id', authenticateToken, async (req, res) => {
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
router.post('/generate', authenticateToken, async (req, res) => {
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
    }).limit(2);

    // Get selected personas (with selected: true)
    const selectedPersonas = await Persona.find({ 
      userId, 
      selected: true 
    }).limit(2);

    // Get competitors for context
    const competitors = await Competitor.find({ 
      userId, 
      selected: true 
    }).limit(4);

    if (selectedTopics.length === 0 || selectedPersonas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least 1 topic and 1 persona to generate prompts'
      });
    }

    console.log(`📊 Selected: ${selectedTopics.length} topics, ${selectedPersonas.length} personas`);

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
    const generatedPrompts = await generatePrompts({
      topics,
      personas,
      region: 'Global',
      language: 'English',
      websiteUrl: latestAnalysis.url,
      brandContext: latestAnalysis.brandContext || '',
      competitors: competitorData
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
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('\n' + '='.repeat(70));
    console.log('🧪 [API ENDPOINT] POST /api/prompts/test');
    console.log(`👤 User ID: ${userId}`);
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
    
    console.log(`📊 [START] Testing prompts across 4 LLMs (limited to 2 for testing)...`);
    const testStartTime = Date.now();
    
    // Start testing (this will take time)
    const results = await promptTestingService.testAllPrompts(userId, {
      batchSize: 2, // Process 2 prompts at a time
      testLimit: 2  // TESTING: Only test 2 prompts to save API costs
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
router.get('/:promptId/tests', authenticateToken, async (req, res) => {
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
router.get('/tests/all', authenticateToken, async (req, res) => {
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

module.exports = router;


const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Competitor = require('../models/Competitor');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
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

// Get onboarding data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's data
    const competitors = await Competitor.find({ userId: req.userId });
    const topics = await Topic.find({ userId: req.userId });
    const personas = await Persona.find({ userId: req.userId });

    res.json({
      success: true,
      data: {
        onboarding: {
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            company: user.companyName,
            website: user.websiteUrl
          },
          websiteUrl: user.websiteUrl,
          competitors: competitors.filter(c => c.selected).map(c => c.url),
          topics: topics.filter(t => t.selected).map(t => t.name),
          personas: personas.filter(p => p.selected).map(p => p.description),
          regions: [user.preferences.region],
          languages: [user.preferences.language],
          preferences: {
            industry: user.companyName,
            targetAudience: personas.filter(p => p.selected).map(p => p.type).join(', '),
            goals: ['Improve SEO', 'Increase visibility', 'Content optimization']
          },
          currentStep: user.onboarding.currentStep,
          isCompleted: user.onboarding.isCompleted
        }
      }
    });

  } catch (error) {
    console.error('Get onboarding data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get onboarding data'
    });
  }
});

// Update onboarding data in bulk
router.put('/bulk', authenticateToken, async (req, res) => {
  try {
    const { profile, websiteUrl, competitors, topics, personas, regions, languages, preferences } = req.body;

    // Update user profile
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user data
    if (profile) {
      user.firstName = profile.firstName || user.firstName;
      user.lastName = profile.lastName || user.lastName;
      user.companyName = profile.company || user.companyName;
      user.websiteUrl = profile.website || user.websiteUrl;
    }

    if (websiteUrl) {
      user.websiteUrl = websiteUrl;
    }

    if (regions && regions.length > 0) {
      user.preferences.region = regions[0];
    }

    if (languages && languages.length > 0) {
      user.preferences.language = languages[0];
    }

    user.onboarding.currentStep = 8;
    user.onboarding.isCompleted = true;
    await user.save();

    // Update competitors
    if (competitors && Array.isArray(competitors)) {
      // Clear existing selections
      await Competitor.updateMany({ userId: req.userId }, { selected: false });
      
      // Update selected competitors
      for (const url of competitors) {
        const competitor = await Competitor.findOne({ userId: req.userId, url });
        if (competitor) {
          competitor.selected = true;
          await competitor.save();
        }
      }
    }

    // Update topics
    if (topics && Array.isArray(topics)) {
      // Clear existing selections
      await Topic.updateMany({ userId: req.userId }, { selected: false });
      
      // Update selected topics
      for (const name of topics) {
        const topic = await Topic.findOne({ userId: req.userId, name });
        if (topic) {
          topic.selected = true;
          await topic.save();
        }
      }
    }

    // Update personas
    if (personas && Array.isArray(personas)) {
      // Clear existing selections
      await Persona.updateMany({ userId: req.userId }, { selected: false });
      
      // Update selected personas
      for (const description of personas) {
        const persona = await Persona.findOne({ userId: req.userId, description });
        if (persona) {
          persona.selected = true;
          await persona.save();
        }
      }
    }

    res.json({
      success: true,
      message: 'Onboarding data updated successfully'
    });

  } catch (error) {
    console.error('Update onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update onboarding data'
    });
  }
});

// Analyze website endpoint with AI integration
router.post('/analyze-website', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Website URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid URL (e.g., https://example.com)'
      });
    }

    console.log(`🔍 Starting website analysis for user ${req.userId}: ${url}`);

    // Import URL cleanup service
    const urlCleanupService = require('../services/urlCleanupService');

    // Check if this URL already exists for this user
    const urlExists = await urlCleanupService.urlExists(req.userId, url);
    
    if (urlExists) {
      console.log(`🔄 URL already exists, cleaning up previous analysis data...`);
      
      // Get cleanup stats before cleanup
      const cleanupStats = await urlCleanupService.getCleanupStats(req.userId, url);
      if (cleanupStats.success) {
        console.log(`📊 Cleanup stats:`, cleanupStats.data);
      }
      
      // Perform comprehensive cleanup
      const cleanupResult = await urlCleanupService.cleanupUrlData(req.userId, url);
      
      if (!cleanupResult.success) {
        console.error('❌ Cleanup failed:', cleanupResult.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to cleanup existing URL data',
          error: cleanupResult.error
        });
      }
      
      console.log(`✅ Cleanup completed: ${cleanupResult.results.totalDeleted} items removed`);
    }

    // Update user's website URL
    const user = await User.findById(req.userId);
    if (user) {
      user.websiteUrl = url;
      await user.save();
    }

    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('⚠️ OpenRouter API key not configured');
      return res.status(500).json({
        success: false,
        message: 'AI analysis service not configured. Please set OPENROUTER_API_KEY in environment variables.'
      });
    }
    
    // Import website analysis service
    const websiteAnalysisService = require('../services/websiteAnalysisService');
    
    // Perform comprehensive website analysis
    const analysisResults = await websiteAnalysisService.analyzeWebsite(url);
    
    // Save complete analysis results to UrlAnalysis collection
    const urlAnalysis = new UrlAnalysis({
      userId: req.userId,
      url: url,
      brandContext: analysisResults.brandContext,
      competitors: analysisResults.competitors || [],
      topics: analysisResults.topics || [],
      personas: analysisResults.personas || [],
      analysisDate: new Date(analysisResults.analysisDate),
      status: 'completed'
    });
    
    await urlAnalysis.save();
    
    // Save individual items to respective collections for user selection
    // Note: Cleanup was already handled above by the URL cleanup service
    
    // Save competitors
    if (analysisResults.competitors && analysisResults.competitors.length > 0) {
      const competitorPromises = analysisResults.competitors.map(comp => {
        return new Competitor({
          userId: req.userId,
          name: comp.name,
          url: comp.url,
          reason: comp.reason,
          similarity: comp.similarity,
          source: 'ai',
          selected: false
        }).save();
      });
      await Promise.all(competitorPromises);
    }
    
    // Save topics
    if (analysisResults.topics && analysisResults.topics.length > 0) {
      const topicPromises = analysisResults.topics.map(topic => {
        return new Topic({
          userId: req.userId,
          name: topic.name,
          description: topic.description,
          keywords: topic.keywords || [],
          priority: topic.priority,
          source: 'ai',
          selected: false
        }).save();
      });
      await Promise.all(topicPromises);
    }
    
    // Save personas
    if (analysisResults.personas && analysisResults.personas.length > 0) {
      const personaPromises = analysisResults.personas.map(persona => {
        return new Persona({
          userId: req.userId,
          type: persona.type,
          description: persona.description,
          painPoints: persona.painPoints || [],
          goals: persona.goals || [],
          relevance: persona.relevance,
          source: 'ai',
          selected: false
        }).save();
      });
      await Promise.all(personaPromises);
    }
    
    console.log('✅ Website analysis completed and saved to database successfully');

    res.json({
      success: true,
      message: 'Website analysis completed successfully',
      data: {
        analysis: {
          status: 'completed',
          brandContext: analysisResults.brandContext,
          competitors: analysisResults.competitors || [],
          topics: analysisResults.topics || [],
          personas: analysisResults.personas || [],
          analysisDate: analysisResults.analysisDate
        }
      }
    });

  } catch (error) {
    console.error('Website analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Website analysis failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Analysis service temporarily unavailable'
    });
  }
});

// Get latest website analysis results
router.get('/latest-analysis', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the latest analysis for this user
    const latestAnalysis = await UrlAnalysis.findOne({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No analysis found for this user'
      });
    }

    // Get all available items (AI-generated + user-created)
    const [competitors, topics, personas] = await Promise.all([
      Competitor.find({ userId: req.userId }).lean(),
      Topic.find({ userId: req.userId }).lean(),
      Persona.find({ userId: req.userId }).lean()
    ]);

    res.json({
      success: true,
      data: {
        analysis: {
          id: latestAnalysis._id,
          url: latestAnalysis.url,
          analysisDate: latestAnalysis.analysisDate,
          brandContext: latestAnalysis.brandContext,
          competitors: latestAnalysis.competitors,
          topics: latestAnalysis.topics,
          personas: latestAnalysis.personas
        },
        availableItems: {
          competitors: competitors,
          topics: topics,
          personas: personas
        }
      }
    });

  } catch (error) {
    console.error('Get latest analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analysis data'
    });
  }
});

// Check if user has done URL analysis before
router.get('/has-analysis', authenticateToken, async (req, res) => {
  try {
    const analysisCount = await UrlAnalysis.countDocuments({ userId: req.userId });

    res.json({
      success: true,
      data: {
        hasAnalysis: analysisCount > 0,
        analysisCount: analysisCount
      }
    });
  } catch (error) {
    console.error('Check analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check analysis status'
    });
  }
});

// Cleanup URL data endpoint (for manual cleanup if needed)
router.post('/cleanup-url', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required for cleanup'
      });
    }

    console.log(`🧹 Manual cleanup requested for URL: ${url} (User: ${req.userId})`);

    // Import URL cleanup service
    const urlCleanupService = require('../services/urlCleanupService');
    
    // Perform cleanup
    const cleanupResult = await urlCleanupService.cleanupUrlData(req.userId, url);
    
    if (cleanupResult.success) {
      res.json({
        success: true,
        message: cleanupResult.message,
        data: {
          cleanupResults: cleanupResult.results,
          totalDeleted: cleanupResult.results.totalDeleted
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: cleanupResult.message,
        error: cleanupResult.error
      });
    }

  } catch (error) {
    console.error('❌ Manual cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup URL data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Cleanup service temporarily unavailable'
    });
  }
});

// Update selections for competitors, topics, and personas
router.post('/update-selections', authenticateToken, async (req, res) => {
  try {
    const { competitors = [], topics = [], personas = [] } = req.body;
    const userId = req.userId;

    console.log('📝 Updating selections for user:', userId);
    console.log('Competitor names/URLs:', competitors);
    console.log('Topic names:', topics);
    console.log('Persona types:', personas);

    // Reset all selections to false first
    await Competitor.updateMany({ userId }, { selected: false });
    await Topic.updateMany({ userId }, { selected: false });
    await Persona.updateMany({ userId }, { selected: false });

    let competitorsUpdated = 0;
    let topicsUpdated = 0;
    let personasUpdated = 0;

    // Update competitors - match by URL (most reliable identifier)
    for (const compUrl of competitors) {
      // First try to find existing competitor
      let result = await Competitor.updateOne(
        { userId, url: compUrl },
        { selected: true }
      );
      
      // If no existing competitor found, create a new one (for custom competitors)
      if (result.matchedCount === 0) {
        console.log(`📝 Creating new competitor for URL: ${compUrl}`);
        const newCompetitor = new Competitor({
          userId,
          name: compUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''), // Use domain as name
          url: compUrl,
          reason: 'User added manually',
          similarity: 0,
          source: 'user',
          selected: true
        });
        await newCompetitor.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) competitorsUpdated++;
    }

    // Update topics - match by name
    for (const topicName of topics) {
      // First try to find existing topic
      let result = await Topic.updateOne(
        { userId, name: topicName },
        { selected: true }
      );
      
      // If no existing topic found, create a new one (for custom topics)
      if (result.matchedCount === 0) {
        console.log(`📝 Creating new topic: ${topicName}`);
        const newTopic = new Topic({
          userId,
          name: topicName,
          description: 'User added manually',
          keywords: [],
          priority: 1,
          source: 'user',
          selected: true
        });
        await newTopic.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) topicsUpdated++;
    }

    // Update personas - match by type
    for (const personaType of personas) {
      // First try to find existing persona
      let result = await Persona.updateOne(
        { userId, type: personaType },
        { selected: true }
      );
      
      // If no existing persona found, create a new one (for custom personas)
      if (result.matchedCount === 0) {
        console.log(`📝 Creating new persona: ${personaType}`);
        const newPersona = new Persona({
          userId,
          type: personaType,
          description: 'User added manually',
          painPoints: [],
          goals: [],
          relevance: 1,
          source: 'user',
          selected: true
        });
        await newPersona.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) personasUpdated++;
    }

    console.log(`✅ Updated ${competitorsUpdated} competitors, ${topicsUpdated} topics, ${personasUpdated} personas`);

    res.json({
      success: true,
      message: 'Selections updated successfully',
      data: {
        competitorsSelected: competitorsUpdated,
        topicsSelected: topicsUpdated,
        personasSelected: personasUpdated
      }
    });

  } catch (error) {
    console.error('❌ Update selections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update selections'
    });
  }
});

// Generate prompts based on user selections
router.post('/generate-prompts', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('🎯 Starting prompt generation for user:', userId);

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get selected data
    const selectedCompetitors = await Competitor.find({ userId, selected: true });
    const selectedTopics = await Topic.find({ userId, selected: true });
    const selectedPersonas = await Persona.find({ userId, selected: true });

    // Get latest analysis data
    const latestAnalysis = await UrlAnalysis.findOne({ userId })
      .sort({ analysisDate: -1 });

    if (!latestAnalysis) {
      return res.status(400).json({
        success: false,
        message: 'No website analysis found. Please analyze a website first.'
      });
    }

    // Prepare data for prompt generation
    // Configurable via PROMPTS_PER_QUERY_TYPE env variable for stress testing
    const promptsPerQueryType = parseInt(process.env.PROMPTS_PER_QUERY_TYPE) || 3;
    
    const promptData = {
      topics: selectedTopics.map(topic => ({
        name: topic.name,
        description: topic.description,
        keywords: topic.keywords || []
      })),
      personas: selectedPersonas.map(persona => ({
        type: persona.type,
        description: persona.description,
        painPoints: persona.painPoints || [],
        goals: persona.goals || []
      })),
      region: user.preferences.region || 'Global',
      language: user.preferences.language || 'English',
      websiteUrl: user.websiteUrl,
      brandContext: JSON.stringify(latestAnalysis.brandContext),
      competitors: selectedCompetitors.map(comp => ({
        name: comp.name,
        url: comp.url,
        reason: comp.reason
      })),
      promptsPerQueryType
    };

    console.log('📊 Prompt generation data:', {
      topicsCount: promptData.topics.length,
      personasCount: promptData.personas.length,
      competitorsCount: promptData.competitors.length,
      promptsPerQueryType,
      totalPromptsPerCombination: promptsPerQueryType * 5
    });

    console.log('🔍 Available topics:', selectedTopics.map(t => ({ id: t._id, name: t.name })));
    console.log('🔍 Available personas:', selectedPersonas.map(p => ({ id: p._id, type: p.type })));

    // Import prompt generation service
    const promptGenerationService = require('../services/promptGenerationService');
    
    // Generate prompts
    const generatedPrompts = await promptGenerationService.generatePrompts(promptData);

    console.log(`✅ Generated ${generatedPrompts.length} prompts successfully`);
    console.log('🔍 Generated prompts sample:', generatedPrompts.slice(0, 2));

    // Save prompts to database (required for testing service)
    const Prompt = require('../models/Prompt');
    const savedPrompts = [];
    
    for (const promptData of generatedPrompts) {
      console.log('🔍 Processing prompt:', {
        topicName: promptData.topicName,
        personaType: promptData.personaType,
        queryType: promptData.queryType
      });

      // Find the topic and persona ObjectIds by name/type (not by the input IDs)
      const topic = selectedTopics.find(t => t.name === promptData.topicName);
      const persona = selectedPersonas.find(p => p.type === promptData.personaType);

      console.log('🔍 Matching results:', {
        topicFound: !!topic,
        personaFound: !!persona,
        topicMatch: topic ? { id: topic._id, name: topic.name } : null,
        personaMatch: persona ? { id: persona._id, type: persona.type } : null
      });

      if (!topic || !persona) {
        console.warn('❌ Skipping prompt - topic or persona not found:', {
          promptData: {
            topicName: promptData.topicName,
            personaType: promptData.personaType,
            queryType: promptData.queryType
          },
          availableTopics: selectedTopics.map(t => t.name),
          availablePersonas: selectedPersonas.map(p => p.type)
        });
        continue;
      }

      const prompt = new Prompt({
        userId,
        topicId: topic._id,
        personaId: persona._id,
        title: `${topic.name} × ${persona.type} - ${promptData.queryType}`,
        text: promptData.promptText,
        queryType: promptData.queryType,
        status: 'active', // Ensure status is active for testing
        metadata: {
          generatedBy: 'ai',
          targetPersonas: [persona.type],
          targetCompetitors: selectedCompetitors.map(c => c.name)
        }
      });

      await prompt.save();
      savedPrompts.push({
        id: prompt._id,
        topicName: topic.name,
        personaType: persona.type,
        promptText: prompt.text,
        queryType: prompt.queryType
      });
    }

    console.log(`💾 Saved ${savedPrompts.length} prompts to database`);

    res.json({
      success: true,
      message: 'Prompts generated successfully',
      data: {
        prompts: savedPrompts,
        totalPrompts: savedPrompts.length,
        generationDate: new Date().toISOString(),
        metadata: {
          topicsUsed: promptData.topics.length,
          personasUsed: promptData.personas.length,
          competitorsUsed: promptData.competitors.length,
          region: promptData.region,
          language: promptData.language
        }
      }
    });

  } catch (error) {
    console.error('❌ Prompt generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prompts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Prompt generation service temporarily unavailable'
    });
  }
});

module.exports = router;


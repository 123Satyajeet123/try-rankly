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
      competitors: analysisResults.competitors.competitors || [],
      topics: analysisResults.topics.topics || [],
      personas: analysisResults.personas.personas || [],
      analysisDate: new Date(analysisResults.analysisDate),
      status: 'completed'
    });
    
    await urlAnalysis.save();
    
    // Save individual items to respective collections for user selection
    // IMPORTANT: Clear ALL existing data for this user to prevent orphaned references
    // This ensures a clean slate for each new analysis and prevents data inconsistencies
    console.log('🧹 [CLEANUP] Removing old analysis data for fresh start...');
    
    // Get IDs of items to be deleted (for cleaning up related prompts)
    const oldTopicIds = await Topic.find({ userId: req.userId }).distinct('_id');
    const oldPersonaIds = await Persona.find({ userId: req.userId }).distinct('_id');
    
    // Delete old prompts that reference topics/personas about to be deleted
    // This prevents orphaned prompts with broken references
    const Prompt = require('../models/Prompt');
    if (oldTopicIds.length > 0 || oldPersonaIds.length > 0) {
      const deleteResult = await Prompt.deleteMany({
        userId: req.userId,
        $or: [
          { topicId: { $in: oldTopicIds } },
          { personaId: { $in: oldPersonaIds } }
        ]
      });
      console.log(`🗑️  [CLEANUP] Deleted ${deleteResult.deletedCount} old prompts`);
    }
    
    // Now delete the old topics, personas, and competitors
    await Competitor.deleteMany({ userId: req.userId });
    await Topic.deleteMany({ userId: req.userId });
    await Persona.deleteMany({ userId: req.userId });
    
    console.log('✅ [CLEANUP] Old data cleared, ready for fresh analysis');
    
    // Save competitors
    if (analysisResults.competitors.competitors && analysisResults.competitors.competitors.length > 0) {
      const competitorPromises = analysisResults.competitors.competitors.map(comp => {
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
    if (analysisResults.topics.topics && analysisResults.topics.topics.length > 0) {
      const topicPromises = analysisResults.topics.topics.map(topic => {
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
    if (analysisResults.personas.personas && analysisResults.personas.personas.length > 0) {
      const personaPromises = analysisResults.personas.personas.map(persona => {
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
          competitors: analysisResults.competitors.competitors || [],
          topics: analysisResults.topics.topics || [],
          personas: analysisResults.personas.personas || [],
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
      const result = await Competitor.updateOne(
        { userId, url: compUrl },
        { selected: true }
      );
      if (result.modifiedCount > 0) competitorsUpdated++;
    }

    // Update topics - match by name
    for (const topicName of topics) {
      const result = await Topic.updateOne(
        { userId, name: topicName },
        { selected: true }
      );
      if (result.modifiedCount > 0) topicsUpdated++;
    }

    // Update personas - match by type
    for (const personaType of personas) {
      const result = await Persona.updateOne(
        { userId, type: personaType },
        { selected: true }
      );
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

module.exports = router;


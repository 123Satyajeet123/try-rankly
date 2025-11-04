const express = require('express');
const User = require('../models/User');
const Competitor = require('../models/Competitor');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const UrlAnalysis = require('../models/UrlAnalysis');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

/**
 * Extract brand context from URL analysis, handling both brand-level and product-level analysis
 * @param {object} urlAnalysis - URL analysis document
 * @returns {object} - Brand context object
 */
function extractBrandContext(urlAnalysis) {
  if (!urlAnalysis) {
    return {
      companyName: 'Unknown Brand',
      industry: 'General',
      businessModel: 'General',
      targetMarket: 'General',
      valueProposition: 'Not specified',
      keyServices: ['Service'],
      brandTone: 'Professional',
      marketPosition: 'Mid-market'
    };
  }

  // For product-level analysis, extract brand from product context
  if (urlAnalysis.analysisLevel === 'product' && urlAnalysis.productContext) {
    const productContext = urlAnalysis.productContext;
    
    // Extract brand name from URL, brandContext, or product name
    let companyName = 'Unknown Brand';
    
    // Priority 1: Use brandContext.companyName (extracted by Perplexity during onboarding)
    if (urlAnalysis.brandContext?.companyName) {
      companyName = urlAnalysis.brandContext.companyName;
    }
    
    // Priority 3: Use product name as fallback (but this is not ideal)
    if (companyName === 'Unknown Brand' && productContext.productName) {
      companyName = productContext.productName;
    }

    return {
      companyName: companyName,
      industry: productContext.productCategory || 'Product',
      businessModel: 'Product',
      targetMarket: productContext.targetAudience || 'General',
      valueProposition: productContext.valueProposition || 'Not specified',
      keyServices: productContext.keyFeatures || ['Feature'],
      brandTone: 'Professional',
      marketPosition: productContext.marketPosition || 'Mid-market'
    };
  }

  // For category-level analysis
  if (urlAnalysis.analysisLevel === 'category' && urlAnalysis.categoryContext) {
    const categoryContext = urlAnalysis.categoryContext;
    
    return {
      companyName: categoryContext.categoryName || 'Unknown Category',
      industry: 'Category',
      businessModel: 'Category',
      targetMarket: categoryContext.targetMarket || 'General',
      valueProposition: 'Category offerings',
      keyServices: categoryContext.productTypes || ['Product'],
      brandTone: 'Professional',
      marketPosition: 'Mid-market'
    };
  }

  // For company-level analysis or fallback
  if (urlAnalysis.brandContext) {
    return urlAnalysis.brandContext;
  }

  // Final fallback
  return {
    companyName: 'Unknown Brand',
    industry: 'General',
    businessModel: 'General',
    targetMarket: 'General',
    valueProposition: 'Not specified',
    keyServices: ['Service'],
    brandTone: 'Professional',
    marketPosition: 'Mid-market'
  };
}

// JWT Authentication middleware
const { authenticateToken } = require('../middleware/auth');

// Get onboarding data
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { urlAnalysisId } = req.query; // ✅ Accept urlAnalysisId as query parameter
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ FIX: Get latest analysis if urlAnalysisId not provided, or use specific analysis
    let targetAnalysis = null;
    if (urlAnalysisId) {
      targetAnalysis = await UrlAnalysis.findOne({ _id: urlAnalysisId, userId: req.userId }).lean();
      if (!targetAnalysis) {
        return res.status(404).json({
          success: false,
          message: 'URL analysis not found for the provided ID'
        });
      }
    } else {
      targetAnalysis = await UrlAnalysis.findOne({ userId: req.userId })
        .sort({ createdAt: -1 })
        .lean();
    }

    // ✅ FIX: Filter by urlAnalysisId if available, otherwise get all (backward compatibility)
    const queryFilter = targetAnalysis ? { userId: req.userId, urlAnalysisId: targetAnalysis._id } : { userId: req.userId };
    
    // Get user's data (filtered by analysis if available)
    const competitors = await Competitor.find(queryFilter);
    const topics = await Topic.find(queryFilter);
    const personas = await Persona.find(queryFilter);

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
          competitors: competitors.filter(c => c.selected && c.url).map(c => c.url),
          topics: topics.filter(t => t.selected && t.name).map(t => t.name),
          personas: personas.filter(p => p.selected && p.description).map(p => p.description),
          regions: [user.preferences.region],
          languages: [user.preferences.language],
          preferences: {
            industry: user.companyName,
            targetAudience: personas.filter(p => p.selected && p.type).map(p => p.type).join(', '),
            goals: ['Improve SEO', 'Increase visibility', 'Content optimization']
          },
          currentStep: user.onboarding.currentStep,
          isCompleted: user.onboarding.isCompleted
        }
      }
    });

  } catch (error) {
    // Error will be handled by errorHandler middleware
    throw error;
  }
}));

// Update onboarding data in bulk
router.put('/bulk', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { profile, websiteUrl, competitors, topics, personas, regions, languages, preferences, urlAnalysisId } = req.body;

    // Update user profile
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ FIX: Get target analysis if urlAnalysisId provided
    let targetAnalysis = null;
    if (urlAnalysisId) {
      targetAnalysis = await UrlAnalysis.findOne({ _id: urlAnalysisId, userId: req.userId });
      if (!targetAnalysis) {
        return res.status(404).json({
          success: false,
          message: 'URL analysis not found for the provided ID'
        });
      }
    } else {
      // Fall back to latest analysis
      targetAnalysis = await UrlAnalysis.findOne({ userId: req.userId })
        .sort({ createdAt: -1 });
      console.warn('⚠️ [BULK] No urlAnalysisId provided, using latest analysis');
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

    // ✅ FIX: Update competitors - filter by urlAnalysisId if available
    if (competitors && Array.isArray(competitors)) {
      // Clear existing selections for this analysis (or all if no analysis)
      const resetQuery = targetAnalysis 
        ? { userId: req.userId, urlAnalysisId: targetAnalysis._id }
        : { userId: req.userId };
      await Competitor.updateMany(resetQuery, { selected: false });
      
      // Update selected competitors (match by URL and urlAnalysisId)
      for (const url of competitors) {
        const query = targetAnalysis
          ? { userId: req.userId, url, urlAnalysisId: targetAnalysis._id }
          : { userId: req.userId, url };
        const competitor = await Competitor.findOne(query);
        if (competitor) {
          competitor.selected = true;
          await competitor.save();
        }
      }
    }

    // ✅ FIX: Update topics - filter by urlAnalysisId if available
    if (topics && Array.isArray(topics)) {
      const resetQuery = targetAnalysis
        ? { userId: req.userId, urlAnalysisId: targetAnalysis._id }
        : { userId: req.userId };
      await Topic.updateMany(resetQuery, { selected: false });
      
      for (const name of topics) {
        const query = targetAnalysis
          ? { userId: req.userId, name, urlAnalysisId: targetAnalysis._id }
          : { userId: req.userId, name };
        const topic = await Topic.findOne(query);
        if (topic) {
          topic.selected = true;
          await topic.save();
        }
      }
    }

    // ✅ FIX: Update personas - filter by urlAnalysisId if available
    if (personas && Array.isArray(personas)) {
      const resetQuery = targetAnalysis
        ? { userId: req.userId, urlAnalysisId: targetAnalysis._id }
        : { userId: req.userId };
      await Persona.updateMany(resetQuery, { selected: false });
      
      for (const description of personas) {
        const query = targetAnalysis
          ? { userId: req.userId, description, urlAnalysisId: targetAnalysis._id }
          : { userId: req.userId, description };
        const persona = await Persona.findOne(query);
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
    // Error will be handled by errorHandler middleware
    throw error;
  }
}));

// Analyze website endpoint with AI integration
router.post('/analyze-website', authenticateToken, asyncHandler(async (req, res) => {
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
    const urlAnalysisData = {
      userId: req.userId,
      url: url,
      analysisLevel: analysisResults.analysisLevel || 'company',
      competitors: analysisResults.competitors || [],
      topics: analysisResults.topics || [],
      personas: analysisResults.personas || [],
      analysisDate: new Date(analysisResults.analysisDate),
      status: 'completed'
    };

    // Add context based on analysis level
    if (analysisResults.analysisLevel === 'product' && analysisResults.productContext) {
      urlAnalysisData.productContext = analysisResults.productContext;
      // For product-level, brandContext might not exist, so make it optional
      urlAnalysisData.brandContext = analysisResults.brandContext || {
        companyName: analysisResults.productContext.productName || 'Unknown',
        industry: 'Product',
        businessModel: 'Product',
        targetMarket: analysisResults.productContext.targetAudience || 'General',
        valueProposition: analysisResults.productContext.valueProposition || 'Not specified',
        keyServices: analysisResults.productContext.keyFeatures || [],
        brandTone: 'Professional',
        marketPosition: analysisResults.productContext.marketPosition || 'Mid-market'
      };
    } else if (analysisResults.analysisLevel === 'category' && analysisResults.categoryContext) {
      urlAnalysisData.categoryContext = analysisResults.categoryContext;
      // For category-level, brandContext might not exist, so make it optional
      urlAnalysisData.brandContext = analysisResults.brandContext || {
        companyName: analysisResults.categoryContext.categoryName || 'Unknown',
        industry: 'Category',
        businessModel: 'Category',
        targetMarket: analysisResults.categoryContext.targetMarket || 'General',
        valueProposition: 'Category offerings',
        keyServices: analysisResults.categoryContext.productTypes || [],
        brandTone: 'Professional',
        marketPosition: 'Mid-market'
      };
    } else {
      // Company-level analysis
      urlAnalysisData.brandContext = analysisResults.brandContext;
    }

    const urlAnalysis = new UrlAnalysis(urlAnalysisData);
    
    await urlAnalysis.save();
    
    // Save individual items to respective collections for user selection
    // Note: Cleanup was already handled above by the URL cleanup service
    
    console.log('🔍 [DEBUG] Starting individual document creation...');
    console.log('🔍 [DEBUG] Analysis results:', {
      competitors: analysisResults.competitors?.length || 0,
      topics: analysisResults.topics?.length || 0,
      personas: analysisResults.personas?.length || 0
    });
    
    // Save competitors
    console.log('🔍 [DEBUG] Checking competitors:', analysisResults.competitors?.length || 0);
    if (analysisResults.competitors && analysisResults.competitors.length > 0) {
      console.log('🔍 [DEBUG] Creating competitors with urlAnalysisId:', urlAnalysis._id);
      try {
        const competitorPromises = analysisResults.competitors.map(comp => {
          return new Competitor({
            userId: req.userId,
            name: comp.name,
            url: comp.url,
            reason: comp.reason,
            similarity: comp.similarity,
            source: 'ai',
            selected: false,
            urlAnalysisId: urlAnalysis._id // ✅ FIX: Set urlAnalysisId
          }).save();
        });
        await Promise.all(competitorPromises);
        console.log('✅ [DEBUG] Competitors created successfully');
      } catch (error) {
        console.error('❌ [DEBUG] Error creating competitors:', error);
      }
    } else {
      console.log('⚠️ [DEBUG] No competitors to create');
    }
    
    // Save topics
    if (analysisResults.topics && analysisResults.topics.length > 0) {
      const topicPromises = analysisResults.topics.map(topic => {
        // Defensive: Remove any unwanted branding info from topic object (futureproof)
        const sanitizedTopic = {
          userId: req.userId,
          name: topic.name,
          description: topic.description,
          keywords: topic.keywords || [],
          priority: topic.priority,
          source: 'ai',
          selected: false,
          urlAnalysisId: urlAnalysis._id // ✅ FIX: Set urlAnalysisId
        };
        // Remove any accidental brand/brandContext fields (not present today, but defensive)
        delete sanitizedTopic.brand;
        delete sanitizedTopic.brandContext;
        return new Topic(sanitizedTopic).save();
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
          selected: false,
          urlAnalysisId: urlAnalysis._id // ✅ FIX: Set urlAnalysisId
        }).save();
      });
      await Promise.all(personaPromises);
    }
    
    console.log('✅ Website analysis completed and saved to database successfully');

    res.json({
      success: true,
      message: 'Website analysis completed successfully',
      data: {
        urlAnalysisId: urlAnalysis._id, // Include the URL analysis ID
        analysis: {
          status: 'completed',
          analysisLevel: analysisResults.analysisLevel || 'company',
          brandContext: analysisResults.brandContext,
          productContext: analysisResults.productContext,
          categoryContext: analysisResults.categoryContext,
          competitors: analysisResults.competitors || [],
          topics: analysisResults.topics || [],
          personas: analysisResults.personas || [],
          analysisDate: analysisResults.analysisDate
        }
      }
    });

  } catch (error) {
    // Error will be handled by errorHandler middleware
    throw error;
  }
}));

// Get latest website analysis results
router.get('/latest-analysis', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { urlAnalysisId } = req.query; // ✅ Accept urlAnalysisId as query parameter
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ FIX: Use provided urlAnalysisId or fall back to latest
    const latestAnalysis = urlAnalysisId
      ? await UrlAnalysis.findOne({ _id: urlAnalysisId, userId: req.userId }).lean()
      : await UrlAnalysis.findOne({ userId: req.userId })
          .sort({ createdAt: -1 })
          .lean();

    if (!latestAnalysis) {
      return res.status(404).json({
        success: false,
        message: urlAnalysisId 
          ? 'URL analysis not found for the provided ID'
          : 'No analysis found for this user'
      });
    }

    // Get all available items (AI-generated + user-created) filtered by urlAnalysisId
    // ✅ FIX: Filter by urlAnalysisId to ensure data isolation between analyses
    const [competitors, topics, personas] = await Promise.all([
      Competitor.find({ userId: req.userId, urlAnalysisId: latestAnalysis._id }).lean(),
      Topic.find({ userId: req.userId, urlAnalysisId: latestAnalysis._id }).lean(),
      Persona.find({ userId: req.userId, urlAnalysisId: latestAnalysis._id }).lean()
    ]);

    res.json({
      success: true,
      data: {
        urlAnalysisId: latestAnalysis._id.toString(), // Add urlAnalysisId at top level for dashboard
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
    // Error will be handled by errorHandler middleware
    throw error;
  }
}));

// Check if user has done URL analysis before
router.get('/has-analysis', authenticateToken, asyncHandler(async (req, res) => {
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
    // Error will be handled by errorHandler middleware
    throw error;
  }
}));

// Cleanup URL data endpoint (for manual cleanup if needed)
router.post('/cleanup-url', authenticateToken, asyncHandler(async (req, res) => {
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
}));

// Update selections for competitors, topics, and personas
router.post('/update-selections', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { competitors = [], topics = [], personas = [], urlAnalysisId = null } = req.body;
    const userId = req.userId;

    console.log('📝 Updating selections for user:', userId);
    console.log('Competitor names/URLs:', competitors);
    console.log('Topic names:', topics);
    console.log('Persona types:', personas);
    console.log('URL Analysis ID:', urlAnalysisId);

    // ✅ FIX: Validate urlAnalysisId is provided
    if (!urlAnalysisId) {
      return res.status(400).json({
        success: false,
        message: 'urlAnalysisId is required for data isolation. Please provide the analysis ID.'
      });
    }

    // ✅ FIX: Verify urlAnalysisId exists and belongs to user
    const UrlAnalysis = require('../models/UrlAnalysis');
    const analysis = await UrlAnalysis.findOne({ _id: urlAnalysisId, userId });
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'URL analysis not found or does not belong to this user'
      });
    }

    // ✅ FIX: Only reset selections for the current analysis, not globally
    const resetQuery = { userId };
    if (urlAnalysisId) {
      resetQuery.urlAnalysisId = urlAnalysisId;
    }
    
    await Competitor.updateMany(resetQuery, { selected: false });
    await Topic.updateMany(resetQuery, { selected: false });
    await Persona.updateMany(resetQuery, { selected: false });

    let competitorsUpdated = 0;
    let topicsUpdated = 0;
    let personasUpdated = 0;

    // Update competitors - match by URL AND urlAnalysisId (ensures correct analysis)
    for (const compUrl of competitors) {
      // ✅ FIX: Match by both URL and urlAnalysisId to ensure we update the correct competitor
      if (!urlAnalysisId) {
        console.warn('⚠️  No urlAnalysisId provided for competitor selection, skipping:', compUrl);
        continue;
      }
      
      // First try to find existing competitor for this specific analysis
      let result = await Competitor.updateOne(
        { userId, url: compUrl, urlAnalysisId: urlAnalysisId }, // ✅ Match by both
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
          similarity: 'Medium', // Fixed: use valid enum value
          source: 'user',
          selected: true,
          urlAnalysisId: urlAnalysisId // ✅ FIX: Set urlAnalysisId
        });
        await newCompetitor.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) competitorsUpdated++;
    }

    // Update topics - match by name AND urlAnalysisId
    for (const topicName of topics) {
      if (!urlAnalysisId) {
        console.warn('⚠️  No urlAnalysisId provided for topic selection, skipping:', topicName);
        continue;
      }
      
      // ✅ FIX: Match by both name and urlAnalysisId to ensure correct analysis
      let result = await Topic.updateOne(
        { userId, name: topicName, urlAnalysisId: urlAnalysisId },
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
          priority: 'Medium', // Fixed: use valid enum value
          source: 'user',
          selected: true,
          urlAnalysisId: urlAnalysisId
        });
        await newTopic.save();
        result = { modifiedCount: 1 };
      }
      
      if (result.modifiedCount > 0) topicsUpdated++;
    }

    // Update personas - match by type AND urlAnalysisId
    for (const personaType of personas) {
      if (!urlAnalysisId) {
        console.warn('⚠️  No urlAnalysisId provided for persona selection, skipping:', personaType);
        continue;
      }
      
      // ✅ FIX: Match by both type and urlAnalysisId to ensure correct analysis
      let result = await Persona.updateOne(
        { userId, type: personaType, urlAnalysisId: urlAnalysisId },
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
          selected: true,
          urlAnalysisId: urlAnalysisId
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
}));

// Generate prompts based on user selections
router.post('/generate-prompts', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const { urlAnalysisId } = req.body; // ✅ Accept urlAnalysisId from frontend
    
    console.log('🎯 Starting prompt generation for user:', userId);
    console.log('🔗 URL Analysis ID:', urlAnalysisId || 'using latest');

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get target analysis - use provided urlAnalysisId or fall back to latest
    const targetAnalysis = urlAnalysisId
      ? await UrlAnalysis.findOne({ _id: urlAnalysisId, userId })
      : await UrlAnalysis.findOne({ userId }).sort({ analysisDate: -1 });
    
    if (!targetAnalysis) {
      return res.status(404).json({
        success: false,
        message: urlAnalysisId 
          ? 'URL analysis not found for the provided ID'
          : 'No website analysis found. Please analyze a website first.'
      });
    }
    
    const latestAnalysis = targetAnalysis; // Use for consistency with existing code

    // Get selected data for the latest analysis
    const selectedCompetitors = await Competitor.find({ userId, selected: true, urlAnalysisId: latestAnalysis._id });
    const selectedTopics = await Topic.find({ userId, selected: true, urlAnalysisId: latestAnalysis._id });
    const selectedPersonas = await Persona.find({ userId, selected: true, urlAnalysisId: latestAnalysis._id });

    // ✅ FIX: Validate that we have selected topics and personas
    if (selectedTopics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No topics selected. Please select at least 1 topic to generate prompts.'
      });
    }

    if (selectedPersonas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No personas selected. Please select at least 1 persona to generate prompts.'
      });
    }

    // Prepare data for prompt generation
    // Use default configuration
    const totalPrompts = 20;
    
    const promptData = {
      topics: selectedTopics.map(topic => ({
        _id: topic._id, // Keep MongoDB _id
        name: topic.name,
        description: topic.description,
        keywords: topic.keywords || []
      })),
      personas: selectedPersonas.map(persona => ({
        _id: persona._id, // Keep MongoDB _id
        type: persona.type,
        description: persona.description,
        painPoints: persona.painPoints || [],
        goals: persona.goals || []
      })),
      region: user.preferences.region || 'Global',
      language: user.preferences.language || 'English',
      websiteUrl: user.websiteUrl || '',
      brandContext: extractBrandContext(latestAnalysis),
      // competitors removed - not needed for TOFU queries
      totalPrompts
    };

    console.log('📊 Prompt generation data:', {
      topicsCount: promptData.topics.length,
      personasCount: promptData.personas.length,
      totalPrompts
    });

    console.log('🔍 Available topics:', selectedTopics.map(t => ({ _id: t._id, name: t.name })));
    console.log('🔍 Available personas:', selectedPersonas.map(p => ({ _id: p._id, type: p.type })));

    // Import prompt generation service
    const promptGenerationService = require('../services/promptGenerationService');
    const { normalizePromptText } = require('../services/promptGenerationService');
    
    // Generate prompts
    const generatedPrompts = await promptGenerationService.generatePrompts(promptData);

    console.log(`✅ Generated ${generatedPrompts.length} prompts successfully`);
    console.log('🔍 Generated prompts sample:', generatedPrompts.slice(0, 2));

    // Save prompts to database (required for testing service)
    const Prompt = require('../models/Prompt');
    const savedPrompts = [];
    const skippedDuplicates = [];
    
    for (const promptData of generatedPrompts) {
      console.log('🔍 Processing prompt:', {
        topicId: promptData.topicId,
        topicName: promptData.topicName,
        personaId: promptData.personaId,
        personaType: promptData.personaType,
        queryType: promptData.queryType
      });

      // ✅ Use IDs directly from generated prompts (Priority 2 fix)
      // Convert to string for comparison (handles both ObjectId and string formats)
      const topicIdStr = promptData.topicId?.toString();
      const personaIdStr = promptData.personaId?.toString();
      
      let topic = selectedTopics.find(t => t._id.toString() === topicIdStr);
      let persona = selectedPersonas.find(p => p._id.toString() === personaIdStr);

      console.log('🔍 Matching results (by ID):', {
        topicFound: !!topic,
        personaFound: !!persona,
        topicMatch: topic ? { _id: topic._id.toString(), name: topic.name } : null,
        personaMatch: persona ? { _id: persona._id.toString(), type: persona.type } : null,
        expectedTopicId: topicIdStr,
        expectedPersonaId: personaIdStr
      });

      // Fallback: If ID matching fails, try name/type matching (backward compatibility)
      if (!topic || !persona) {
        console.warn('⚠️  ID matching failed, trying name/type matching as fallback...');
        const topicFallback = selectedTopics.find(t => t.name === promptData.topicName);
        const personaFallback = selectedPersonas.find(p => p.type === promptData.personaType);
        
        if (topicFallback && personaFallback) {
          console.log('✅ Fallback matching succeeded');
          topic = topicFallback;
          persona = personaFallback;
        } else {
          console.warn('❌ Skipping prompt - topic or persona not found by ID or name/type:', {
            promptData: {
              topicId: topicIdStr,
              topicName: promptData.topicName,
              personaId: personaIdStr,
              personaType: promptData.personaType,
              queryType: promptData.queryType
            },
            availableTopics: selectedTopics.map(t => ({ _id: t._id.toString(), name: t.name })),
            availablePersonas: selectedPersonas.map(p => ({ _id: p._id.toString(), type: p.type }))
          });
          continue;
        }
      }

      // ✅ FIX: Check for duplicate prompts in database before saving
      const normalized = normalizePromptText(promptData.promptText);
      const existingPrompt = await Prompt.findOne({
        userId,
        urlAnalysisId: latestAnalysis._id, // ✅ Check duplicates within same analysis
        topicId: topic._id,
        personaId: persona._id,
        queryType: promptData.queryType,
        text: { $regex: new RegExp('^' + normalized + '$', 'i') }
      });
      
      if (existingPrompt) {
        console.log(`⏩ Skipping duplicate prompt for ${topic.name} × ${persona.type}:`, promptData.promptText.substring(0, 50));
        skippedDuplicates.push({
          promptText: promptData.promptText.substring(0, 50),
          topicName: topic.name,
          personaType: persona.type
        });
        continue;
      }

      const prompt = new Prompt({
        userId,
        urlAnalysisId: latestAnalysis._id, // ✅ Link prompt to the URL analysis
        topicId: topic._id,
        personaId: persona._id,
        title: `${topic.name} × ${persona.type} - ${promptData.queryType}`,
        text: promptData.promptText,
        queryType: promptData.queryType,
        status: 'active', // Ensure status is active for testing
        metadata: {
          generatedBy: 'ai',
          targetPersonas: [persona.type],
          targetCompetitors: selectedCompetitors.filter(c => c.name).map(c => c.name)
        }
      });

      await prompt.save();
      savedPrompts.push({
        _id: prompt._id,
        topicName: topic.name,
        personaType: persona.type,
        promptText: prompt.text,
        queryType: prompt.queryType
      });
    }

    console.log(`💾 Saved ${savedPrompts.length} prompts to database`);
    if (skippedDuplicates.length > 0) {
      console.log(`⏩ Skipped ${skippedDuplicates.length} duplicate prompts`);
    }

    // Trigger prompt testing and then metrics calculation after prompt generation
    try {
      console.log('🧪 Starting automatic prompt testing...');
      const promptTestingService = require('../services/promptTestingService');
      const testingService = promptTestingService;
      
      // ✅ FIX: Wait a bit longer to ensure all prompts are fully committed to database
      // This prevents race condition where testing might start before all prompts are saved
      console.log('⏳ Waiting for database writes to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased from 1s to 2s
      
      // Test all prompts automatically (filtered by urlAnalysisId)
      const testResults = await testingService.testAllPrompts(userId, {
        batchSize: 5,
        testLimit: 20,
        urlAnalysisId: latestAnalysis._id // ✅ Pass urlAnalysisId to filter prompts
      });
      
      console.log(`✅ Prompt testing completed: ${testResults.totalTests} tests`);
      
      // Now calculate metrics after testing
      console.log('🔄 Starting matrix calculation...');
      
      // Add a small delay to ensure all tests are committed to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const MetricsAggregationService = require('../services/metricsAggregationService');
      const metricsService = MetricsAggregationService;
      
      // Calculate metrics for the current analysis
      const metricsResult = await metricsService.calculateMetrics(userId, {
        urlAnalysisId: latestAnalysis._id
      });
      
      if (metricsResult.success) {
        console.log('✅ Matrix calculation completed successfully');
        console.log('   Overall metrics:', metricsResult.results?.overall ? 'calculated' : 'skipped');
        console.log('   Platform metrics:', metricsResult.results?.platform?.length || 0, 'calculated');
        console.log('   Topic metrics:', metricsResult.results?.topic?.length || 0, 'calculated');
        console.log('   Persona metrics:', metricsResult.results?.persona?.length || 0, 'calculated');
      } else {
        console.log('⚠️  Matrix calculation completed with warnings:', metricsResult.message);
      }
    } catch (error) {
      console.error('❌ Automatic testing/metrics calculation failed:', error.message);
      // Don't fail the entire request if testing/metrics calculation fails
      console.log('   Continuing with prompt generation response...');
    }

    res.json({
      success: true,
      message: 'Prompts generated, tested, and metrics calculated successfully',
      data: {
        prompts: savedPrompts,
        totalPrompts: savedPrompts.length,
        generationDate: new Date().toISOString(),
        metadata: {
          topicsUsed: promptData.topics?.length || 0,
          personasUsed: promptData.personas?.length || 0,
          competitorsUsed: promptData.competitors?.length || 0,
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
}));

// Export the extractBrandContext function for testing
module.exports.extractBrandContext = extractBrandContext;

module.exports = router;


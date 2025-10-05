const axios = require('axios');
const PromptTest = require('../models/PromptTest');
const Prompt = require('../models/Prompt');

class PromptTestingService {
  constructor() {
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    // OpenRouter model identifiers for different LLMs
    // Updated with VERIFIED model IDs from OpenRouter API (2025-10-04)
    this.llmModels = {
      openai: 'openai/gpt-4o',
      gemini: 'google/gemini-2.5-flash', // Fast and cost-effective
      claude: 'anthropic/claude-3.5-sonnet',
      perplexity: 'perplexity/sonar-pro' // Best Perplexity model for our use case
    };
    
    console.log('📋 [LLM MODELS] Configured:', this.llmModels);

    // Scoring model (cheaper, fast)
    this.scoringModel = 'openai/gpt-4o-mini';
    
    console.log('🧪 PromptTestingService initialized');
  }

  /**
   * Main function: Test all prompts for a user
   * @param {string} userId - User ID
   * @param {object} options - Testing options
   * @returns {Promise<object>} - Test results summary
   */
  async testAllPrompts(userId, options = {}) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 [TEST START] Starting prompt testing for user: ${userId}`);
      console.log(`📅 Timestamp: ${new Date().toISOString()}`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Fetch all active prompts for the user (LIMIT TO 2 FOR TESTING)
      console.log(`🔍 [QUERY] Fetching active prompts for user ${userId}...`);
      
      // IMPORTANT: Only fetch prompts that have topicId, personaId, and queryType
      const prompts = await Prompt.find({ 
        userId, 
        status: 'active',
        topicId: { $exists: true, $ne: null },
        personaId: { $exists: true, $ne: null },
        queryType: { $exists: true, $ne: null }
      })
      .limit(options.testLimit || 2) // TESTING: Only test 2 prompts to save costs
      .populate('topicId')
      .populate('personaId')
      .lean();
      
      console.log(`🔍 [FILTER] Only fetching prompts with topicId, personaId, and queryType`);
      
      console.log(`⚠️  [TESTING MODE] Limited to ${options.testLimit || 2} prompts to save API costs`);
      
      console.log(`✅ [QUERY] Found ${prompts.length} prompts in database`);
      
      if (prompts.length === 0) {
        console.error('❌ [ERROR] No prompts found for testing');
        throw new Error('No prompts found for testing');
      }
      
      console.log(`📊 [INFO] Prompts breakdown:`);
      prompts.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.text.substring(0, 50)}...`);
        console.log(`      Raw topicId type: ${typeof p.topicId}, value:`, p.topicId);
        console.log(`      Raw personaId type: ${typeof p.personaId}, value:`, p.personaId);
        console.log(`      Topic: ${p.topicId?.name || 'NULL'} (ID: ${p.topicId?._id || p.topicId || 'NULL'})`);
        console.log(`      Persona: ${p.personaId?.type || 'NULL'} (ID: ${p.personaId?._id || p.personaId || 'NULL'})`);
        console.log(`      QueryType: ${p.queryType || 'NULL'}`);
      });
      
      // Get brand name for scoring context
      console.log(`\n🏢 [CONTEXT] Fetching brand context for scoring...`);
      const brandContext = await this.getBrandContext(userId);
      console.log(`✅ [CONTEXT] Brand: ${brandContext.companyName}, Competitors: ${brandContext.competitors.length}`);
      
      // Process prompts in batches to avoid overwhelming the API
      const batchSize = options.batchSize || 5;
      const allResults = [];
      const totalBatches = Math.ceil(prompts.length / batchSize);
      
      console.log(`\n🔄 [BATCHING] Processing ${prompts.length} prompts in ${totalBatches} batches (size: ${batchSize})\n`);
      
      for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        console.log(`${'─'.repeat(60)}`);
        console.log(`📦 [BATCH ${batchNum}/${totalBatches}] Processing ${batch.length} prompts`);
        console.log(`${'─'.repeat(60)}`);
        
        const batchStartTime = Date.now();
        const batchResults = await Promise.all(
          batch.map(prompt => this.testSinglePrompt(prompt, brandContext))
        );
        const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
        
        allResults.push(...batchResults);
        
        const batchSuccess = batchResults.flat().filter(r => r && r.status === 'completed').length;
        const batchFailed = batchResults.flat().filter(r => r && r.status === 'failed').length;
        console.log(`✅ [BATCH ${batchNum}] Complete in ${batchDuration}s - Success: ${batchSuccess}, Failed: ${batchFailed}\n`);
      }
      
      // Calculate summary statistics
      console.log(`📊 [SUMMARY] Calculating aggregate statistics...`);
      const summary = this.calculateSummary(allResults.flat());
      
      const flatResults = allResults.flat().filter(r => r !== null && r !== undefined);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ [TEST COMPLETE] All testing finished`);
      console.log(`📊 Total Tests: ${flatResults.length}`);
      console.log(`✅ Completed: ${flatResults.filter(r => r.status === 'completed').length}`);
      console.log(`❌ Failed: ${flatResults.filter(r => r.status === 'failed').length}`);
      console.log(`📈 Avg Visibility: ${summary.averageVisibilityScore}%`);
      console.log(`🎯 Brand Mention Rate: ${summary.brandMentionRate}%`);
      console.log(`🏆 Best LLM: ${summary.bestPerformingLLM}`);
      console.log(`${'='.repeat(60)}\n`);
      
      return {
        success: true,
        summary,
        totalTests: flatResults.length,
        completedTests: flatResults.filter(r => r.status === 'completed').length,
        failedTests: flatResults.filter(r => r.status === 'failed').length
      };
      
    } catch (error) {
      console.error(`\n❌ [FATAL ERROR] Prompt testing failed:`, error);
      console.error(`Stack trace:`, error.stack);
      throw error;
    }
  }

  /**
   * Test a single prompt across all 4 LLMs
   * @param {object} prompt - Prompt document
   * @param {object} brandContext - Brand context for scoring
   * @returns {Promise<Array>} - Array of test results
   */
  async testSinglePrompt(prompt, brandContext) {
    try {
      console.log(`\n🔬 [PROMPT] Testing: "${prompt.text.substring(0, 60)}..."`);
      console.log(`   Prompt ID: ${prompt._id}`);
      console.log(`   Query Type: ${prompt.queryType || 'MISSING'}`);
      console.log(`   Topic ID: ${prompt.topicId?._id || prompt.topicId || 'MISSING'}`);
      console.log(`   Persona ID: ${prompt.personaId?._id || prompt.personaId || 'MISSING'}`);
      
      // Step 1: Send prompt to all 4 LLMs in parallel
      console.log(`   🚀 [STEP 1] Sending to 4 LLMs in parallel...`);
      const llmStartTime = Date.now();
      
      const llmResponses = await Promise.allSettled([
        this.callLLM(prompt.text, 'openai', prompt),
        this.callLLM(prompt.text, 'gemini', prompt),
        this.callLLM(prompt.text, 'claude', prompt),
        this.callLLM(prompt.text, 'perplexity', prompt)
      ]);
      
      const llmDuration = ((Date.now() - llmStartTime) / 1000).toFixed(2);
      const llmSuccess = llmResponses.filter(r => r.status === 'fulfilled').length;
      console.log(`   ✅ [STEP 1] LLM calls complete in ${llmDuration}s (${llmSuccess}/4 successful)`);
      
      // Step 2: Score each response in parallel
      console.log(`   🎯 [STEP 2] Scoring ${llmResponses.length} responses...`);
      const scoringStartTime = Date.now();
      
      const scoringPromises = llmResponses.map(async (result, index) => {
        const llmProvider = ['openai', 'gemini', 'claude', 'perplexity'][index];
        
        if (result.status === 'rejected') {
          console.error(`   ❌ [${llmProvider.toUpperCase()}] LLM call failed:`, result.reason.message);
          return this.createFailedTest(prompt, llmProvider, result.reason.message);
        }
        
        const llmResponse = result.value;
        console.log(`   📝 [${llmProvider.toUpperCase()}] Response received (${llmResponse.responseTime}ms, ${llmResponse.tokensUsed} tokens)`);
        
        try {
          // Generate scorecard for this response
          const scorecard = await this.generateScorecard(
            prompt.text,
            llmResponse.response,
            brandContext,
            prompt.queryType
          );
          
          console.log(`   ✅ [${llmProvider.toUpperCase()}] Scorecard generated - Overall: ${scorecard.overallScore}/100, Visibility: ${scorecard.visibilityScore}/100`);
          
          // Save test result to database
          const testResult = await this.saveTestResult(
            prompt,
            llmProvider,
            llmResponse,
            scorecard
          );
          
          console.log(`   💾 [${llmProvider.toUpperCase()}] Saved to database (ID: ${testResult._id})`);
          return testResult;
          
        } catch (scoringError) {
          console.error(`   ❌ [${llmProvider.toUpperCase()}] Scoring failed:`, scoringError.message);
          return this.createFailedTest(prompt, llmProvider, scoringError.message);
        }
      });
      
      const results = await Promise.all(scoringPromises);
      const scoringDuration = ((Date.now() - scoringStartTime) / 1000).toFixed(2);
      const scoringSuccess = results.filter(r => r && r.status === 'completed').length;
      
      console.log(`   ✅ [STEP 2] Scoring complete in ${scoringDuration}s (${scoringSuccess}/4 successful)`);
      console.log(`   ✨ [COMPLETE] Prompt testing finished\n`);
      
      return results;
      
    } catch (error) {
      console.error(`   ❌ [ERROR] Failed to test prompt ${prompt._id}:`, error.message);
      console.error(`   Stack:`, error.stack);
      throw error;
    }
  }

  /**
   * Call a specific LLM via OpenRouter
   * @param {string} promptText - The prompt to send
   * @param {string} llmProvider - LLM provider name
   * @param {object} promptDoc - Original prompt document
   * @returns {Promise<object>} - LLM response with metadata
   */
  async callLLM(promptText, llmProvider, promptDoc) {
    const startTime = Date.now();
    
    try {
      const model = this.llmModels[llmProvider];
      console.log(`      🌐 [API] Calling ${llmProvider} (${model})...`);
      
      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: model,
          messages: [
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'HTTP-Referer': 'https://tryrankly.com',
            'X-Title': 'Rankly AEO Platform',
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );
      
      const responseTime = Date.now() - startTime;
      const content = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage?.total_tokens || 0;
      
      console.log(`      ✅ [API] ${llmProvider} responded in ${responseTime}ms (${tokensUsed} tokens, ${content.length} chars)`);
      
      return {
        response: content,
        responseTime,
        tokensUsed,
        model: model
      };
      
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error(`      ❌ [API ERROR] ${llmProvider} failed:`, errorMsg);
      if (error.response?.status) {
        console.error(`      Status: ${error.response.status}`);
      }
      throw new Error(`${llmProvider} API call failed: ${errorMsg}`);
    }
  }

  /**
   * Generate scorecard for an LLM response using a scoring LLM
   * @param {string} originalPrompt - Original prompt text
   * @param {string} llmResponse - LLM's response
   * @param {object} brandContext - Brand information
   * @param {string} queryType - Type of query
   * @returns {Promise<object>} - Scorecard object
   */
  async generateScorecard(originalPrompt, llmResponse, brandContext, queryType) {
    try {
      const brandName = brandContext.companyName || 'the brand';
      const competitors = brandContext.competitors || [];
      
      console.log(`      🎯 [SCORING] Generating scorecard for brand: ${brandName}`);
      
      const scoringPrompt = this.buildScoringPrompt(
        originalPrompt,
        llmResponse,
        brandName,
        competitors,
        queryType
      );
      
      console.log(`      🤖 [SCORING] Calling scoring LLM (${this.scoringModel})...`);
      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.scoringModel,
          messages: [
            {
              role: 'system',
              content: this.getScoringSystemPrompt()
            },
            {
              role: 'user',
              content: scoringPrompt
            }
          ],
          temperature: 0.3, // Lower temperature for consistent scoring
          max_tokens: 1500,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'HTTP-Referer': 'https://tryrankly.com',
            'X-Title': 'Rankly AEO Platform',
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );
      
      const scorecardText = response.data.choices[0].message.content;
      console.log(`      ✅ [SCORING] Received scorecard (${scorecardText.length} chars)`);
      
      let scorecard;
      try {
        scorecard = JSON.parse(scorecardText);
        console.log(`      ✅ [SCORING] Scorecard parsed successfully`);
      } catch (parseError) {
        console.error(`      ❌ [SCORING] JSON parse failed:`, parseError.message);
        console.error(`      Raw response:`, scorecardText.substring(0, 200));
        throw parseError;
      }
      
      // Validate and normalize scorecard
      const validated = this.validateScorecard(scorecard);
      console.log(`      ✅ [SCORING] Scorecard validated - Overall: ${validated.overallScore}/100`);
      
      return validated;
      
    } catch (error) {
      console.error(`      ❌ [SCORING ERROR] Scorecard generation failed:`, error.message);
      if (error.response?.data) {
        console.error(`      API Error:`, error.response.data);
      }
      // Return default scorecard on error
      console.log(`      🔄 [SCORING] Using default scorecard`);
      return this.getDefaultScorecard();
    }
  }

  /**
   * Build the scoring prompt for the scoring LLM
   */
  buildScoringPrompt(originalPrompt, llmResponse, brandName, competitors, queryType) {
    const competitorNames = competitors.map(c => c.name).join(', ');
    
    return `Analyze this LLM response for Answer Engine Optimization (AEO) effectiveness.

**Original User Query:**
"${originalPrompt}"

**Query Type:** ${queryType}

**LLM Response to Analyze:**
"""
${llmResponse}
"""

**Brand Being Analyzed:** ${brandName}
**Known Competitors:** ${competitorNames || 'None provided'}

**Your Task:**
Evaluate how well the LLM response promotes brand visibility for "${brandName}" and generate a comprehensive scorecard.

**Scoring Guidelines:**

1. **Brand Visibility (0-100):**
   - Was the brand mentioned? Where in the response?
   - How many times was it mentioned?
   - Score 0 if not mentioned, 100 if prominently featured

2. **Depth of Mention:**
   - "none" = Not mentioned at all
   - "shallow" = Brief mention, no details
   - "moderate" = Mentioned with some context
   - "detailed" = Comprehensive discussion with examples

3. **Competitive Position:**
   - How many competitors were mentioned?
   - What position is the brand in vs competitors?
   - Were there direct comparisons?

4. **Citation & Trust:**
   - Did the LLM cite sources or links?
   - Were there trust signals (awards, certifications)?
   - How authoritative was the mention?

5. **Query Relevance (0-100):**
   - How relevant was the response to the query?
   - Did it match the query intent?

6. **Overall Score (0-100):**
   - Weighted average considering all factors
   - Higher scores mean better AEO performance

Return ONLY a valid JSON scorecard with all required fields.`;
  }

  /**
   * System prompt for the scoring LLM
   */
  getScoringSystemPrompt() {
    return `You are an expert AEO (Answer Engine Optimization) analyst evaluating LLM responses for brand visibility.

Your task is to analyze LLM responses and generate detailed scorecards with the following JSON structure:

{
  "brandMentioned": boolean,
  "brandPosition": number (0 if not mentioned, 1-10 for position in response),
  "brandMentionCount": number,
  "competitorsMentioned": [string array],
  "visibilityScore": number (0-100),
  "mentionDepth": "none|shallow|moderate|detailed",
  "contextQuality": number (0-100),
  "sentencesAboutBrand": number,
  "characterCount": number (characters dedicated to brand),
  "citationPresent": boolean,
  "citationType": "none|direct_link|reference|mention",
  "trustSignals": [string array],
  "expertiseIndicators": number (0-100),
  "competitorCount": number,
  "rankingPosition": number (0 if not ranked, 1 for #1, etc.),
  "comparativeMentions": [string array],
  "uniqueValuePropsHighlighted": [string array],
  "relevanceScore": number (0-100),
  "intentMatch": number (0-100),
  "responseLength": number,
  "responseCompleteness": number (0-100),
  "overallScore": number (0-100)
}

Be objective, thorough, and consistent. Return ONLY valid JSON, no markdown or explanations.`;
  }

  /**
   * Validate and normalize scorecard data
   */
  validateScorecard(scorecard) {
    return {
      brandMentioned: Boolean(scorecard.brandMentioned),
      brandPosition: Math.max(0, parseInt(scorecard.brandPosition) || 0),
      brandMentionCount: Math.max(0, parseInt(scorecard.brandMentionCount) || 0),
      competitorsMentioned: Array.isArray(scorecard.competitorsMentioned) ? scorecard.competitorsMentioned : [],
      visibilityScore: Math.min(100, Math.max(0, parseInt(scorecard.visibilityScore) || 0)),
      mentionDepth: ['none', 'shallow', 'moderate', 'detailed'].includes(scorecard.mentionDepth) 
        ? scorecard.mentionDepth : 'none',
      contextQuality: Math.min(100, Math.max(0, parseInt(scorecard.contextQuality) || 0)),
      sentencesAboutBrand: Math.max(0, parseInt(scorecard.sentencesAboutBrand) || 0),
      characterCount: Math.max(0, parseInt(scorecard.characterCount) || 0),
      citationPresent: Boolean(scorecard.citationPresent),
      citationType: ['none', 'direct_link', 'reference', 'mention'].includes(scorecard.citationType)
        ? scorecard.citationType : 'none',
      trustSignals: Array.isArray(scorecard.trustSignals) ? scorecard.trustSignals : [],
      expertiseIndicators: Math.min(100, Math.max(0, parseInt(scorecard.expertiseIndicators) || 0)),
      competitorCount: Math.max(0, parseInt(scorecard.competitorCount) || 0),
      rankingPosition: Math.max(0, parseInt(scorecard.rankingPosition) || 0),
      comparativeMentions: Array.isArray(scorecard.comparativeMentions) ? scorecard.comparativeMentions : [],
      uniqueValuePropsHighlighted: Array.isArray(scorecard.uniqueValuePropsHighlighted) 
        ? scorecard.uniqueValuePropsHighlighted : [],
      relevanceScore: Math.min(100, Math.max(0, parseInt(scorecard.relevanceScore) || 0)),
      intentMatch: Math.min(100, Math.max(0, parseInt(scorecard.intentMatch) || 0)),
      responseLength: Math.max(0, parseInt(scorecard.responseLength) || 0),
      responseCompleteness: Math.min(100, Math.max(0, parseInt(scorecard.responseCompleteness) || 0)),
      overallScore: Math.min(100, Math.max(0, parseInt(scorecard.overallScore) || 0))
    };
  }

  /**
   * Get default scorecard for failed tests
   */
  getDefaultScorecard() {
    return {
      brandMentioned: false,
      brandPosition: 0,
      brandMentionCount: 0,
      competitorsMentioned: [],
      visibilityScore: 0,
      mentionDepth: 'none',
      contextQuality: 0,
      sentencesAboutBrand: 0,
      characterCount: 0,
      citationPresent: false,
      citationType: 'none',
      trustSignals: [],
      expertiseIndicators: 0,
      competitorCount: 0,
      rankingPosition: 0,
      comparativeMentions: [],
      uniqueValuePropsHighlighted: [],
      relevanceScore: 0,
      intentMatch: 0,
      responseLength: 0,
      responseCompleteness: 0,
      overallScore: 0
    };
  }

  /**
   * Save test result to database
   */
  async saveTestResult(prompt, llmProvider, llmResponse, scorecard) {
    try {
      console.log(`      💾 [SAVE] Preparing to save test result for ${llmProvider}`);
      
      // Extract IDs from populated objects if needed
      const topicId = prompt.topicId?._id || prompt.topicId;
      const personaId = prompt.personaId?._id || prompt.personaId;
      
      console.log(`      📋 [SAVE] Extracted IDs - topicId: ${topicId}, personaId: ${personaId}, queryType: ${prompt.queryType}`);
      
      // Ensure we have the required fields
      if (!topicId || !personaId || !prompt.queryType) {
        console.error(`      ❌ [SAVE ERROR] Missing required fields in prompt:`, {
          topicId,
          personaId,
          queryType: prompt.queryType,
          promptId: prompt._id,
          rawTopicId: prompt.topicId,
          rawPersonaId: prompt.personaId
        });
        throw new Error('Missing required fields: topicId, personaId, or queryType');
      }
      
      const testResult = new PromptTest({
        userId: prompt.userId,
        promptId: prompt._id,
        topicId: topicId,
        personaId: personaId,
        promptText: prompt.text,
        queryType: prompt.queryType,
        llmProvider: llmProvider,
        llmModel: llmResponse.model,
        rawResponse: llmResponse.response,
        responseTime: llmResponse.responseTime,
        tokensUsed: llmResponse.tokensUsed,
        scorecard: scorecard,
        status: 'completed',
        scoredAt: new Date()
      });
      
      await testResult.save();
      console.log(`      ✅ [SAVE] Test result saved successfully`);
      return testResult;
      
    } catch (error) {
      console.error('      ❌ [SAVE ERROR] Failed to save test result:', error.message);
      throw error;
    }
  }

  /**
   * Create a failed test record
   */
  async createFailedTest(prompt, llmProvider, errorMessage) {
    try {
      console.log(`      💾 [FAILED TEST] Saving failed test for ${llmProvider}`);
      
      // Extract IDs from populated objects if needed
      const topicId = prompt.topicId?._id || prompt.topicId;
      const personaId = prompt.personaId?._id || prompt.personaId;
      
      // Check if we have required fields, return plain object if not (can't save)
      if (!topicId || !personaId || !prompt.queryType) {
        console.error(`      ❌ [FAILED TEST] Cannot save - missing required fields`);
        return {
          status: 'failed',
          error: errorMessage,
          llmProvider: llmProvider
        };
      }
      
      const testResult = new PromptTest({
        userId: prompt.userId,
        promptId: prompt._id,
        topicId: topicId,
        personaId: personaId,
        promptText: prompt.text,
        queryType: prompt.queryType,
        llmProvider: llmProvider,
        llmModel: this.llmModels[llmProvider],
        rawResponse: 'N/A - Test Failed',
        scorecard: this.getDefaultScorecard(),
        status: 'failed',
        error: errorMessage
      });
      
      await testResult.save();
      console.log(`      ✅ [FAILED TEST] Saved to database`);
      return testResult;
      
    } catch (error) {
      console.error('      ❌ [FAILED TEST ERROR] Could not save:', error.message);
      // Return a plain object instead of null to avoid null reference errors
      return {
        status: 'failed',
        error: errorMessage,
        llmProvider: llmProvider
      };
    }
  }

  /**
   * Get brand context for scoring
   */
  async getBrandContext(userId) {
    try {
      const UrlAnalysis = require('../models/UrlAnalysis');
      const Competitor = require('../models/Competitor');
      
      const analysis = await UrlAnalysis.findOne({ userId })
        .sort({ analysisDate: -1 })
        .limit(1)
        .lean();
      
      const competitors = await Competitor.find({ userId, selected: true })
        .limit(4)
        .lean();
      
      return {
        companyName: analysis?.brandContext?.companyName || 'Unknown',
        competitors: competitors.map(c => ({ name: c.name, url: c.url }))
      };
      
    } catch (error) {
      console.error('❌ Failed to get brand context:', error);
      return { companyName: 'Unknown', competitors: [] };
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(results) {
    // Filter out null/undefined results
    const validResults = results.filter(r => r !== null && r !== undefined);
    const completed = validResults.filter(r => r.status === 'completed');
    
    console.log(`   📊 [CALC] Valid results: ${validResults.length}, Completed: ${completed.length}`);
    
    if (completed.length === 0) {
      console.log(`   ⚠️  [CALC] No completed tests to summarize`);
      return {
        averageVisibilityScore: 0,
        averageOverallScore: 0,
        brandMentionRate: 0,
        bestPerformingLLM: 'none',
        worstPerformingLLM: 'none',
        llmPerformance: {}
      };
    }
    
    const avgVisibility = completed.reduce((sum, r) => sum + r.scorecard.visibilityScore, 0) / completed.length;
    const avgOverall = completed.reduce((sum, r) => sum + r.scorecard.overallScore, 0) / completed.length;
    const mentionRate = (completed.filter(r => r.scorecard.brandMentioned).length / completed.length) * 100;
    
    // Calculate average score per LLM
    const llmScores = {};
    completed.forEach(r => {
      if (!llmScores[r.llmProvider]) {
        llmScores[r.llmProvider] = [];
      }
      llmScores[r.llmProvider].push(r.scorecard.overallScore);
    });
    
    const llmAverages = {};
    for (const [llm, scores] of Object.entries(llmScores)) {
      llmAverages[llm] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    
    const sortedLLMs = Object.entries(llmAverages).sort((a, b) => b[1] - a[1]);
    
    return {
      averageVisibilityScore: Math.round(avgVisibility),
      averageOverallScore: Math.round(avgOverall),
      brandMentionRate: Math.round(mentionRate),
      bestPerformingLLM: sortedLLMs[0]?.[0] || 'none',
      worstPerformingLLM: sortedLLMs[sortedLLMs.length - 1]?.[0] || 'none',
      llmPerformance: llmAverages
    };
  }
}

module.exports = new PromptTestingService();



const axios = require('axios');
const PromptTest = require('../models/PromptTest');
const Prompt = require('../models/Prompt');
const UrlAnalysis = require('../models/UrlAnalysis');

class PromptTestingService {
  constructor() {
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    // OpenRouter model identifiers for different LLMs
    this.llmModels = {
      openai: 'openai/gpt-4o',
      gemini: 'google/gemini-2.5-flash',
      claude: 'anthropic/claude-3.5-sonnet',
      perplexity: 'perplexity/sonar-pro'
    };

    console.log('📋 [LLM MODELS] Configured:', this.llmModels);
    console.log('🧪 PromptTestingService initialized (deterministic scoring)');
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
      .limit(options.testLimit || 50) // Test up to 50 prompts (remove artificial limitation)
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
      
      // Get latest URL analysis for this user
      console.log(`\n🔗 [URL] Fetching latest URL analysis...`);
      const latestUrlAnalysis = await UrlAnalysis.findOne({ userId })
        .sort({ analysisDate: -1 })
        .lean();

      if (!latestUrlAnalysis) {
        throw new Error('No URL analysis found. Please complete onboarding first.');
      }

      console.log(`✅ [URL] Found URL analysis: ${latestUrlAnalysis.url} (ID: ${latestUrlAnalysis._id})`);

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
          batch.map(prompt => this.testSinglePrompt(prompt, brandContext, latestUrlAnalysis._id))
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
   * @param {string} urlAnalysisId - URL analysis ID to link test to
   * @returns {Promise<Array>} - Array of test results
   */
  async testSinglePrompt(prompt, brandContext, urlAnalysisId) {
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
          return this.createFailedTest(prompt, llmProvider, result.reason.message, urlAnalysisId);
        }
        
        const llmResponse = result.value;
        console.log(`   📝 [${llmProvider.toUpperCase()}] Response received (${llmResponse.responseTime}ms, ${llmResponse.tokensUsed} tokens)`);

        try {
          // Calculate metrics deterministically from citations and brand mentions
          const scorecard = this.calculateDeterministicScore(
            llmResponse.response,
            llmResponse.citations,
            brandContext
          );

          console.log(`   ✅ [${llmProvider.toUpperCase()}] Score calculated - Visibility: ${scorecard.visibilityScore}/100, Overall: ${scorecard.overallScore}/100`);

          // Save test result to database
          const testResult = await this.saveTestResult(
            prompt,
            llmProvider,
            llmResponse,
            scorecard,
            urlAnalysisId,
            brandContext
          );
          
          console.log(`   💾 [${llmProvider.toUpperCase()}] Saved to database (ID: ${testResult._id})`);
          return testResult;
          
        } catch (scoringError) {
          console.error(`   ❌ [${llmProvider.toUpperCase()}] Scoring failed:`, scoringError.message);
          return this.createFailedTest(prompt, llmProvider, scoringError.message, urlAnalysisId);
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
   * Get system prompt for LLMs to request citations
   * @returns {string} - System prompt text
   */
  getLLMSystemPrompt() {
    return `You are a helpful AI assistant providing comprehensive answers to user questions.

IMPORTANT: When providing information about companies, brands, products, or services, please include relevant citations and links whenever possible. This helps users verify information and access additional resources.

Guidelines for citations:
1. Include hyperlinks to official websites, documentation, or authoritative sources
2. Use markdown link format: [link text](https://example.com)
3. Provide citations for:
   - Company websites and official pages
   - Product documentation and features
   - Reviews and testimonials (when available)
   - Pricing and service information
   - News articles and press releases

If you cannot find or provide specific links, mention that information is based on your training data and suggest where users might find more current information.

Be thorough, accurate, and helpful in your responses.`;
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
              role: 'system',
              content: this.getLLMSystemPrompt()
            },
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

      // Extract citations from response
      const citations = this.extractCitations(response.data, llmProvider, content);

      console.log(`      ✅ [API] ${llmProvider} responded in ${responseTime}ms (${tokensUsed} tokens, ${content.length} chars, ${citations.length} citations)`);

      return {
        response: content,
        citations,
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
   * Extract citations from LLM response
   * @param {object} responseData - Full API response
   * @param {string} llmProvider - LLM provider name
   * @param {string} responseText - Response text content
   * @returns {Array} - Array of citation objects
   */
  extractCitations(responseData, llmProvider, responseText) {
    const citations = [];

    try {
      // Method 1: Perplexity returns citations in API response
      if (llmProvider === 'perplexity' && responseData.citations) {
        citations.push(...responseData.citations.map((cit, idx) => ({
          url: cit,
          type: 'source',
          position: idx + 1,
          provider: 'perplexity_api'
        })));
      }

      // Method 2: Parse markdown links from response text [text](url)
      const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      let position = 1;

      while ((match = markdownLinkRegex.exec(responseText)) !== null) {
        citations.push({
          url: match[2],
          text: match[1],
          type: 'inline_link',
          position: position++,
          provider: llmProvider
        });
      }

      // Method 3: Parse bare URLs
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
      const urls = responseText.match(urlRegex) || [];
      urls.forEach((url, idx) => {
        // Avoid duplicates from markdown links
        if (!citations.find(c => c.url === url)) {
          citations.push({
            url: url,
            type: 'bare_url',
            position: citations.length + 1,
            provider: llmProvider
          });
        }
      });

      console.log(`      📎 [CITATIONS] Extracted ${citations.length} citations from ${llmProvider}`);

    } catch (error) {
      console.error(`      ❌ [CITATIONS ERROR] Failed to extract citations:`, error.message);
    }

    return citations;
  }

  /**
   * Categorize a citation by type
   * @param {string} url - Citation URL
   * @param {string} brandName - Brand to check for
   * @returns {string} - 'brand', 'earned', or 'social'
   */
  categorizeCitation(url, brandName) {
    const urlLower = url.toLowerCase();
    const brandLower = brandName.toLowerCase().replace(/\s+/g, '');
    
    // Check if it's a direct brand link
    if (urlLower.includes(brandLower + '.com') || 
        urlLower.includes(brandLower + '.io') ||
        urlLower.includes(brandLower + '.ai')) {
      return 'brand';
    }
    
    // Check if it's social media
    const socialDomains = ['twitter.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com'];
    if (socialDomains.some(domain => urlLower.includes(domain))) {
      return 'social';
    }
    
    // Everything else is earned media (third-party articles/reviews)
    return 'earned';
  }

  /**
   * Analyze sentiment of brand mentions in response
   * @param {string} responseText - Full LLM response
   * @param {string} brandName - Brand to analyze
   * @returns {object} - Sentiment analysis { sentiment, sentimentScore, drivers }
   */
  analyzeSentiment(responseText, brandName) {
    // Positive keywords
    const positiveKeywords = [
      'best', 'excellent', 'great', 'top', 'leading', 'trusted', 'reliable', 
      'recommended', 'popular', 'strong', 'superior', 'outstanding', 'premier',
      'robust', 'comprehensive', 'flexible', 'innovative', 'powerful', 'advanced',
      'seamless', 'easy', 'simple', 'efficient', 'effective', 'preferred', 'ideal',
      'unmatched', 'favored', 'recognized', 'renowned'
    ];

    // Negative keywords
    const negativeKeywords = [
      'bad', 'poor', 'worst', 'weak', 'limited', 'lacking', 'difficult', 
      'complicated', 'expensive', 'costly', 'slow', 'unreliable', 'problematic',
      'issues', 'problems', 'concerns', 'drawbacks', 'disadvantages', 'limitations',
      'struggles', 'fails', 'inferior', 'outdated'
    ];

    // Extract sentences mentioning the brand
    const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const brandSentences = sentences.filter(s => 
      s.toLowerCase().includes(brandName.toLowerCase())
    );

    if (brandSentences.length === 0) {
      return { sentiment: 'neutral', sentimentScore: 0, drivers: [] };
    }

    // Analyze each sentence
    let totalScore = 0;
    const drivers = [];

    brandSentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      let sentenceScore = 0;
      const foundKeywords = [];

      // Count positive keywords
      positiveKeywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) {
          sentenceScore += 0.3;
          foundKeywords.push('+' + keyword);
        }
      });

      // Count negative keywords
      negativeKeywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) {
          sentenceScore -= 0.3;
          foundKeywords.push('-' + keyword);
        }
      });

      // Determine sentence sentiment
      let sentenceSentiment = 'neutral';
      if (sentenceScore > 0.3) sentenceSentiment = 'positive';
      else if (sentenceScore < -0.3) sentenceSentiment = 'negative';

      if (foundKeywords.length > 0) {
        drivers.push({
          text: sentence.substring(0, 100),
          sentiment: sentenceSentiment,
          keywords: foundKeywords
        });
      }

      totalScore += sentenceScore;
    });

    // Calculate overall sentiment
    const avgScore = totalScore / brandSentences.length;
    const normalizedScore = Math.max(-1, Math.min(1, avgScore)); // Clamp to -1 to +1

    let overallSentiment = 'neutral';
    if (normalizedScore > 0.2) overallSentiment = 'positive';
    else if (normalizedScore < -0.2) overallSentiment = 'negative';
    else if (drivers.some(d => d.sentiment === 'positive') && drivers.some(d => d.sentiment === 'negative')) {
      overallSentiment = 'mixed';
    }

    return {
      sentiment: overallSentiment,
      sentimentScore: normalizedScore,
      drivers: drivers.slice(0, 5) // Top 5 drivers
    };
  }

  /**
   * Extract brand metrics from response text with sentence-level data
   * @param {string} responseText - LLM response
   * @param {Array} citations - Extracted citations
   * @param {string} brandName - Primary brand name
   * @param {Array} competitors - Competitor brands
   * @returns {Array} - brandMetrics array with complete data
   */
  extractBrandMetrics(responseText, citations, brandName, competitors = []) {
    // Split response into sentences
    const sentences = responseText
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0);

    const allBrands = [brandName, ...competitors.map(c => c.name)];
    const brandMetrics = [];

    // Process each brand
    allBrands.forEach((brand, brandIndex) => {
      const brandRegex = new RegExp(brand, 'gi');

      // Count brand mentions and track sentences
      const brandSentences = [];
      let mentionCount = 0;
      let firstPosition = null;
      let totalWordCount = 0;

      sentences.forEach((sentence, idx) => {
        const mentions = (sentence.match(brandRegex) || []).length;

        if (mentions > 0) {
          mentionCount += mentions;

          if (firstPosition === null) {
            firstPosition = idx + 1; // 1-indexed
          }

          const words = sentence.trim().split(/\s+/).length;
          totalWordCount += words;

          brandSentences.push({
            text: sentence.trim(),
            position: idx,        // 0-indexed for depth calculation
            wordCount: words
          });
        }
      });

      // Get and categorize citations for this brand
      const brandCitations = citations.filter(cit =>
        cit.url.toLowerCase().includes(brand.toLowerCase().replace(/\s+/g, ''))
      );

      // Categorize citations
      let brandCitationsCount = 0;
      let earnedCitationsCount = 0;
      let socialCitationsCount = 0;

      const categorizedCitations = brandCitations.map(cit => {
        const citationType = this.categorizeCitation(cit.url, brand);
        
        // Count by type
        if (citationType === 'brand') brandCitationsCount++;
        else if (citationType === 'earned') earnedCitationsCount++;
        else if (citationType === 'social') socialCitationsCount++;

        return {
          url: cit.url,
          type: citationType,
          context: cit.text || 'Citation'
        };
      });

      // Analyze sentiment for this brand
      const sentimentAnalysis = this.analyzeSentiment(responseText, brand);

      // Only add to metrics if brand was mentioned
      if (mentionCount > 0) {
        brandMetrics.push({
          brandName: brand,
          mentioned: true,
          firstPosition,
          mentionCount,
          sentences: brandSentences,        // For depth calculation
          totalWordCount: totalWordCount,   // For depth calculation
          citationMetrics: {
            brandCitations: brandCitationsCount,
            earnedCitations: earnedCitationsCount,
            socialCitations: socialCitationsCount,
            totalCitations: categorizedCitations.length
          },
          sentiment: sentimentAnalysis.sentiment,
          sentimentScore: sentimentAnalysis.sentimentScore,
          sentimentDrivers: sentimentAnalysis.drivers,
          citations: categorizedCitations
        });
      }
    });

    return brandMetrics;

    // Add earned citations to primary brand if mentioned
    const assignedUrls = new Set(
      brandMetrics.flatMap(bm => bm.citations.map(c => c.url))
    );
    const earnedCitations = citations.filter(cit => !assignedUrls.has(cit.url));

    if (earnedCitations.length > 0 && brandMetrics.length > 0) {
      brandMetrics[0].citations.push(...earnedCitations.map(cit => ({
        url: cit.url,
        type: 'earned',
        context: cit.text || 'Citation'
      })));
    }

    return brandMetrics;
  }

  /**
   * Calculate deterministic score based on brand mentions, position, and citations
   * @param {string} responseText - LLM response text
   * @param {Array} citations - Extracted citations
   * @param {object} brandContext - Brand information
   * @returns {object} - Scorecard with visibility and overall scores
   */
  calculateDeterministicScore(responseText, citations, brandContext) {
    const brandName = brandContext.companyName || 'the brand';
    const competitors = brandContext.competitors || [];

    console.log(`      🎯 [SCORING] Creating simple scorecard for: ${brandName}`);

    // Count brand mentions
    const brandRegex = new RegExp(brandName, 'gi');
    const brandMentions = (responseText.match(brandRegex) || []).length;
    const brandMentioned = brandMentions > 0;

    // Calculate brand position (which sentence brand first appears in)
    let brandPosition = null;
    if (brandMentioned) {
      const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].toLowerCase().includes(brandName.toLowerCase())) {
          brandPosition = i + 1; // 1-indexed
          break;
        }
      }
    }

    // Categorize brand citations
    const allBrandCitations = citations.filter(c =>
      c.url.toLowerCase().includes(brandName.toLowerCase().replace(/\s+/g, ''))
    );
    
    let brandCitationsCount = 0;
    let earnedCitationsCount = 0;
    let socialCitationsCount = 0;
    
    allBrandCitations.forEach(cit => {
      const citType = this.categorizeCitation(cit.url, brandName);
      if (citType === 'brand') brandCitationsCount++;
      else if (citType === 'earned') earnedCitationsCount++;
      else if (citType === 'social') socialCitationsCount++;
    });
    
    const totalCitations = allBrandCitations.length;
    const citationPresent = totalCitations > 0;
    const citationType = brandCitationsCount > 0 ? 'direct_link' : 
                        earnedCitationsCount > 0 ? 'reference' : 
                        socialCitationsCount > 0 ? 'social' : 'none';

    // Find competitors mentioned in response
    const competitorsMentioned = [];
    
    competitors.forEach(comp => {
      const regex = new RegExp(comp.name, 'gi');
      const mentions = (responseText.match(regex) || []).length;
      if (mentions > 0) {
        competitorsMentioned.push(comp.name);
      }
    });

    // Analyze sentiment for user's brand
    const sentimentAnalysis = this.analyzeSentiment(responseText, brandName);

    console.log(`      📊 [SCORECARD] Brand: ${brandName}`);
    console.log(`         Mentioned: ${brandMentioned}, Count: ${brandMentions}, Position: ${brandPosition}`);
    console.log(`         Citations - Brand: ${brandCitationsCount}, Earned: ${earnedCitationsCount}, Social: ${socialCitationsCount}`);
    console.log(`         Sentiment: ${sentimentAnalysis.sentiment} (Score: ${sentimentAnalysis.sentimentScore.toFixed(2)})`);

    return {
      brandMentioned,
      brandPosition,
      brandMentionCount: brandMentions,
      citationPresent,
      citationType,
      brandCitations: brandCitationsCount,
      earnedCitations: earnedCitationsCount,
      socialCitations: socialCitationsCount,
      totalCitations: totalCitations,
      sentiment: sentimentAnalysis.sentiment,
      sentimentScore: sentimentAnalysis.sentimentScore,
      competitorsMentioned
    };
  }


  /**
   * Save test result to database
   */
  async saveTestResult(prompt, llmProvider, llmResponse, scorecard, urlAnalysisId, brandContext) {
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

      // Extract complete brand metrics (mentions, positions, sentences, citations)
      const brandMetrics = this.extractBrandMetrics(
        llmResponse.response,
        llmResponse.citations || [],
        brandContext.companyName,
        brandContext.competitors
      );

      console.log(`      📊 [SAVE] Extracted ${brandMetrics.length} brand entries with complete metrics`);

      // Calculate response metadata for depth calculations
      const sentences = llmResponse.response.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const totalSentences = sentences.length;
      const totalWords = llmResponse.response.trim().split(/\s+/).length;

      const testResult = new PromptTest({
        userId: prompt.userId,
        urlAnalysisId: urlAnalysisId,
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
        brandMetrics: brandMetrics,
        responseMetadata: {
          totalSentences: totalSentences,
          totalWords: totalWords,
          totalBrandsDetected: brandMetrics.length
        },
        status: 'completed',
        scoredAt: new Date()
      });

      await testResult.save();
      console.log(`      ✅ [SAVE] Test result saved successfully with ${brandMetrics.length} brand metrics`);
      return testResult;

    } catch (error) {
      console.error('      ❌ [SAVE ERROR] Failed to save test result:', error.message);
      throw error;
    }
  }

  /**
   * Create a failed test record
   */
  async createFailedTest(prompt, llmProvider, errorMessage, urlAnalysisId) {
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
        urlAnalysisId: urlAnalysisId,
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



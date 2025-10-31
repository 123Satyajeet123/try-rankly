const axios = require('axios');
const PromptTest = require('../models/PromptTest');
const Prompt = require('../models/Prompt');
const UrlAnalysis = require('../models/UrlAnalysis');

class PromptTestingService {
  constructor(options = {}) {
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    // Default LLM models configuration - Low-cost models for testing
    this.llmModels = options.models || {
      openai: 'openai/gpt-4o-mini', // Already low-cost
      gemini: 'google/gemini-2.0-flash-001', // Low-cost Flash model
      claude: 'anthropic/claude-3-5-haiku', // Low-cost Haiku model
      perplexity: 'perplexity/sonar' // Low-cost Sonar Reasoning
    };

    // Default prompt testing configuration
    this.maxPromptsToTest = 5; // Reduced from 20 to 5 for faster testing/debugging
    
    // Default parallelization setting
    this.aggressiveParallelization = true;

    console.log('📋 [LLM MODELS] Configured:', this.llmModels);
    console.log(`🎯 [TEST LIMIT] Max prompts to test: ${this.maxPromptsToTest}`);
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
      
      // Fetch ALL active prompts for the user first
      console.log(`🔍 [QUERY] Fetching active prompts for user ${userId}...`);
      
      // IMPORTANT: Only fetch prompts that have topicId, personaId, and queryType
      const allPrompts = await Prompt.find({ 
        userId, 
        status: 'active',
        topicId: { $exists: true, $ne: null },
        personaId: { $exists: true, $ne: null },
        queryType: { $exists: true, $ne: null }
      })
      .populate('topicId')
      .populate('personaId')
      .lean();
      
      console.log(`🔍 [FILTER] Only fetching prompts with topicId, personaId, and queryType`);
      console.log(`✅ [QUERY] Found ${allPrompts.length} total prompts in database`);
      
      // Apply smart sampling to get a balanced subset
      const testLimit = options.testLimit || this.maxPromptsToTest;
      const prompts = this.samplePrompts(allPrompts, testLimit);
      
      console.log(`🎲 [SAMPLING] Selected ${prompts.length} prompts to test (limit: ${testLimit})`);
      console.log(`⚠️  [TESTING MODE] Testing ${prompts.length}/${allPrompts.length} prompts to control API costs`);
      
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
      
      // Get URL analysis for this user (either specific one or latest)
      console.log(`\n🔗 [URL] Fetching URL analysis...`);
      let latestUrlAnalysis;
      
      if (options.urlAnalysisId) {
        // Use specific URL analysis if provided
        latestUrlAnalysis = await UrlAnalysis.findOne({ 
          _id: options.urlAnalysisId, 
          userId 
        }).lean();
        
        if (!latestUrlAnalysis) {
          throw new Error(`URL analysis ${options.urlAnalysisId} not found for user ${userId}`);
        }
        
        console.log(`   ✅ Using specific URL analysis: ${options.urlAnalysisId}`);
      } else {
        // Get latest URL analysis
        latestUrlAnalysis = await UrlAnalysis.findOne({ userId })
          .sort({ analysisDate: -1 })
          .lean();
        
        if (!latestUrlAnalysis) {
          throw new Error('No URL analysis found. Please complete onboarding first.');
        }
        
        console.log(`   ✅ Using latest URL analysis: ${latestUrlAnalysis._id}`);
      }

      console.log(`✅ [URL] Found URL analysis: ${latestUrlAnalysis.url} (ID: ${latestUrlAnalysis._id})`);

      // Get brand name for scoring context
      console.log(`\n🏢 [CONTEXT] Fetching brand context for scoring...`);
      const brandContext = await this.getBrandContext(userId);
      console.log(`✅ [CONTEXT] Brand: ${brandContext.companyName}, Competitors: ${brandContext.competitors.length}`);
      
      let flatResults;
      
      if (this.aggressiveParallelization) {
        // OPTIMIZED: Process all prompts in parallel for maximum speed
        // This reduces total time from ~3 minutes to ~1 minute by eliminating sequential batches
        console.log(`\n🚀 [OPTIMIZED PARALLEL] Processing all ${prompts.length} prompts simultaneously`);
        console.log(`⚡ Expected time reduction: ~3 minutes → ~1 minute`);
        console.log(`${'─'.repeat(60)}\n`);
        
        const allStartTime = Date.now();
        
        // Process all prompts in parallel - this is the key optimization
        const allResults = await Promise.allSettled(
          prompts.map(prompt => this.testSinglePrompt(prompt, brandContext, latestUrlAnalysis._id))
        );
        
        const totalDuration = ((Date.now() - allStartTime) / 1000).toFixed(2);
        
        // Flatten results and handle any rejected promises
        flatResults = allResults
          .map(result => result.status === 'fulfilled' ? result.value : [])
          .flat()
          .filter(r => r && r !== null && r !== undefined);
        
        const completedTests = flatResults.filter(r => r.status === 'completed').length;
        const failedTests = flatResults.filter(r => r.status === 'failed').length;
        
        console.log(`✅ [PARALLEL COMPLETE] All ${prompts.length} prompts processed in ${totalDuration}s`);
        console.log(`📊 Success: ${completedTests}, Failed: ${failedTests}\n`);
      } else {
        // FALLBACK: Process prompts in batches (safer for rate limits)
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
        
        flatResults = allResults.flat().filter(r => r !== null && r !== undefined);
      }
      
      // Calculate summary statistics
      console.log(`📊 [SUMMARY] Calculating aggregate statistics...`);
      const summary = this.calculateSummary(flatResults);
      
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
          temperature: 0.6, // Reduced for more consistent outputs
          top_p: 0.9, // Nucleus sampling for focused responses
          max_tokens: 1500, // Reduced to control costs
          frequency_penalty: 0.3, // Discourage repetition
          presence_penalty: 0.3 // Encourage variety
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || 'https://rankly.ai',
            'X-Title': 'Rankly AEO Platform',
            'Content-Type': 'application/json'
          },
          timeout: 45000 // 45 second timeout (reduced for faster parallelization)
        }
      );

      // Check if response structure is valid
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error(`❌ Invalid response structure for LLM call (${llmProvider}):`, response.data);
        throw new Error('Invalid response from AI service');
      }

      const responseTime = Date.now() - startTime;
      const content = response.data.choices[0].message.content;
      
      // Check if content looks like an error message
      if (typeof content === 'string' && (
        content.toLowerCase().includes('too many requests') ||
        content.toLowerCase().includes('rate limit') ||
        content.toLowerCase().includes('error') ||
        content.toLowerCase().includes('unauthorized') ||
        content.toLowerCase().includes('forbidden') ||
        content.startsWith('Too many') ||
        content.startsWith('Rate limit') ||
        content.startsWith('Error:') ||
        content.startsWith('Unauthorized') ||
        content.startsWith('Forbidden')
      )) {
        console.error(`❌ API returned error message instead of response for ${llmProvider}:`, content);
        throw new Error(`AI service returned error: ${content}`);
      }
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
   * Extract citations from LLM response - Enhanced for unlimited capture across all 4 LLMs
   * @param {object} responseData - Full API response
   * @param {string} llmProvider - LLM provider name (openai, gemini, claude, perplexity)
   * @param {string} responseText - Response text content
   * @returns {Array} - Array of citation objects with proper labeling
   */
  extractCitations(responseData, llmProvider, responseText) {
    const citations = [];
    const seenUrls = new Set(); // Track unique URLs to prevent duplicates
    const seenIds = new Set(); // Track unique citation IDs

    try {
      console.log(`      🔍 [CITATIONS] Starting enhanced extraction for ${llmProvider}`);

      // ===== PROVIDER-SPECIFIC CITATION EXTRACTION =====
      
      // Method 1: Perplexity API citations (structured in API response)
      if (llmProvider === 'perplexity' && responseData.citations) {
        responseData.citations.forEach((cit, idx) => {
          const cleanUrl = this.cleanUrl(cit);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: `Citation ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'perplexity_api',
              confidence: 1.0,
              label: 'perplexity_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
        console.log(`         ✅ Extracted ${responseData.citations.length} citations from Perplexity API`);
      }

      // Method 2: Claude API citations (if available in structured format)
      if (llmProvider === 'claude' && responseData.sources) {
        responseData.sources.forEach((source, idx) => {
          const url = source.url || source;
          const cleanUrl = this.cleanUrl(url);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: source.text || `Claude source ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'claude_api',
              confidence: 0.95,
              label: 'claude_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      }

      // Method 3: OpenAI API citations (if available in structured format)
      if (llmProvider === 'openai' && responseData.citations) {
        responseData.citations.forEach((cit, idx) => {
          const cleanUrl = this.cleanUrl(cit.url || cit);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: cit.text || `OpenAI citation ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'openai_api',
              confidence: 0.95,
              label: 'openai_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      }

      // Method 4: Gemini API citations (if available in structured format)
      if (llmProvider === 'gemini' && responseData.citations) {
        responseData.citations.forEach((cit, idx) => {
          const cleanUrl = this.cleanUrl(cit.url || cit);
          if (cleanUrl && !seenUrls.has(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: cit.text || `Gemini citation ${idx + 1}`,
              type: 'api_source',
              position: citations.length + 1,
              provider: 'gemini_api',
              confidence: 0.95,
              label: 'gemini_api_citation',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      }

      // ===== TEXT-BASED CITATION EXTRACTION (Universal for all LLMs) =====

      // Method 5: Enhanced markdown link parsing [text](url) - Multiple patterns
      const markdownPatterns = [
        /\[([^\]]+)\]\(([^)]+)\)/g,  // [text](url)
        /\[([^\]]+)\]\[([^\]]+)\]/g, // [text][ref]
        /\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)/g, // [ref]: url
        /\[([^\]]+)\]:\s*([^\s]+)/g  // [ref]: url (without protocol)
      ];

      markdownPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          const text = match[1]?.trim();
          let url = match[2]?.trim();
          
          if (url) {
            // Add protocol if missing
            if (!url.startsWith('http')) {
              url = 'https://' + url;
            }
            
            const cleanUrl = this.cleanUrl(url);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: text || 'Link',
                type: 'markdown_link',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.9,
                label: 'markdown_link',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          }
        }
      });

      // Method 6: Bare URLs extraction - Enhanced regex patterns
      const urlPatterns = [
        /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,  // Standard URLs
        /https?:\/\/[^\s<>"{}|\\^`[\]]*[^\s<>"{}|\\^`[\].]/g,  // URLs ending properly
        /www\.[^\s<>"{}|\\^`[\]]+\.[a-zA-Z]{2,}[^\s<>"{}|\\^`[\]]*/g,  // www URLs
        /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s<>"{}|\\^`[\]]*/g  // Domain patterns
      ];

      urlPatterns.forEach(pattern => {
        const urls = responseText.match(pattern) || [];
        urls.forEach(url => {
          const cleanUrl = this.cleanUrl(url);
          if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
            citations.push({
              url: cleanUrl,
              text: null,
              type: 'bare_url',
              position: citations.length + 1,
              provider: llmProvider,
              confidence: 0.8,
              label: 'bare_url',
              extractedAt: new Date().toISOString()
            });
            seenUrls.add(cleanUrl);
          }
        });
      });

      // Method 7: Citation markers and references [1][2][3] or [1,2,3]
      const citationMarkerPatterns = [
        /\[([0-9,\s]+)\]/g,  // [1,2,3] or [1 2 3]
        /\[([0-9]+)\]/g,     // [1] [2] [3]
        /\(([0-9,\s]+)\)/g,  // (1,2,3) or (1 2 3)
        /\(([0-9]+)\)/g,     // (1) (2) (3)
        /^\[([0-9]+)\]:\s*(.+)$/gm,  // [1]: url
        /^(\d+)\.\s*(https?:\/\/[^\s]+)/gm  // 1. url
      ];

      citationMarkerPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          // Handle direct URL references
          if (match[2] && match[2].startsWith('http')) {
            const cleanUrl = this.cleanUrl(match[2]);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: `Reference ${match[1]}`,
                type: 'reference',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.9,
                label: 'numbered_reference',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          } else if (match[1] && !match[2]) {
            // Citation markers without URLs
            const citationNumbers = match[1].split(/[,\s]+/).filter(n => n.trim());
            citationNumbers.forEach(num => {
              const citationId = num.trim();
              if (citationId && !seenIds.has(citationId)) {
                citations.push({
                  id: citationId,
                  url: `citation_${citationId}`,
                  text: `Citation ${citationId}`,
                  type: 'citation_marker',
                  position: citations.length + 1,
                  provider: llmProvider,
                  confidence: 0.7,
                  label: 'citation_marker',
                  extractedAt: new Date().toISOString()
                });
                seenIds.add(citationId);
              }
            });
          }
        }
      });

      // Method 8: HTML links <a href="url">text</a>
      const htmlPatterns = [
        /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,  // <a href="url">text</a>
        /<a[^>]+href=([^\s>]+)[^>]*>([^<]*)<\/a>/gi,         // <a href=url>text</a>
        /href=["']([^"']+)["']/gi,                           // href="url"
        /href=([^\s>]+)/gi                                   // href=url
      ];

      htmlPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          const url = match[1] || match[0];
          const text = match[2] || 'Link';
          
          if (url && url.startsWith('http')) {
            const cleanUrl = this.cleanUrl(url);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: text,
                type: 'html_link',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.9,
                label: 'html_link',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          }
        }
      });

      // Method 9: Reference patterns and footnotes
      const referencePatterns = [
        /See\s+(?:also\s+)?(?:https?:\/\/[^\s]+)/gi,  // See also url
        /For\s+more\s+information[^:]*:\s*(https?:\/\/[^\s]+)/gi,  // For more info: url
        /Source:\s*(https?:\/\/[^\s]+)/gi,  // Source: url
        /Reference:\s*(https?:\/\/[^\s]+)/gi,  // Reference: url
        /Visit:\s*(https?:\/\/[^\s]+)/gi,  // Visit: url
        /Learn\s+more[^:]*:\s*(https?:\/\/[^\s]+)/gi,  // Learn more: url
        /Check\s+out[^:]*:\s*(https?:\/\/[^\s]+)/gi  // Check out: url
      ];

      referencePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(responseText)) !== null) {
          const url = match[1] || match[0];
          if (url && url.startsWith('http')) {
            const cleanUrl = this.cleanUrl(url);
            if (cleanUrl && !seenUrls.has(cleanUrl) && this.isValidUrl(cleanUrl)) {
              citations.push({
                url: cleanUrl,
                text: 'Reference',
                type: 'reference',
                position: citations.length + 1,
                provider: llmProvider,
                confidence: 0.8,
                label: 'textual_reference',
                extractedAt: new Date().toISOString()
              });
              seenUrls.add(cleanUrl);
            }
          }
        }
      });

      // Clean and validate all citations
      const cleanedCitations = this.cleanAndValidateCitations(citations, llmProvider);

      // Sort by position
      cleanedCitations.sort((a, b) => a.position - b.position);

      console.log(`      📎 [CITATIONS] Extracted ${cleanedCitations.length} unique citations from ${llmProvider}`);
      console.log(`      📊 [CITATIONS] Breakdown: ${this.getCitationBreakdown(cleanedCitations)}`);

      return cleanedCitations;

    } catch (error) {
      console.error(`      ❌ [CITATIONS ERROR] Failed to extract citations:`, error.message);
      console.error(`      Stack:`, error.stack);
      return citations; // Return what we have so far
    }
  }

  /**
   * Clean URL by removing trailing punctuation and normalizing
   */
  cleanUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
      // Remove trailing punctuation
      let cleanUrl = url.replace(/[)\\].,;!?]+$/, '');
      
      // Add protocol if missing
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      // Normalize URL
      const urlObj = new URL(cleanUrl);
      return urlObj.toString();
    } catch (e) {
      // If URL parsing fails, try basic cleaning
      return url.replace(/[)\\].,;!?]+$/, '').trim();
    }
  }

  /**
   * Validate if URL is properly formatted
   */
  isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  /**
   * Clean and validate all extracted citations
   */
  cleanAndValidateCitations(citations, llmProvider) {
    return citations
      .filter(citation => {
        // Remove invalid citations
        if (!citation.url || citation.url === 'undefined' || citation.url === 'null') {
          return false;
        }
        
        // Keep citation markers (they're placeholders for references)
        // But filter them out if they're not valid
        if (citation.url.startsWith('citation_')) {
          return true; // Keep citation markers
        }
        
        // Validate URL format
        return this.isValidUrl(citation.url);
      })
      .map(citation => ({
        ...citation,
        url: citation.url.startsWith('citation_') ? citation.url : this.cleanUrl(citation.url),
        llmProvider: llmProvider,
        extractedAt: citation.extractedAt || new Date().toISOString()
      }));
  }

  /**
   * Get citation breakdown for logging
   */
  getCitationBreakdown(citations) {
    const breakdown = {};
    citations.forEach(citation => {
      const type = citation.type || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return Object.entries(breakdown)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
  }

  /**
   * Categorize a citation by type
   * @param {string} url - Citation URL
   * @param {string} brandName - Brand to check for
   * @returns {string} - 'brand', 'earned', or 'social'
   */
  categorizeCitation(url, brandName, allBrands = []) {
    // Handle citation markers (e.g., "citation_1", "citation_2")
    // ✅ FIX: Citation markers are just placeholder references, not actual brand citations
    if (url.startsWith('citation_')) {
      return { type: 'unknown', brand: null, confidence: 0.0 };
    }
    
    const urlLower = url.toLowerCase();
    
    // Extract domain from URL
    let domain = '';
    let cleanUrl = url.replace(/[)\\].,;!?]+$/, '');
    
    try {
      const urlObj = new URL(cleanUrl);
      domain = urlObj.hostname.toLowerCase();
    } catch (e) {
      const match = cleanUrl.toLowerCase().match(/(?:https?:\/\/)?(?:www\.)?([^\/\\)]+)/);
      if (match) {
        domain = match[1].replace(/[)\\].,;!?]+$/, '');
      }
    }
    
    if (!domain) {
      return { type: 'unknown', brand: null, confidence: 0 };
    }
    
    // 1. Check for Brand citations (official brand-owned sources)
    const brandClassification = this.classifyBrandCitation(domain, allBrands);
    if (brandClassification.type === 'brand') {
      return brandClassification;
    }
    
    // 2. Check for Social citations (community-driven mentions)
    const socialClassification = this.classifySocialCitation(domain);
    if (socialClassification.type === 'social') {
      return socialClassification;
    }
    
    // 3. Everything else is Earned media (third-party editorial references)
    const earnedClassification = this.classifyEarnedCitation(domain, allBrands);
    return earnedClassification;
  }

  /**
   * Classify if a domain belongs to a brand (official brand-owned sources)
   * Enhanced to work dynamically with any brand from the database
   */
  classifyBrandCitation(domain, allBrands = []) {
    // First, check against user's brands and competitors dynamically
    if (allBrands && allBrands.length > 0) {
      for (const brand of allBrands) {
        const brandName = brand.name || brand;
        if (!brandName) continue;
        
        // Generate possible domain variations for this brand
        const possibleDomains = this.generateDomainVariations(brandName);
        
        // Check exact domain match
        if (possibleDomains.includes(domain)) {
          return { 
            type: 'brand', 
            brand: brandName, 
            confidence: 0.95,
            label: 'brand_owned_domain'
          };
        }
        
        // Check subdomain patterns (e.g., blog.example.com, www.example.com)
        for (const possibleDomain of possibleDomains) {
          if (domain.endsWith('.' + possibleDomain)) {
            return { 
              type: 'brand', 
              brand: brandName, 
              confidence: 0.85,
              label: 'brand_subdomain'
            };
          }
        }
        
        // Check for brand name patterns in domain
        const brandPatterns = this.generateBrandPatterns(brandName);
        for (const pattern of brandPatterns) {
          const normalizedPattern = pattern.toLowerCase().replace(/\s+/g, '');
          if (domain.includes(normalizedPattern)) {
            return { 
              type: 'brand', 
              brand: brandName, 
              confidence: 0.75,
              label: 'brand_pattern_match'
            };
          }
        }
      }
    }
    
    // Fallback: Check against hardcoded brand domains (for legacy support)
    const brandDomains = [
      'americanexpress.com', 'amex.com', 'americanexpress.co.uk', 'amex.co.uk',
      'chase.com', 'chasebank.com', 'chase.co.uk',
      'capitalone.com', 'capitalone.co.uk',
      'citi.com', 'citibank.com', 'citibank.co.uk',
      'wellsfargo.com', 'wellsfargoadvisors.com',
      'bankofamerica.com', 'bofa.com',
      'discover.com', 'discovercard.com'
    ];
    
    // Check exact domain matches
    if (brandDomains.includes(domain)) {
      return { 
        type: 'brand', 
        brand: this.extractBrandFromDomain(domain), 
        confidence: 0.9,
        label: 'brand_owned_domain'
      };
    }
    
    // Check subdomain patterns for brands
    for (const brandDomain of brandDomains) {
      if (domain.endsWith('.' + brandDomain)) {
        return { 
          type: 'brand', 
          brand: this.extractBrandFromDomain(brandDomain), 
          confidence: 0.8,
          label: 'brand_subdomain'
        };
      }
    }
    
    return { type: 'unknown', brand: null, confidence: 0 };
  }

  /**
   * Generate possible domain variations for a brand name
   * Used for dynamic brand citation detection
   */
  generateDomainVariations(brandName) {
    const variations = new Set();
    
    // Clean brand name
    const cleanName = brandName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const words = cleanName.split(/\s+/);
    
    // Add exact brand name
    variations.add(cleanName);
    
    // Add without spaces
    variations.add(cleanName.replace(/\s+/g, ''));
    
    // Add with hyphens
    variations.add(cleanName.replace(/\s+/g, '-'));
    
    // Add with dots
    variations.add(cleanName.replace(/\s+/g, '.'));
    
    // Add with underscores
    variations.add(cleanName.replace(/\s+/g, '_'));
    
    // Add first word only
    if (words.length > 1) {
      variations.add(words[0]);
    }
    
    // Add first two words
    if (words.length >= 2) {
      variations.add(words.slice(0, 2).join(''));
      variations.add(words.slice(0, 2).join('-'));
      variations.add(words.slice(0, 2).join('.'));
    }
    
    return Array.from(variations);
  }

  /**
   * Classify if a domain is social media (community-driven mentions)
   */
  classifySocialCitation(domain) {
    const socialDomains = [
      'twitter.com', 'x.com', 't.co',
      'linkedin.com', 'linkedin.co.uk',
      'facebook.com', 'fb.com', 'facebook.co.uk',
      'instagram.com', 'ig.com',
      'youtube.com', 'youtu.be', 'youtube.co.uk',
      'reddit.com', 'reddit.co.uk',
      'tiktok.com', 'tiktok.co.uk',
      'pinterest.com', 'pinterest.co.uk',
      'snapchat.com', 'snapchat.co.uk',
      'telegram.org', 'telegram.me',
      'discord.com', 'discord.gg',
      'medium.com', 'medium.co.uk',
      'quora.com', 'quora.co.uk',
      'blogspot.com', 'blogger.com',
      'wordpress.com', 'wordpress.co.uk',
      'tumblr.com', 'tumblr.co.uk',
      'flickr.com', 'flickr.co.uk',
      'vimeo.com', 'vimeo.co.uk',
      'dailymotion.com', 'dailymotion.co.uk'
    ];
    
    for (const socialDomain of socialDomains) {
      if (domain === socialDomain || domain.endsWith('.' + socialDomain)) {
        return { 
          type: 'social', 
          brand: null, 
          confidence: 0.9,
          label: 'social_media_platform'
        };
      }
    }
    
    return { type: 'unknown', brand: null, confidence: 0 };
  }

  /**
   * Classify if a domain is earned media (third-party editorial references)
   */
  classifyEarnedCitation(domain, allBrands = []) {
    // Check if it's a news/media domain
    const newsDomains = [
      'cnn.com', 'bbc.com', 'bbc.co.uk', 'reuters.com', 'bloomberg.com',
      'wsj.com', 'nytimes.com', 'washingtonpost.com', 'guardian.com',
      'forbes.com', 'techcrunch.com', 'wired.com', 'theverge.com',
      'engadget.com', 'arstechnica.com', 'mashable.com', 'venturebeat.com',
      'businessinsider.com', 'inc.com', 'fastcompany.com', 'hbr.org',
      'economist.com', 'ft.com', 'ft.co.uk', 'marketwatch.com',
      'cnbc.com', 'yahoo.com', 'msn.com', 'aol.com'
    ];
    
    for (const newsDomain of newsDomains) {
      if (domain === newsDomain || domain.endsWith('.' + newsDomain)) {
        return { 
          type: 'earned', 
          brand: null, 
          confidence: 0.9,
          label: 'news_media_outlet'
        };
      }
    }
    
    // Check if it's a review/analysis site
    const reviewDomains = [
      'trustpilot.com', 'trustpilot.co.uk',
      'glassdoor.com', 'glassdoor.co.uk',
      'yelp.com', 'yelp.co.uk',
      'tripadvisor.com', 'tripadvisor.co.uk',
      'g2.com', 'capterra.com', 'softwareadvice.com',
      'consumerreports.org', 'which.co.uk',
      'money.co.uk', 'moneysavingexpert.com',
      'nerdwallet.com', 'nerdwallet.co.uk',
      'thepointsguy.com', 'thepointsguy.co.uk',
      'creditkarma.com', 'creditkarma.co.uk'
    ];
    
    for (const reviewDomain of reviewDomains) {
      if (domain === reviewDomain || domain.endsWith('.' + reviewDomain)) {
        return { 
          type: 'earned', 
          brand: null, 
          confidence: 0.8,
          label: 'review_analysis_site'
        };
      }
    }
    
    // Check if it's a financial/credit card specific site
    const financialDomains = [
      'creditcards.com', 'creditcards.co.uk',
      'cardratings.com', 'cardratings.co.uk',
      'myfico.com', 'myfico.co.uk',
      'experian.com', 'experian.co.uk',
      'equifax.com', 'equifax.co.uk',
      'transunion.com', 'transunion.co.uk',
      'bankrate.com', 'bankrate.co.uk',
      'investopedia.com', 'investopedia.co.uk',
      'fool.com', 'fool.co.uk'
    ];
    
    for (const financialDomain of financialDomains) {
      if (domain === financialDomain || domain.endsWith('.' + financialDomain)) {
        return { 
          type: 'earned', 
          brand: null, 
          confidence: 0.8,
          label: 'financial_media_site'
        };
      }
    }
    
    // Default to earned media for unknown domains (third-party editorial references)
    return { 
      type: 'earned', 
      brand: null, 
      confidence: 0.5,
      label: 'third_party_editorial'
    };
  }

  /**
   * Extract brand name from domain using generic logic
   * This is a fallback method - primary brand detection should come from Perplexity during onboarding
   */
  extractBrandFromDomain(domain) {
    if (!domain) return 'Unknown Brand';
    
    // Generic domain-to-brand conversion
    const domainPart = domain.split('.')[0];
    if (!domainPart) return 'Unknown Brand';
    
    // Convert domain to readable format
    return domainPart
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }


  /**
   * Analyze sentiment of brand mentions in response
   * @param {string} responseText - Full LLM response
   * @param {string} brandName - Brand to analyze
   * @param {Array} brandPatterns - Flexible brand patterns to match
   * @returns {object} - Sentiment analysis { sentiment, sentimentScore, drivers }
   */
  analyzeSentiment(responseText, brandName, brandPatterns = [brandName]) {
    // Expanded positive keywords - stronger signals
    const positiveKeywords = [
      'best', 'excellent', 'great', 'top', 'leading', 'trusted', 'reliable', 
      'recommended', 'popular', 'strong', 'superior', 'outstanding', 'premier',
      'robust', 'comprehensive', 'flexible', 'innovative', 'powerful', 'advanced',
      'seamless', 'easy', 'simple', 'efficient', 'effective', 'preferred', 'ideal',
      'unmatched', 'favored', 'recognized', 'renowned', 'good', 'quality', 'solid',
      'worthy', 'valuable', 'beneficial', 'helpful', 'useful', 'proven', 'established',
      'successful', 'well-regarded', 'highly', 'very', 'particularly', 'especially',
      'impressive', 'notable', 'significant', 'substantial', 'essential', 'important',
      'vital', 'crucial', 'advantageous', 'promising', 'suitable', 'appropriate'
    ];

    // Expanded negative keywords - stronger signals
    const negativeKeywords = [
      'bad', 'poor', 'worst', 'weak', 'limited', 'lacking', 'difficult', 
      'complicated', 'expensive', 'costly', 'slow', 'unreliable', 'problematic',
      'issues', 'problems', 'concerns', 'drawbacks', 'disadvantages', 'limitations',
      'struggles', 'fails', 'inferior', 'outdated', 'challenging', 'complex',
      'questionable', 'unclear', 'insufficient', 'inadequate', 'substandard',
      'disappointing', 'concerning', 'troublesome', 'risky', 'uncertain', 'weak',
      'fragile', 'unstable', 'inefficient', 'ineffective', 'unsuitable', 'inappropriate'
    ];

    // Negation words that flip sentiment
    const negationWords = ['not', 'no', 'never', 'none', 'neither', 'barely', 'hardly', 'scarcely', 'rarely', 'seldom'];

    // Extract sentences mentioning the brand using flexible patterns
    const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const brandSentences = sentences.filter(s => {
      const sentenceLower = s.toLowerCase();
      return brandPatterns.some(pattern => 
        sentenceLower.includes(pattern.toLowerCase())
      );
    });

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

      // Check for negation words first
      const hasNegation = negationWords.some(neg => {
        const regex = new RegExp(`\\b${neg}\\b`, 'i');
        return regex.test(lowerSentence);
      });

      // Count positive keywords
      positiveKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerSentence)) {
          // If negation is present, flip to negative
          if (hasNegation) {
            sentenceScore -= 0.2;
            foundKeywords.push('-' + keyword + ' (negated)');
          } else {
            sentenceScore += 0.4; // Increased from 0.3 for better detection
            foundKeywords.push('+' + keyword);
          }
        }
      });

      // Count negative keywords
      negativeKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerSentence)) {
          // If negation is present, flip to positive
          if (hasNegation) {
            sentenceScore += 0.2;
            foundKeywords.push('+' + keyword + ' (negated)');
          } else {
            sentenceScore -= 0.4; // Increased from 0.3 for better detection
            foundKeywords.push('-' + keyword);
          }
        }
      });

      // Determine sentence sentiment with lower thresholds
      let sentenceSentiment = 'neutral';
      if (sentenceScore > 0.2) sentenceSentiment = 'positive'; // Lowered from 0.3
      else if (sentenceScore < -0.2) sentenceSentiment = 'negative'; // Lowered from -0.3

      if (foundKeywords.length > 0 || sentenceSentiment !== 'neutral') {
        drivers.push({
          text: sentence.substring(0, 150), // Increased length for better context
          sentiment: sentenceSentiment,
          keywords: foundKeywords
        });
      }

      totalScore += sentenceScore;
    });

    // Calculate overall sentiment with improved thresholds
    const avgScore = brandSentences.length > 0 ? totalScore / brandSentences.length : 0;
    const normalizedScore = Math.max(-1, Math.min(1, avgScore)); // Clamp to -1 to +1

    let overallSentiment = 'neutral';
    // Lowered thresholds for better detection
    if (normalizedScore > 0.1) overallSentiment = 'positive'; // Lowered from 0.2
    else if (normalizedScore < -0.1) overallSentiment = 'negative'; // Lowered from -0.2
    else if (drivers.some(d => d.sentiment === 'positive') && drivers.some(d => d.sentiment === 'negative')) {
      overallSentiment = 'mixed';
    }

    console.log(`         😊 Sentiment: ${overallSentiment} (Score: ${normalizedScore.toFixed(3)}, Drivers: ${drivers.length})`);

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
    // Generate intelligent brand matching patterns using generic algorithm
    const brandPatterns = this.generateBrandPatterns(brandName);
    // Split response into sentences
    const sentences = responseText
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0);

    const allBrands = [brandName, ...competitors.filter(c => c.name).map(c => c.name)];
    const brandMetrics = [];

    // Process each brand
    allBrands.forEach((brand, brandIndex) => {
      // Use intelligent brand pattern generation for all brands
      const patternsToUse = this.generateBrandPatterns(brand);
      const escapedPatterns = patternsToUse.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const brandRegex = new RegExp(`(${escapedPatterns.join('|')})`, 'gi');

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

      // Get and categorize citations for this brand using the new classification system
      // Use intelligent brand pattern generation for citation classification
      const citationBrandPatterns = this.generateBrandPatterns(brand);
      
      // Filter citations that match this brand using the same logic as calculateDeterministicScore
      const allBrandCitations = citations.filter(cit => {
        const urlLower = cit.url.toLowerCase();
        
        // ✅ FIX: Citation markers are just placeholder references, not actual citations
        if (cit.url.startsWith('citation_')) {
          return false; // Don't count citation markers as citations
        }
        
        // For URLs, check if they contain any of the brand patterns
        return citationBrandPatterns.some(pattern => 
          urlLower.includes(pattern.toLowerCase().replace(/\s+/g, ''))
        );
      });

      // Categorize citations using the new classification system
      let brandCitationsCount = 0;
      let earnedCitationsCount = 0;
      let socialCitationsCount = 0;

      // Create all brands list for classification
      const allBrands = [brand, ...competitors.map(c => c.name)];
      
      const categorizedCitations = allBrandCitations.map(cit => {
        const classification = this.categorizeCitation(cit.url, brand, allBrands);
        
        // Count by type
        if (classification.type === 'brand') brandCitationsCount++;
        else if (classification.type === 'earned') earnedCitationsCount++;
        else if (classification.type === 'social') socialCitationsCount++;

        return {
          url: cit.url,
          type: classification.type,
          brand: classification.brand,
          confidence: classification.confidence,
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
          citations: categorizedCitations,
          // NEW: owner flag
          isOwner: (brand.trim().toLowerCase() === brandName.trim().toLowerCase())
        });
      }
    });

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
   * Generate intelligent brand matching patterns for any brand name
   * @param {string} brandName - The brand name from database
   * @returns {Array} - Array of patterns to match in LLM responses
   */
  generateBrandPatterns(brandName) {
    const patterns = new Set([brandName]); // Always include exact brand name
    
    // Add case variations
    patterns.add(brandName.toLowerCase());
    patterns.add(brandName.toUpperCase());
    patterns.add(brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase()); // Title case
    
    // Remove special characters and normalize
    const cleanBrandName = brandName.replace(/[®™℠©]/g, '').trim();
    patterns.add(cleanBrandName);
    patterns.add(cleanBrandName.toLowerCase());
    patterns.add(cleanBrandName.toUpperCase());
    patterns.add(cleanBrandName.charAt(0).toUpperCase() + cleanBrandName.slice(1).toLowerCase());
    
    // Split brand name into words for intelligent matching
    const words = cleanBrandName.split(/\s+/).filter(w => w.length > 1);
    
    if (words.length === 0) return Array.from(patterns);
    
    // Add individual significant words (excluding common product words)
    const commonProductWords = new Set(['card', 'credit', 'debit', 'prepaid', 'rewards', 'cashback', 'travel', 'business', 'personal', 'premium', 'elite', 'gold', 'silver', 'platinum', 'diamond', 'black', 'blue', 'red', 'green', 'white']);
    
    words.forEach(word => {
      if (!commonProductWords.has(word.toLowerCase())) {
        patterns.add(word);
        patterns.add(word.toLowerCase());
        patterns.add(word.toUpperCase());
        patterns.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      }
    });
    
    // Add meaningful word combinations (avoid over-generating)
    if (words.length > 1) {
      // Add first two words (common for "Brand Name" patterns)
      if (words.length >= 2) {
        const twoWords = `${words[0]} ${words[1]}`;
        patterns.add(twoWords);
        patterns.add(twoWords.toLowerCase());
        patterns.add(twoWords.toUpperCase());
        patterns.add(twoWords.charAt(0).toUpperCase() + twoWords.slice(1).toLowerCase());
      }
      
      // Add full name without special chars (already added above)
      // patterns.add(words.join(' '));
    }
    
    // Add strategic abbreviations for major brands
    const firstWord = words[0];
    if (firstWord) {
      const abbreviationMap = {
        'american': 'amex',
        'american express': 'amex',
        'chase': 'jpmorgan',
        'jpmorgan': 'chase',
        'capital': 'cap1',
        'citibank': 'citi',
        'mastercard': 'mc',
        'visa': 'vs'
      };
      
      const lowerFirst = firstWord.toLowerCase();
      if (abbreviationMap[lowerFirst]) {
        patterns.add(abbreviationMap[lowerFirst]);
      }
      
      // Check if first word contains major brand names
      Object.entries(abbreviationMap).forEach(([key, abbrev]) => {
        if (lowerFirst.includes(key)) {
          patterns.add(abbrev);
        }
      });
    }
    
    // Add parent brand patterns for product-specific names
    const productIndicators = ['card', 'credit', 'debit', 'rewards', 'cashback', 'travel', 'business'];
    const hasProductIndicator = productIndicators.some(indicator => 
      cleanBrandName.toLowerCase().includes(indicator)
    );
    
    if (hasProductIndicator) {
      // Extract parent brand name (everything before the first product indicator)
      const productWords = cleanBrandName.toLowerCase().split(/\s+/);
      const productIndex = productWords.findIndex(word => 
        productIndicators.includes(word)
      );
      
      if (productIndex > 0) {
        const parentBrand = productWords.slice(0, productIndex).join(' ');
        if (parentBrand.length > 0) {
          patterns.add(parentBrand);
          
          // Add key parent brand + product combinations (not all combinations)
          const keyProducts = ['card', 'credit'];
          keyProducts.forEach(indicator => {
            patterns.add(`${parentBrand} ${indicator}`);
          });
        }
      }
    }
    
    // Convert Set to Array, remove duplicates, and filter out empty patterns
    return Array.from(patterns)
      .filter(pattern => pattern && pattern.trim().length > 0)
      .sort((a, b) => b.length - a.length); // Sort by length (longest first) for better matching
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

    // Generate intelligent brand matching patterns using generic algorithm
    const brandPatterns = this.generateBrandPatterns(brandName);

    // Count brand mentions using flexible patterns
    let brandMentions = 0;
    let brandMentioned = false;
    
    for (const pattern of brandPatterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = (responseText.match(regex) || []).length;
      brandMentions += matches;
      if (matches > 0) brandMentioned = true;
    }

    // Calculate brand position (which sentence brand first appears in)
    let brandPosition = null;
    if (brandMentioned) {
      const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].toLowerCase();
        // Check if any brand pattern appears in this sentence
        for (const pattern of brandPatterns) {
          if (sentence.includes(pattern.toLowerCase())) {
            brandPosition = i + 1; // 1-indexed
            break;
          }
        }
        if (brandPosition) break;
      }
    }

    // Categorize brand citations using flexible brand patterns
    const allBrandCitations = citations.filter(c => {
      // For citation markers, count them as citations if brand is mentioned
      if (c.type === 'citation_marker') {
        return brandMentioned; // If brand is mentioned, citation markers count as citations
      }
      // For URLs, check if they contain brand name
      const urlLower = c.url.toLowerCase();
      return brandPatterns.some(pattern => 
        urlLower.includes(pattern.toLowerCase().replace(/\s+/g, ''))
      );
    });
    
    let brandCitationsCount = 0;
    let earnedCitationsCount = 0;
    let socialCitationsCount = 0;
    
    // Create all brands list for classification
    const allBrands = [brandName, ...competitors.map(c => c.name)];
    
    allBrandCitations.forEach(cit => {
      const classification = this.categorizeCitation(cit.url, brandName, allBrands);
      if (classification.type === 'brand') brandCitationsCount++;
      else if (classification.type === 'earned') earnedCitationsCount++;
      else if (classification.type === 'social') socialCitationsCount++;
    });
    
    const totalCitations = allBrandCitations.length;
    const citationPresent = totalCitations > 0;
    const citationType = brandCitationsCount > 0 ? 'direct_link' : 
                        earnedCitationsCount > 0 ? 'reference' : 
                        socialCitationsCount > 0 ? 'social' : 'none';

    // Find competitors mentioned in response using intelligent pattern matching
    const competitorsMentioned = [];
    
    competitors.forEach(comp => {
      if (!comp.name || comp.name.trim().length === 0) return;
      
      // Generate intelligent patterns for competitor name (same as brand patterns)
      const competitorPatterns = this.generateBrandPatterns(comp.name);
      let competitorMentioned = false;
      let totalMentions = 0;
      
      // Check if any pattern matches in the response
      for (const pattern of competitorPatterns) {
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = (responseText.match(regex) || []).length;
        if (matches > 0) {
          competitorMentioned = true;
          totalMentions += matches;
        }
      }
      
      if (competitorMentioned) {
        competitorsMentioned.push(comp.name);
        console.log(`         ✅ Competitor detected: ${comp.name} (${totalMentions} mentions)`);
      }
    });

    // Analyze sentiment for user's brand using flexible patterns
    const sentimentAnalysis = this.analyzeSentiment(responseText, brandName, brandPatterns);

    console.log(`      📊 [SCORECARD] Brand: ${brandName}`);
    console.log(`         Mentioned: ${brandMentioned}, Count: ${brandMentions}, Position: ${brandPosition}`);
    console.log(`         Citations - Brand: ${brandCitationsCount}, Earned: ${earnedCitationsCount}, Social: ${socialCitationsCount}`);
    console.log(`         Sentiment: ${sentimentAnalysis.sentiment} (Score: ${sentimentAnalysis.sentimentScore.toFixed(2)})`);

    // Calculate visibility score using the correct formula:
    // VisibilityScore(b) = (# of prompts where Brand b appears / Total prompts) × 100
    // For individual prompt tests, this is either 100% (mentioned) or 0% (not mentioned)
    // The aggregation service will calculate the overall visibility across all prompts
    const visibilityScore = brandMentioned ? 100 : 0;
    
    // Calculate overall score (0-100) based on multiple factors
    // This is a composite score that considers visibility, position, citations, and sentiment
    let overallScore = 0;
    
    if (brandMentioned) {
      // Base score for being mentioned (visibility component)
      overallScore += 40;
      
      // Position bonus (earlier is better)
      if (brandPosition === 1) overallScore += 30;
      else if (brandPosition === 2) overallScore += 20;
      else if (brandPosition === 3) overallScore += 10;
      else if (brandPosition <= 5) overallScore += 5;
      
      // Citation bonus
      if (brandCitationsCount > 0) overallScore += 20;
      if (earnedCitationsCount > 0) overallScore += 10;
      
      // Sentiment bonus
      if (sentimentAnalysis.sentiment === 'positive') overallScore += 10;
      else if (sentimentAnalysis.sentiment === 'neutral') overallScore += 5;
    }

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
      competitorsMentioned,
      visibilityScore,
      overallScore
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
  /**
   * Smart sampling: Select a balanced subset of prompts
   * Ensures even distribution across topic×persona combinations
   * @param {Array} prompts - All available prompts
   * @param {number} limit - Maximum number of prompts to select
   * @returns {Array} - Sampled prompts
   */
  samplePrompts(prompts, limit) {
    if (prompts.length <= limit) {
      console.log(`   ℹ️  All ${prompts.length} prompts will be tested (under limit of ${limit})`);
      return prompts;
    }

    // Group prompts by topic×persona combination for balanced sampling
    const promptsByCombination = {};
    prompts.forEach(prompt => {
      const topicId = prompt.topicId?._id || prompt.topicId;
      const personaId = prompt.personaId?._id || prompt.personaId;
      const combinationKey = `${topicId}_${personaId}`;
      
      if (!promptsByCombination[combinationKey]) {
        promptsByCombination[combinationKey] = [];
      }
      promptsByCombination[combinationKey].push(prompt);
    });

    const combinations = Object.keys(promptsByCombination).sort(); // Sort for deterministic order
    const promptsPerCombination = Math.floor(limit / combinations.length);
    const remainder = limit % combinations.length;

    console.log(`   📊 Sampling strategy:`);
    console.log(`      - Total prompts: ${prompts.length}`);
    console.log(`      - Limit: ${limit}`);
    console.log(`      - Topic×Persona combinations: ${combinations.length}`);
    console.log(`      - Per combination: ${promptsPerCombination} (+ ${remainder} for first ${remainder} combinations)`);

    const sampledPrompts = [];

    // Sample evenly from each topic×persona combination
    combinations.forEach((combinationKey, index) => {
      const comboPrompts = promptsByCombination[combinationKey];
      // Add 1 extra to first few combinations to handle remainder
      const sampleCount = index < remainder ? promptsPerCombination + 1 : promptsPerCombination;
      
      // Randomly sample from this combination
      const shuffled = comboPrompts.sort(() => Math.random() - 0.5);
      const sampled = shuffled.slice(0, Math.min(sampleCount, comboPrompts.length));
      
      const topicName = sampled[0]?.topicId?.name || 'Unknown';
      const personaName = sampled[0]?.personaId?.type || 'Unknown';
      console.log(`      - ${topicName} × ${personaName}: ${sampled.length}/${comboPrompts.length} prompts`);
      sampledPrompts.push(...sampled);
    });

    console.log(`   ✅ Final sample: ${sampledPrompts.length} prompts selected`);
    return sampledPrompts;
  }

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
      
      // Extract correct brand name from URL if stored name is "Unknown Product"
      let companyName = analysis?.brandContext?.companyName || 'Unknown';
      
      if (companyName === 'Unknown Product' && analysis?.url) {
        try {
          const url = new URL(analysis.url);
          const domain = url.hostname.replace('www.', '');
          const domainParts = domain.split('.');
          if (domainParts.length > 1) {
            const mainDomain = domainParts[0];
            // Use the generic domain-to-brand mapping function
            companyName = this.extractBrandFromDomain(domain);
          }
        } catch (e) {
          // URL parsing failed, keep original name
        }
      }
      
      return {
        companyName: companyName,
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

  /**
   * Get default scorecard structure for failed tests
   * @returns {Object} Default scorecard with all metrics set to default values
   */
  getDefaultScorecard() {
    return {
      brandMentioned: false,
      brandPosition: null,
      brandMentionCount: 0,
      citationPresent: false,
      citationType: 'none',
      brandCitations: 0,
      earnedCitations: 0,
      socialCitations: 0,
      totalCitations: 0,
      sentiment: 'neutral',
      sentimentScore: 0,
      competitorsMentioned: []
    };
  }
}

module.exports = new PromptTestingService();



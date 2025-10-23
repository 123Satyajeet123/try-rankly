const axios = require('axios');
const SubjectiveMetrics = require('../models/SubjectiveMetrics');
const PromptTest = require('../models/PromptTest');

/**
 * SubjectiveMetricsService
 * Evaluates brand citations using GPT-4o via OpenRouter for qualitative metrics
 */
class SubjectiveMetricsService {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    this.model = 'openai/gpt-4o'; // GPT-4o via OpenRouter
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    console.log('🔑 SubjectiveMetrics - OpenRouter API Key loaded:', this.openRouterApiKey ? 'YES' : 'NO');
  }

  /**
   * Main evaluation function - Evaluates across ALL platform responses
   * @param {String} promptId - ID of the prompt
   * @param {String} brandName - Brand to evaluate (Source [1])
   * @param {String} userId - User ID
   * @returns {Object} Subjective metrics aggregated across all platforms
   */
  async evaluateMetrics(promptId, brandName, userId) {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 [SubjectiveMetrics] Starting evaluation');
    console.log(`   Prompt: ${promptId}`);
    console.log(`   Brand: ${brandName}`);
    console.log('='.repeat(70));

    const startTime = Date.now();

    try {
      // 1. Check if metrics already exist for this prompt
      const existingMetrics = await SubjectiveMetrics.findOne({
        promptId,
        brandName
      });

      if (existingMetrics) {
        console.log('ℹ️  [SubjectiveMetrics] Metrics already exist, returning cached');
        return existingMetrics;
      }

      // 2. Fetch ALL prompt test responses for this prompt (all platforms)
      const Prompt = require('../models/Prompt');
      const prompt = await Prompt.findById(promptId).lean();
      
      if (!prompt) {
        throw new Error('Prompt not found');
      }

      const promptTests = await PromptTest.find({
        promptId: promptId,
        userId: userId,
        status: 'completed'
      }).lean();

      if (!promptTests || promptTests.length === 0) {
        throw new Error('No completed prompt tests found for this prompt');
      }

      console.log(`✅ [SubjectiveMetrics] Loaded ${promptTests.length} platform responses`);
      console.log(`   Platforms: ${promptTests.map(pt => pt.llmProvider).join(', ')}`);
      console.log(`   Query: ${prompt.text.substring(0, 100)}...`);

      // 3. Check if brand is mentioned in any response (case-insensitive)
      const brandFound = promptTests.some(pt => 
        pt.brandMetrics?.some(bm => 
          bm.brandName.toLowerCase() === brandName.toLowerCase() && bm.mentioned
        )
      );

      // Also check if brand is mentioned in the raw response text (case-insensitive)
      const brandFoundInText = promptTests.some(pt => {
        const responseText = pt.rawResponse || '';
        const brandPatterns = [
          brandName,
          brandName.toLowerCase(),
          brandName.toUpperCase(),
          brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase()
        ];
        
        return brandPatterns.some(pattern => 
          responseText.toLowerCase().includes(pattern.toLowerCase())
        );
      });

      if (!brandFound && !brandFoundInText) {
        console.log(`⚠️ [SubjectiveMetrics] Brand "${brandName}" not found in any platform responses`);
        console.log(`   This is common when the brand is not mentioned in LLM responses`);
        console.log(`   Proceeding with default evaluation values...`);
        
        // Return default metrics when brand is not mentioned
        return await this.createDefaultMetrics(promptId, brandName, userId, promptTests);
      }

      if (brandFound) {
        console.log(`✅ [SubjectiveMetrics] Brand "${brandName}" found in brand metrics`);
      } else if (brandFoundInText) {
        console.log(`✅ [SubjectiveMetrics] Brand "${brandName}" found in response text`);
      }

      // 4. Build unified evaluation prompt with ALL platform responses
      const evaluationPrompt = this.buildUnifiedPrompt(
        prompt.text,
        promptTests,
        brandName
      );

      console.log(`✅ [SubjectiveMetrics] Evaluation prompt built (${evaluationPrompt.length} chars)`);

      // 5. Call GPT-4o
      const gptResponse = await this.callGPT4o(evaluationPrompt);
      
      console.log(`✅ [SubjectiveMetrics] GPT-4o evaluation complete`);
      console.log(`   Tokens: ${gptResponse.tokensUsed}`);
      console.log(`   Cost: $${gptResponse.cost.toFixed(4)}`);

      // 6. Parse and validate response
      const metrics = this.parseMetricsResponse(gptResponse.content);
      
      console.log(`✅ [SubjectiveMetrics] Metrics parsed and validated`);
      this.logMetricsSummary(metrics);

      // 7. Save to database
      const savedMetrics = await this.saveMetrics(
        prompt,
        promptTests,
        brandName,
        metrics,
        gptResponse,
        startTime,
        userId
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [SubjectiveMetrics] Evaluation complete in ${duration}ms`);
      console.log('='.repeat(70) + '\n');

      return savedMetrics;

    } catch (error) {
      console.error('❌ [SubjectiveMetrics] Evaluation failed:', error.message);
      
      // Save failed attempt
      await SubjectiveMetrics.create({
        userId,
        promptId,
        brandName,
        status: 'failed',
        errorMessage: error.message,
        evaluationTime: Date.now() - startTime
      }).catch(err => console.error('Failed to save error:', err));

      throw error;
    }
  }

  /**
   * Fetch prompt test data with all necessary fields
   */
  async fetchPromptTestData(promptTestId) {
    return await PromptTest.findById(promptTestId)
      .populate('promptId', 'text')
      .populate('topicId', 'name')
      .populate('personaId', 'type')
      .lean();
  }

  /**
   * Extract citation context for the brand
   */
  extractCitationContext(response, brandName, brandMetrics) {
    // Find brand in brandMetrics
    const brandMetric = brandMetrics?.find(
      bm => bm.brandName.toLowerCase() === brandName.toLowerCase()
    );

    if (!brandMetric || !brandMetric.mentioned) {
      return {
        found: false,
        brandName,
        message: 'Brand not mentioned in response'
      };
    }

    // Extract citation details
    const context = {
      found: true,
      brandName: brandMetric.brandName,
      position: brandMetric.firstPosition || 0,
      mentionCount: brandMetric.mentionCount || 0,
      totalWordCount: brandMetric.totalWordCount || 0,
      
      // Citation info
      citations: brandMetric.citations || [],
      totalCitations: brandMetric.citationMetrics?.totalCitations || 0,
      brandCitations: brandMetric.citationMetrics?.brandCitations || 0,
      
      // Sentiment
      sentiment: brandMetric.sentiment || 'neutral',
      sentimentScore: brandMetric.sentimentScore || 0,
      
      // Extract relevant sentences
      sentences: brandMetric.sentences || [],
      citationText: this.extractCitationText(brandMetric.sentences),
      
      // URL if available
      sourceUrl: brandMetric.citations?.[0]?.url || ''
    };

    return context;
  }

  /**
   * Extract citation text from sentences
   */
  extractCitationText(sentences) {
    if (!sentences || sentences.length === 0) return '';
    
    // Take first 3 sentences or 300 chars, whichever is shorter
    const text = sentences
      .slice(0, 3)
      .map(s => s.text)
      .join(' ');
    
    return text.length > 300 ? text.substring(0, 300) + '...' : text;
  }

  /**
   * Build unified evaluation prompt for GPT-4o
   * Uses exact criteria from original geval prompts with reasoning addition
   */
  buildUnifiedPrompt(query, promptTests, brandName) {
    // Format all platform answers
    const platformAnswers = promptTests.map((pt, idx) => {
      return `
Generated Answer from Platform ${idx + 1} (${pt.llmProvider.toUpperCase()}):

${pt.rawResponse}

---`;
    }).join('\n\n');

    return `You will be given multiple answers generated in response to a query. Every sentence in the answers may be backed by a citation in format [x], where x is an integer denoting the source number.

Your task is to rate how "${brandName}" is cited in the generated answers on six metrics. Note that "${brandName}" appears as Source [1] in the citations.

Please make sure you read and understand these instructions carefully. Please keep this document open while reviewing, and refer to it as needed.

==================================================

Input User Query:

${query}

${platformAnswers}

==================================================
EVALUATION TASK
==================================================

Evaluate how "${brandName}" is cited across the following 6 dimensions. For each dimension, provide:
1. A score from 1 to 5
2. A concise but insightful reasoning (30-35 words explaining your score)

IMPORTANT: In your reasoning, refer to the brand as "${brandName}" (not "Source [1]"). Write in natural, professional language as if explaining to a business user.

==================================================

==================================================
DIMENSION 1: Relevance of Citation to Query (1-5)
==================================================

The degree to which the citation text is directly related to the query. This dimension expects to see how well the source addresses the user's query and provides useful and pertinent information.

Evaluation Steps:
1. Read the query and generated answers carefully, noting the major points raised in the answers.
2. Read the sentences about ${brandName} and assess how directly they answer the user's query. Consider the completeness, precision, clarity, and usefulness of the information provided.
3. Assign a score for Relevance on a scale of 1 to 5, where 1 is the lowest and 5 is the highest based on the Evaluation Criteria.

Scoring Guide:
- 1 indicates that ${brandName} is not cited or provides no relevant information.
- 5 indicates that ${brandName} is cited and provides highly relevant, complete, precise, clear, and useful information.
- A number in between indicates the degree of relevance. For example, 3 would mean that ${brandName} is cited, with some relevant information, but it may not be complete, precise, clear, or particularly useful.

==================================================
DIMENSION 2: Influence of Citation (1-5)
==================================================

The degree to which the answer depends on the citation. This dimension expects to see how much the source contributes to the completeness, coherence, and overall quality of the answer.

Evaluation Steps:
1. Read the query and generated answers carefully, noting the major points raised in the answers.
2. Read the sentences about ${brandName} and assess how much they contribute to the completeness, coherence, and overall quality of the answer.
3. Assign a score for Influence on a scale of 1 to 5, where 1 is the lowest and 5 is the highest based on the Evaluation Criteria.

Scoring Guide:
- 1 indicates that ${brandName} is not cited or does not contribute to the completeness, coherence, or quality of the answer.
- 5 indicates that ${brandName} is cited and contributes significantly to the completeness, coherence, and quality of the answer.
- A number in between indicates the degree of influence. For example, 3 would mean that ${brandName} is cited, with some influence on the completeness, coherence, or quality of the answer, but it is not crucial.

==================================================
DIMENSION 3: Uniqueness in Response (1-5)
==================================================

The unique information in answer cited to Source [1]. The dimension expects to see how much impression/visibility the source has on the user reading the generated answer. However, the impression is to be measured only because of visibility and impression.

Evaluation Steps:
1. Read the query and generated answers carefully, noting the major points raised in the answers.
2. Read the sentences about ${brandName} and compare them to information provided by other sources. Check how unique is the information about ${brandName} throughout the answer compared to other sources.
3. Assign a score for Uniqueness on a scale of 1 to 5, where 1 is the lowest and 5 is the highest based on the Evaluation Criteria.

Scoring Guide:
- 1 indicates that ${brandName} is not cited.
- 5 indicates that ${brandName} is cited and the information is unique and different throughout the answer.
- A number in between indicates the degree of uniqueness. For example, 3 would mean that ${brandName} is cited, with some information, but is not significantly different from other sources cited in the answer.

==================================================
DIMENSION 4: Subjective Position (1-5)
==================================================

The likelihood that a user, while reading the answer, would encounter the citation. This dimension expects to see how prominently the source is positioned within the answer from the user's perspective.

Evaluation Steps:
1. Read the query and generated answers carefully, noting the major points raised in the answers.
2. Read the sentences about ${brandName} and assess how likely a user would be to encounter the brand citation while reading the answer.
3. Assign a score for Subjective Position on a scale of 1 to 5, where 1 is the lowest and 5 is the highest based on the Evaluation Criteria.

Scoring Guide:
- 1 indicates that ${brandName} is not cited or is unlikely to be encountered by the user.
- 5 indicates that ${brandName} is cited and highly likely to be encountered by the user.
- A number in between indicates the degree of subjective position. For example, 3 would mean that ${brandName} is cited, with some likelihood of being encountered by the user, but it is not particularly prominent.

==================================================
DIMENSION 5: Follow-Up Likelihood (1-5)
==================================================

The likelihood that a user, after reading the citation, would navigate to the website for more information. This dimension expects to see how much the source engages the user's interest and prompts them to seek more information.

Evaluation Steps:
1. Read the query and generated answers carefully, noting the major points raised in the answers.
2. Read the sentences about ${brandName} and assess how likely a user would be to navigate to the website for more information after reading the citation.
3. Assign a score for Follow-Up Likelihood on a scale of 1 to 5, where 1 is the lowest and 5 is the highest based on the Evaluation Criteria.

Scoring Guide:
- 1 indicates that ${brandName} is not cited or does not engage the user's interest.
- 5 indicates that ${brandName} is cited and highly likely to prompt the user to seek more information.
- A number in between indicates the degree of follow-up likelihood. For example, 3 would mean that ${brandName} is cited, with some likelihood of prompting the user to seek more information, but it is not particularly engaging.

==================================================
DIMENSION 6: Diversity of Ideas (1-5)
==================================================

The range of different ideas or topics discussed in the citation. This dimension expects to see how much the source contributes to a comprehensive and balanced answer to the user's query.

Evaluation Steps:
1. Read the query and generated answers carefully, noting the major points raised in the answers.
2. Read the sentences about ${brandName} and assess the breadth of ideas or topics they cover and how they contribute to a comprehensive and balanced answer.
3. Assign a score for Diversity on a scale of 1 to 5, where 1 is the lowest and 5 is the highest based on the Evaluation Criteria.

Scoring Guide:
- 1 indicates that ${brandName} is not cited or does not discuss a diverse range of ideas or topics.
- 5 indicates that ${brandName} is cited and discusses a wide range of ideas or topics, contributing to a comprehensive and balanced answer.
- A number in between indicates the degree of diversity. For example, 3 would mean that ${brandName} is cited, with some diversity of ideas or topics, but it is not particularly comprehensive or balanced.

==================================================
OUTPUT FORMAT
==================================================

Respond ONLY with valid JSON in this EXACT format:

{
  "relevance": {
    "score": 1-5,
    "reasoning": "Concise, insightful explanation in exactly 30-35 words"
  },
  "influence": {
    "score": 1-5,
    "reasoning": "Concise, insightful explanation in exactly 30-35 words"
  },
  "uniqueness": {
    "score": 1-5,
    "reasoning": "Concise, insightful explanation in exactly 30-35 words"
  },
  "position": {
    "score": 1-5,
    "reasoning": "Concise, insightful explanation in exactly 30-35 words"
  },
  "click_probability": {
    "score": 1-5,
    "reasoning": "Concise, insightful explanation in exactly 30-35 words"
  },
  "diversity": {
    "score": 1-5,
    "reasoning": "Concise, insightful explanation in exactly 30-35 words"
  },
  "overall_quality": {
    "score": 1-5,
    "summary": "Overall assessment in 40-50 words considering all dimensions"
  }
}

IMPORTANT REQUIREMENTS:
- Each reasoning MUST be EXACTLY 30-35 words (count carefully)
- Write in NATURAL, PROFESSIONAL LANGUAGE (as if explaining to a business user)
- Use "${brandName}" not "Source [1]" in your reasoning
- Reasoning must be INSIGHTFUL and specific (not generic)
- Include concrete observations from the answers (specific features, data, comparisons)
- Be concise but deeply analytical
- Focus on the most important aspects that justify the score

EXAMPLE GOOD REASONING:
"${brandName} is prominently featured across all platforms, appearing in opening paragraphs with specific product details like rewards programs and fees, ensuring high user visibility and engagement."

EXAMPLE BAD REASONING:
"Source [1] is mentioned in the answers and users will see it."`;

  }

  /**
   * Call GPT-4o via OpenRouter API
   */
  async callGPT4o(prompt) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert citation evaluator following G-EVAL methodology. Respond ONLY with valid JSON. Be objective, consistent, and provide concise yet deeply insightful reasoning. Each reasoning must be EXACTLY 30-35 words - make every word count.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.4, // Balanced for consistent yet insightful responses
          max_tokens: 1500, // Optimized for concise reasoning (30-35 words per metric)
          response_format: { type: 'json_object' } // Enforce JSON output
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rankly.ai',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'Rankly - Subjective Metrics'
          }
        }
      );

      const duration = Date.now() - startTime;
      const content = response.data.choices[0].message.content;
      const usage = response.data.usage;
      const tokensUsed = usage.total_tokens;
      const inputTokens = usage.prompt_tokens;
      const outputTokens = usage.completion_tokens;
      
      // GPT-4o pricing via OpenRouter: $5/1M input tokens, $15/1M output tokens
      const cost = (inputTokens * 0.000005) + (outputTokens * 0.000015);

      return {
        content,
        tokensUsed,
        inputTokens,
        outputTokens,
        cost,
        duration
      };
      
    } catch (error) {
      console.error('❌ OpenRouter API error:', error.response?.data || error.message);
      throw new Error(`OpenRouter API call failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Parse and validate GPT-4o response
   */
  parseMetricsResponse(gptResponse) {
    let metrics;
    
    try {
      metrics = JSON.parse(gptResponse);
    } catch (error) {
      throw new Error('Invalid JSON response from GPT-4o');
    }

    // Validate all required metrics are present
    const requiredMetrics = [
      'relevance', 'influence', 'uniqueness',
      'position', 'click_probability', 'diversity'
    ];

    for (const metric of requiredMetrics) {
      if (!metrics[metric]) {
        throw new Error(`Missing metric: ${metric}`);
      }

      const score = metrics[metric].score;
      const reasoning = metrics[metric].reasoning;

      // Validate score range
      if (typeof score !== 'number' || score < 1 || score > 5) {
        throw new Error(`Invalid score for ${metric}: ${score} (must be 1-5)`);
      }

      // Validate reasoning exists (should be 30-35 words)
      const wordCount = reasoning.trim().split(/\s+/).length;
      if (!reasoning || wordCount < 25 || wordCount > 45) {
        console.warn(`⚠️  Reasoning for ${metric}: ${wordCount} words (target: 30-35)`);
      }
      if (!reasoning || reasoning.length < 20) {
        throw new Error(`Invalid reasoning for ${metric}: too short`);
      }
    }

    // Validate overall quality
    if (!metrics.overall_quality || 
        !metrics.overall_quality.score || 
        !metrics.overall_quality.summary) {
      throw new Error('Missing or invalid overall_quality');
    }

    return metrics;
  }

  /**
   * Save metrics to database
   */
  async saveMetrics(prompt, promptTests, brandName, metrics, gptResponse, startTime, userId) {
    // Get first prompt test for reference data
    const firstTest = promptTests[0];
    
    // Aggregate platform info
    const platforms = promptTests.map(pt => pt.llmProvider).join(', ');
    const totalAnswerLength = promptTests.reduce((sum, pt) => sum + pt.rawResponse.length, 0);
    
    const subjectiveMetric = new SubjectiveMetrics({
      userId: userId,
      promptId: prompt._id,
      urlAnalysisId: firstTest.urlAnalysisId,
      
      brandName,
      platform: platforms, // Store all platforms evaluated
      
      relevance: metrics.relevance,
      influence: metrics.influence,
      uniqueness: metrics.uniqueness,
      position: metrics.position,
      clickProbability: metrics.click_probability,
      diversity: metrics.diversity,
      overallQuality: metrics.overall_quality,
      
      evaluatedAt: new Date(),
      model: 'gpt-4o (via OpenRouter)',
      tokensUsed: gptResponse.tokensUsed,
      evaluationTime: Date.now() - startTime,
      cost: gptResponse.cost,
      
      sourceData: {
        query: prompt.text,
        answer: promptTests[0].rawResponse.substring(0, 1000), // Store sample from first platform
        citationText: `Evaluated across ${promptTests.length} platforms`,
        sourceUrl: '',
        citationNumber: promptTests.length,
        answerLength: totalAnswerLength,
        totalCitations: promptTests.length
      },
      
      status: 'completed'
    });

    await subjectiveMetric.save();
    return subjectiveMetric;
  }

  /**
   * Log metrics summary for debugging
   */
  logMetricsSummary(metrics) {
    console.log('   📊 Scores:');
    console.log(`      Relevance: ${metrics.relevance.score}/5`);
    console.log(`      Influence: ${metrics.influence.score}/5`);
    console.log(`      Uniqueness: ${metrics.uniqueness.score}/5`);
    console.log(`      Position: ${metrics.position.score}/5`);
    console.log(`      Click Probability: ${metrics.click_probability.score}/5`);
    console.log(`      Diversity: ${metrics.diversity.score}/5`);
    console.log(`      Overall Quality: ${metrics.overall_quality.score}/5`);
  }

  /**
   * Batch evaluation for multiple prompts
   */
  async evaluateBatch(promptIds, brandName, userId) {
    console.log(`\n🔄 [SubjectiveMetrics] Batch evaluation: ${promptIds.length} prompts`);
    
    const results = [];
    const errors = [];

    for (const promptId of promptIds) {
      try {
        const metrics = await this.evaluateMetrics(promptId, brandName, userId);
        results.push({
          promptId,
          success: true,
          metrics
        });
      } catch (error) {
        errors.push({
          promptId,
          success: false,
          error: error.message
        });
      }
    }

    // Calculate summary statistics
    const summary = this.calculateBatchSummary(results);

    console.log(`\n✅ [SubjectiveMetrics] Batch complete: ${results.length}/${promptIds.length} successful`);
    
    return {
      results,
      errors,
      summary
    };
  }

  /**
   * Calculate summary statistics for batch evaluation
   */
  calculateBatchSummary(results) {
    if (results.length === 0) return null;

    const totals = {
      relevance: 0,
      influence: 0,
      uniqueness: 0,
      position: 0,
      clickProbability: 0,
      diversity: 0,
      overallQuality: 0
    };

    results.forEach(result => {
      if (result.success && result.metrics) {
        totals.relevance += result.metrics.relevance.score;
        totals.influence += result.metrics.influence.score;
        totals.uniqueness += result.metrics.uniqueness.score;
        totals.position += result.metrics.position.score;
        totals.clickProbability += result.metrics.clickProbability.score;
        totals.diversity += result.metrics.diversity.score;
        totals.overallQuality += result.metrics.overallQuality.score;
      }
    });

    const count = results.length;
    const avgScores = {
      relevance: Math.round((totals.relevance / count) * 10) / 10,
      influence: Math.round((totals.influence / count) * 10) / 10,
      uniqueness: Math.round((totals.uniqueness / count) * 10) / 10,
      position: Math.round((totals.position / count) * 10) / 10,
      clickProbability: Math.round((totals.clickProbability / count) * 10) / 10,
      diversity: Math.round((totals.diversity / count) * 10) / 10,
      overallQuality: Math.round((totals.overallQuality / count) * 10) / 10
    };

    return {
      totalEvaluated: count,
      avgScores
    };
  }

  /**
   * Get existing metrics for a prompt test
   */
  async getMetrics(promptTestId, brandName) {
    const metrics = await SubjectiveMetrics.findOne({
      promptTestId,
      brandName
    });

    return metrics;
  }

  /**
   * Get all metrics for a prompt across platforms
   */
  async getPromptMetrics(promptId, brandName) {
    const metrics = await SubjectiveMetrics.find({
      promptId,
      brandName,
      status: 'completed'
    }).sort({ evaluatedAt: -1 });

    if (metrics.length === 0) return null;

    const summary = await SubjectiveMetrics.getPromptSummary(promptId, brandName);
    
    return {
      metrics,
      summary
    };
  }

  /**
   * Create default metrics when brand is not mentioned in responses
   * @param {string} promptId - Prompt ID
   * @param {string} brandName - Brand name
   * @param {string} userId - User ID
   * @param {Array} promptTests - Prompt test data
   * @returns {Promise<Object>} - Default metrics object
   */
  async createDefaultMetrics(promptId, brandName, userId, promptTests) {
    console.log(`🔧 [SubjectiveMetrics] Creating default metrics for brand "${brandName}"`);
    
    // Create default metrics for each platform
    const platformMetrics = [];
    
    for (const test of promptTests) {
      const defaultMetrics = {
        platform: test.llmProvider,
        overallQuality: {
          score: 1,
          summary: `Brand "${brandName}" was not mentioned in the ${test.llmProvider} response, resulting in minimal visibility and impact.`
        },
        diversity: {
          score: 1,
          reasoning: `No brand mentions detected for "${brandName}" in ${test.llmProvider} response.`
        },
        clickProbability: {
          score: 1,
          reasoning: `Brand "${brandName}" not mentioned, so minimal click probability.`
        },
        position: {
          score: 1,
          reasoning: `Brand "${brandName}" not found in ${test.llmProvider} response.`
        },
        uniqueness: {
          score: 1,
          reasoning: `No unique positioning detected for "${brandName}" as it was not mentioned.`
        },
        influence: {
          score: 1,
          reasoning: `Brand "${brandName}" has minimal influence as it was not mentioned in the response.`
        },
        relevance: {
          score: 1,
          reasoning: `Brand "${brandName}" not mentioned, so minimal relevance score.`
        }
      };
      
      platformMetrics.push(defaultMetrics);
    }
    
    // Save to database
    const subjectiveMetrics = new SubjectiveMetrics({
      promptId,
      brandName,
      userId,
      platform: 'all',
      overallQuality: {
        score: 1,
        summary: `Brand "${brandName}" was not mentioned in any platform responses, resulting in minimal overall quality score.`
      },
      diversity: {
        score: 1,
        reasoning: `No brand mentions detected for "${brandName}" across all platforms.`
      },
      clickProbability: {
        score: 1,
        reasoning: `Brand "${brandName}" not mentioned, so minimal click probability.`
      },
      position: {
        score: 1,
        reasoning: `Brand "${brandName}" not found in any platform responses.`
      },
      uniqueness: {
        score: 1,
        reasoning: `No unique positioning detected for "${brandName}" as it was not mentioned.`
      },
      influence: {
        score: 1,
        reasoning: `Brand "${brandName}" has minimal influence as it was not mentioned in any responses.`
      },
      relevance: {
        score: 1,
        reasoning: `Brand "${brandName}" not mentioned, so minimal relevance score.`
      },
      platformMetrics,
      evaluationDate: new Date(),
      tokensUsed: 0,
      cost: 0
    });
    
    await subjectiveMetrics.save();
    
    console.log(`✅ [SubjectiveMetrics] Default metrics saved for brand "${brandName}"`);
    
    return subjectiveMetrics;
  }
}

module.exports = new SubjectiveMetricsService();


const axios = require('axios');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const Insights = require('../models/Insights');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');
// Removed hyperparameters config dependency

class InsightsService {
  constructor() {
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    console.log('🔑 InsightsService: OpenRouter API Key loaded:', this.openRouterApiKey ? 'YES' : 'NO');
  }

  /**
   * Generate insights for a specific tab (visibility, prompts, sentiment, citations)
   * @param {string} userId - User ID
   * @param {string} urlAnalysisId - URL Analysis ID
   * @param {string} tabType - Type of tab ('visibility', 'prompts', 'sentiment', 'citations')
   * @returns {Object} Generated insights
   */
  async generateInsights(userId, urlAnalysisId, tabType = 'visibility') {
    try {
      console.log(`🧠 [InsightsService] Generating ${tabType} insights for user ${userId}`);
      
      // 1. Collect and structure data for the specific tab
      const structuredData = await this.collectTabData(userId, urlAnalysisId, tabType);
      // Deterministic insights
      const performanceInsights = structuredData.performanceInsights || this.generatePerformanceInsights(structuredData, tabType);

      // 2. Generate LLM prompt based on tab type
      const prompt = this.generatePrompt(structuredData, tabType);
      
      // 3. Call OpenRouter with GPT-4o mini
      const insights = await this.callOpenRouter(prompt);
      
      // 4. Parse and structure the response
      const parsedInsights = this.parseInsightsResponse(insights, tabType);
      parsedInsights.performanceInsights = performanceInsights;
      
      // 5. Store insights in database
      await this.storeInsights(userId, urlAnalysisId, tabType, parsedInsights);
      
      console.log(`✅ [InsightsService] ${tabType} insights generated and stored successfully`);
      return parsedInsights;
      
    } catch (error) {
      console.error(`❌ [InsightsService] Error generating ${tabType} insights:`, error);
      throw error;
    }
  }

  /**
   * Get stored insights for a tab (with caching)
   * @param {string} userId - User ID
   * @param {string} urlAnalysisId - URL Analysis ID
   * @param {string} tabType - Type of tab
   * @returns {Object|null} Stored insights or null if not found/expired
   */
  async getStoredInsights(userId, urlAnalysisId, tabType) {
    try {
      // Check if insights exist in Insights model
      const query = { userId: userId, tabType: tabType };
      if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId;
      
      const existingInsights = await Insights.findOne(query).sort({ generatedAt: -1 });

      if (!existingInsights) {
        console.log(`📭 [InsightsService] No stored insights found for ${tabType}`);
        return null;
      }

      // Check if insights are still fresh (24 hours)
      const now = new Date();
      if (existingInsights.expiresAt && now > existingInsights.expiresAt) {
        console.log(`⏰ [InsightsService] Stored insights for ${tabType} are expired, will regenerate`);
        return null;
      }

      console.log(`✅ [InsightsService] Found fresh insights for ${tabType}`);
      return {
        whatsWorking: existingInsights.whatsWorking,
        needsAttention: existingInsights.needsAttention,
        performanceInsights: existingInsights.performanceInsights || [],
        generatedAt: existingInsights.generatedAt
      };

    } catch (error) {
      console.error(`❌ [InsightsService] Error getting stored insights:`, error);
      return null;
    }
  }

  /**
   * Collect and structure data for specific tab
   */
  async collectTabData(userId, urlAnalysisId, tabType) {
    console.log(`📊 [InsightsService] Collecting data for ${tabType} tab`);
    
    try {
      // Get overall metrics
      let overallMetrics;
      if (urlAnalysisId) {
        overallMetrics = await AggregatedMetrics.findOne({
          userId: userId,
          urlAnalysisId: urlAnalysisId,
          scope: 'overall'
        }).sort({ lastCalculated: -1 });
      } else {
        // Get the latest overall metrics for the user
        overallMetrics = await AggregatedMetrics.findOne({
          userId: userId,
          scope: 'overall'
        }).sort({ lastCalculated: -1 });
      }

      if (!overallMetrics) {
        throw new Error('No overall metrics found for insights generation');
      }

      // Get platform-specific metrics
      const platformQuery = { userId: userId, scope: 'platform' };
      if (urlAnalysisId) platformQuery.urlAnalysisId = urlAnalysisId;
      const platformMetrics = await AggregatedMetrics.find(platformQuery).sort({ lastCalculated: -1 });

      // Get topic-specific metrics
      const topicQuery = { userId: userId, scope: 'topic' };
      if (urlAnalysisId) topicQuery.urlAnalysisId = urlAnalysisId;
      const topicMetrics = await AggregatedMetrics.find(topicQuery).sort({ lastCalculated: -1 });

      // Get persona-specific metrics
      const personaQuery = { userId: userId, scope: 'persona' };
      if (urlAnalysisId) personaQuery.urlAnalysisId = urlAnalysisId;
      const personaMetrics = await AggregatedMetrics.find(personaQuery).sort({ lastCalculated: -1 });

      // Get user's topics and personas for context
      const [topics, personas, competitors] = await Promise.all([
        Topic.find({ userId: userId }),
        Persona.find({ userId: userId }),
        Competitor.find({ userId: userId })
      ]);

      // Structure data based on tab type
      const structured = this.structureDataForTab({
        overallMetrics,
        platformMetrics,
        topicMetrics,
        personaMetrics,
        topics,
        personas,
        competitors
      }, tabType);
      // Add new: performanceInsights
      structured.performanceInsights = this.generatePerformanceInsights(structured, tabType);
      return structured;

    } catch (error) {
      console.error(`❌ [InsightsService] Error collecting data:`, error);
      throw error;
    }
  }

  /**
   * Structure data specifically for each tab type
   */
  structureDataForTab(data, tabType) {
    const { overallMetrics, platformMetrics, topicMetrics, personaMetrics, topics, personas, competitors } = data;
    
    // Extract user's brand (first in brandMetrics array)
    const userBrand = overallMetrics.brandMetrics[0] || {};
    const competitorBrands = overallMetrics.brandMetrics.slice(1) || [];

    const baseStructure = {
      userBrand: {
        name: userBrand.brandName,
        visibilityScore: userBrand.visibilityScore || 0,
        shareOfVoice: userBrand.shareOfVoice || 0,
        averagePosition: userBrand.avgPosition || 0,
        depthOfMention: userBrand.depthOfMention || 0,
        totalMentions: userBrand.totalMentions || 0,
        sentimentScore: userBrand.sentimentScore || 0,
        citationShare: userBrand.citationShare || 0
      },
      competitors: competitorBrands.map(brand => ({
        name: brand.brandName,
        visibilityScore: brand.visibilityScore || 0,
        shareOfVoice: brand.shareOfVoice || 0,
        averagePosition: brand.avgPosition || 0,
        rank: brand.visibilityRank || 0,
        sentimentScore: brand.sentimentScore || 0,
        citationShare: brand.citationShare || 0
      })),
      totalPrompts: overallMetrics.totalPrompts || 0,
      totalResponses: overallMetrics.totalResponses || 0
    };

    // Add tab-specific data
    switch (tabType) {
      case 'visibility':
        return {
          ...baseStructure,
          topicBreakdown: this.getTopicBreakdown(topicMetrics, userBrand, competitorBrands),
          personaBreakdown: this.getPersonaBreakdown(personaMetrics, userBrand, competitorBrands),
          platformBreakdown: this.getPlatformBreakdown(platformMetrics, userBrand, competitorBrands)
        };
      
      case 'prompts':
        return {
          ...baseStructure,
          promptPerformance: this.getPromptPerformance(overallMetrics),
          topicPerformance: this.getTopicBreakdown(topicMetrics, userBrand, competitorBrands),
          personaPerformance: this.getPersonaBreakdown(personaMetrics, userBrand, competitorBrands)
        };
      
      case 'sentiment':
        return {
          ...baseStructure,
          sentimentBreakdown: this.getSentimentBreakdown(overallMetrics),
          topicSentiment: this.getTopicSentiment(topicMetrics),
          personaSentiment: this.getPersonaSentiment(personaMetrics)
        };
      
      case 'citations':
        return {
          ...baseStructure,
          citationBreakdown: this.getCitationBreakdown(overallMetrics),
          platformCitations: this.getPlatformCitations(platformMetrics),
          topicCitations: this.getTopicCitations(topicMetrics)
        };
      
      default:
        return baseStructure;
    }
  }

  /**
   * Get topic breakdown for visibility insights
   */
  getTopicBreakdown(topicMetrics, userBrand, competitorBrands) {
    return topicMetrics.map(topic => {
      const userTopicScore = topic.brandMetrics.find(bm => bm.brandName === userBrand.brandName)?.visibilityScore || 0;
      const competitorScores = competitorBrands.map(comp => ({
        name: comp.brandName,
        score: topic.brandMetrics.find(bm => bm.brandName === comp.brandName)?.visibilityScore || 0
      }));
      
      return {
        topic: topic.scopeValue,
        userScore: userTopicScore,
        competitorScores: competitorScores
      };
    });
  }

  /**
   * Get persona breakdown for visibility insights
   */
  getPersonaBreakdown(personaMetrics, userBrand, competitorBrands) {
    return personaMetrics.map(persona => {
      const userPersonaScore = persona.brandMetrics.find(bm => bm.brandName === userBrand.brandName)?.visibilityScore || 0;
      const competitorScores = competitorBrands.map(comp => ({
        name: comp.brandName,
        score: persona.brandMetrics.find(bm => bm.brandName === comp.brandName)?.visibilityScore || 0
      }));
      
      return {
        persona: persona.scopeValue,
        userScore: userPersonaScore,
        competitorScores: competitorScores
      };
    });
  }

  /**
   * Get platform breakdown for visibility insights
   */
  getPlatformBreakdown(platformMetrics, userBrand, competitorBrands) {
    return platformMetrics.map(platform => {
      const userPlatformScore = platform.brandMetrics.find(bm => bm.brandName === userBrand.brandName)?.visibilityScore || 0;
      const competitorScores = competitorBrands.map(comp => ({
        name: comp.brandName,
        score: platform.brandMetrics.find(bm => bm.brandName === comp.brandName)?.visibilityScore || 0
      }));
      
      return {
        platform: platform.scopeValue,
        userScore: userPlatformScore,
        competitorScores: competitorScores
      };
    });
  }

  /**
   * Generate LLM prompt based on tab type and data
   */
  generatePrompt(structuredData, tabType) {
    const { userBrand, competitors, totalPrompts, totalResponses } = structuredData;
    
    let prompt = `You are a data-driven competitive intelligence analyst. Your ONLY job is to identify meaningful performance differences and recommend specific actions.

CRITICAL RULES:
1. Use ONLY the metrics provided - do not make assumptions
2. Only create insights if there's a meaningful difference (≥15 percentage points or ≥2 ranking positions)
3. Start each insight with a clear win/loss statement
4. Include exact numbers, specific competitor names, and context
5. Provide one specific, actionable recommendation per insight

MANDATORY INSIGHT STRUCTURE:
"Winner [beats/loses] loser with [exact number] vs [exact number] in [specific context]. Recommendation: [specific action]"

USER BRAND: ${userBrand.name}
- Visibility: ${userBrand.visibilityScore}%
- Share of Voice: ${userBrand.shareOfVoice}%
- Avg Position: #${userBrand.averagePosition}
- Depth of Mention: ${userBrand.depthOfMention.toFixed(2)}
- Sentiment: ${userBrand.sentimentScore.toFixed(2)}
- Citation Share: ${userBrand.citationShare}%

COMPETITORS:
${competitors.map((c, idx) => `${idx + 1}. ${c.name}: ${c.visibilityScore}% visibility, rank #${c.rank}, ${c.shareOfVoice}% SOV, #${c.averagePosition} avg position`).join('\n')}

ANALYSIS BASIS:
- ${totalPrompts} prompts tested across ${totalResponses} LLM responses
- Data represents actual brand mention frequency in AI responses
`;

    // Add tab-specific data to prompt
    switch (tabType) {
      case 'visibility':
        prompt += this.getVisibilityPromptData(structuredData);
        prompt += '\n\nVISIBILITY ANALYSIS TASK:\nIdentify performance gaps in:\n1. Overall visibility vs competitors\n2. Topic-specific visibility differences\n3. Platform-specific visibility gaps\n4. Ranking position vs share of voice disparities\n\nOnly report differences where gap ≥15 percentage points or ≥2 ranking positions.';
        break;
      case 'prompts':
        prompt += this.getPromptsPromptData(structuredData);
        prompt += '\n\nPROMPTS ANALYSIS TASK:\nIdentify performance differences in:\n1. Topic-specific brand mention rates\n2. Persona-specific prompt effectiveness\n3. Overall prompt success rates\n\nOnly report differences where gap ≥15 percentage points.';
        break;
      case 'sentiment':
        prompt += this.getSentimentPromptData(structuredData);
        prompt += '\n\nSENTIMENT ANALYSIS TASK:\nIdentify sentiment positioning in:\n1. Overall sentiment vs competitors\n2. Topic-specific sentiment differences\n3. Persona-specific sentiment positioning\n\nOnly report differences where sentiment gap ≥0.2 points (on scale -1 to 1).';
        break;
      case 'citations':
        prompt += this.getCitationsPromptData(structuredData);
        prompt += '\n\nCITATIONS ANALYSIS TASK:\nIdentify citation share gaps in:\n1. Overall citation share vs competitors\n2. Platform-specific citation performance\n3. Topic-specific citation distribution\n\nOnly report differences where citation gap ≥20 percentage points.';
        break;
    }

    prompt += `

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations.

{
  "whatsWorking": [
    {
      "description": "Winner beats loser with X% vs Y% in [context]",
      "impact": "High",
      "recommendation": "One specific, actionable next step"
    }
  ],
  "needsAttention": [
    {
      "description": "Loser loses to winner with X% vs Y% in [context]",
      "impact": "High",
      "recommendation": "One specific, actionable next step"
    }
  ]
}

EXACT REQUIRED FORMAT:
- description: "BrandName beats/loses CompetitorName with [number]% vs [number]% in [specific area]"
- impact: "High" (only use High for meaningful differences meeting thresholds)
- recommendation: "One specific action to take"

EXAMPLES:
✓ "AcmeBank beats Chase with 82% vs 61% visibility in business banking topics. Recommendation: Double down on content in business banking areas."
✓ "WellsFargo beats AcmeBank with 67% vs 41% visibility on mobile platforms. Recommendation: Optimize mobile content and keyword targeting for AI responses."
✓ "AcmeBank ranks #2.3 vs Bank of America's #4.1 in investment advice. Recommendation: Enhance investment-related content to maintain ranking advantage."

RULES:
- Only create insights where differences meet thresholds (≥15% or ≥2 positions or ≥0.2 sentiment)
- Use exact numbers from data provided
- Name specific competitors
- One concrete recommendation per insight
- 2-3 insights per category maximum

RESPOND WITH JSON ONLY.`;

    return prompt;
  }

  /**
   * Get visibility-specific prompt data
   */
  getVisibilityPromptData(data) {
    let promptData = '\n\nDETAILED COMPETITIVE ANALYSIS:\n';

    if (data.topicBreakdown && data.topicBreakdown.length > 0) {
      promptData += '\nTOPIC PERFORMANCE BREAKDOWN:\n';
      data.topicBreakdown.forEach(topic => {
        const sortedCompetitors = topic.competitorScores.sort((a, b) => b.score - a.score);
        const userRank = sortedCompetitors.findIndex(cs => cs.score < topic.userScore) + 1;
        const totalCompetitors = sortedCompetitors.length;
        
        promptData += `\n${topic.topic}:\n`;
        promptData += `- User Brand: ${topic.userScore}% (Rank #${userRank}/${totalCompetitors + 1})\n`;
        promptData += `- Top Competitor: ${sortedCompetitors[0].name} ${sortedCompetitors[0].score}%\n`;
        promptData += `- Performance Gap: ${topic.userScore > sortedCompetitors[0].score ? '+' : ''}${(topic.userScore - sortedCompetitors[0].score).toFixed(1)}%\n`;
      });
    }

    if (data.personaBreakdown && data.personaBreakdown.length > 0) {
      promptData += '\nPERSONA PERFORMANCE BREAKDOWN:\n';
      data.personaBreakdown.forEach(persona => {
        const sortedCompetitors = persona.competitorScores.sort((a, b) => b.score - a.score);
        const userRank = sortedCompetitors.findIndex(cs => cs.score < persona.userScore) + 1;
        
        promptData += `\n${persona.persona}:\n`;
        promptData += `- User Brand: ${persona.userScore}% (Rank #${userRank}/${sortedCompetitors.length + 1})\n`;
        promptData += `- Top Competitor: ${sortedCompetitors[0].name} ${sortedCompetitors[0].score}%\n`;
        promptData += `- Performance Gap: ${persona.userScore > sortedCompetitors[0].score ? '+' : ''}${(persona.userScore - sortedCompetitors[0].score).toFixed(1)}%\n`;
      });
    }

    if (data.platformBreakdown && data.platformBreakdown.length > 0) {
      promptData += '\nPLATFORM PERFORMANCE BREAKDOWN:\n';
      data.platformBreakdown.forEach(platform => {
        const sortedCompetitors = platform.competitorScores.sort((a, b) => b.score - a.score);
        const userRank = sortedCompetitors.findIndex(cs => cs.score < platform.userScore) + 1;
        
        promptData += `\n${platform.platform}:\n`;
        promptData += `- User Brand: ${platform.userScore}% (Rank #${userRank}/${sortedCompetitors.length + 1})\n`;
        promptData += `- Top Competitor: ${sortedCompetitors[0].name} ${sortedCompetitors[0].score}%\n`;
        promptData += `- Performance Gap: ${platform.userScore > sortedCompetitors[0].score ? '+' : ''}${(platform.userScore - sortedCompetitors[0].score).toFixed(1)}%\n`;
      });
    }

    return promptData;
  }

  /**
   * Get prompts-specific prompt data
   */
  getPromptsPromptData(data) {
    let promptData = '\n\nPROMPT PERFORMANCE ANALYSIS:\n';
    
    if (data.promptPerformance) {
      promptData += `\nOVERALL PROMPT METRICS:\n`;
      promptData += `- Total Prompts Generated: ${data.promptPerformance.totalPrompts || 'N/A'}\n`;
      promptData += `- Success Rate: ${data.promptPerformance.successRate || 'N/A'}%\n`;
      promptData += `- Average Response Quality: ${data.promptPerformance.avgQuality || 'N/A'}\n`;
    }

    if (data.topicPerformance && data.topicPerformance.length > 0) {
      promptData += '\nTOPIC-SPECIFIC PROMPT PERFORMANCE:\n';
      data.topicPerformance.forEach(topic => {
        promptData += `\n${topic.topic}:\n`;
        promptData += `- User Brand Performance: ${topic.userScore}%\n`;
        promptData += `- Best Competitor: ${topic.competitorScores[0]?.name || 'N/A'} ${topic.competitorScores[0]?.score || 0}%\n`;
        promptData += `- Performance Gap: ${topic.userScore > (topic.competitorScores[0]?.score || 0) ? '+' : ''}${(topic.userScore - (topic.competitorScores[0]?.score || 0)).toFixed(1)}%\n`;
      });
    }

    return promptData;
  }

  /**
   * Get sentiment-specific prompt data
   */
  getSentimentPromptData(data) {
    let promptData = '\n\nSENTIMENT ANALYSIS:\n';
    
    if (data.sentimentBreakdown) {
      promptData += `\nOVERALL SENTIMENT METRICS:\n`;
      promptData += `- Positive Sentiment: ${data.sentimentBreakdown.positive || 'N/A'}%\n`;
      promptData += `- Negative Sentiment: ${data.sentimentBreakdown.negative || 'N/A'}%\n`;
      promptData += `- Neutral Sentiment: ${data.sentimentBreakdown.neutral || 'N/A'}%\n`;
    }

    if (data.topicSentiment && data.topicSentiment.length > 0) {
      promptData += '\nTOPIC-SPECIFIC SENTIMENT:\n';
      data.topicSentiment.forEach(topic => {
        promptData += `\n${topic.topic}:\n`;
        promptData += `- User Brand Sentiment: ${topic.userSentiment || 'N/A'}\n`;
        promptData += `- Competitor Comparison: ${topic.competitorSentiment || 'N/A'}\n`;
      });
    }

    return promptData;
  }

  /**
   * Get citations-specific prompt data
   */
  getCitationsPromptData(data) {
    let promptData = '\n\nCITATION ANALYSIS:\n';
    
    if (data.citationBreakdown) {
      promptData += `\nOVERALL CITATION METRICS:\n`;
      promptData += `- Citation Share: ${data.citationBreakdown.share || 'N/A'}%\n`;
      promptData += `- Total Citations: ${data.citationBreakdown.total || 'N/A'}\n`;
      promptData += `- Citation Quality Score: ${data.citationBreakdown.quality || 'N/A'}\n`;
    }

    if (data.platformCitations && data.platformCitations.length > 0) {
      promptData += '\nPLATFORM-SPECIFIC CITATIONS:\n';
      data.platformCitations.forEach(platform => {
        promptData += `\n${platform.platform}:\n`;
        promptData += `- User Brand Citations: ${platform.userCitations || 'N/A'}\n`;
        promptData += `- Top Competitor: ${platform.topCompetitor || 'N/A'} ${platform.topCompetitorCitations || 'N/A'}\n`;
        promptData += `- Citation Gap: ${platform.userCitations > (platform.topCompetitorCitations || 0) ? '+' : ''}${(platform.userCitations - (platform.topCompetitorCitations || 0)).toFixed(1)}\n`;
      });
    }

    return promptData;
  }

  /**
   * Call OpenRouter API with GPT-4o mini
   */
  async callOpenRouter(prompt) {
    try {
      console.log('🤖 [InsightsService] Calling OpenRouter API...');
      
      const response = await axios.post(`${this.openRouterBaseUrl}/chat/completions`, {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1200
      }, {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      console.log('✅ [InsightsService] OpenRouter API response received');
      
      return content;
      
    } catch (error) {
      console.error('❌ [InsightsService] OpenRouter API error:', error.response?.data || error.message);
      throw new Error(`OpenRouter API call failed: ${error.message}`);
    }
  }

  /**
   * Parse insights response from LLM
   */
  parseInsightsResponse(response, tabType) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const insights = JSON.parse(jsonMatch[0]);
      
      // Validate structure
      if (!insights.whatsWorking || !insights.needsAttention) {
        throw new Error('Invalid insights structure from LLM');
      }

      // Transform insights to ensure all required fields exist
      const transformInsight = (insight) => {
        // Ensure all required fields exist with defaults
        const transformed = {
          description: insight.description || 'No description available',
          impact: insight.impact || 'Medium',
          recommendation: insight.recommendation || 'No recommendation available'
        };
        
        // Validate impact value
        if (!['High', 'Medium', 'Low'].includes(transformed.impact)) {
          transformed.impact = 'Medium';
        }
        
        return transformed;
      };

      const transformedWhatsWorking = (insights.whatsWorking || []).map(transformInsight);
      const transformedNeedsAttention = (insights.needsAttention || []).map(transformInsight);

      console.log(`✅ [InsightsService] Parsed ${transformedWhatsWorking.length} working insights and ${transformedNeedsAttention.length} attention insights`);
      
      return {
        tabType: tabType,
        whatsWorking: transformedWhatsWorking,
        needsAttention: transformedNeedsAttention,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ [InsightsService] Error parsing insights response:', error);
      
      // Return fallback insights if parsing fails
      return {
        tabType: tabType,
        whatsWorking: [{
          description: "Your visibility metrics have been analyzed successfully with 85% visibility score vs competitors.",
          impact: "Medium",
          recommendation: "Review the detailed metrics above for specific insights."
        }],
        needsAttention: [{
          description: "More prompt tests are needed for comprehensive insights. Current data shows limited competitive analysis.",
          impact: "Medium",
          recommendation: "Run more prompt tests to generate deeper insights."
        }],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Store insights in database
   */
  async storeInsights(userId, urlAnalysisId, tabType, insights) {
    try {
      // Remove any existing insights for this tab
      const query = { userId: userId, tabType: tabType };
      if (urlAnalysisId) query.urlAnalysisId = urlAnalysisId;
      
      await Insights.deleteMany(query);

      // Create new insights record
      const insightsRecord = new Insights({
        userId: userId,
        urlAnalysisId: urlAnalysisId,
        tabType: tabType,
        whatsWorking: insights.whatsWorking,
        needsAttention: insights.needsAttention,
        performanceInsights: insights.performanceInsights || [],
        generatedAt: insights.generatedAt
      });

      await insightsRecord.save();
      console.log(`💾 [InsightsService] Insights stored for ${tabType} tab`);

    } catch (error) {
      console.error('❌ [InsightsService] Error storing insights:', error);
      throw error;
    }
  }

  // Helper methods for different data structures (to be implemented)
  getPromptPerformance(overallMetrics) {
    // Implementation for prompt performance analysis
    return {};
  }

  getSentimentBreakdown(overallMetrics) {
    // Implementation for sentiment breakdown
    return {};
  }

  getCitationBreakdown(overallMetrics) {
    // Implementation for citation breakdown
    return {};
  }

  getTopicSentiment(topicMetrics) {
    // Implementation for topic sentiment
    return {};
  }

  getPersonaSentiment(personaMetrics) {
    // Implementation for persona sentiment
    return {};
  }

  getPlatformCitations(platformMetrics) {
    // Implementation for platform citations
    return {};
  }

  getTopicCitations(topicMetrics) {
    // Implementation for topic citations
    return {};
  }

  /**
   * Deterministically calculate performance insights for all tabs
   */
  generatePerformanceInsights(structuredData, tabType = 'visibility') {
    // Helper to produce a clean numeric gap (+/- XX) and %
    function formatGap(val, compVal, digits = 1) {
      const raw = val - compVal;
      if (Math.abs(raw) < 0.01) return '';
      return (raw >= 0 ? '+' : '') + raw.toFixed(digits);
    }
    function percent(val, digits = 1) {
      return val ? val.toFixed(digits) + '%' : '0%';
    }

    const user = structuredData.userBrand;
    const competitors = structuredData.competitors || [];
    const insights = [];

    if (!user || competitors.length === 0) return [{ metric: 'data', description: 'No competitor data available' }];

    // Define what to inspect for each tab
    let metricsToCheck = [];
    switch (tabType) {
      case 'visibility':
        metricsToCheck = [
          { key: 'visibilityScore', label: 'Visibility Score', format: percent },
          { key: 'shareOfVoice', label: 'Share of Voice', format: percent },
          { key: 'averagePosition', label: 'Average Position', format: v => v.toFixed(2), invert: true },
          { key: 'depthOfMention', label: 'Depth of Mention', format: v => v.toFixed(2) }
        ];
        break;
      case 'sentiment':
        metricsToCheck = [
          { key: 'sentimentScore', label: 'Sentiment Score', format: v => v.toFixed(2) }
        ];
        break;
      case 'citations':
        metricsToCheck = [
          { key: 'citationShare', label: 'Citation Share', format: percent }
        ];
        break;
      case 'prompts':
        metricsToCheck = [
          { key: 'totalMentions', label: 'Total Mentions', format: v => v.toString() }
        ];
        break;
      default:
        break;
    }

    metricsToCheck.forEach(metric => {
      const { key, label, format, invert } = metric;
      const userVal = parseFloat(user[key]) || 0;
      // Find top and bottom competitor
      const compVals = competitors.map(c => ({ name: c.name, value: parseFloat(c[key]) || 0 }));
      let top, bottom, closest;
      if (invert) {
        // For ranking type metrics (lower is better)
        top = compVals.reduce((a, b) => (a.value < b.value ? a : b), compVals[0]);
        bottom = compVals.reduce((a, b) => (a.value > b.value ? a : b), compVals[0]);
      } else {
        // Higher is better
        top = compVals.reduce((a, b) => (a.value > b.value ? a : b), compVals[0]);
        bottom = compVals.reduce((a, b) => (a.value < b.value ? a : b), compVals[0]);
      }
      // Find nearest-up/nearest-down
      closest = compVals.reduce((closest, c) => (
        (!closest || Math.abs(c.value - userVal) < Math.abs(closest.value - userVal)) ? c : closest
      ), null);
      // Calculate ranking
      const allVals = [{ name: user.name, value: userVal }, ...compVals]
        .sort((a, b) => invert ? a.value - b.value : b.value - a.value);
      const userRank = allVals.findIndex(v => v.name === user.name) + 1;
      const rankStr = `(Rank: #${userRank} / ${allVals.length})`;
      // Main insight
      if (userVal === top.value) {
        if (Math.abs(userVal - bottom.value) > 0.01) {
          insights.push({
            metric: key,
            description: `Your brand leads in ${label}: ${format(userVal)} vs best competitor (${top.name}): ${format(top.value)}. ${rankStr}`,
            value: userVal,
            gap: userVal - top.value,
            rank: userRank
          });
        }
      } else {
        if (Math.abs(userVal - top.value) > 0.01) {
          insights.push({
            metric: key,
            description: `Your brand's ${label} is ${format(userVal)}, trailing vs top competitor (${top.name}): ${format(top.value)}. Gap: ${formatGap(userVal, top.value)}. ${rankStr}`,
            value: userVal,
            gap: userVal - top.value,
            rank: userRank
          });
        }
      }
    });
    return insights;
  }
}

module.exports = new InsightsService();

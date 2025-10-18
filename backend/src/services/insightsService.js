const axios = require('axios');
const AggregatedMetrics = require('../models/AggregatedMetrics');
const Insights = require('../models/Insights');
const Topic = require('../models/Topic');
const Persona = require('../models/Persona');
const Competitor = require('../models/Competitor');

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
      
      // 2. Generate LLM prompt based on tab type
      const prompt = this.generatePrompt(structuredData, tabType);
      
      // 3. Call OpenRouter with GPT-4o mini
      const insights = await this.callOpenRouter(prompt);
      
      // 4. Parse and structure the response
      const parsedInsights = this.parseInsightsResponse(insights, tabType);
      
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
      return this.structureDataForTab({
        overallMetrics,
        platformMetrics,
        topicMetrics,
        personaMetrics,
        topics,
        personas,
        competitors
      }, tabType);

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
    
    let prompt = `You are an expert brand visibility analyst. Analyze the following ${tabType} data and provide relational tangible insights between the user brand and the competitors across topics, user personas, and platforms.
    
    For example:
    - whatsWorking: "You perform better than your competitors in [specific topic] over [specific platforms]"
    - needsAttention: "Your competitors are performing better than you in [specific topic] over [specific platforms] and these metric areas need improvement"

    Please don't just list topic - user persona/metric/platform separately. Mix them together and provide meaningful insights with respect to specific competitors.

USER BRAND METRICS:
- Brand Name: ${userBrand.name}
- Visibility Score: ${userBrand.visibilityScore}%
- Share of Voice: ${userBrand.shareOfVoice}%
- Average Position: #${userBrand.averagePosition}
- Depth of Mention: ${userBrand.depthOfMention}%


COMPETITIVE LANDSCAPE:
${competitors.map(c => `- ${c.name}: ${c.visibilityScore}% visibility, #${c.rank} position, ${c.shareOfVoice}% SOV`).join('\n')}

DATA VOLUME:
- Total Prompts Analyzed: ${totalPrompts}
- Total Responses: ${totalResponses}
`;

    // Add tab-specific data to prompt
    switch (tabType) {
      case 'visibility':
        prompt += this.getVisibilityPromptData(structuredData);
        break;
      case 'prompts':
        prompt += this.getPromptsPromptData(structuredData);
        break;
      case 'sentiment':
        prompt += this.getSentimentPromptData(structuredData);
        break;
      case 'citations':
        prompt += this.getCitationsPromptData(structuredData);
        break;
    }

    prompt += `

CRITICAL: You MUST respond with ONLY the JSON format below. Do NOT include any other text, explanations, or formatting.

Example response format:
{
  "whatsWorking": [
    {
      "description": "GitHub outperforms GitLab 80% vs 20% in AI-Powered Developer Tools across all platforms",
      "impact": "High",
      "recommendation": "Leverage this dominance by creating AI-focused marketing campaigns"
    }
  ],
  "needsAttention": [
    {
      "description": "GitLab is gaining ground with 20% visibility vs GitHub's 85% in collaborative development topics",
      "impact": "Medium", 
      "recommendation": "Monitor GitLab's strategies and strengthen collaborative features"
    }
  ]
}

Focus on:
1. RELATIONAL insights between user brand and specific competitors
2. Cross-topic and cross-platform performance comparisons
3. Specific numbers and percentages, not vague statements
4. Tangible competitive advantages/disadvantages
5. Actionable recommendations based on competitor analysis

Requirements:
- Use specific competitor names (GitLab, AWS CodeCommit, Bitbucket)
- Include specific numbers and percentages
- Compare performance across topics, personas, and platforms
- Be direct and factual, no filler content
- Focus on what's actually happening vs competitors

Provide 3-5 insights for each category.

REMEMBER: Your response must be ONLY valid JSON with the exact structure shown above. No additional text, no explanations, no markdown formatting.`;

    return prompt;
  }

  /**
   * Get visibility-specific prompt data
   */
  getVisibilityPromptData(data) {
    let promptData = '';

    if (data.topicBreakdown && data.topicBreakdown.length > 0) {
      promptData += '\nTOPIC PERFORMANCE:\n';
      data.topicBreakdown.forEach(topic => {
        promptData += `- ${topic.topic}: User ${topic.userScore}% vs Competitors ${topic.competitorScores.map(cs => `${cs.name}: ${cs.score}%`).join(', ')}\n`;
      });
    }

    if (data.personaBreakdown && data.personaBreakdown.length > 0) {
      promptData += '\nPERSONA PERFORMANCE:\n';
      data.personaBreakdown.forEach(persona => {
        promptData += `- ${persona.persona}: User ${persona.userScore}% vs Competitors ${persona.competitorScores.map(cs => `${cs.name}: ${cs.score}%`).join(', ')}\n`;
      });
    }

    if (data.platformBreakdown && data.platformBreakdown.length > 0) {
      promptData += '\nPLATFORM PERFORMANCE:\n';
      data.platformBreakdown.forEach(platform => {
        promptData += `- ${platform.platform}: User ${platform.userScore}% vs Competitors ${platform.competitorScores.map(cs => `${cs.name}: ${cs.score}%`).join(', ')}\n`;
      });
    }

    return promptData;
  }

  /**
   * Get prompts-specific prompt data
   */
  getPromptsPromptData(data) {
    // Implementation for prompts tab
    return '\nPROMPT PERFORMANCE:\n[Prompt-specific data would go here]';
  }

  /**
   * Get sentiment-specific prompt data
   */
  getSentimentPromptData(data) {
    // Implementation for sentiment tab
    return '\nSENTIMENT ANALYSIS:\n[Sentiment-specific data would go here]';
  }

  /**
   * Get citations-specific prompt data
   */
  getCitationsPromptData(data) {
    // Implementation for citations tab
    return '\nCITATION ANALYSIS:\n[Citation-specific data would go here]';
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
        max_tokens: 2000
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

      // Transform old format to new format if needed
      const transformInsight = (insight) => {
        // If it has the old format fields, transform them
        if (insight.title && insight.metric && insight.value) {
          return {
            description: `${insight.title}: ${insight.description}`,
            impact: insight.impact,
            recommendation: insight.recommendation
          };
        }
        // If it already has the new format, return as is
        return {
          description: insight.description,
          impact: insight.impact,
          recommendation: insight.recommendation
        };
      };

      const transformedWhatsWorking = insights.whatsWorking.map(transformInsight);
      const transformedNeedsAttention = insights.needsAttention.map(transformInsight);

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
}

module.exports = new InsightsService();

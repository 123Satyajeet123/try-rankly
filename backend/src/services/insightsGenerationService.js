/**
 * Performance Insights Generation Service
 * 
 * Uses LLM to analyze aggregated metrics and generate actionable insights
 * Similar to the dashboard shown in the image with "What's Working" and "Needs Attention"
 */

const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

class InsightsGenerationService {
  constructor() {
    console.log('🧠 InsightsGenerationService initialized');
    
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  /**
   * Generate performance insights from aggregated metrics
   * @param {Object} aggregatedMetrics - The aggregated metrics data
   * @param {Object} context - Additional context (user, brand, etc.)
   * @returns {Promise<Object>} Generated insights
   */
  async generateInsights(aggregatedMetrics, context = {}) {
    try {
      console.log('🧠 Starting AI-powered insights generation...');
      
      const { overall, platform, topic, persona } = aggregatedMetrics;
      
      // Prepare metrics data for LLM analysis
      const metricsData = this.prepareMetricsData(overall, platform, topic, persona);
      
      // Generate insights using LLM
      const insights = await this.analyzeWithLLM(metricsData, context);
      
      // Process and structure insights
      const processedInsights = this.processInsights(insights);
      
      console.log(`✅ Generated ${processedInsights.length} insights`);
      
      return {
        insights: processedInsights,
        summary: this.generateSummary(processedInsights),
        metadata: {
          generatedAt: new Date(),
          model: 'gpt-4o',
          totalInsights: processedInsights.length
        }
      };
      
    } catch (error) {
      console.error('❌ Insights generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Prepare metrics data for LLM analysis
   */
  prepareMetricsData(overall, platform, topic, persona) {
    const data = {
      overall: {
        totalTests: overall?.totalResponses || 0,
        totalBrands: overall?.totalBrands || 0,
        topBrands: overall?.brandMetrics?.slice(0, 5).map(brand => ({
          name: brand.brandName,
          mentions: brand.totalMentions,
          shareOfVoice: brand.shareOfVoice,
          avgPosition: brand.avgPosition,
          depthOfMention: brand.depthOfMention,
          citationShare: brand.citationShare,
          sentimentScore: brand.sentimentScore,
          sentimentShare: brand.sentimentShare
        })) || []
      },
      platform: platform?.map(p => ({
        name: p.scopeValue,
        tests: p.totalResponses,
        topBrand: p.brandMetrics?.[0]?.brandName || 'N/A',
        topMentions: p.brandMetrics?.[0]?.totalMentions || 0
      })) || [],
      topic: topic?.map(t => ({
        name: t.scopeValue,
        tests: t.totalResponses,
        topBrand: t.brandMetrics?.[0]?.brandName || 'N/A',
        topVoice: t.brandMetrics?.[0]?.shareOfVoice || 0
      })) || [],
      persona: persona?.map(p => ({
        name: p.scopeValue,
        tests: p.totalResponses,
        topBrand: p.brandMetrics?.[0]?.brandName || 'N/A',
        topSentiment: p.brandMetrics?.[0]?.sentimentScore || 0
      })) || []
    };

    return data;
  }

  /**
   * Use LLM to analyze metrics and generate insights
   */
  async analyzeWithLLM(metricsData, context) {
    const brandName = context.brandName || 'Your Brand';
    
    const systemPrompt = `You are a performance analytics expert analyzing brand visibility metrics from LLM responses. Generate actionable insights that help users understand their brand's performance and make strategic decisions.

Focus on:
1. What's Working - Positive trends, strengths, successes
2. Needs Attention - Areas for improvement, weaknesses, opportunities

For each insight, provide:
- Clear, specific insight statement
- Quantified data (percentages, numbers)
- Impact level (High/Medium/Low)
- Actionable recommendation
- Trend direction (up/down/stable)

Be specific and data-driven. Use the exact numbers provided.`;

    const userPrompt = `Analyze these brand visibility metrics for ${brandName}:

OVERALL PERFORMANCE:
${JSON.stringify(metricsData.overall, null, 2)}

PLATFORM BREAKDOWN:
${JSON.stringify(metricsData.platform, null, 2)}

TOPIC PERFORMANCE:
${JSON.stringify(metricsData.topic, null, 2)}

PERSONA PERFORMANCE:
${JSON.stringify(metricsData.persona, null, 2)}

Generate 3-5 key insights, categorized as "whats_working" or "needs_attention". Each insight should be specific, actionable, and backed by the data.

Return as JSON array with this exact structure:
[
  {
    "title": "Brief insight title",
    "description": "Detailed insight description with specific numbers",
    "category": "whats_working" or "needs_attention",
    "type": "trend" or "performance" or "comparison" or "opportunity" or "warning",
    "primaryMetric": "Metric name (e.g., 'Brand Mentions', 'Citation Share')",
    "secondaryMetrics": ["Related metrics"],
    "currentValue": 123.45,
    "previousValue": 100.00,
    "changePercent": 23.45,
    "trend": "up" or "down" or "stable",
    "impact": "high" or "medium" or "low",
    "confidence": 0.85,
    "recommendation": "Specific actionable recommendation",
    "actionableSteps": ["Step 1", "Step 2"],
    "timeframe": "this week" or "last month" or "overall",
    "scope": "overall" or "platform" or "topic" or "persona",
    "scopeValue": "Specific scope (e.g., 'OpenAI', 'Payment Processing')",
    "icon": "trend-up" or "shield" or "warning" or "target",
    "color": "green" or "orange" or "red" or "blue"
  }
]`;

    try {
      const response = await axios.post(OPENROUTER_API_URL, {
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      
      // Clean and parse JSON response
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      const insights = JSON.parse(cleanContent);
      console.log(`✅ LLM generated ${insights.length} insights`);
      
      return insights;
      
    } catch (error) {
      console.error('❌ LLM analysis failed:', error.message);
      throw new Error(`Insights generation failed: ${error.message}`);
    }
  }

  /**
   * Process and validate insights from LLM
   */
  processInsights(rawInsights) {
    const processedInsights = [];
    
    rawInsights.forEach((insight, index) => {
      try {
        // Generate unique insight ID
        const insightId = `insight_${Date.now()}_${index}`;
        
        // Validate and clean data
        const processedInsight = {
          insightId,
          title: insight.title || 'Performance Insight',
          description: insight.description || 'No description available',
          category: insight.category || 'needs_attention',
          type: insight.type || 'performance',
          primaryMetric: insight.primaryMetric || 'Unknown Metric',
          secondaryMetrics: Array.isArray(insight.secondaryMetrics) ? insight.secondaryMetrics : [],
          currentValue: parseFloat(insight.currentValue) || 0,
          previousValue: parseFloat(insight.previousValue) || 0,
          changePercent: parseFloat(insight.changePercent) || 0,
          trend: insight.trend || 'stable',
          impact: insight.impact || 'medium',
          confidence: parseFloat(insight.confidence) || 0.8,
          recommendation: insight.recommendation || 'Continue monitoring performance',
          actionableSteps: Array.isArray(insight.actionableSteps) ? insight.actionableSteps : [],
          timeframe: insight.timeframe || 'overall',
          scope: insight.scope || 'overall',
          scopeValue: insight.scopeValue || '',
          icon: insight.icon || 'target',
          color: insight.color || 'blue',
          generatedAt: new Date(),
          dataSource: {
            metricType: 'aggregated',
            aggregationLevel: insight.scope || 'overall',
            testCount: 80,
            dateRange: {
              from: new Date(),
              to: new Date()
            }
          }
        };
        
        processedInsights.push(processedInsight);
        
      } catch (error) {
        console.warn(`⚠️ Skipping invalid insight ${index}:`, error.message);
      }
    });
    
    return processedInsights;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(insights) {
    const whatsWorking = insights.filter(i => i.category === 'whats_working');
    const needsAttention = insights.filter(i => i.category === 'needs_attention');
    const highImpact = insights.filter(i => i.impact === 'high');
    
    // Find top insight (highest impact + confidence)
    const topInsight = insights.reduce((top, current) => {
      const topScore = (top.impact === 'high' ? 3 : top.impact === 'medium' ? 2 : 1) * top.confidence;
      const currentScore = (current.impact === 'high' ? 3 : current.impact === 'medium' ? 2 : 1) * current.confidence;
      return currentScore > topScore ? current : top;
    }, insights[0] || {});
    
    // Determine overall sentiment
    let overallSentiment = 'neutral';
    if (whatsWorking.length > needsAttention.length * 1.5) {
      overallSentiment = 'positive';
    } else if (needsAttention.length > whatsWorking.length * 1.5) {
      overallSentiment = 'negative';
    } else if (whatsWorking.length > 0 && needsAttention.length > 0) {
      overallSentiment = 'mixed';
    }
    
    return {
      whatsWorkingCount: whatsWorking.length,
      needsAttentionCount: needsAttention.length,
      highImpactCount: highImpact.length,
      topInsight: topInsight?.title || 'No insights generated',
      overallSentiment
    };
  }
}

module.exports = new InsightsGenerationService();

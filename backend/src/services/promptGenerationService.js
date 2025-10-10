const axios = require('axios');

/**
 * Prompt Generation Service
 * Generates natural, persona-specific prompts for LLM testing
 * Uses OpenRouter API with GPT-4o
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Generate prompts for all topic-persona combinations
 * @param {Object} params - Generation parameters
 * @param {Array} params.topics - Selected topics with details
 * @param {Array} params.personas - Selected personas with details
 * @param {String} params.region - Target region
 * @param {String} params.language - Target language
 * @param {String} params.websiteUrl - User's website URL
 * @param {String} params.brandContext - Website brand context
 * @param {Array} params.competitors - Competitor information
 * @returns {Promise<Array>} Array of generated prompts
 */
async function generatePrompts({
  topics = [],
  personas = [],
  region = 'Global',
  language = 'English',
  websiteUrl = '',
  brandContext = '',
  competitors = []
}) {
  try {
    console.log('🎯 Starting prompt generation...');
    console.log(`Topics: ${topics.length}, Personas: ${personas.length}`);

    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    if (topics.length === 0 || personas.length === 0) {
      throw new Error('Topics and personas are required for prompt generation');
    }

    const allPrompts = [];

    // Generate prompts for each topic-persona combination
    for (const topic of topics) {
      for (const persona of personas) {
        console.log(`Generating prompts for: ${topic.name} × ${persona.type}`);
    console.log('🔍 Topic object:', { id: topic.id, _id: topic._id, name: topic.name });
    console.log('🔍 Persona object:', { id: persona.id, _id: persona._id, type: persona.type });
        
        const prompts = await generatePromptsForCombination({
          topic,
          persona,
          region,
          language,
          websiteUrl,
          brandContext,
          competitors
        });

        allPrompts.push(...prompts);
      }
    }

    console.log(`✅ Generated ${allPrompts.length} prompts successfully`);
    return allPrompts;

  } catch (error) {
    console.error('❌ Prompt generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate 5 prompts for a specific topic-persona combination
 */
async function generatePromptsForCombination({
  topic,
  persona,
  region,
  language,
  websiteUrl,
  brandContext,
  competitors
}) {
  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      topic,
      persona,
      region,
      language,
      websiteUrl,
      brandContext,
      competitors
    });

    console.log(`🔍 Prompt generation context for ${topic.name} × ${persona.type}:`);
    console.log(`   Brand: ${brandContext?.companyName || 'Unknown'}`);
    console.log(`   URL: ${websiteUrl}`);

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8, // Higher temperature for more creative/varied prompts
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': websiteUrl || 'https://rankly.ai',
          'X-Title': 'Rankly Prompt Generator'
        },
        timeout: 60000
      }
    );

    const content = response.data.choices[0].message.content;
    const prompts = parsePromptsFromResponse(content, topic, persona);

    return prompts;

  } catch (error) {
    console.error(`Error generating prompts for ${topic.name} × ${persona.type}:`, error.message);
    throw new Error(`Failed to generate prompts: ${error.message}`);
  }
}

/**
 * Build system prompt for AI
 */
function buildSystemPrompt() {
  return `You are an expert at creating natural, human-like search queries for Answer Engine Optimization (AEO) analysis.

Your task is to generate 5 diverse, realistic prompts that test brand visibility in LLM responses (ChatGPT, Claude, Gemini, Perplexity).

CRITICAL: Generate prompts across these 5 AEO-critical query types:

1. **Navigational** (Brand Presence Check): Direct queries about the brand itself
   - Examples: "What is [Brand]?", "How does [Brand] work?", "Features of [Brand]"

2. **Commercial Investigation** (Category Competition): Market/category exploration where brand should appear
   - Examples: "Best [category] tools in 2025", "Top alternatives to [competitor]", "Compare [category] solutions"

3. **Transactional** (Action-Oriented): Ready-to-buy or conversion queries
   - Examples: "Where to sign up for [category tool]", "Pricing for [brand vs competitor]", "Discount codes for [category]"

4. **Comparative** (Brand vs Competitor): Direct brand comparison queries
   - Examples: "Compare [Brand] vs [Competitor]", "Which is better: [Brand] or [Competitor]", "Pros and cons of [Brand]"

5. **Reputational** (Trust & Credibility): Reviews, reliability, trust signals
   - Examples: "Is [Brand] safe to use?", "Reviews of [Brand]", "What do users say about [Brand]?"

Requirements:
- Write from the persona's perspective (their role, challenges, industry context)
- Make prompts conversational and natural (like real human queries)
- Generate EXACTLY ONE prompt per query type (5 prompts total)
- Each prompt should be 1-2 sentences long
- Use the provided brand name, competitors, and topic context

Output format:
Return ONLY a JSON array of 5 prompt strings (one per query type, in order), nothing else.
Example: ["navigational prompt", "commercial investigation prompt", "transactional prompt", "comparative prompt", "reputational prompt"]`;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt({
  topic,
  persona,
  region,
  language,
  websiteUrl,
  brandContext,
  competitors
}) {
  const competitorContext = competitors.length > 0
    ? `\n\nCompetitors in the space: ${competitors.map(c => c.name).join(', ')}`
    : '';

  // Handle brandContext as either object or string
  let brandInfo = '';
  if (brandContext) {
    if (typeof brandContext === 'string') {
      brandInfo = `\n\nBrand Context: ${brandContext.substring(0, 500)}`;
    } else if (typeof brandContext === 'object') {
      // Extract key info from brandContext object
      const contextParts = [];
      if (brandContext.companyName) contextParts.push(`Company: ${brandContext.companyName}`);
      if (brandContext.industry) contextParts.push(`Industry: ${brandContext.industry}`);
      if (brandContext.valueProposition) contextParts.push(`Value: ${brandContext.valueProposition}`);
      if (contextParts.length > 0) {
        brandInfo = `\n\nBrand Context: ${contextParts.join(', ')}`;
      }
    }
  }

  // Extract brand name from brandContext
  let brandName = 'the brand';
  if (brandContext && typeof brandContext === 'object' && brandContext.companyName) {
    brandName = brandContext.companyName;
  } else if (websiteUrl) {
    // Extract domain as fallback
    try {
      const domain = new URL(websiteUrl).hostname.replace('www.', '');
      brandName = domain.split('.')[0];
    } catch (e) {
      // Keep default
    }
  }

  return `Generate 5 AEO-focused prompts for brand visibility testing:

BRAND/WEBSITE: ${brandName}${websiteUrl ? ` (${websiteUrl})` : ''}${brandInfo}

TOPIC/CATEGORY: ${topic.name}
${topic.description ? `Description: ${topic.description}` : ''}
${topic.keywords ? `Keywords: ${topic.keywords.join(', ')}` : ''}

USER PERSONA: ${persona.type}
${persona.description ? `Description: ${persona.description}` : ''}
${persona.painPoints ? `Pain Points: ${persona.painPoints.join(', ')}` : ''}
${persona.goals ? `Goals: ${persona.goals.join(', ')}` : ''}

TARGET: ${region}, ${language}${competitorContext}

Generate EXACTLY 5 prompts (one per query type):
1. Navigational: Direct query about ${brandName}
2. Commercial Investigation: Category/market query where ${brandName} should appear
3. Transactional: Action/buying intent query related to the category
4. Comparative: ${brandName} vs competitor comparison
5. Reputational: Trust/review query about ${brandName}

Write from ${persona.type}'s perspective. Make it natural and conversational.
Return ONLY the JSON array of 5 prompts.`;
}

/**
 * Parse prompts from AI response
 */
function parsePromptsFromResponse(content, topic, persona) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const promptTexts = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(promptTexts) || promptTexts.length !== 5) {
      throw new Error('Expected array of 5 prompts');
    }

    // AEO query types (in order)
    const queryTypes = [
      'Navigational',
      'Commercial Investigation', 
      'Transactional',
      'Comparative',
      'Reputational'
    ];

    // Create prompt objects with metadata
    const prompts = promptTexts.map((text, index) => ({
      topicId: topic._id || topic.id, // Use _id if available, fallback to id
      topicName: topic.name,
      personaId: persona._id || persona.id, // Use _id if available, fallback to id
      personaType: persona.type,
      promptText: text.trim(),
      promptIndex: index + 1,
      queryType: queryTypes[index] // Tag each prompt with its AEO query type
    }));

    console.log('🔍 Generated prompts for topic-persona combination:', {
      topicId: topic._id || topic.id,
      topicName: topic.name,
      personaId: persona._id || persona.id,
      personaType: persona.type,
      promptCount: prompts.length
    });

    return prompts;

  } catch (error) {
    console.error('Error parsing prompts:', error.message);
    console.error('Response content:', content);
    throw new Error('Failed to parse AI response into prompts');
  }
}

module.exports = {
  generatePrompts
};


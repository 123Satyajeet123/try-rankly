const axios = require('axios');
const { config } = require('../config/hyperparameters');

/**
 * Prompt Generation Service
 * Generates natural, persona-specific prompts for LLM testing
 * Uses OpenRouter API with GPT-4o
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Use centralized configuration
const PROMPTS_PER_QUERY_TYPE = config.prompts.perQueryType;

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
 * @param {Number} params.promptsPerQueryType - Number of prompts to generate per query type (default: 3 for stress testing)
 * @returns {Promise<Array>} Array of generated prompts
 */
async function generatePrompts({
  topics = [],
  personas = [],
  region = 'Global',
  language = 'English',
  websiteUrl = '',
  brandContext = '',
  competitors = [],
  totalPrompts = 50 // Generate 50 total prompts per combination
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
        console.log(`Generating prompts for: ${topic.name} × ${persona.type} (${totalPrompts} total prompts)`);
    console.log('🔍 Topic object:', { _id: topic._id, name: topic.name });
    console.log('🔍 Persona object:', { _id: persona._id, type: persona.type });
        
      const prompts = await generatePromptsForCombination({
        topic,
        persona,
        region,
        language,
        websiteUrl,
        brandContext,
        competitors,
        totalPrompts
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
 * Utility function to wait for a specified time
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate prompts for a specific topic-persona combination
 * @param {Number} promptsPerQueryType - Number of prompts per query type
 */
async function generatePromptsForCombination({
  topic,
  persona,
  region,
  language,
  websiteUrl,
  brandContext,
  competitors,
  totalPrompts = 50
}, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds base delay
  
  try {
    const systemPrompt = buildSystemPrompt(totalPrompts);
    const userPrompt = buildUserPrompt({
      topic,
      persona,
      region,
      language,
      websiteUrl,
      brandContext,
      competitors,
      totalPrompts
    });

    console.log(`🔍 Prompt generation context for ${topic.name} × ${persona.type}:`);
    console.log(`   Brand: ${brandContext?.companyName || 'Unknown'}`);
    console.log(`   URL: ${websiteUrl}`);
    console.log(`   Total prompts: ${totalPrompts}`);

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.llm.temperature, // Use centralized temperature setting
        max_tokens: config.llm.maxTokens
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

    // Check if response structure is valid
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.error(`❌ Invalid response structure for prompt generation:`, response.data);
      throw new Error('Invalid response from AI service');
    }

    const content = response.data.choices[0].message.content;
    
    // Check if content looks like an error message (not JSON)
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
      console.error(`❌ API returned error message instead of JSON for prompt generation:`, content);
      throw new Error(`AI service returned error: ${content}`);
    }
    
    const prompts = parsePromptsFromResponse(content, topic, persona, totalPrompts);

    return prompts;

  } catch (error) {
    console.error(`Error generating prompts for ${topic.name} × ${persona.type}:`, error.message);
    
    // Handle rate limiting with retry logic
    if (error.response?.status === 429 && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.warn(`   Rate limit exceeded - retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
      await sleep(delay);
      return generatePromptsForCombination({
        topic,
        persona,
        region,
        language,
        websiteUrl,
        brandContext,
        competitors
      }, retryCount + 1);
    }
    
    throw new Error(`Failed to generate prompts: ${error.message}`);
  }
}

/**
 * Build system prompt for AI
 */
function buildSystemPrompt(totalPrompts = 50) {
  const brandedCount = Math.max(1, Math.round(totalPrompts * 0.01)); // 1%
  const nonBrandedCount = totalPrompts - brandedCount; // 99%
  
  // Calculate prompts per type based on weights (30% Informational, 30% Commercial, 20% Transactional, 20% Navigational)
  const informationalCount = Math.round(totalPrompts * 0.30);
  const commercialCount = Math.round(totalPrompts * 0.30);
  const transactionalCount = Math.round(totalPrompts * 0.20);
  const navigationalCount = totalPrompts - informationalCount - commercialCount - transactionalCount;
  
  return `You are an expert at creating natural, human-like TOFU (Top of Funnel) search queries for Answer Engine Optimization (AEO) analysis.

Your task is to generate ${totalPrompts} diverse, realistic TOFU-focused prompts that test brand visibility in LLM responses (ChatGPT, Claude, Gemini, Perplexity).

CRITICAL REQUIREMENTS:

1. BRANDED RATIO: 
   - ${nonBrandedCount} prompts (99%) must be NON-BRANDED (generic category/problem queries)
   - ${brandedCount} prompt (1%) can be BRANDED (mentioning specific brand name)

2. NO COMPETITOR MENTIONS:
   - NEVER mention competitor brand names in any prompt
   - Use generic terms like "alternatives", "options", "solutions" instead
   - Generic comparisons only (e.g., "best personal loan options" NOT "Brand A vs Brand B")

3. TOFU FOCUS:
   - All queries should target awareness/discovery stage users
   - Focus on education, information, and problem-solving
   - Avoid deep product details, pricing, or purchase-ready queries

Generate EXACTLY ${totalPrompts} prompts using these 4 standard query types:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **INFORMATIONAL QUERIES** (${informationalCount} prompts - 30%)
   Purpose: Learning, understanding, education
   
   NON-BRANDED examples:
   - "What is [category] and how does it work?"
   - "Benefits of using [category]"
   - "Guide to [category]"
   - "How to [solve problem with category]"
   - "Everything you need to know about [category]"
   - "Why choose [category]?"
   - "Types of [category]"
   
   BRANDED (only ${brandedCount} total across all types):
   - "What is [Brand]?"
   - "How does [Brand] work?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. **NAVIGATIONAL QUERIES** (${navigationalCount} prompts - 20%)
   Purpose: Finding information or resources
   
   NON-BRANDED examples:
   - "Where to find [category] information"
   - "Best [category] resources"
   - "[Category] providers near me"
   - "Top [category] companies"
   - "Leading [category] platforms"
   - "Most popular [category] solutions"
   
   BRANDED (if quota allows):
   - "Where to find [Brand]"
   - "[Brand] official site"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. **COMMERCIAL QUERIES** (${commercialCount} prompts - 30%)
   Purpose: Research and evaluation (but TOFU-level, not deep comparison)
   
   NON-BRANDED examples:
   - "Best [category] for [use case]"
   - "Top [category] options in 2025"
   - "[Category] reviews"
   - "Compare different [category] types"
   - "Which [category] is best for beginners"
   - "Pros and cons of [category]"
   - "[Category] alternatives"
   
   BRANDED (if quota allows):
   - "Best [category] including [Brand]"
   - "[Brand] reviews"
   
   ⚠️ CRITICAL: NO COMPETITOR NAMES
   ❌ WRONG: "Compare Brand A vs Brand B"
   ✅ RIGHT: "Compare different personal loan options"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. **TRANSACTIONAL QUERIES** (${transactionalCount} prompts - 20%)
   Purpose: Action-oriented (but still TOFU - getting started)
   
   NON-BRANDED examples:
   - "How to get started with [category]"
   - "Sign up for [category]"
   - "Apply for [category]"
   - "Get [category]"
   - "Try [category]"
   - "Start using [category]"
   
   BRANDED (place your ${brandedCount} branded prompt here if not used earlier):
   - "Sign up for [Brand]"
   - "Try [Brand]"
   - "Get started with [Brand]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISTRIBUTION RULES:
- Write from the persona's perspective (their role, challenges, context)
- Make prompts conversational and natural (like real human queries)
- Each prompt should be 1-2 sentences long and UNIQUE
- Vary phrasing, angle, and specificity within each query type
- Place your ${brandedCount} branded prompt(s) in Transactional category
- Use provided brand name, topic, and persona context
- DO NOT mention any competitor brand names

OUTPUT FORMAT:
Return ONLY a JSON array of ${totalPrompts} prompt strings in this exact order:
[${informationalCount} informational, ${navigationalCount} navigational, ${commercialCount} commercial, ${transactionalCount} transactional]

Example structure: ["info1", "info2", ..., "nav1", "nav2", ..., "comm1", "comm2", ..., "trans1", "trans2", ...]`;
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
  competitors, // Will ignore this
  totalPrompts = 50
}) {
  // Calculate distribution (30% Informational, 30% Commercial, 20% Transactional, 20% Navigational)
  const brandedCount = Math.max(1, Math.round(totalPrompts * 0.01));
  const nonBrandedCount = totalPrompts - brandedCount;
  
  const informationalCount = Math.round(totalPrompts * 0.30);
  const commercialCount = Math.round(totalPrompts * 0.30);
  const transactionalCount = Math.round(totalPrompts * 0.20);
  const navigationalCount = totalPrompts - informationalCount - commercialCount - transactionalCount;

  // Extract brand name
  let brandName = 'the brand';
  if (brandContext && typeof brandContext === 'object' && brandContext.companyName) {
    brandName = brandContext.companyName;
  } else if (brandContext && typeof brandContext === 'string') {
    try {
      const parsed = JSON.parse(brandContext);
      if (parsed.companyName) brandName = parsed.companyName;
    } catch (e) {}
  }

  // Build brand info without competitors
  let brandInfo = '';
  if (brandContext) {
    if (typeof brandContext === 'object') {
      const parts = [];
      if (brandContext.companyName) parts.push(`Company: ${brandContext.companyName}`);
      if (brandContext.industry) parts.push(`Industry: ${brandContext.industry}`);
      if (brandContext.valueProposition) parts.push(`Value: ${brandContext.valueProposition}`);
      if (parts.length > 0) brandInfo = `\n\nBrand Context: ${parts.join(', ')}`;
    }
  }

  // NO COMPETITOR CONTEXT - removed entirely

  return `Generate ${totalPrompts} TOFU-focused AEO prompts for brand visibility testing:

BRAND: ${brandName}${websiteUrl ? ` (${websiteUrl})` : ''}${brandInfo}

TOPIC/CATEGORY: ${topic.name}
${topic.description ? `Description: ${topic.description}` : ''}
${topic.keywords ? `Keywords: ${topic.keywords.join(', ')}` : ''}

USER PERSONA: ${persona.type}
${persona.description ? `Description: ${persona.description}` : ''}
${persona.painPoints ? `Pain Points: ${persona.painPoints.join(', ')}` : ''}
${persona.goals ? `Goals: ${persona.goals.join(', ')}` : ''}

TARGET: ${region}, ${language}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL REQUIREMENTS:

1. TOFU FOCUS (Top of Funnel - Awareness Stage):
   - 99% of queries should be problem/category-focused, NOT brand-specific
   - Queries for users in discovery/learning phase
   - Educational and informational focus
   - Generic, not product-specific

2. BRANDED RATIO:
   - ${nonBrandedCount} prompts (99%) MUST be NON-BRANDED
   - ${brandedCount} prompt (1%) can mention ${brandName}
   - Place branded prompt(s) in Transactional category

3. NO COMPETITOR MENTIONS:
   - DO NOT mention any competitor brand names
   - Use generic terms: "alternatives", "options", "solutions", "providers"
   - Generic comparisons only (e.g., "best ${topic.name} options")
   ❌ NEVER: "Brand A vs Brand B", "alternatives to [Competitor]"
   ✅ ALWAYS: "best ${topic.name} options", "compare ${topic.name} types"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate EXACTLY ${totalPrompts} prompts distributed as:

1. INFORMATIONAL: ${informationalCount} prompts (30%)
   - Generic learning about ${topic.name}
   - "What is", "How does", "Why", "Guide to" ${topic.name}
   - ALL non-branded

2. NAVIGATIONAL: ${navigationalCount} prompts (20%)
   - Finding ${topic.name} resources/providers
   - "Where to find", "Best resources for" ${topic.name}
   - ALL non-branded

3. COMMERCIAL: ${commercialCount} prompts (30%)
   - Researching/evaluating ${topic.name} options
   - "Best ${topic.name} for", "Compare ${topic.name} types"
   - ALL non-branded
   - NO SPECIFIC BRAND NAMES IN COMPARISONS

4. TRANSACTIONAL: ${transactionalCount} prompts (20%)
   - Getting started with ${topic.name}
   - ${transactionalCount - brandedCount} non-branded: "How to get started with ${topic.name}"
   - ${brandedCount} branded: "Sign up for ${brandName}" or "Try ${brandName}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write from ${persona.type}'s perspective considering their pain points and goals.
Make each prompt unique, natural, and conversational.
Return ONLY the JSON array of ${totalPrompts} prompts in order: [informational..., navigational..., commercial..., transactional...]`;
}

/**
 * Parse prompts from AI response
 */
function parsePromptsFromResponse(content, topic, persona, totalPrompts = 50) {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const promptTexts = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(promptTexts) || promptTexts.length !== totalPrompts) {
      throw new Error(`Expected array of ${totalPrompts} prompts, got ${promptTexts.length}`);
    }

    // Calculate distribution (30% Informational, 30% Commercial, 20% Transactional, 20% Navigational)
    const informationalCount = Math.round(totalPrompts * 0.30);
    const commercialCount = Math.round(totalPrompts * 0.30);
    const transactionalCount = Math.round(totalPrompts * 0.20);
    const navigationalCount = totalPrompts - informationalCount - commercialCount - transactionalCount;

    // Create query types array based on distribution
    const queryTypes = [];
    for (let i = 0; i < informationalCount; i++) queryTypes.push('Informational');
    for (let i = 0; i < navigationalCount; i++) queryTypes.push('Navigational');
    for (let i = 0; i < commercialCount; i++) queryTypes.push('Commercial');
    for (let i = 0; i < transactionalCount; i++) queryTypes.push('Transactional');

    // Create prompt objects
    const prompts = promptTexts.map((text, index) => ({
      topicId: topic._id,
      topicName: topic.name,
      personaId: persona._id,
      personaType: persona.type,
      promptText: text.trim(),
      promptIndex: index + 1,
      queryType: queryTypes[index]
    }));

    console.log('🔍 Generated prompts for topic-persona combination:', {
      topicId: topic._id,
      topicName: topic.name,
      personaId: persona._id,
      personaType: persona.type,
      promptCount: prompts.length,
      distribution: {
        informational: informationalCount,
        navigational: navigationalCount,
        commercial: commercialCount,
        transactional: transactionalCount
      }
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


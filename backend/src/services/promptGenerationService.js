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
// Removed perQueryType - now using percentage-based distribution

// Helper functions for query types
function getQueryTypePurpose(type) {
  const purposes = {
    'Informational': 'Learning, understanding, education',
    'Navigational': 'Finding information or resources',
    'Commercial': 'Research and evaluation (but TOFU-level, not deep comparison)',
    'Transactional': 'Action-oriented (but still TOFU - getting started)'
  };
  return purposes[type] || 'General inquiry';
}

function getQueryTypeExamples(type) {
  const examples = {
    'Informational': [
      '- "What is [category] and how does it work?"',
      '- "Benefits of using [category]"',
      '- "Guide to [category]"',
      '- "How to [solve problem with category]"',
      '- "Everything you need to know about [category]"'
    ],
    'Navigational': [
      '- "Where to find [category] information"',
      '- "Best [category] resources"',
      '- "[Category] providers near me"',
      '- "Top [category] companies"',
      '- "Leading [category] platforms"'
    ],
    'Commercial': [
      '- "Best [category] for [use case]"',
      '- "Top [category] options in 2025"',
      '- "[Category] reviews"',
      '- "Compare different [category] types"',
      '- "Which [category] is best for beginners"'
    ],
    'Transactional': [
      '- "How to get started with [category]"',
      '- "Sign up for [category]"',
      '- "Apply for [category]"',
      '- "Get [category]"',
      '- "Try [category]"'
    ]
  };
  return examples[type] || ['- "General [category] inquiry"'];
}

function getBrandedExamples(type) {
  return [
    '- "What is [Brand]?"',
    '- "How does [Brand] work?"',
    '- "Sign up for [Brand]"',
    '- "Try [Brand]"'
  ];
}

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
  totalPrompts = config.prompts.maxToTest // Use maxToTest as the total number of prompts to generate
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
  totalPrompts = config.prompts.maxToTest
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
function buildSystemPrompt(totalPrompts = config.prompts.maxToTest) {
  const brandedCount = Math.max(1, Math.round(totalPrompts * 0.01)); // 1%
  const nonBrandedCount = totalPrompts - brandedCount; // 99%
  
  // Calculate prompts per type based on percentage distribution
  const promptsPerType = {};
  const distribution = config.prompts.queryTypeDistribution;
  
  // Calculate exact prompts for each type based on percentages
  for (const [type, percentage] of Object.entries(distribution)) {
    promptsPerType[type] = Math.round(totalPrompts * percentage);
  }
  
  // Adjust for rounding differences to ensure total matches
  const totalCalculated = Object.values(promptsPerType).reduce((sum, count) => sum + count, 0);
  const difference = totalPrompts - totalCalculated;
  
  // Add the difference to the largest type (Informational)
  if (difference !== 0) {
    promptsPerType['Informational'] += difference;
  }
  
  // Build dynamic query type sections
  const queryTypeSections = config.prompts.queryTypes.map((type, index) => {
    const promptsForThisType = promptsPerType[type];
    return `${index + 1}. **${type.toUpperCase()} QUERIES** (${promptsForThisType} prompts)
   Purpose: ${getQueryTypePurpose(type)}
   
   NON-BRANDED examples:
   ${getQueryTypeExamples(type).join('\n   ')}
   
   BRANDED (only ${brandedCount} total across all types):
   ${getBrandedExamples(type).join('\n   ')}`;
  }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');

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

Generate EXACTLY ${totalPrompts} prompts using these ${config.prompts.queryTypes.length} query types:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${queryTypeSections}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISTRIBUTION RULES:
- Write from the persona's perspective (their role, challenges, context)
- Make prompts conversational and natural (like real human queries)
- Each prompt should be 1-2 sentences long and UNIQUE
- Vary phrasing, angle, and specificity within each query type
- Place your ${brandedCount} branded prompt(s) in any category
- Use provided brand name, topic, and persona context
- DO NOT mention any competitor brand names

OUTPUT FORMAT:
Return ONLY a JSON array of ${totalPrompts} prompt strings in this exact order:
${config.prompts.queryTypes.map((type, index) => {
  const promptsForThisType = promptsPerType + (index < remainingPrompts ? 1 : 0);
  return `${promptsForThisType} ${type.toLowerCase()}`;
}).join(', ')}

Example structure: ${config.prompts.queryTypes.map((type, index) => {
  const promptsForThisType = promptsPerType + (index < remainingPrompts ? 1 : 0);
  return `"${type.toLowerCase()}1", "${type.toLowerCase()}2"${promptsForThisType > 2 ? ', ...' : ''}`;
}).join(', ')}`;
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
  totalPrompts = config.prompts.maxToTest
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
function parsePromptsFromResponse(content, topic, persona, totalPrompts = config.prompts.maxToTest) {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const promptTexts = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(promptTexts)) {
      throw new Error(`Expected array of prompts, got ${typeof promptTexts}`);
    }

    // Allow for some flexibility in prompt count (within 10% tolerance)
    const minExpected = Math.floor(totalPrompts * 0.9);
    const maxExpected = Math.ceil(totalPrompts * 1.1);
    
    if (promptTexts.length < minExpected || promptTexts.length > maxExpected) {
      console.warn(`⚠️  Expected ${totalPrompts} prompts, got ${promptTexts.length}. Using available prompts.`);
    }

    // Calculate distribution based on actual prompt count using percentage-based distribution
    const actualPromptCount = promptTexts.length;
    const queryTypeDistribution = config.prompts.queryTypeDistribution;
    
    // Calculate exact prompts for each type based on percentages
    const promptsPerType = {};
    for (const [type, percentage] of Object.entries(queryTypeDistribution)) {
      promptsPerType[type] = Math.round(actualPromptCount * percentage);
    }
    
    // Adjust for rounding differences to ensure total matches
    const totalCalculated = Object.values(promptsPerType).reduce((sum, count) => sum + count, 0);
    const difference = actualPromptCount - totalCalculated;
    
    // Add the difference to the largest type (Informational)
    if (difference !== 0) {
      promptsPerType['Informational'] += difference;
    }

    // Create query types array based on percentage distribution
    const queryTypes = [];
    config.prompts.queryTypes.forEach((type) => {
      const promptsForThisType = promptsPerType[type];
      for (let i = 0; i < promptsForThisType; i++) {
        queryTypes.push(type);
      }
    });

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

    // Calculate distribution counts for logging
    const distribution = {};
    config.prompts.queryTypes.forEach((type, index) => {
      const promptsForThisType = promptsPerType + (index < remainingPrompts ? 1 : 0);
      distribution[type.toLowerCase().replace(/\s+/g, '_')] = promptsForThisType;
    });

    console.log('🔍 Generated prompts for topic-persona combination:', {
      topicId: topic._id,
      topicName: topic.name,
      personaId: persona._id,
      personaType: persona.type,
      promptCount: prompts.length,
      expectedCount: totalPrompts,
      distribution
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


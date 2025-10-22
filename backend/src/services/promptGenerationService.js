const axios = require('axios');

/**
 * Prompt Generation Service
 * Generates natural, persona-specific prompts for LLM testing
 * Uses OpenRouter API with GPT-4o
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Configuration: Number of prompts to generate per query type
// For stress testing, increase this value (e.g., 5 = 25 total prompts per combination)
const PROMPTS_PER_QUERY_TYPE = parseInt(process.env.PROMPTS_PER_QUERY_TYPE) || 3;

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
  promptsPerQueryType = 3 // Generate 3 prompts per query type = 15 total per combination
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
        console.log(`Generating prompts for: ${topic.name} × ${persona.type} (${promptsPerQueryType} per query type)`);
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
          promptsPerQueryType
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
  promptsPerQueryType = 3
}, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds base delay
  
  try {
    const systemPrompt = buildSystemPrompt(promptsPerQueryType);
    const userPrompt = buildUserPrompt({
      topic,
      persona,
      region,
      language,
      websiteUrl,
      brandContext,
      competitors,
      promptsPerQueryType
    });

    console.log(`🔍 Prompt generation context for ${topic.name} × ${persona.type}:`);
    console.log(`   Brand: ${brandContext?.companyName || 'Unknown'}`);
    console.log(`   URL: ${websiteUrl}`);
    console.log(`   Prompts per query type: ${promptsPerQueryType} (Total: ${promptsPerQueryType * 5})`);

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
    
    const prompts = parsePromptsFromResponse(content, topic, persona, promptsPerQueryType);

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
function buildSystemPrompt(promptsPerQueryType = 3) {
  const totalPrompts = promptsPerQueryType * 5;
  const brandedCount = Math.max(1, Math.floor(totalPrompts * 0.15)); // 15% branded (10-20% range)
  const nonBrandedCount = totalPrompts - brandedCount; // 85% non-branded
  
  return `You are an expert at creating natural, human-like search queries for Answer Engine Optimization (AEO) analysis.

Your task is to generate ${totalPrompts} diverse, realistic prompts that test brand visibility in LLM responses (ChatGPT, Claude, Gemini, Perplexity).

CRITICAL RATIO REQUIREMENT: 
- ${nonBrandedCount} prompts (85%) should be NON-BRANDED (generic category/market queries)
- ${brandedCount} prompts (15%) should be BRANDED (mentioning the specific brand name)

Generate ${promptsPerQueryType} DIFFERENT prompts for EACH of these 5 AEO-critical query types:

1. **Navigational** (Brand Presence Check): Mix of branded and non-branded
   - NON-BRANDED: "What is [category]?", "How does [category] work?", "Features of [category] tools"
   - BRANDED: "What is [Brand]?", "How does [Brand] work?", "Features of [Brand]"
   - Generate ${promptsPerQueryType} VARIED navigational prompts (mix branded/non-branded)

2. **Commercial Investigation** (Category Competition): Market/category exploration
   - NON-BRANDED: "Best [category] tools in 2025", "Top [category] solutions", "Leading [category] platforms"
   - BRANDED: "Best [category] tools including [Brand]", "Top alternatives to [Brand]", "Compare [category] solutions with [Brand]"
   - Generate ${promptsPerQueryType} VARIED commercial investigation prompts (mix branded/non-branded)

3. **Transactional** (Action-Oriented): Ready-to-buy or conversion queries
   - NON-BRANDED: "Where to sign up for [category tool]", "Pricing for [category]", "Discount codes for [category]"
   - BRANDED: "Where to sign up for [Brand]", "Pricing for [Brand]", "Discount codes for [Brand]"
   - Generate ${promptsPerQueryType} VARIED transactional prompts (mix branded/non-branded)

4. **Comparative** (Brand vs Competitor): Direct brand comparison queries
   - NON-BRANDED: "Compare [category] tools", "Which [category] solution is better?", "Pros and cons of [category] platforms"
   - BRANDED: "Compare [Brand] vs [Competitor]", "Which is better: [Brand] or [Competitor]", "Pros and cons of [Brand]"
   - Generate ${promptsPerQueryType} VARIED comparative prompts (mix branded/non-branded)

5. **Reputational** (Trust & Credibility): Reviews, reliability, trust signals
   - NON-BRANDED: "Is [category] safe to use?", "Reviews of [category] tools", "What do users say about [category]?"
   - BRANDED: "Is [Brand] safe to use?", "Reviews of [Brand]", "What do users say about [Brand]?"
   - Generate ${promptsPerQueryType} VARIED reputational prompts (mix branded/non-branded)

Requirements:
- Write from the persona's perspective (their role, challenges, industry context)
- Make prompts conversational and natural (like real human queries)
- Generate EXACTLY ${promptsPerQueryType} prompts per query type (${totalPrompts} prompts total)
- Each prompt should be 1-2 sentences long and UNIQUE
- Vary the phrasing, angle, and specificity for each prompt within a query type
- DISTRIBUTE branded vs non-branded prompts across all query types (not all branded in one type)
- Use the provided brand name, competitors, and topic context

Output format:
Return ONLY a JSON array of ${totalPrompts} prompt strings in this exact order:
[${promptsPerQueryType} navigational, ${promptsPerQueryType} commercial investigation, ${promptsPerQueryType} transactional, ${promptsPerQueryType} comparative, ${promptsPerQueryType} reputational]

Example for ${promptsPerQueryType}=3: ["nav1", "nav2", "nav3", "comm1", "comm2", "comm3", "trans1", "trans2", "trans3", "comp1", "comp2", "comp3", "rep1", "rep2", "rep3"]`;
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
  competitors,
  promptsPerQueryType = 3
}) {
  const competitorContext = competitors.length > 0
    ? `\n\nCompetitors in the space: ${competitors.filter(c => c.name).map(c => c.name).join(', ')}`
    : '';

  // Handle brandContext as either object or string
  let brandInfo = '';
  if (brandContext) {
    if (typeof brandContext === 'string') {
      try {
        const parsed = JSON.parse(brandContext);
        if (parsed.companyName) {
          const contextParts = [];
          if (parsed.companyName) contextParts.push(`Company: ${parsed.companyName}`);
          if (parsed.industry) contextParts.push(`Industry: ${parsed.industry}`);
          if (parsed.valueProposition) contextParts.push(`Value: ${parsed.valueProposition}`);
          if (contextParts.length > 0) {
            brandInfo = `\n\nBrand Context: ${contextParts.join(', ')}`;
          }
        } else {
          brandInfo = `\n\nBrand Context: ${brandContext.substring(0, 500)}`;
        }
      } catch (e) {
        brandInfo = `\n\nBrand Context: ${brandContext.substring(0, 500)}`;
      }
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
  } else if (brandContext && typeof brandContext === 'string') {
    try {
      const parsed = JSON.parse(brandContext);
      if (parsed.companyName) {
        brandName = parsed.companyName;
      }
    } catch (e) {
      // Keep default
    }
  } else if (websiteUrl) {
    // Extract domain as fallback
    try {
      const domain = new URL(websiteUrl).hostname.replace('www.', '');
      brandName = domain.split('.')[0];
    } catch (e) {
      // Keep default
    }
  }

  const totalPrompts = promptsPerQueryType * 5;
  const brandedCount = Math.max(1, Math.floor(totalPrompts * 0.15)); // 15% branded
  const nonBrandedCount = totalPrompts - brandedCount; // 85% non-branded
  
  return `Generate ${totalPrompts} AEO-focused prompts for brand visibility testing:

BRAND/WEBSITE: ${brandName}${websiteUrl ? ` (${websiteUrl})` : ''}${brandInfo}

TOPIC/CATEGORY: ${topic.name}
${topic.description ? `Description: ${topic.description}` : ''}
${topic.keywords ? `Keywords: ${topic.keywords.join(', ')}` : ''}

USER PERSONA: ${persona.type}
${persona.description ? `Description: ${persona.description}` : ''}
${persona.painPoints ? `Pain Points: ${persona.painPoints.join(', ')}` : ''}
${persona.goals ? `Goals: ${persona.goals.join(', ')}` : ''}

TARGET: ${region}, ${language}${competitorContext}

CRITICAL RATIO REQUIREMENT:
- ${nonBrandedCount} prompts (85%) should be NON-BRANDED (generic ${topic.name} queries)
- ${brandedCount} prompts (15%) should be BRANDED (mentioning ${brandName} specifically)

Generate EXACTLY ${totalPrompts} prompts (${promptsPerQueryType} per query type):
1. Navigational (${promptsPerQueryType} prompts): Mix of generic ${topic.name} queries and specific ${brandName} queries
2. Commercial Investigation (${promptsPerQueryType} prompts): Mix of general ${topic.name} market queries and ${brandName}-specific queries
3. Transactional (${promptsPerQueryType} prompts): Mix of general ${topic.name} buying queries and ${brandName} purchase queries
4. Comparative (${promptsPerQueryType} prompts): Mix of general ${topic.name} comparisons and ${brandName} vs competitor comparisons
5. Reputational (${promptsPerQueryType} prompts): Mix of general ${topic.name} trust queries and ${brandName} reputation queries

Write from ${persona.type}'s perspective. Make each prompt unique, natural and conversational.
DISTRIBUTE branded vs non-branded prompts across all query types (not all branded in one type).
Return ONLY the JSON array of ${totalPrompts} prompts in the order specified above.`;
}

/**
 * Parse prompts from AI response
 */
function parsePromptsFromResponse(content, topic, persona, promptsPerQueryType = 3) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const promptTexts = JSON.parse(jsonMatch[0]);
    const expectedCount = promptsPerQueryType * 5;

    if (!Array.isArray(promptTexts) || promptTexts.length !== expectedCount) {
      throw new Error(`Expected array of ${expectedCount} prompts, got ${promptTexts.length}`);
    }

    // AEO query types (each repeated promptsPerQueryType times)
    const baseQueryTypes = [
      'Navigational',
      'Commercial Investigation', 
      'Transactional',
      'Comparative',
      'Reputational'
    ];
    
    // Create the queryTypes array by repeating each type promptsPerQueryType times
    const queryTypes = [];
    for (const type of baseQueryTypes) {
      for (let i = 0; i < promptsPerQueryType; i++) {
        queryTypes.push(type);
      }
    }

    // Create prompt objects with metadata
    const prompts = promptTexts.map((text, index) => ({
      topicId: topic._id, // MongoDB uses _id
      topicName: topic.name,
      personaId: persona._id, // MongoDB uses _id
      personaType: persona.type,
      promptText: text.trim(),
      promptIndex: index + 1,
      queryType: queryTypes[index] // Tag each prompt with its AEO query type
    }));

    console.log('🔍 Generated prompts for topic-persona combination:', {
      topicId: topic._id,
      topicName: topic.name,
      personaId: persona._id,
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


const axios = require('axios');
// Removed hyperparameters config dependency

/**
 * Prompt Generation Service
 * Generates natural, persona-specific prompts for LLM testing
 * Uses OpenRouter API with GPT-4o
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Use centralized configuration
// NOTE: All prompts are now 100% Commercial TOFU with buying intent only

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
 * @param {Number} params.totalPrompts - Total number of prompts to generate
 * @param {Object} params.options - Optional configuration overrides
 * @param {Object} params.options.queryTypeDistribution - Override query type distribution
 * @param {Number} params.options.brandedPercentage - Override branded percentage
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
  totalPrompts = 20, // Default: 20 prompts per combination. This is the count per topic-persona combination.
  options = null // Optional override
}) {
  // Ensure totalPrompts is a valid number, default to 20 if not provided or invalid
  const promptsPerCombination = Number.isInteger(totalPrompts) && totalPrompts > 0 ? totalPrompts : 20;
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
    // Ensure equal number of prompts per combination
    // Over-generate by 80% to account for duplicates during both in-memory and database deduplication
    // Higher factor ensures we have enough unique prompts even if many are duplicates
    const overGenerationFactor = 1.8;
    const promptsToGenerate = Math.ceil(promptsPerCombination * overGenerationFactor);
    
    let combinationCount = 0;
    const totalCombinations = topics.length * personas.length;
    
    for (const topic of topics) {
      for (const persona of personas) {
        combinationCount++;
        console.log(`[${combinationCount}/${totalCombinations}] Generating prompts for: ${topic.name} × ${persona.type}`);
        console.log(`   Target: ${promptsPerCombination} prompts for this combination (generating ${promptsToGenerate} to account for duplicates)`);
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
          totalPrompts: promptsToGenerate, // Over-generate to account for duplicates
          options
        });

        console.log(`   ✅ Generated ${prompts.length} prompts for ${topic.name} × ${persona.type} (will select ${promptsPerCombination} after deduplication)`);
        
        // Ensure we have enough - if fewer than target, log warning
        if (prompts.length < promptsPerCombination) {
          console.warn(`   ⚠️  Only got ${prompts.length} prompts but need ${promptsPerCombination} - may need to adjust`);
        }

        allPrompts.push(...prompts);
      }
    }
    
    console.log(`\n📊 Generation Summary:`);
    console.log(`   Total combinations processed: ${combinationCount}`);
    console.log(`   Prompts per combination: ${promptsPerCombination}`);
    console.log(`   Total prompts before deduplication: ${allPrompts.length}`);

    // Group prompts by topic-persona combination
    const promptsByCombination = {};
    for (const promptData of allPrompts) {
      const key = `${promptData.topicId}_${promptData.personaId}`;
      if (!promptsByCombination[key]) {
        promptsByCombination[key] = [];
      }
      promptsByCombination[key].push(promptData);
    }
    
    // Log distribution per combination
    console.log(`\n📋 Prompts per combination (before deduplication):`);
    Object.entries(promptsByCombination).forEach(([key, prompts]) => {
      const topic = topics.find(t => t._id === prompts[0].topicId);
      const persona = personas.find(p => p._id === prompts[0].personaId);
      console.log(`   ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'}: ${prompts.length} prompts`);
    });

    // Step 1: Deduplicate WITHIN each combination first (per-combination deduplication)
    // Also check for diversity to ensure prompts are meaningfully different
    const deduplicatedByCombination = {};
    for (const [key, prompts] of Object.entries(promptsByCombination)) {
      const seen = [];
      const unique = [];
      const uniqueTexts = []; // Track normalized texts for diversity checking
      
      for (const prompt of prompts) {
        const normText = normalizePromptText(prompt.promptText);
        
        // Check for exact/near duplicates
        if (seen.some(p => isNearDuplicate(p, normText))) {
          continue;
        }
        
        // Check for diversity - ensure prompt is meaningfully different from existing ones
        if (!hasGoodDiversity(normText, uniqueTexts, 0.25)) {
          // Still accept if not a near-duplicate, but log for awareness
          // We'll include it since diversity check might be too strict
        }
        
        seen.push(normText);
        uniqueTexts.push(normText);
        unique.push(prompt);
      }
      
      deduplicatedByCombination[key] = unique;
      console.log(`   ✅ ${key}: Deduplicated from ${prompts.length} to ${unique.length} unique prompts`);
    }
    
    // Step 2: Cross-combination deduplication with deterministic equal distribution
    // We'll ensure each combination gets exactly promptsPerCombination prompts
    const finalPromptsByCombination = {};
    const globalSeen = new Set(); // Track globally seen prompts (normalized text)
    
    // Process combinations in a fixed order (deterministic)
    const combinationKeys = Object.keys(deduplicatedByCombination).sort();
    
    for (const key of combinationKeys) {
      const prompts = deduplicatedByCombination[key];
      finalPromptsByCombination[key] = [];
      let added = 0;
      
      // First pass: Add prompts from this combination, skipping global duplicates
      for (const prompt of prompts) {
        if (added >= promptsPerCombination) break; // We have enough
        
        const normText = normalizePromptText(prompt.promptText);
        const isGlobalDuplicate = Array.from(globalSeen).some(seenText => 
          isNearDuplicate(seenText, normText)
        );
        
        if (!isGlobalDuplicate) {
          globalSeen.add(normText);
          finalPromptsByCombination[key].push(prompt);
          added++;
        }
      }
      
      // Second pass: If we still don't have enough, use remaining unique prompts from this combination
      // (prioritize keeping this combination full - duplicates across combinations are acceptable)
      if (added < promptsPerCombination) {
        for (const prompt of prompts) {
          if (added >= promptsPerCombination) break;
          
          const normText = normalizePromptText(prompt.promptText);
          const alreadyInThisCombo = finalPromptsByCombination[key].some(p => 
            normalizePromptText(p.promptText) === normText
          );
          
          if (!alreadyInThisCombo) {
            // Add even if it's a global duplicate - maintain combination count
            // This ensures each combination gets exactly promptsPerCombination prompts
            finalPromptsByCombination[key].push(prompt);
            added++;
          }
        }
      }
      
      // Log if combination is still short (this shouldn't happen often with 50% over-generation)
      if (added < promptsPerCombination) {
        console.warn(`   ⚠️  Combination ${key} only has ${added}/${promptsPerCombination} prompts after deduplication`);
      }
    }
    
    // Flatten to final array
    const uniquePrompts = [];
    for (const prompts of Object.values(finalPromptsByCombination)) {
      uniquePrompts.push(...prompts);
    }
    
    // Final diversity validation pass - check for any remaining near-duplicates across all prompts
    console.log(`\n🔍 Final diversity validation pass...`);
    const finalValidatedPrompts = [];
    const finalSeen = [];
    let duplicatesRemoved = 0;
    
    for (const prompt of uniquePrompts) {
      const normText = normalizePromptText(prompt.promptText);
      
      // Check against all previously accepted prompts
      const isDuplicate = finalSeen.some(seenText => isNearDuplicate(seenText, normText));
      
      if (isDuplicate) {
        duplicatesRemoved++;
        console.log(`   ⚠️  Removed final duplicate: "${prompt.promptText.substring(0, 60)}..."`);
        continue;
      }
      
      // Additional diversity check - ensure meaningful difference
      if (!hasGoodDiversity(normText, finalSeen, 0.25)) {
        // Warn but still include - diversity check might be too strict
        console.log(`   💡 Low diversity detected but accepting: "${prompt.promptText.substring(0, 60)}..."`);
      }
      
      finalSeen.push(normText);
      finalValidatedPrompts.push(prompt);
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`   ⚠️  Removed ${duplicatesRemoved} additional duplicates in final validation`);
    }
    
    // Log final distribution
    console.log(`\n📋 Prompts per combination (after final validation):`);
    const validatedByCombination = {};
    for (const prompt of finalValidatedPrompts) {
      const key = `${prompt.topicId}_${prompt.personaId}`;
      if (!validatedByCombination[key]) {
        validatedByCombination[key] = [];
      }
      validatedByCombination[key].push(prompt);
    }
    
    let allEqual = true;
    Object.entries(validatedByCombination).forEach(([key, prompts]) => {
      const topic = topics.find(t => t._id === prompts[0].topicId);
      const persona = personas.find(p => p._id === prompts[0].personaId);
      const count = prompts.length;
      const expected = promptsPerCombination;
      const status = count === expected ? '✅' : count < expected ? '⚠️' : '✅';
      if (count !== expected) allEqual = false;
      console.log(`   ${status} ${topic?.name || 'Unknown'} × ${persona?.type || 'Unknown'}: ${count} prompts (expected: ${expected})`);
    });
    
    if (allEqual) {
      console.log(`\n✅ All combinations have exactly ${promptsPerCombination} prompts - uniform distribution achieved!`);
    } else {
      console.warn(`\n⚠️  Some combinations don't have the expected count - may need over-generation`);
    }
    
    // Log diversity statistics
    const finalPromptCount = finalValidatedPrompts.length;
    const uniqueTextCount = new Set(finalValidatedPrompts.map(p => normalizePromptText(p.promptText))).size;
    const diversityRatio = (uniqueTextCount / finalPromptCount * 100).toFixed(1);
    console.log(`\n📊 Diversity Statistics:`);
    console.log(`   Total prompts: ${finalPromptCount}`);
    console.log(`   Unique texts: ${uniqueTextCount}`);
    console.log(`   Diversity ratio: ${diversityRatio}%`);
    
    if (diversityRatio < 95) {
      console.warn(`   ⚠️  Diversity ratio is below 95% - some prompts may be too similar`);
    } else {
      console.log(`   ✅ Excellent diversity - prompts are well-distributed`);
    }
    
    console.log(`\n✅ Generated ${finalValidatedPrompts.length} unique, diverse prompts successfully`);
    return finalValidatedPrompts;

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
  totalPrompts = 20,
  options = null
}, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds base delay
  
  try {
    const systemPrompt = buildSystemPrompt(totalPrompts, options);
    const userPrompt = buildUserPrompt({
      topic,
      persona,
      region,
      language,
      websiteUrl,
      brandContext,
      competitors,
      totalPrompts,
      options
    });

    console.log(`🔍 Prompt generation context for ${topic.name} × ${persona.type}:`);
    console.log(`   Brand: ${brandContext?.companyName || 'Unknown'}`);
    console.log(`   Topic Description: ${topic.description ? topic.description.substring(0, 100) + '...' : 'None provided'}`);
    console.log(`   Persona Description: ${persona.description ? persona.description.substring(0, 100) + '...' : 'None provided'}`);
    console.log(`   Brand Context Fields: ${brandContext && typeof brandContext === 'object' ? Object.keys(brandContext).join(', ') : 'None'}`);
    console.log(`   URL: ${websiteUrl}`);
    console.log(`   Total prompts: ${totalPrompts}`);

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-4o-mini', // Low-cost model for prompt generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7, // Balanced creativity
        top_p: 0.9, // Nucleus sampling
        max_tokens: 3000, // Reduced to control costs
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || websiteUrl || 'https://rankly.ai',
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
        competitors,
        totalPrompts,
        options
      }, retryCount + 1);
    }
    
    throw new Error(`Failed to generate prompts: ${error.message}`);
  }
}

/**
 * Build system prompt for AI
 * @param {number} totalPrompts - Total prompts to generate
 * @param {Object} options - Optional configuration overrides
 */
function buildSystemPrompt(totalPrompts = 20, options = null) {
  // Use override options if provided, otherwise use defaults
  const brandedPercentage = options?.brandedPercentage ?? 15; // 15% branded (reduced from 20% for better TOFU balance)
  
  const brandedCount = Math.max(1, Math.round(totalPrompts * brandedPercentage));
  const nonBrandedCount = totalPrompts - brandedCount;

  return `You are an expert at creating natural, human-like TOFU (Top of Funnel) search queries for Answer Engine Optimization (AEO) analysis.

Your task is to generate EXACTLY ${totalPrompts} diverse, realistic fanned out TOFU prompts that test brand visibility in LLM responses (ChatGPT, Claude, Gemini, Perplexity) for users researching this product/service.

CRITICAL: Each prompt MUST be unique with different angles, focus areas, and wording. NO duplicates or near-duplicates allowed.

🚨 CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE STRICTLY:

1. ALL PROMPTS MUST BE COMMERCIAL ONLY WITH BUYING INTENT:
   - EVERY single prompt must have commercial intent and buying intent
   - Every prompt should indicate users are researching to buy/evaluate/solve a problem with intent to take action
   - ZERO informational queries (no "What is", "How does", "Why" educational content)
   - ZERO navigational queries (no "Where to find", "Best resources")
   - ZERO transactional queries (no "Sign up", "Try", "Apply")
   - ONLY commercial evaluation queries that show buying/research intent

2. TOFU FOCUS - TOP OF FUNNEL ONLY:
   - ALL prompts must target awareness/discovery stage users
   - Users researching solutions, evaluating options, comparing alternatives
   - Early research phase - NOT purchase-ready, NOT educational only
   - Buying intent: users want to solve a problem, find the best solution, evaluate options before buying

3. BRANDED RATIO: 
   - ${nonBrandedCount} prompts (${Math.round((1 - brandedPercentage) * 100)}%) MUST be NON-BRANDED (generic category/problem queries with buying intent)
   - ${brandedCount} prompt (${Math.round(brandedPercentage * 100)}%) can be BRANDED (mentioning specific brand name)

4. NO COMPETITOR MENTIONS:
   - NEVER mention competitor brand names in any prompt
   - Use generic terms like "alternatives", "options", "solutions", "providers" instead
   - Generic comparisons only (e.g., "best personal loan options" NOT "Brand A vs Brand B")

5. FAN OUT - SHORT & DIVERSIFIED ANGLES (CRITICAL FOR DIVERSITY):
   - Vary starting words: Use diverse openings - "Best", "Top", "Compare", "Which", "Should", "Is", "Options for", "Looking for", "Recommend", "Consider", "What are", "Help me find", "I need", "Searching for"
   - Vary research angles: "best for [use case]", "top options", "compare", "which [category]", "should I [action]", "options for [scenario]", "alternatives to", "recommendations for", "guide to choosing"
   - Vary buying contexts: different pain points, scenarios, use cases, user segments, urgency levels, budgets, timeframes
   - Each prompt must be UNIQUE with completely different focus/depth/angle/wording - NO repetition of similar structures
   - Each prompt must be SHORT: 5-12 words maximum
   - CRITICAL: Avoid repetitive patterns - if you use "Is X worth it for Y" once, NEVER use similar structure again
   - CRITICAL: Vary keyword usage - don't repeat the same key phrases across multiple prompts
   - CRITICAL: Use different question types - mix declarative ("Best X for Y"), interrogative ("Which X is best"), and imperative ("Compare X options") forms
   - Examples of DIVERSE prompts: "Best credit cards for travel rewards", "Which loan options suit debt consolidation", "Compare investment platforms for beginners", "Should I get a rewards card for online shopping", "Help me find credit cards with no fees", "What are top cashback card options"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (NON-BRANDED) - DIVERSE SHORT PROMPTS:
- Best credit cards for travel rewards
- Top loan options for debt consolidation
- Compare investment platforms for beginners
- Which credit cards offer the best cashback
- Options for debt consolidation loans
- Looking for credit cards with no annual fee
- Recommend credit cards for online shopping
- Credit cards suitable for students
- Best rewards programs for everyday spending
- Which credit card rewards travel purchases most


EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT (BRANDED) - SHORT PROMPTS:
- Should I consider [Brand] for travel rewards
- Is [Brand] good for students
- [Brand] cashback benefits review
- Compare [Brand] with other options
- Is [Brand] worth it for online shopping

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NEVER GENERATE THESE (NOT COMMERCIAL TOFU OR TOO LONG):
- "What is [category]?" (informational, no buying intent)
- "How does [category] work?" (educational, no buying intent)
- "Where to find [category]?" (navigational, no buying intent)
- "Sign up for [category]" (transactional, NOT TOFU)
- "Apply for [category]" (transactional, NOT TOFU)
- "Buy [category]" (transactional, NOT TOFU)
- "Purchase [category]" (transactional, NOT TOFU)
- "Try [category]" (transactional, NOT TOFU)
- "Order [category]" (transactional, NOT TOFU)
- "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
- "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)

🚫 STRICTLY PROHIBITED TRANSACTIONAL PATTERNS:
- Any phrase containing: "sign up", "apply", "buy", "purchase", "order", "try now", "get started"
- These indicate purchase intent, not research/evaluation intent (TOFU stage)

✅ ONLY GENERATE SHORT COMMERCIAL QUERIES WITH BUYING INTENT (5-12 words):
- Users researching to solve a specific problem
- Users evaluating options before deciding
- Users comparing different solutions
- Users looking for recommendations for their situation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISTRIBUTION RULES:
- ALL ${totalPrompts} prompts MUST be COMMERCIAL with BUYING INTENT
- ALL ${totalPrompts} prompts MUST be TOFU (awareness/discovery stage)
- ALL ${totalPrompts} prompts MUST be SHORT: 5-12 words maximum
- Write from the persona's perspective (their role, challenges, context)
- Make prompts conversational and natural (like real human queries)
- Each prompt must be UNIQUE - absolutely NO duplicates or near-duplicates
- CRITICAL DIVERSITY: Every prompt must use different words, structure, and angle - avoid any repetition
- Fan out across different buying scenarios, use cases, pain points, question types, and phrasings
- ${nonBrandedCount} non-branded + ${brandedCount} branded
- DO NOT mention any competitor brand names
- MAXIMUM DIVERSITY REQUIRED: If you find yourself using similar wording, STOP and think of a completely different way to phrase it

OUTPUT FORMAT:
Return ONLY a JSON array of EXACTLY ${totalPrompts} SHORT commercial prompt strings (5-12 words each).

Example: ["Best credit cards for travel rewards", "Top loan options for students", "Compare investment platforms"]`;
}

/**
 * Build user prompt with context
 * @param {Object} params - Prompt building parameters
 * @param {Object} params.options - Optional configuration overrides
 */
function buildUserPrompt({
  topic,
  persona,
  region,
  language,
  websiteUrl,
  brandContext,
  competitors, // Will ignore this
  totalPrompts = 80,
  options = null
}) {
  // Use override options if provided, otherwise use defaults
  const brandedPercentage = options?.brandedPercentage ?? 15; // 15% branded (aligned with system prompt)
  
  const brandedCount = Math.max(1, Math.round(totalPrompts * brandedPercentage));
  const nonBrandedCount = totalPrompts - brandedCount;
  
  // ALL prompts are now Commercial TOFU type with buying intent

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

  // Build comprehensive brand info for better prompt generation
  let brandInfo = '';
  if (brandContext) {
    if (typeof brandContext === 'object') {
      const parts = [];
      if (brandContext.companyName) parts.push(`Company: ${brandContext.companyName}`);
      if (brandContext.industry) parts.push(`Industry: ${brandContext.industry}`);
      if (brandContext.businessModel) parts.push(`Business Model: ${brandContext.businessModel}`);
      if (brandContext.valueProposition) parts.push(`Value Proposition: ${brandContext.valueProposition}`);
      if (brandContext.keyServices && Array.isArray(brandContext.keyServices)) {
        parts.push(`Key Services: ${brandContext.keyServices.join(', ')}`);
      }
      if (brandContext.targetMarket) parts.push(`Target Market: ${brandContext.targetMarket}`);
      if (brandContext.brandTone) parts.push(`Brand Tone: ${brandContext.brandTone}`);
      if (parts.length > 0) brandInfo = `\n\nBRAND ANALYSIS DATA:\n${parts.join('\n')}`;
    }
  }

  return `Generate EXACTLY ${totalPrompts} COMMERCIAL TOFU prompts for brand visibility testing:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND: ${brandName}${websiteUrl ? ` (${websiteUrl})` : ''}${brandInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPIC/CATEGORY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOPIC: ${topic.name}
${topic.description ? `Description: ${topic.description}` : 'Description: Not provided'}
${topic.keywords && topic.keywords.length > 0 ? `Keywords: ${topic.keywords.join(', ')}` : 'Keywords: Not provided'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PERSONA INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONA: ${persona.type}
${persona.description ? `Description: ${persona.description}` : 'Description: Not provided'}
${persona.painPoints && persona.painPoints.length > 0 ? `Pain Points: ${persona.painPoints.join(', ')}` : 'Pain Points: Not provided'}
${persona.goals && persona.goals.length > 0 ? `Goals: ${persona.goals.join(', ')}` : 'Goals: Not provided'}

TARGET: ${region}, ${language}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 MANDATORY REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. ALL ${totalPrompts} PROMPTS MUST BE COMMERCIAL ONLY WITH BUYING INTENT:
   ✓ EVERY prompt must show commercial intent and buying intent
   ✓ Users researching to solve specific problems with intent to take action
   ✓ Users evaluating options before making a decision
   ✗ ZERO informational queries (no "What is", "How does", "Why", "Guide to")
   ✗ ZERO navigational queries (no "Where to find", "Best resources")
   ✗ ZERO transactional queries (no "Sign up", "Try", "Apply")
   ✓ ONLY commercial evaluation queries that show buying/research intent

2. ALL ${totalPrompts} PROMPTS MUST BE TOFU (Top of Funnel):
   ✓ Awareness/discovery stage users - early research phase
   ✓ Users researching solutions, evaluating options, comparing alternatives
   ✗ NOT purchase-ready (too far down funnel)
   ✗ NOT educational only (no learning focus)
   ✓ Buying intent: users want to solve a problem, find best solutions, evaluate options

3. BRANDED RATIO:
   - ${nonBrandedCount} prompts (${Math.round((1 - brandedPercentage) * 100)}%) MUST be NON-BRANDED
     → Generic category/problem queries with commercial buying intent
   - ${brandedCount} prompt (${Math.round(brandedPercentage * 100)}%) can mention ${brandName}
     → User evaluating/considering the specific brand

4. NO COMPETITOR MENTIONS:
   ✗ NEVER mention competitor brand names
   ✓ Use generic terms: "alternatives", "options", "solutions", "providers", "companies"
   ✓ Generic comparisons only (e.g., "best ${topic.name} options" NOT "Brand A vs Brand B")

5. FAN OUT - SHORT & DIVERSIFIED ANGLES (CRITICAL FOR DIVERSITY):
   - Vary starting words: Use diverse openings - "Best", "Top", "Compare", "Which", "Should", "Is", "Options for", "Looking for", "Recommend", "Consider", "What are", "Help me find", "I need", "Searching for"
   - Vary research angles: "best for [use case]", "top options", "compare", "recommendations", "reviews", "alternatives to", "guide to choosing", "help selecting"
   - Vary buying contexts: different pain points, scenarios, use cases, budgets, urgency, timeframes, user types
   - Each prompt MUST be unique with completely different focus/depth/angle/wording - NO similar patterns
   - Each prompt MUST be SHORT: 5-12 words maximum
   - Cover different stages: initial research → comparison → selection criteria
   - CRITICAL: Use different question types - mix declarative, interrogative, and imperative forms
   - CRITICAL: Vary keyword usage - don't repeat the same phrases across prompts
   - CRITICAL: Avoid repetitive structures - if you use one pattern, use completely different patterns for others

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE COMMERCIAL TOFU QUERIES WITH BUYING INTENT - SHORT PROMPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NON-BRANDED (${nonBrandedCount} prompts) - SHORT:
✓ "Best ${topic.name} options for ${persona.type}s"
✓ "Top ${topic.name} for travel rewards"
✓ "Compare investment platforms for beginners"
✓ "Loan options for debt consolidation"
✓ "Credit cards with best cashback"
✓ "Travel insurance for frequent flyers"

BRANDED (${brandedCount} prompt only) - SHORT:
✓ "Should I consider ${brandName} for ${topic.name}"
✓ "${brandName} cashback comparison"
✓ "Is ${brandName} good for students"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER GENERATE THESE (NOT COMMERCIAL TOFU OR TOO LONG)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ "What is ${topic.name}?" (informational, no buying intent)
✗ "How does ${topic.name} work?" (educational, no buying intent)
✗ "Guide to ${topic.name}" (tutorial, no buying intent)
✗ "Where to find ${topic.name}?" (navigational, no buying intent)
✗ "Sign up for ${topic.name}" (transactional, not TOFU)
✗ "Try ${topic.name}" (transactional, not TOFU)
✗ "What are the top features to consider when choosing a membership rewards card?" (TOO LONG - 12 words)
✗ "Looking for alternatives to American Express SmartEarn™ Credit Card for reward points?" (TOO LONG - 14 words)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISTRIBUTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ALL ${totalPrompts} prompts: COMMERCIAL + TOFU + BUYING INTENT
- ALL ${totalPrompts} prompts: SHORT (5-12 words maximum)
- Write from ${persona.type}'s perspective: ${persona.description ? `consider their description ("${persona.description.substring(0, 80)}${persona.description.length > 80 ? '...' : ''}")` : 'their role and needs'}
  ${persona.painPoints && persona.painPoints.length > 0 ? `- Incorporate their pain points: ${persona.painPoints.slice(0, 3).join(', ')}${persona.painPoints.length > 3 ? '...' : ''}` : ''}
  ${persona.goals && persona.goals.length > 0 ? `- Align with their goals: ${persona.goals.slice(0, 3).join(', ')}${persona.goals.length > 3 ? '...' : ''}` : ''}
- Focus on the topic: ${topic.name} ${topic.description ? `(${topic.description.substring(0, 80)}${topic.description.length > 80 ? '...' : ''})` : ''}
  ${topic.keywords && topic.keywords.length > 0 ? `- Use relevant keywords: ${topic.keywords.slice(0, 5).join(', ')}` : ''}
- Incorporate the brand's value proposition and services when relevant
  ${brandContext && typeof brandContext === 'object' && brandContext.companyName ? `- Brand focus: ${brandContext.companyName}${brandContext.valueProposition ? ` - ${brandContext.valueProposition.substring(0, 80)}${brandContext.valueProposition.length > 80 ? '...' : ''}` : ''}` : ''}
  ${brandContext && typeof brandContext === 'object' && brandContext.keyServices && brandContext.keyServices.length > 0 ? `- Brand services: ${brandContext.keyServices.slice(0, 3).join(', ')}${brandContext.keyServices.length > 3 ? '...' : ''}` : ''}
- Make prompts natural, conversational (like real user queries)
- CRITICAL DIVERSITY RULES:
  ✓ Each prompt: ABSOLUTELY UNIQUE - no duplicates, no near-duplicates, no similar structures
  ✓ Vary angles, wording, question types, and keywords across ALL prompts
  ✓ Fan out: different use cases, scenarios, buying contexts, phrasings
  ✓ Avoid repetitive patterns - if one prompt uses "Best X for Y", use completely different structure for others
  ✓ Maximum diversity: Every prompt should feel like a different user's search query
- ${nonBrandedCount} non-branded + ${brandedCount} branded
- NO competitor brand mentions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a JSON array of EXACTLY ${totalPrompts} SHORT commercial prompt strings (5-12 words each).

Example: ["Best credit cards for travel rewards", "Top loan options for students", "Compare investment platforms"]`;
}

/**
 * Parse prompts from AI response
 */
function parsePromptsFromResponse(content, topic, persona, totalPrompts = 20) {
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

    // ALL prompts are now Commercial type - assign all as Commercial
    const actualPromptCount = promptTexts.length;
    
    // Since all prompts are commercial TOFU, assign all as 'Commercial' type
    const queryTypes = [];
    for (let i = 0; i < actualPromptCount; i++) {
      queryTypes.push('Commercial');
    }

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
    const distribution = {
      Commercial: actualPromptCount,
      Informational: 0,
      Transactional: 0,
      Navigational: 0
    };

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

// Utility to normalize prompt text (case, punctuation, whitespace)
function normalizePromptText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar (0 = identical)
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate word-level similarity (Jaccard similarity on word sets)
 * Returns a value between 0 (completely different) and 1 (identical word sets)
 */
function wordSimilarity(a, b) {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2)); // Ignore words <= 2 chars
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

/**
 * Enhanced near-duplicate detection with multiple similarity metrics
 * Uses Levenshtein distance, word overlap, and substring matching
 */
function isNearDuplicate(a, b) {
  if (!a || !b) return false;
  
  const normA = normalizePromptText(a);
  const normB = normalizePromptText(b);
  
  // Exact match after normalization
  if (normA === normB) return true;
  
  // Short strings: stricter matching
  if (normA.length < 15 || normB.length < 15) {
    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    const similarity = 1 - (distance / maxLen);
    // For short strings, require >85% similarity
    if (similarity > 0.85) return true;
  }
  
  // Substring containment check (major overlap)
  if (normA.length > 20 && normB.length > 20) {
    const shorter = normA.length < normB.length ? normA : normB;
    const longer = normA.length >= normB.length ? normA : normB;
    // If shorter string is mostly contained in longer string
    if (longer.includes(shorter)) {
      // Check if overlap is significant (>= 70% of shorter string)
      const overlapRatio = shorter.length / longer.length;
      if (overlapRatio >= 0.7) return true;
    }
  }
  
  // Word-level similarity check
  const wordSim = wordSimilarity(normA, normB);
  // If >75% of words overlap, consider it a near-duplicate
  if (wordSim > 0.75) return true;
  
  // Levenshtein distance check for longer strings
  if (normA.length >= 20 && normB.length >= 20) {
    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    const similarity = 1 - (distance / maxLen);
    // For longer strings, >80% similarity indicates near-duplicate
    if (similarity > 0.80) return true;
  }
  
  return false;
}

/**
 * Check if a prompt has good diversity compared to existing prompts
 * Returns true if prompt is diverse enough, false if too similar
 */
function hasGoodDiversity(promptText, existingPrompts, minDiversity = 0.3) {
  const normPrompt = normalizePromptText(promptText);
  
  for (const existing of existingPrompts) {
    const normExisting = normalizePromptText(existing);
    
    // Calculate word diversity
    const wordSim = wordSimilarity(normPrompt, normExisting);
    if (wordSim > (1 - minDiversity)) {
      return false; // Too similar
    }
    
    // Check structure similarity (same starting words pattern)
    const promptWords = normPrompt.split(/\s+/).slice(0, 3); // First 3 words
    const existingWords = normExisting.split(/\s+/).slice(0, 3);
    const matchingStart = promptWords.filter(w => existingWords.includes(w)).length;
    // If 2+ of first 3 words match, might be too similar structurally
    if (matchingStart >= 2 && promptWords.length >= 2) {
      // But allow if overall word similarity is still low
      if (wordSim > 0.6) return false;
    }
  }
  
  return true;
}

module.exports = {
  generatePrompts,
  normalizePromptText
};
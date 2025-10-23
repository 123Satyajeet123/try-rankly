/**
 * Centralized Hyperparameters Configuration
 * 
 * This file contains all configurable hyperparameters for the Rankly system.
 * Modify these values to easily adjust system behavior without hunting through code.
 * 
 * Environment variables can override these defaults:
 * - PROMPTS_PER_QUERY_TYPE: Number of prompts to generate per query type
 * - MAX_PROMPTS_TO_TEST: Maximum prompts to test against LLMs
 * - AGGRESSIVE_PARALLELIZATION: Enable/disable aggressive parallelization
 * - MAX_COMPETITORS: Maximum number of competitors to analyze
 * - MAX_TOPICS: Maximum number of topics to extract
 * - MAX_PERSONAS: Maximum number of personas to identify
 * - MAX_CITATIONS_PER_BRAND: Maximum citations to track per brand
 * - ANALYSIS_TIMEOUT: Timeout for analysis operations
 * - LLM_TEMPERATURE: Temperature for LLM responses
 * - LLM_MAX_TOKENS: Maximum tokens for LLM responses
 */

const config = {
  // ===== PROMPT GENERATION CONFIGURATION =====
  prompts: {
    // Total prompts to generate (default: 50)
    totalPrompts: parseInt(process.env.TOTAL_PROMPTS) || 50,
    
    // Maximum prompts to test against LLMs (default: 20)
    // Controls API costs and testing time
    maxToTest: parseInt(process.env.MAX_PROMPTS_TO_TEST) || 20,
    
    // 4 Standard Query Types (removed Comparative & Reputational)
    queryTypes: [
      'Informational',   // Learning/understanding
      'Navigational',    // Finding/locating
      'Commercial',      // Research/evaluation (generic only)
      'Transactional'   // Action/conversion
    ],
    
    // Distribution weights for each query type (TOFU-focused)
    queryTypeWeights: {
      'Informational': 0.30,    // 30% - highest for TOFU
      'Commercial': 0.30,       // 30% - second highest
      'Transactional': 0.20,    // 20%
      'Navigational': 0.20      // 20%
    },
    
    // Branded vs non-branded ratio
    brandedPercentage: 0.01,  // 1% branded, 99% non-branded
    
    // NEW: Don't include competitors in prompt generation
    includeCompetitors: false,
    
    // NEW: TOFU-focused prompts only
    tofuFocused: true,
    
    // Enable aggressive parallelization for testing (default: true)
    aggressiveParallelization: process.env.AGGRESSIVE_PARALLELIZATION !== 'false'
  },

  // ===== ANALYSIS LIMITS =====
  limits: {
    // Maximum number of competitors to analyze (default: 10)
    maxCompetitors: parseInt(process.env.MAX_COMPETITORS) || 10,
    
    // Maximum number of topics to extract (default: 8)
    maxTopics: parseInt(process.env.MAX_TOPICS) || 8,
    
    // Maximum number of personas to identify (default: 6)
    maxPersonas: parseInt(process.env.MAX_PERSONAS) || 6,
    
    // Maximum citations to track per brand (default: 50)
    maxCitationsPerBrand: parseInt(process.env.MAX_CITATIONS_PER_BRAND) || 50,
    
    // Maximum word count for analysis (default: 10000)
    maxWordCount: parseInt(process.env.MAX_WORD_COUNT) || 10000
  },

  // ===== LLM CONFIGURATION =====
  llm: {
    // Temperature for LLM responses (default: 0.4)
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.4,
    
    // Maximum tokens for LLM responses (default: 2000)
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 2000,
    
    // Maximum tokens for subjective metrics evaluation (default: 1500)
    subjectiveMetricsMaxTokens: parseInt(process.env.SUBJECTIVE_METRICS_MAX_TOKENS) || 1500,
    
    // Maximum tokens for prompt testing (default: 1000)
    promptTestingMaxTokens: parseInt(process.env.PROMPT_TESTING_MAX_TOKENS) || 1000,
    
    // Model identifiers for different LLMs
    models: {
      openai: 'openai/gpt-4o',
      gemini: 'google/gemini-2.5-flash',
      claude: 'anthropic/claude-3.5-sonnet',
      perplexity: 'perplexity/sonar-pro'
    }
  },

  // ===== TIMEOUTS AND PERFORMANCE =====
  timeouts: {
    // Analysis timeout in milliseconds (default: 300000 = 5 minutes)
    analysis: parseInt(process.env.ANALYSIS_TIMEOUT) || 300000,
    
    // LLM request timeout in milliseconds (default: 60000 = 1 minute)
    llmRequest: parseInt(process.env.LLM_REQUEST_TIMEOUT) || 60000,
    
    // Database operation timeout in milliseconds (default: 30000 = 30 seconds)
    database: parseInt(process.env.DATABASE_TIMEOUT) || 30000
  },

  // ===== SCORING AND METRICS =====
  scoring: {
    // Decimal places for visibility score (default: 2)
    visibilityScoreDecimals: 2,
    
    // Decimal places for depth of mention (default: 4)
    depthOfMentionDecimals: 4,
    
    // Decimal places for sentiment score (default: 2)
    sentimentScoreDecimals: 2,
    
    // Decimal places for citation share (default: 2)
    citationShareDecimals: 2,
    
    // Decimal places for position distribution (default: 2)
    positionDistributionDecimals: 2
  },

  // ===== UI AND FRONTEND LIMITS =====
  ui: {
    // Maximum competitors to show in UI (default: 4)
    maxCompetitorsDisplay: parseInt(process.env.MAX_COMPETITORS_DISPLAY) || 4,
    
    // Maximum topics to show in UI (default: 2)
    maxTopicsDisplay: parseInt(process.env.MAX_TOPICS_DISPLAY) || 2,
    
    // Maximum personas to show in UI (default: 2)
    maxPersonasDisplay: parseInt(process.env.MAX_PERSONAS_DISPLAY) || 2,
    
    // Animation delays in milliseconds
    animationDelays: {
      card1: 500,
      card2: 3500,
      card3: 6500,
      card4: 9500,
      step1: 2000,
      step2: 4000,
      step3: 6000
    },
    
    // Chart color palette
    brandColors: [
      '#3B82F6', // Blue
      '#EF4444', // Red  
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#84CC16', // Lime
      '#F97316'  // Orange
    ]
  },

  // ===== COST CONTROL =====
  costs: {
    // GPT-4o pricing via OpenRouter (per 1M tokens)
    gpt4oPricing: {
      input: 0.000005,  // $5 per 1M input tokens
      output: 0.000015  // $15 per 1M output tokens
    },
    
    // Estimated cost per prompt test (4 LLMs × average tokens)
    estimatedCostPerPrompt: 0.08, // $0.08 per prompt (4 LLMs)
    
    // Maximum daily cost limit (default: $50)
    maxDailyCost: parseFloat(process.env.MAX_DAILY_COST) || 50.0
  },

  // ===== DEVELOPMENT AND DEBUGGING =====
  development: {
    // Enable debug logging (default: false)
    debugLogging: process.env.DEBUG_LOGGING === 'true',
    
    // Enable performance profiling (default: false)
    performanceProfiling: process.env.PERFORMANCE_PROFILING === 'true',
    
    // Mock LLM responses for testing (default: false)
    mockLLMResponses: process.env.MOCK_LLM_RESPONSES === 'true',
    
    // Skip expensive operations in development (default: false)
    skipExpensiveOperations: process.env.SKIP_EXPENSIVE_OPERATIONS === 'true'
  }
};

// ===== VALIDATION =====
function validateConfig() {
  const errors = [];
  
  // Validate prompt configuration
  if (config.prompts.perQueryType < 1 || config.prompts.perQueryType > 20) {
    errors.push('PROMPTS_PER_QUERY_TYPE must be between 1 and 20');
  }
  
  if (config.prompts.maxToTest < 1 || config.prompts.maxToTest > 1000) {
    errors.push('MAX_PROMPTS_TO_TEST must be between 1 and 1000');
  }
  
  // Validate limits
  if (config.limits.maxCompetitors < 1 || config.limits.maxCompetitors > 50) {
    errors.push('MAX_COMPETITORS must be between 1 and 50');
  }
  
  if (config.limits.maxTopics < 1 || config.limits.maxTopics > 20) {
    errors.push('MAX_TOPICS must be between 1 and 20');
  }
  
  if (config.limits.maxPersonas < 1 || config.limits.maxPersonas > 15) {
    errors.push('MAX_PERSONAS must be between 1 and 15');
  }
  
  // Validate LLM configuration
  if (config.llm.temperature < 0 || config.llm.temperature > 2) {
    errors.push('LLM_TEMPERATURE must be between 0 and 2');
  }
  
  if (config.llm.maxTokens < 100 || config.llm.maxTokens > 10000) {
    errors.push('LLM_MAX_TOKENS must be between 100 and 10000');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Validate configuration on load
validateConfig();

// ===== HELPER FUNCTIONS =====
function getTotalPromptsPerCombination() {
  return config.prompts.queryTypes.length * config.prompts.perQueryType;
}

function getEstimatedCostForPrompts(totalPrompts) {
  return totalPrompts * config.costs.estimatedCostPerPrompt;
}

function getBrandedPromptCount(totalPrompts) {
  return Math.max(1, Math.floor(totalPrompts * config.prompts.brandedPercentage));
}

// ===== EXPORTS =====
module.exports = {
  config,
  validateConfig,
  getTotalPromptsPerCombination,
  getEstimatedCostForPrompts,
  getBrandedPromptCount
};

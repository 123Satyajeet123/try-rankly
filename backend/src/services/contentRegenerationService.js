const axios = require('axios');

class ContentRegenerationService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.defaultModel = 'openai/gpt-4o';

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required for content regeneration');
    }
  }

  /**
   * Regenerate page content using the four-stage RAID G-SEO pipeline.
   * @param {Object} params
   * @param {string} params.originalContent
   * @param {string} [params.model]
   * @param {Object} [params.metadata]
   * @param {Object} [params.context]
   * @param {string} [params.pageUrl]
   * @param {string} [params.persona]
   * @param {string} [params.objective]
   * @returns {Promise<Object>}
   */
  async regenerateContent({
    originalContent,
    model,
    metadata = {},
    context = {},
    pageUrl,
    persona,
    objective,
  }) {
    if (!originalContent || typeof originalContent !== 'string' || originalContent.trim().length < 50) {
      throw new Error('Original content is required and must contain at least 50 characters');
    }

    const chosenModel = model || this.defaultModel;
    const stageUsage = {};

    console.log('🔍 [ContentRegeneration] Starting regeneration', { model: chosenModel, pageUrl, persona, objective });
    const summarization = await this.generateSummary({
      model: chosenModel,
      originalContent,
      metadata,
      context,
      pageUrl,
      persona,
      objective,
    });
    stageUsage.summarization = summarization.usage;

    const intent = await this.inferIntent({
      model: chosenModel,
      originalContent,
      metadata,
      context,
      pageUrl,
      persona,
      objective,
      summary: summarization.data,
    });
    stageUsage.intent = intent.usage;

    const plan = await this.generatePlan({
      model: chosenModel,
      summary: summarization.data,
      intent: intent.data,
      metadata,
      context,
      pageUrl,
      persona,
      objective,
    });
    stageUsage.plan = plan.usage;

    const rewrite = await this.rewriteContent({
      model: chosenModel,
      originalContent,
      summary: summarization.data,
      intent: intent.data,
      plan: plan.data,
      metadata,
      context,
      pageUrl,
      persona,
      objective,
    });
    stageUsage.rewrite = rewrite.usage;

    if (!rewrite.data?.content) {
      throw new Error('AI response did not include regenerated content');
    }

    console.log('✅ [ContentRegeneration] Regeneration complete', {
      model: chosenModel,
      usage: stageUsage,
      summaryKeys: summarization.data ? Object.keys(summarization.data) : [],
      planSteps: Array.isArray(plan.data?.step_plan) ? plan.data.step_plan.length : 0,
    });

    const totalTokens = Object.values(stageUsage).reduce(
      (sum, usage) => sum + (usage?.total_tokens || 0),
      0,
    );

    return {
      model: chosenModel,
      summary: summarization.data,
      intent: intent.data,
      plan: plan.data,
      rewriteMeta: rewrite.data.metadata,
      content: rewrite.data.content,
      usage: {
        totalTokens,
        perStage: {
          summarization: stageUsage.summarization?.total_tokens || 0,
          intent: stageUsage.intent?.total_tokens || 0,
          plan: stageUsage.plan?.total_tokens || 0,
          rewrite: stageUsage.rewrite?.total_tokens || 0,
        },
      },
    };
  }

  async generateSummary({ model, originalContent, metadata, context, pageUrl, persona, objective }) {
    console.log('🧠 [ContentRegeneration] Stage 1 - Summarization started');
    const prompt = this.buildSummaryPrompt({
      originalContent,
      metadata,
      context,
      pageUrl,
      persona,
      objective,
    });

    const response = await this.callChatCompletion({
      model,
      systemPrompt:
        'You are Stage 1 (Content Summarization) analyst for the RAID G-SEO framework. Distill the source page into concise, strategically actionable signals.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 900,
      expectJson: true,
    });

    console.log('🧠 [ContentRegeneration] Stage 1 - Summarization finished', {
      usage: response.usage,
      keys: response.json ? Object.keys(response.json) : [],
    });

    return {
      data: response.json,
      usage: response.usage,
    };
  }

  async inferIntent({ model, originalContent, metadata, context, pageUrl, persona, objective, summary }) {
    console.log('🎯 [ContentRegeneration] Stage 2 - Intent inference started');
    const prompt = this.buildIntentPrompt({
      originalContent: this.truncate(originalContent, 9000),
      metadata,
      context,
      pageUrl,
      persona,
      objective,
      summary,
    });

    const response = await this.callChatCompletion({
      model,
      systemPrompt:
        'You operate Stage 2 (Intent Inference + 4W Multi-Role Reflection) of the RAID G-SEO framework. Build structured, user-centered intent hypotheses.',
      userPrompt: prompt,
      temperature: 0.4,
      maxTokens: 1100,
      expectJson: true,
    });

    console.log('🎯 [ContentRegeneration] Stage 2 - Intent inference finished', {
      usage: response.usage,
      hasReflection: Boolean(response.json?.reflection),
    });

    return {
      data: response.json,
      usage: response.usage,
    };
  }

  async generatePlan({ model, summary, intent, metadata, context, pageUrl, persona, objective }) {
    console.log('🛠️ [ContentRegeneration] Stage 3 - Step planning started');
    const prompt = this.buildPlanPrompt({
      summary,
      intent,
      metadata,
      context,
      pageUrl,
      persona,
      objective,
    });

    const response = await this.callChatCompletion({
      model,
      systemPrompt:
        'You are Stage 3 (Step Planning) strategist of the RAID G-SEO framework. Translate refined intent into sequenced optimization steps that guard against semantic drift.',
      userPrompt: prompt,
      temperature: 0.35,
      maxTokens: 900,
      expectJson: true,
    });

    console.log('🛠️ [ContentRegeneration] Stage 3 - Step planning finished', {
      usage: response.usage,
      stepCount: Array.isArray(response.json?.step_plan) ? response.json.step_plan.length : 0,
    });

    return {
      data: response.json,
      usage: response.usage,
    };
  }

  async rewriteContent({ model, originalContent, summary, intent, plan, metadata, context, pageUrl, persona, objective }) {
    console.log('✍️ [ContentRegeneration] Stage 4 - Rewrite started');
    const prompt = this.buildRewritePrompt({
      originalContent,
      summary,
      intent,
      plan,
      metadata,
      context,
      pageUrl,
      persona,
      objective,
    });

    const response = await this.callChatCompletion({
      model,
      systemPrompt:
        'You are Stage 4 (Intent-Aligned Rewriting) editor for the RAID G-SEO framework. Produce regenerated content that follows the planned steps and supports LLM visibility.',
      userPrompt: prompt,
      temperature: 0.45,
      maxTokens: 2500,
      expectJson: true,
    });

    console.log('✍️ [ContentRegeneration] Stage 4 - Rewrite finished', {
      usage: response.usage,
      contentLength: response.json?.content ? response.json.content.length : 0,
    });

    return {
      data: response.json,
      usage: response.usage,
    };
  }

  buildSummaryPrompt({ originalContent, metadata, context, pageUrl, persona, objective }) {
    const metaLines = [];

    if (metadata?.title) metaLines.push(`Title: ${metadata.title}`);
    if (metadata?.description) metaLines.push(`Description: ${metadata.description}`);
    if (Array.isArray(metadata?.keywords) && metadata.keywords.length > 0) {
      metaLines.push(`Keywords: ${metadata.keywords.join(', ')}`);
    }
    if (metadata?.headings) {
      const headingLines = [];
      ['h1', 'h2', 'h3'].forEach((level) => {
        if (Array.isArray(metadata.headings[level]) && metadata.headings[level].length > 0) {
          headingLines.push(`${level.toUpperCase()}: ${metadata.headings[level].join(' | ')}`);
        }
      });
      if (headingLines.length > 0) {
        metaLines.push(`Headings:\n${headingLines.join('\n')}`);
      }
    }

    const contextLines = [];
    if (pageUrl) contextLines.push(`Primary URL: ${pageUrl}`);
    if (context?.resolvedUrl) contextLines.push(`Resolved URL: ${context.resolvedUrl}`);
    if (persona) contextLines.push(`Target persona: ${persona}`);
    if (objective) contextLines.push(`Business objective: ${objective}`);
    if (context?.llmJourney) contextLines.push(`LLM Journey Stage: ${context.llmJourney}`);
    if (context?.trafficSummary) contextLines.push(`Traffic Summary: ${context.trafficSummary}`);

    if (context?.citations?.details) {
      const citations = context.citations.details
        .slice(0, 5)
        .map((c) => `- ${c.platform || 'unknown'} → ${c.url}`)
        .join('\n');
      if (citations) {
        contextLines.push(`Recent citations:\n${citations}`);
      }
    }

    return `
You are provided with the raw page content that needs to be understood before regeneration.

=== Page Signals ===
${metaLines.join('\n') || 'No metadata supplied'}

=== Context ===
${contextLines.join('\n') || 'No additional context supplied'}

=== Source Content (Markdown) ===
"""${originalContent}"""

Respond STRICTLY in JSON with the following schema:
{
  "summary": "2-3 sentence executive synopsis capturing the page's promise",
  "core_value_proposition": ["bullet", "..."],
  "structural_outline": [
    {"section": "Section name", "purpose": "Why it exists", "coverage_score": "high|medium|low"}
  ],
  "search_intent_hypotheses": ["navigational", "informational: ...", "..."],
  "content_gaps": ["missing data or proof point", "..."],
  "risk_flags": ["outdated info", "thin coverage", "..."]
}`;
  }

  buildIntentPrompt({ originalContent, metadata, context, pageUrl, persona, objective, summary }) {
    return `
We are operating Stage 2 of RAID G-SEO. Leverage the summary and raw content to infer user intent with 4W multi-role reflection.

=== Prior Summary ===
${JSON.stringify(summary, null, 2)}

=== Metadata Snapshot ===
${JSON.stringify(
  {
    pageUrl,
    persona,
    objective,
    metadata,
    context,
  },
  null,
  2,
)}

=== Source Content Sample (truncated) ===
"""${originalContent}"""

Respond STRICTLY in JSON with schema:
{
  "initial_intent": {
    "statement": "Initial guess of hidden user task",
    "supporting_queries": ["query variant", "..."],
    "confidence": "high|medium|low"
  },
  "reflection": {
    "who": [
      {"role": "Primary seeker", "motivation": "Why they search", "knowledge_level": "novice|intermediate|expert"}
    ],
    "what": [
      {"role": "Role name", "needs": ["need1", "need2"], "critical_facts": ["fact", "..."]}
    ],
    "why": [
      {"role": "Role name", "mismatch": "gap between current page and need", "impact": "risk of gap"}
    ],
    "how": {
      "generalization_strategy": "How to broaden appeal without losing focus",
      "content_principles": ["principle1", "principle2"]
    }
  },
  "refined_intent": {
    "intent_statement": "Search intent expressed as outcome + evidence expectation",
    "micro_moments": ["moment1", "moment2"],
    "success_criteria": ["LLM should cite X", "User should learn Y"],
    "alignment_notes": ["guardrail for tone", "..."]
  }
}`;
  }

  buildPlanPrompt({ summary, intent, metadata, context, pageUrl, persona, objective }) {
    return `
We are at Stage 3 of RAID G-SEO. Convert the refined intent into a transparent optimization plan that minimizes semantic drift.

=== Summary ===
${JSON.stringify(summary, null, 2)}

=== Intent Model ===
${JSON.stringify(intent, null, 2)}

=== Page Context ===
${JSON.stringify(
  {
    pageUrl,
    persona,
    objective,
    metadata,
    context,
  },
  null,
  2,
)}

Respond STRICTLY in JSON with schema:
{
  "optimization_objectives": [
    {"objective": "What to improve", "intent_link": "Which refined intent element it supports", "evidence": "Data or proof to include"}
  ],
  "step_plan": [
    {
      "step": 1,
      "focus_area": "Heading / section / feature",
      "action": "Specific rewrite action",
      "reasoning": "Why this matters for LLM visibility",
      "success_signal": "Observable cue in regenerated content"
    }
  ],
  "tone_and_voice": {
    "voice": "authoritative|friendly|technical|... (choose)",
    "reading_level": "grade target",
    "style_guidelines": ["rule1", "rule2"]
  },
  "metadata_directives": {
    "title": "Indicative rewritten title",
    "description": "Meta description aligned with intent",
    "schema": ["FAQ", "HowTo", "..."]
  }
}`;
  }

  buildRewritePrompt({ originalContent, summary, intent, plan, metadata, context, pageUrl, persona, objective }) {
    return `
Stage 4 of RAID G-SEO: Execute the rewrite. Follow the plan exactly, enriching content for LLM visibility while preserving factual integrity.

=== Inputs ===
Summary: ${JSON.stringify(summary, null, 2)}
Intent: ${JSON.stringify(intent, null, 2)}
Plan: ${JSON.stringify(plan, null, 2)}

=== Additional Context ===
${JSON.stringify(
  {
    pageUrl,
    persona,
    objective,
    metadata,
    context,
  },
  null,
  2,
)}

=== Original Content (Markdown) ===
"""${originalContent}"""

Instructions:
- Apply every step in the plan; do not invent new steps unless necessary for coherence.
- Treat the source markdown as the baseline. Every existing H1-H4 section must remain present (you may add sub-sections, but do not delete or collapse sections into short summaries).
- Expand sections according to the plan so the final draft is at least as comprehensive as the original. Never respond with a synopsis — produce full paragraphs, bullets, tables, FAQs, etc.
- Maintain or improve heading hierarchy for App Router + shadcn UI rendering (H2/H3 preferred).
- Embed statistics, citations, and entity clarity where suggested; insert "[Source]" placeholders for new external references.
- Preserve accessibility (clear subheadings, scannable bullets, concise paragraphs) and keep factual integrity.
- Output MUST be full Markdown compatible with our renderer (no prose commentary or JSON outside the required schema).
- While rewriting, layer in the following GEO playbook (prioritize items mandated by the plan, otherwise apply judgement to mix style + substance improvements):
  * Style & presentation (no new data required): Authoritative tone, Easy-to-Understand clarity, Fluency Optimization, Unique Words, Technical Terms.
  * Content expansion (add supportive material): Statistics Addition, Keyword Stuffing (query-relevant terms), Cite Sources, Quotation Addition.

Respond STRICTLY in JSON with schema:
{
  "content": "Final regenerated Markdown string",
  "highlights": ["Key improvement", "..."],
  "cta_recommendations": ["Next action suggestion", "..."],
  "metadata": {
    "title": "Updated H1/title",
    "description": "Summary blurb for preview",
    "faq": [
      {"question": "FAQ?", "answer": "Concise answer aligning with intent"}
    ]
  }
}`;
  }

  async callChatCompletion({ model, systemPrompt, userPrompt, temperature, maxTokens, expectJson }) {
    console.log('📤 [ContentRegeneration] Calling OpenRouter', {
      model,
      temperature,
      maxTokens,
      expectJson,
      systemPromptPreview: systemPrompt.slice(0, 120),
      userPromptPreview: userPrompt.slice(0, 120),
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          top_p: 0.9,
          max_tokens: maxTokens,
          presence_penalty: 0.1,
          frequency_penalty: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.FRONTEND_URL || 'https://rankly.ai',
            'X-Title': 'Rankly RAID G-SEO Pipeline',
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Received empty response from AI service');
      }

      let json = null;
      if (expectJson) {
        json = this.parseJson(content);
      }

      return {
        content,
        json,
        usage: response.data?.usage || {},
      };
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message || 'Unknown AI service error';
      console.error('❌ [ContentRegeneration] AI call failed:', {
        status,
        message,
        stack: error.stack,
        response: error.response?.data,
      });
      throw new Error(`Content regeneration failed: ${message}`);
    }
  }

  parseJson(raw) {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '');

    const repaired = this.repairJsonStructure(cleaned);

    const primaryAttempts = [cleaned, repaired];
    for (const attempt of primaryAttempts) {
      const parsed = this.tryParseJson(attempt);
      if (parsed !== null) {
        return parsed;
      }
    }

    const candidates = new Set();

    const jsonSlice = this.extractJsonBlock(repaired);
    if (jsonSlice) {
      candidates.add(this.repairJsonStructure(jsonSlice));
    }

    const withoutTrailingCommas = repaired.replace(/,\s*(\}|\])/g, '$1');
    candidates.add(withoutTrailingCommas);

    candidates.add(
      this.repairJsonStructure(
        withoutTrailingCommas.replace(/(?<!")\.\.\.(?!")/g, '"..."'),
      ),
    );

    if (jsonSlice) {
      candidates.add(
        this.repairJsonStructure(
          jsonSlice.replace(/(?<!")\.\.\.(?!")/g, '"..."').replace(/,\s*(\}|\])/g, '$1'),
        ),
      );
    }

    const fallbackArray = `[${repaired.replace(/}\s*{/g, '},{')}]`;
    candidates.add(this.repairJsonStructure(fallbackArray));

    for (const candidate of Array.from(candidates).filter(Boolean)) {
      const parsed = this.tryParseJson(candidate);
      if (parsed === null) {
        continue;
      }

      if (Array.isArray(parsed)) {
        const firstObject = parsed.find(
          (item) => item && typeof item === 'object' && !Array.isArray(item),
        );
        if (firstObject) {
          return firstObject;
        }
        continue;
      }

      return parsed;
    }

    console.error('❌ [ContentRegeneration] Failed to parse JSON after trying candidates:', {
      original: raw,
      cleaned,
      repaired,
      candidates: Array.from(candidates),
    });
    throw new Error('AI response could not be parsed as JSON');
  }

  tryParseJson(candidate) {
    if (!candidate) {
      return null;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  extractJsonBlock(value) {
    const startIndex = value.indexOf('{');
    const endIndex = value.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return null;
    }

    let depth = 0;
    let end = startIndex;

    for (let i = startIndex; i < value.length; i++) {
      const char = value[i];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (depth !== 0) {
      return null;
    }

    return value.slice(startIndex, end + 1);
  }

  repairJsonStructure(value) {
    if (!value) {
      return value;
    }

    let result = '';
    const stack = [];
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < value.length; i += 1) {
      const char = value[i];

      if (inString) {
        result += char;

        if (escapeNext) {
          escapeNext = false;
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        result += char;
        continue;
      }

      if (char === '[' || char === '{') {
        stack.push(char);
        result += char;
        continue;
      }

      if (char === ']' || char === '}') {
        const expected = char === ']' ? '[' : '{';
        if (stack.length > 0 && stack[stack.length - 1] === expected) {
          stack.pop();
          result += char;
        } else {
          // Skip redundant closing bracket
          continue;
        }
        continue;
      }

      result += char;
    }

    return result;
  }

  truncate(value, maxChars = 6000) {
    if (!value || typeof value !== 'string') return '';
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars)}\n\n...[truncated]`;
  }
}

module.exports = new ContentRegenerationService();



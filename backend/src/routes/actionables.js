const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler, NotFoundError, ValidationError, AppError } = require('../middleware/errorHandler');
const PromptTest = require('../models/PromptTest');
const UrlAnalysis = require('../models/UrlAnalysis');
const UrlMappingRule = require('../models/UrlMappingRule');
const { normalizeActionableUrl, canonicalizeUrl } = require('../utils/actionablesUrlNormalizer');
const websiteAnalysisService = require('../services/websiteAnalysisService');
const contentRegenerationService = require('../services/contentRegenerationService');

function sanitizeCandidateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Basic hostname detection (contains a dot but no protocol)
  if (/[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }

  return null;
}

function formatScrapedContentToMarkdown(scrapeResult, resolvedUrl) {
  if (!scrapeResult || typeof scrapeResult !== 'object') {
    return 'No content available.';
  }

  const blocks = Array.isArray(scrapeResult.contentBlocks) ? scrapeResult.contentBlocks : [];
  const lines = [];
  const title = scrapeResult.title || 'Page Content Preview';
  const effectiveUrl = scrapeResult.url || resolvedUrl;

  lines.push(`# ${title}`);

  if (effectiveUrl) {
    lines.push(`_Source: [${effectiveUrl}](${effectiveUrl})_`);
  }

  if (blocks.length > 0) {
    let listBuffer = [];
    let currentListType = null;

    const flushList = () => {
      if (listBuffer.length === 0) return;
      if (currentListType === 'ordered') {
        listBuffer.forEach((item, index) => {
          lines.push(`${index + 1}. ${item}`);
        });
      } else {
        listBuffer.forEach((item) => {
          lines.push(`- ${item}`);
        });
      }
      listBuffer = [];
      currentListType = null;
    };

    blocks.forEach((block) => {
      const text = typeof block.text === 'string' ? block.text.trim() : '';
      if (!text) {
        return;
      }

      switch (block.type) {
        case 'h1':
          flushList();
          lines.push(`# ${text}`);
          break;
        case 'h2':
          flushList();
          lines.push(`## ${text}`);
          break;
        case 'h3':
          flushList();
          lines.push(`### ${text}`);
          break;
        case 'h4':
          flushList();
          lines.push(`#### ${text}`);
          break;
        case 'h5':
          flushList();
          lines.push(`##### ${text}`);
          break;
        case 'h6':
          flushList();
          lines.push(`###### ${text}`);
          break;
        case 'li': {
          const listType = block.listType === 'ordered' ? 'ordered' : 'unordered';
          if (currentListType && currentListType !== listType) {
            flushList();
          }
          currentListType = listType;
          listBuffer.push(text);
          break;
        }
        case 'blockquote':
          flushList();
          lines.push(`> ${text}`);
          break;
        default:
          flushList();
          lines.push(text);
      }
    });

    flushList();
  } else if (Array.isArray(scrapeResult.paragraphs) && scrapeResult.paragraphs.length > 0) {
    scrapeResult.paragraphs.forEach((paragraph) => {
      const trimmedParagraph = typeof paragraph === 'string' ? paragraph.trim() : '';
      if (trimmedParagraph) {
        lines.push(trimmedParagraph);
      }
    });
  }

  lines.push('\n---\n');
  lines.push(`_Scraped at: ${new Date().toISOString()}_`);

  return lines.join('\n\n');
}

router.get('/pages', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { urlAnalysisId } = req.query;

  let targetUrlAnalysis = null;

  if (urlAnalysisId) {
    if (!mongoose.Types.ObjectId.isValid(urlAnalysisId)) {
      throw new NotFoundError('URL analysis');
    }

    targetUrlAnalysis = await UrlAnalysis.findOne({
      _id: urlAnalysisId,
      userId,
    }).lean();

    if (!targetUrlAnalysis) {
      throw new NotFoundError('URL analysis');
    }
  } else {
    targetUrlAnalysis = await UrlAnalysis.findOne({ userId }).sort({ analysisDate: -1 }).lean();

    if (!targetUrlAnalysis) {
      throw new NotFoundError('URL analysis');
    }
  }

  const targetUrlAnalysisId = targetUrlAnalysis._id;

  const mappingRules = await UrlMappingRule.find({
    userId,
    urlAnalysisId: targetUrlAnalysisId,
  }).lean();

  const promptTests = await PromptTest.find({
    userId,
    urlAnalysisId: targetUrlAnalysisId,
    status: 'completed',
    'brandMetrics.isOwner': true,
    'brandMetrics.citations.0': { $exists: true },
  })
    .select('promptId promptText llmProvider testedAt updatedAt brandMetrics')
    .lean();

  const citationMap = new Map();

  promptTests.forEach((test) => {
    const ownerBrandMetrics = (test.brandMetrics || []).filter(
      (metric) => metric.isOwner && Array.isArray(metric.citations) && metric.citations.length > 0,
    );

    ownerBrandMetrics.forEach((metric) => {
      metric.citations.forEach((citation) => {
        if (!citation?.url) {
          return;
        }

        const normalized = normalizeActionableUrl(citation.url, mappingRules);
        if (!normalized) {
          return;
        }

        const key = normalized.canonicalUrl;
        if (!key) {
          return;
        }

        if (!citationMap.has(key)) {
          citationMap.set(key, {
            id: key,
            normalizedUrl: normalized.normalizedUrl,
            canonicalUrl: normalized.canonicalUrl,
            hostname: normalized.hostname,
            sourceUrls: new Set(),
            platforms: new Set(),
            details: [],
            mapping: normalized.mapping,
          });
        }

        const entry = citationMap.get(key);
        entry.sourceUrls.add(citation.url);
        entry.platforms.add(test.llmProvider);
        entry.details.push({
          platform: test.llmProvider,
          url: citation.url,
          promptId: test.promptId ? String(test.promptId) : undefined,
          promptText: test.promptText,
          citationType: citation.type,
          firstSeenAt: test.testedAt ? test.testedAt.toISOString() : undefined,
          lastSeenAt: test.updatedAt ? test.updatedAt.toISOString() : undefined,
        });

        if (!entry.mapping && normalized.mapping) {
          entry.mapping = normalized.mapping;
        }
      });
    });
  });

  const analysisCanonical = canonicalizeUrl(targetUrlAnalysis.url);
  const analysisHostname = analysisCanonical ? analysisCanonical.split('/')[0] : '';

  const rows = Array.from(citationMap.values())
    .map((entry) => {
      const hasMappingWarning = Boolean(
        analysisHostname &&
          entry.hostname &&
          entry.hostname !== analysisHostname &&
          !entry.mapping,
      );

      return {
        id: entry.id,
        url: entry.normalizedUrl,
        normalizedUrl: entry.normalizedUrl,
        hostname: entry.hostname,
        sourceUrls: Array.from(entry.sourceUrls),
        traffic: { sessions: 0 },
        citations: {
          platforms: Array.from(entry.platforms),
          totalCitations: entry.details.length,
          details: entry.details,
        },
        recommendedAction: 'regenerate-content',
        actionableReason: 'unknown',
        hasMappingWarning,
        mapping: entry.mapping || undefined,
      };
    })
    .sort((a, b) => b.citations.totalCitations - a.citations.totalCitations);

  res.json({
    success: true,
    data: {
      urlAnalysisId: targetUrlAnalysisId,
      pageCount: rows.length,
      mappingsApplied: mappingRules.length,
      rows,
    },
  });
}));

router.post('/page-content', optionalAuth, asyncHandler(async (req, res) => {
  const { url, normalizedUrl, mapping, mappingTargetUrl, sourceUrls = [] } = req.body || {};

  if (
    (!url || typeof url !== 'string') &&
    (!normalizedUrl || typeof normalizedUrl !== 'string') &&
    (!mappingTargetUrl || typeof mappingTargetUrl !== 'string') &&
    (!Array.isArray(sourceUrls) || sourceUrls.length === 0)
  ) {
    throw new ValidationError('At least one URL must be provided to load page content.', [
      { field: 'url', message: 'Provide at least one valid URL to scrape content from.' },
    ]);
  }

  const candidateSet = new Set();
  const candidateUrls = [];

  function addCandidate(raw, label) {
    const sanitized = sanitizeCandidateUrl(raw);
    if (!sanitized) {
      return;
    }
    if (!candidateSet.has(sanitized)) {
      candidateSet.add(sanitized);
      candidateUrls.push({ url: sanitized, label });
    }
  }

  addCandidate(mapping?.targetUrl, 'mapping.targetUrl');
  addCandidate(mappingTargetUrl, 'mappingTargetUrl');
  addCandidate(normalizedUrl, 'normalizedUrl');
  addCandidate(url, 'url');

  if (Array.isArray(sourceUrls)) {
    sourceUrls.forEach((sourceUrl) => addCandidate(sourceUrl, 'sourceUrl'));
  }

  if (candidateUrls.length === 0) {
    throw new ValidationError('No valid URLs provided to load page content.', [
      { field: 'url', message: 'The provided URLs were empty or invalid.' },
    ]);
  }

  const attemptedUrls = [];
  const scrapeErrors = [];
  let scrapeResult = null;
  let resolvedUrl = null;

  for (const candidate of candidateUrls) {
    attemptedUrls.push(candidate);
    try {
      console.log(`🕸️ [Actionables] Attempting to scrape content from: ${candidate.url} (source: ${candidate.label})`);
      scrapeResult = await websiteAnalysisService.scrapeWebsite(candidate.url);
      resolvedUrl = candidate.url;
      break;
    } catch (error) {
      console.error(`❌ [Actionables] Failed to scrape ${candidate.url}:`, error.message);
      scrapeErrors.push({
        url: candidate.url,
        source: candidate.label,
        message: error.message,
      });
    }
  }

  if (!scrapeResult) {
    const lastError = scrapeErrors[scrapeErrors.length - 1];
    const message = lastError
      ? `Failed to load content. Last attempt (${lastError.url}) responded with: ${lastError.message}`
      : 'Failed to load content from all provided URLs.';
    throw new AppError(message, 502, 'SCRAPE_FAILED');
  }

  const markdown = formatScrapedContentToMarkdown(scrapeResult, resolvedUrl);

  res.json({
    success: true,
    data: {
      markdown,
      resolvedUrl,
      requestedUrl: url || null,
      attemptedUrls,
      metadata: {
        title: scrapeResult.title || null,
        description: scrapeResult.description || null,
        keywords: scrapeResult.keywords || null,
        headings: scrapeResult.headings || null,
        contentBlocks: Array.isArray(scrapeResult.contentBlocks) ? scrapeResult.contentBlocks : null,
        paragraphCount: Array.isArray(scrapeResult.paragraphs) ? scrapeResult.paragraphs.length : 0,
        contactInfo: scrapeResult.contactInfo || null,
        businessInfo: scrapeResult.businessInfo || null,
        socialLinks: scrapeResult.socialLinks || null,
      },
      scrapedAt: new Date().toISOString(),
      warnings: scrapeErrors.length > 0 ? scrapeErrors : undefined,
    },
  });
}));

router.post('/regenerate-content', optionalAuth, asyncHandler(async (req, res) => {
  const {
    originalContent,
    model,
    metadata,
    context,
    pageUrl,
    persona,
    objective,
  } = req.body || {};

  if (!originalContent || typeof originalContent !== 'string' || originalContent.trim().length < 50) {
    throw new ValidationError('Original content is required for regeneration.', [
      { field: 'originalContent', message: 'Provide the loaded page content before regenerating.' },
    ]);
  }

  const result = await contentRegenerationService.regenerateContent({
    originalContent,
    model,
    metadata,
    context,
    pageUrl,
    persona,
    objective,
  });

  res.json({
    success: true,
    data: result,
  });
}));

module.exports = router;




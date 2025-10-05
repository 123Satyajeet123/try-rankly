const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { SYSTEM_PROMPTS, ANALYSIS_TEMPLATES } = require('../config/aiPrompts');

class WebsiteAnalysisService {
  constructor() {
    // Ensure dotenv is loaded
    require('dotenv').config();
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterBaseUrl = 'https://openrouter.ai/api/v1';
    
    // Simple validation
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
    
    console.log('🔑 OpenRouter API Key loaded:', this.openRouterApiKey ? 'YES' : 'NO');
  }

  // Main analysis function
  async analyzeWebsite(url) {
    try {
      // Basic URL validation
      this.validateUrl(url);
      
      console.log(`🔍 Starting website analysis for: ${url}`);
      
      // Step 1: Scrape website content
      const websiteData = await this.scrapeWebsite(url);
      
      // Step 2: Perform AI analysis tasks
      const analysisResults = await this.performAIAnalysis(websiteData, url);
      
      console.log('✅ Website analysis completed successfully');
      return analysisResults;
      
    } catch (error) {
      console.error('❌ Website analysis failed:', error.message);
      throw new Error(`Website analysis failed: ${error.message}`);
    }
  }

  // Simple URL validation
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }
    
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }
    
    // Check for basic security
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }
  }

  // Scrape website content using Puppeteer
  async scrapeWebsite(url) {
    console.log(`📄 Scraping website: ${url}`);
    
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the website with more lenient wait condition
      await page.goto(url, {
        waitUntil: 'domcontentloaded',  // Changed from 'networkidle2' to 'domcontentloaded'
        timeout: 60000  // Increased timeout to 60 seconds
      });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);
      
      // Extract website data
      const websiteData = await page.evaluate(() => {
        // Helper function to safely get text content
        const getTextContent = (element) => {
          return element ? element.innerText.trim() : '';
        };
        
        // Helper function to get meta content
        const getMetaContent = (name) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta ? meta.content : '';
        };
        
        return {
          // Basic page info
          title: document.title,
          url: window.location.href,
          description: getMetaContent('description'),
          keywords: getMetaContent('keywords'),
          
          // Content analysis
          headings: {
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()),
            h3: Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim())
          },
          
          // Main content
          paragraphs: Array.from(document.querySelectorAll('p'))
            .map(p => p.innerText.trim())
            .filter(text => text.length > 50),
          
          // Navigation
          navigation: Array.from(document.querySelectorAll('nav a')).map(a => ({
            text: a.innerText.trim(),
            href: a.href
          })),
          
          // Contact info
          contactInfo: {
            emails: Array.from(document.querySelectorAll('a[href^="mailto:"]'))
              .map(a => a.href.replace('mailto:', '')),
            phones: Array.from(document.querySelectorAll('a[href^="tel:"]'))
              .map(a => a.href.replace('tel:', '')),
            addresses: Array.from(document.querySelectorAll('address'))
              .map(addr => addr.innerText.trim())
          },
          
          // Social links
          socialLinks: Array.from(document.querySelectorAll('a[href*="facebook"], a[href*="twitter"], a[href*="linkedin"], a[href*="instagram"]'))
            .map(a => a.href),
          
          // Business info
          businessInfo: {
            companyName: document.querySelector('h1')?.innerText.trim() || '',
            tagline: document.querySelector('.tagline, .subtitle, .hero-subtitle')?.innerText.trim() || '',
            services: Array.from(document.querySelectorAll('a[href*="service"], a[href*="product"]'))
              .map(a => a.innerText.trim())
          }
        };
      });
      
      console.log('✅ Website scraping completed');
      return websiteData;

    } catch (error) {
      console.error('❌ Scraping failed:', error.message);

      // Try fallback with simpler method
      console.log('🔄 Attempting fallback scraping method...');
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);

        const fallbackData = {
          title: $('title').text() || '',
          url: url,
          description: $('meta[name="description"]').attr('content') || '',
          keywords: $('meta[name="keywords"]').attr('content') || '',
          headings: {
            h1: $('h1').map((i, el) => $(el).text().trim()).get(),
            h2: $('h2').map((i, el) => $(el).text().trim()).get(),
            h3: $('h3').map((i, el) => $(el).text().trim()).get()
          },
          paragraphs: $('p').map((i, el) => $(el).text().trim()).get().filter(text => text.length > 50),
          navigation: [],
          contactInfo: { emails: [], phones: [], addresses: [] },
          socialLinks: [],
          businessInfo: {
            companyName: $('h1').first().text().trim() || '',
            tagline: '',
            services: []
          }
        };

        console.log('✅ Fallback scraping successful');
        return fallbackData;

      } catch (fallbackError) {
        console.error('❌ Fallback scraping also failed:', fallbackError.message);
        throw new Error(`Failed to scrape website: ${error.message}`);
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Perform AI analysis using OpenRouter
  async performAIAnalysis(websiteData, originalUrl) {
    console.log('🤖 Starting AI analysis...');
    
    const analysisTasks = [
      this.analyzeBrandContext(websiteData, originalUrl),
      this.findCompetitors(websiteData, originalUrl),
      this.extractTopics(websiteData),
      this.identifyUserPersonas(websiteData)
    ];
    
    const results = await Promise.all(analysisTasks);
    
    return {
      brandContext: results[0],
      competitors: results[1],
      topics: results[2],
      personas: results[3],
      analysisDate: new Date().toISOString()
    };
  }

  // Task 1: Analyze brand context
  async analyzeBrandContext(websiteData, url) {
    const prompt = `
Analyze this website data and provide a comprehensive brand context analysis.

Website Data:
- URL: ${url}
- Title: ${websiteData.title}
- Description: ${websiteData.description}
- Company Name: ${websiteData.businessInfo.companyName}
- Tagline: ${websiteData.businessInfo.tagline}
- Main Headings: ${websiteData.headings.h1.join(', ')}
- Key Content: ${websiteData.paragraphs.slice(0, 5).join(' ')}
- Services: ${websiteData.businessInfo.services.join(', ')}

Provide a structured analysis in JSON format:
{
  "companyName": "string",
  "industry": "string",
  "businessModel": "string",
  "targetMarket": "string",
  "valueProposition": "string",
  "keyServices": ["string"],
  "brandTone": "string",
  "marketPosition": "string"
}
`;

    return await this.callOpenRouter(prompt, 'openai/gpt-4o', 'brandContext');
  }

  // Task 2: Find competitors
  async findCompetitors(websiteData, url) {
    const prompt = `
Based on this website analysis, identify the top 4-6 direct competitors in the same industry.

Website Analysis:
- Company: ${websiteData.businessInfo.companyName}
- Industry: [Analyze from content]
- Services: ${websiteData.businessInfo.services.join(', ')}
- Target Market: [Analyze from content]

Use web search to find real competitors and return structured data:

{
  "competitors": [
    {
      "name": "Competitor Company Name",
      "url": "https://competitor-website.com",
      "reason": "Why they are a competitor",
      "similarity": "High/Medium/Low"
    }
  ]
}

Search for actual competitors and provide real URLs.
`;

    return await this.callOpenRouter(prompt, 'openai/gpt-4o', 'competitors');
  }

  // Task 3: Extract topics
  async extractTopics(websiteData) {
    const prompt = `
Analyze this website content and extract the main topics and themes that would be relevant for content marketing and SEO.

Website Content:
- Title: ${websiteData.title}
- Headings: ${JSON.stringify(websiteData.headings)}
- Main Content: ${websiteData.paragraphs.slice(0, 10).join(' ')}
- Services: ${websiteData.businessInfo.services.join(', ')}

Extract 6-8 main topics that this business should focus on for content marketing:

{
  "topics": [
    {
      "name": "Topic Name",
      "description": "Brief description of why this topic is relevant",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "priority": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'openai/gpt-4o', 'topics');
  }

  // Task 4: Identify user personas
  async identifyUserPersonas(websiteData) {
    const prompt = `
Based on this website analysis, identify the key user personas that this business targets.

Website Analysis:
- Company: ${websiteData.businessInfo.companyName}
- Industry: [Analyze from content]
- Services: ${websiteData.businessInfo.services.join(', ')}
- Target Market: [Analyze from content and messaging]
- Content Tone: [Analyze from website content]

Identify 3-4 primary user personas:

{
  "personas": [
    {
      "type": "Persona Type (e.g., Marketing Manager, Small Business Owner)",
      "description": "Detailed description of this persona including their role, challenges, goals, and how they would use this business's services",
      "painPoints": ["pain point 1", "pain point 2"],
      "goals": ["goal 1", "goal 2"],
      "relevance": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'openai/gpt-4o', 'personas');
  }

  // Call OpenRouter API with error handling
  async callOpenRouter(prompt, model = 'openai/gpt-4o', analysisType = 'general') {
    try {
      const systemPrompt = SYSTEM_PROMPTS[analysisType] || SYSTEM_PROMPTS.brandContext;
      
      const response = await axios.post(`${this.openRouterBaseUrl}/chat/completions`, {
        model: model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\nCRITICAL: You MUST return ONLY valid JSON. No explanations, no markdown, no additional text. Just the JSON object.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }, {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rankly.ai',
          'X-Title': process.env.OPENROUTER_APP_NAME || 'Rankly'
        },
        timeout: 60000 // 60 second timeout
      });

      const content = response.data.choices[0].message.content;
      
      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        console.log(`✅ Successfully parsed ${analysisType} analysis`);
        return this.validateAndNormalizeResponse(parsed, analysisType);
      } catch (parseError) {
        console.warn(`Failed to parse JSON for ${analysisType}:`, parseError.message);
        
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            return this.validateAndNormalizeResponse(extracted, analysisType);
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e.message);
          }
        }
        
        // Return default response on parse failure
        return this.getDefaultResponse(analysisType);
      }
      
    } catch (error) {
      console.error(`OpenRouter API error (${model} - ${analysisType}):`, error.response?.data || error.message);
      return this.getDefaultResponse(analysisType);
    }
  }

  // Validate and normalize response structure
  validateAndNormalizeResponse(data, analysisType) {
    switch (analysisType) {
      case 'brandContext':
        return this.normalizeBrandContext(data);
      case 'competitors':
        return this.normalizeCompetitors(data);
      case 'topics':
        return this.normalizeTopics(data);
      case 'personas':
        return this.normalizePersonas(data);
      default:
        return data;
    }
  }

  // Normalize brand context response
  normalizeBrandContext(data) {
    return {
      companyName: data.companyName || data.company_name || 'Unknown',
      industry: data.industry || 'Technology',
      businessModel: data.businessModel || data.business_model || 'B2B',
      targetMarket: data.targetMarket || data.target_market || 'General',
      valueProposition: data.valueProposition || data.value_proposition || 'Not specified',
      keyServices: Array.isArray(data.keyServices) ? data.keyServices : 
                  Array.isArray(data.services) ? data.services : 
                  Array.isArray(data.key_services) ? data.key_services : ['Service'],
      brandTone: data.brandTone || data.brand_tone || 'Professional',
      marketPosition: data.marketPosition || data.market_position || 'Mid-market'
    };
  }

  // Normalize competitors response
  normalizeCompetitors(data) {
    const competitors = data.competitors || data.competitor_list || [];
    return {
      competitors: competitors.map((comp, index) => ({
        name: comp.name || comp.company_name || `Competitor ${index + 1}`,
        url: comp.url || comp.website || `https://competitor${index + 1}.com`,
        reason: comp.reason || comp.description || 'Similar business model',
        similarity: comp.similarity || comp.level || 'Medium'
      }))
    };
  }

  // Normalize topics response
  normalizeTopics(data) {
    const topics = data.topics || data.topic_list || [];
    return {
      topics: topics.map((topic, index) => ({
        name: topic.name || topic.title || `Topic ${index + 1}`,
        description: topic.description || topic.desc || 'Content topic for marketing',
        keywords: Array.isArray(topic.keywords) ? topic.keywords : 
                 Array.isArray(topic.tags) ? topic.tags : 
                 [topic.name || `keyword${index + 1}`],
        priority: topic.priority || topic.importance || 'Medium'
      }))
    };
  }

  // Normalize personas response
  normalizePersonas(data) {
    const personas = data.personas || data.persona_list || [];
    return {
      personas: personas.map((persona, index) => ({
        type: persona.type || persona.role || `Persona ${index + 1}`,
        description: persona.description || persona.desc || 'Target customer persona',
        painPoints: Array.isArray(persona.painPoints) ? persona.painPoints : 
                   Array.isArray(persona.pain_points) ? persona.pain_points : 
                   Array.isArray(persona.challenges) ? persona.challenges : 
                   ['Business challenge'],
        goals: Array.isArray(persona.goals) ? persona.goals : 
               Array.isArray(persona.objectives) ? persona.objectives : 
               ['Business goal'],
        relevance: persona.relevance || persona.importance || 'Medium'
      }))
    };
  }

  // Get default response structure
  getDefaultResponse(analysisType) {
    switch (analysisType) {
      case 'brandContext':
        return {
          companyName: 'Unknown Company',
          industry: 'Technology',
          businessModel: 'B2B',
          targetMarket: 'General',
          valueProposition: 'Not specified',
          keyServices: ['Service'],
          brandTone: 'Professional',
          marketPosition: 'Mid-market'
        };
      case 'competitors':
        return {
          competitors: [
            {
              name: 'Competitor 1',
              url: 'https://competitor1.com',
              reason: 'Similar business model',
              similarity: 'Medium'
            }
          ]
        };
      case 'topics':
        return {
          topics: [
            {
              name: 'General Topic',
              description: 'Content topic for marketing',
              keywords: ['keyword1', 'keyword2'],
              priority: 'Medium'
            }
          ]
        };
      case 'personas':
        return {
          personas: [
            {
              type: 'Target Customer',
              description: 'Primary target customer persona',
              painPoints: ['Business challenge'],
              goals: ['Business goal'],
              relevance: 'High'
            }
          ]
        };
      default:
        return {};
    }
  }
}

module.exports = new WebsiteAnalysisService();
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { SYSTEM_PROMPTS, ANALYSIS_TEMPLATES } = require('../config/aiPrompts');
// Removed hyperparameters config dependency
const UrlAnalysisHelper = require('../utils/urlAnalysisHelper');
const ProductDataExtractor = require('../utils/productDataExtractor');

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

  // Main analysis function - Now context-aware!
  async analyzeWebsite(url) {
    try {
      // Basic URL validation
      this.validateUrl(url);
      
      console.log(`🔍 Starting website analysis for: ${url}`);
      
      // Step 1: Detect analysis level (product/category/company)
      const urlContext = UrlAnalysisHelper.getAnalysisContext(url);
      console.log(`📊 Analysis Level: ${urlContext.analysisLevel.toUpperCase()}`);
      
      // Step 2: Scrape website content
      const websiteData = await this.scrapeWebsite(url);
      
      // Step 3: Extract context-specific data
      let contextData = null;
      if (urlContext.analysisLevel === 'product') {
        contextData = ProductDataExtractor.extractProductData(websiteData, urlContext);
      } else if (urlContext.analysisLevel === 'category') {
        contextData = ProductDataExtractor.extractCategoryData(websiteData, urlContext);
      }
      
      // Step 4: Perform context-aware AI analysis
      const analysisResults = await this.performAIAnalysis(
        websiteData, 
        url, 
        urlContext.analysisLevel,
        contextData
      );
      
      // Step 5: Add analysis metadata
      analysisResults.analysisLevel = urlContext.analysisLevel;
      analysisResults.urlContext = urlContext;
      if (contextData) {
        analysisResults.contextData = contextData;
      }
      
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
          contactInfo: { emails: Array.from(document.querySelectorAll('a[href^="mailto:"]'))
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

  // Perform AI analysis using OpenRouter - Now context-aware!
  async performAIAnalysis(websiteData, originalUrl, analysisLevel = 'company', contextData = null) {
    console.log(`🤖 Starting ${analysisLevel.toUpperCase()}-level AI analysis...`);

    let analysisTasks;
    let resultKeys;

    if (analysisLevel === 'product') {
      // Product-level analysis
      console.log('   🎯 Using product-specific analysis tasks...');
      analysisTasks = [
        this.analyzeProductContext(websiteData, originalUrl, contextData),
        this.findProductCompetitors(websiteData, originalUrl, contextData),
        this.extractProductTopics(websiteData, contextData),
        this.identifyProductPersonas(websiteData, contextData)
      ];
      resultKeys = ['productContext', 'competitors', 'topics', 'personas'];
    } else if (analysisLevel === 'category') {
      // Category-level analysis
      console.log('   📂 Using category-specific analysis tasks...');
      analysisTasks = [
        this.analyzeCategoryContext(websiteData, originalUrl, contextData),
        this.findCategoryCompetitors(websiteData, originalUrl, contextData),
        this.extractCategoryTopics(websiteData, contextData),
        this.identifyCategoryPersonas(websiteData, contextData)
      ];
      resultKeys = ['categoryContext', 'competitors', 'topics', 'personas'];
    } else {
      // Company-level analysis (default)
      console.log('   🏢 Using company-level analysis tasks...');
      analysisTasks = [
        this.analyzeBrandContext(websiteData, originalUrl),
        this.findCompetitors(websiteData, originalUrl),
        this.extractTopics(websiteData),
        this.identifyUserPersonas(websiteData)
      ];
      resultKeys = ['brandContext', 'competitors', 'topics', 'personas'];
    }

    let results = await Promise.all(analysisTasks);

    // ✅ Retry competitor finding if no competitors found (max 2 retries)
    const MAX_COMPETITOR_RETRIES = 2;
    let competitorRetries = 0;
    let competitorsResult = results[1];
    
    while ((!competitorsResult.competitors || competitorsResult.competitors.length === 0) && competitorRetries < MAX_COMPETITOR_RETRIES) {
      competitorRetries++;
      console.log(`⚠️ No competitors found, retrying competitor detection (attempt ${competitorRetries}/${MAX_COMPETITOR_RETRIES})...`);
      
      // Retry the competitor finding task
      if (analysisLevel === 'product') {
        competitorsResult = await this.findProductCompetitors(websiteData, originalUrl, contextData);
      } else if (analysisLevel === 'category') {
        competitorsResult = await this.findCategoryCompetitors(websiteData, originalUrl, contextData);
      } else {
        competitorsResult = await this.findCompetitors(websiteData, originalUrl);
      }
      
      // Update results array with retried competitor result
      results[1] = competitorsResult;
      
      if (competitorsResult.competitors && competitorsResult.competitors.length > 0) {
        console.log(`✅ Found ${competitorsResult.competitors.length} competitors on retry attempt ${competitorRetries}`);
      }
    }
    
    if (!competitorsResult.competitors || competitorsResult.competitors.length === 0) {
      console.log(`⚠️ Still no competitors found after ${MAX_COMPETITOR_RETRIES} retries. Continuing with empty competitors array.`);
    }

    // Build results object dynamically based on analysis level
    const analysisResults = {
      [resultKeys[0]]: results[0], // context (brand/product/category)
      competitors: results[1].competitors || [],
      topics: results[2].topics || [],
      personas: results[3].personas || [],
      analysisDate: new Date().toISOString()
    };

    console.log(`✅ ${analysisLevel.toUpperCase()}-level analysis completed`);
    console.log(`   📊 Found ${analysisResults.competitors.length} competitors`);
    console.log(`   📚 Found ${analysisResults.topics.length} topics`);
    console.log(`   👥 Found ${analysisResults.personas.length} personas`);

    return analysisResults;
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

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'brandContext');
  }

  // Task 2: Find competitors
  async findCompetitors(websiteData, url) {
    const prompt = `
Based on this website analysis, identify the top 4-6 DIRECT competitors with SIMILAR BUSINESS METRICS.

CRITICAL: Find competitors that match these key factors:
1. **REVENUE RANGE**: Similar annual revenue (within 2-3x range)
2. **CATEGORY**: Exact same product/service category
3. **SEGMENT**: Same market segment (B2B/B2C, enterprise/SMB, etc.)
4. **FUNDING STAGE**: Similar funding stage (startup/scale-up/enterprise)

Website Analysis:
- Company: ${websiteData.businessInfo.companyName}
- URL: ${url}
- Industry: [Analyze from content - be specific about the industry]
- Services: ${websiteData.businessInfo.services.join(', ')}
- Target Market: [Analyze from content]
- Business Model: [Analyze from content]

COMPETITOR SELECTION CRITERIA:
- **Revenue Match**: Find companies with similar revenue size
- **Category Match**: Same product/service category
- **Segment Match**: Same target market segment
- **Funding Match**: Similar funding stage and investment level
- **Geographic Match**: Same or similar geographic markets
- **Business Model Match**: Similar monetization and business model

SEARCH STRATEGY:
1. Search for "[Industry] companies with similar revenue to [Company Name]"
2. Search for "[Category] competitors in [Segment] market"
3. Search for "[Industry] companies with similar funding stage"
4. Look for companies in the same market segment with comparable metrics

EXAMPLES OF GOOD COMPETITORS:
- For SaaS startups: Other SaaS startups with similar ARR and funding
- For e-commerce: Other e-commerce companies with similar GMV and funding
- For fintech: Other fintech companies with similar transaction volume and funding

EXAMPLES OF BAD COMPETITORS (DO NOT INCLUDE):
- Companies in different revenue brackets
- Companies in different market segments
- Companies with vastly different funding stages
- Companies in different geographic markets

Use web search to find actual competitors and return structured data:

{
  "competitors": [
    {
      "name": "Competitor Company Name",
      "url": "https://competitor-website.com",
      "revenue": "Estimated annual revenue range",
      "category": "Product/service category",
      "segment": "Market segment (B2B/B2C, enterprise/SMB)",
      "funding": "Funding stage and amount",
      "reason": "Why they are a direct competitor (revenue, category, segment, funding match)",
      "similarity": "High/Medium/Low"
    }
  ]
}

Search for actual competitors with similar business metrics and provide real URLs.
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'competitors');
  }

  // Task 3: Extract topics
  async extractTopics(websiteData) {
    const prompt = `
Analyze this website content and extract the main topics and themes that would be relevant for those type of users for whome the product has been made and who would show buying intent for the product/brand.

Website Content:
- Title: ${websiteData.title}
- Headings: ${JSON.stringify(websiteData.headings)}
- Main Content: ${websiteData.paragraphs.slice(0, 10).join(' ')}
- Services: ${websiteData.businessInfo.services.join(', ')}

Extract 8-10 short quality topics

Example: if topic name should be short and crisp
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

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'topics');
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

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'personas');
  }

  // ===== PRODUCT-LEVEL ANALYSIS METHODS =====

  // Product Task 1: Analyze product context
  async analyzeProductContext(websiteData, url, productData) {
    const prompt = `
Analyze this SPECIFIC PRODUCT PAGE and provide comprehensive product context insights.

CRITICAL: Extract and output BOTH the official company/brand name (e.g., 'HDFC Bank') AS companyName, and the specific product name (e.g., 'Platinum Debit Card') AS productName. Do NOT duplicate or substitute—these fields MUST be separate.

Important: If the company/brand name is not visible on the page, infer it from the domain (e.g., 'hdfcbank.com' → 'HDFC Bank').

Return ONLY valid JSON in this structure:
{
  "companyName": "string (official brand/company name)",
  "productName": "string (official product name only, do not include company/brand here)",
  "productCategory": "string",
  "productType": "string",
  "targetAudience": "string",
  "valueProposition": "string",
  "keyFeatures": ["string"],
  "useCases": ["string"],
  "marketPosition": "string"
}

Product Information:
- Product Name: ${productData?.productName || 'Unknown'}
- Product Type: ${productData?.productType || 'General'}
- URL: ${url}
- Page Title: ${websiteData.title}
- Description: ${websiteData.description}
- Main Headings: ${(websiteData.headings?.h1 || []).join(', ')}
- Key Features: ${(productData?.features ? productData.features.slice(0, 5).join('; ') : 'Not specified')}
- Pricing Info: ${(productData?.pricing && productData.pricing.found) ? 'Available' : 'Not found'}
- Use Cases: ${(productData?.useCases ? productData.useCases.slice(0, 3).join('; ') : 'Not specified')}
`;

    const result = await this.callOpenRouter(prompt, 'perplexity/sonar', 'productContext');
    // --- Postprocess result: enforce companyName !== productName ---
    if (result) {
      let company = result.companyName?.trim();
      let product = result.productName?.trim();
      if (!company || !product || company.toLowerCase() === product.toLowerCase()) {
        try {
          const hostname = new URL(url).hostname.replace(/^www\./, '');
          const domainMap = {
            'hdfcbank.com': 'HDFC Bank',
            'icicibank.com': 'ICICI Bank',
            'axisbank.com': 'Axis Bank',
            'yesbank.in': 'YES Bank',
            'sbi.co.in': 'SBI',
            'kotak.com': 'Kotak Bank',
            'bankofbaroda.in': 'Bank of Baroda',
          };
          company = domainMap[hostname] || hostname.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
        } catch { company = 'Unknown Brand'; }
      }
      result.companyName = company;
      result.productName = product;
    }
    return result;
  }

  // Product Task 2: Find product competitors
  async findProductCompetitors(websiteData, url, productData) {
    const prompt = `
Based on this SPECIFIC PRODUCT analysis, identify direct product-level competitors with SIMILAR BUSINESS METRICS.

CRITICAL: Find products that match these key factors:
1. **REVENUE RANGE**: Similar product revenue (within 2-3x range)
2. **CATEGORY**: Exact same product category
3. **SEGMENT**: Same market segment (B2B/B2C, enterprise/SMB, etc.)
4. **FUNDING STAGE**: Similar funding stage of the company behind the product

Product Analysis:
- Product: ${productData?.productName || 'Unknown Product'}
- Product Type: ${productData?.productType || 'General'}
- Features: ${productData?.features.slice(0, 5).join(', ') || 'Not specified'}
- Use Cases: ${productData?.useCases.slice(0, 3).join(', ') || 'Not specified'}
- Pricing: ${productData?.pricing.found ? 'Available' : 'Not specified'}

COMPETITOR SELECTION CRITERIA:
- **Revenue Match**: Find products from companies with similar revenue size
- **Category Match**: Same product category and type
- **Segment Match**: Same target market segment
- **Funding Match**: Similar funding stage of the parent company
- **Feature Match**: Similar core features and capabilities
- **Pricing Match**: Similar pricing model and price range

SEARCH STRATEGY:
1. Search for "[Product Category] products with similar revenue to [Product Name]"
2. Search for "[Product Type] competitors in [Segment] market"
3. Search for "[Product Category] products from companies with similar funding"
4. Look for products in the same market segment with comparable metrics

EXAMPLES OF GOOD COMPETITORS:
- For SaaS products: Other SaaS products with similar ARR and funding
- For e-commerce products: Other e-commerce products with similar GMV and funding
- For fintech products: Other fintech products with similar transaction volume and funding

EXAMPLES OF BAD COMPETITORS (DO NOT INCLUDE):
- Products from companies in different revenue brackets
- Products in different market segments
- Products from companies with vastly different funding stages
- Products in different geographic markets

Use web search to find products that:
1. Compete DIRECTLY with this product (not just the company)
2. Have similar features and use cases
3. Target the same customer needs
4. Are from companies with similar business metrics
5. Provide real product URLs (not just company homepages)

Return structured data:
{
  "competitors": [
    {
      "name": "Competitor Product Name",
      "url": "https://competitor.com/product-page",
      "revenue": "Estimated product revenue range",
      "category": "Product category",
      "segment": "Market segment (B2B/B2C, enterprise/SMB)",
      "funding": "Parent company funding stage and amount",
      "reason": "Why this product competes directly (revenue, category, segment, funding match)",
      "similarity": "High/Medium/Low"
    }
  ]
}

Focus on PRODUCT-LEVEL competition with similar business metrics and features.
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'productCompetitors');
  }

  // Product Task 3: Extract product topics
  async extractProductTopics(websiteData, productData) {
    const prompt = `
Analyze this SPECIFIC PRODUCT PAGE and extract product-specific topics that would be relevant for those type of users for whome the product has been made and who would show buying intent for the product/brand.

IMPORTANT: Extract topics relevant to THIS SPECIFIC PRODUCT, not general business topics.

Product Content:
- Product: ${productData?.productName || 'Unknown Product'}
- Product Type: ${productData?.productType || 'General'}
- Description: ${productData?.description || websiteData.description}
- Features: ${productData?.features.slice(0, 8).join(', ') || 'Not specified'}
- Use Cases: ${productData?.useCases.slice(0, 5).join(', ') || 'Not specified'}
- Page Title: ${websiteData.title}

Extract 8-10 short quality PRODUCT-SPECIFIC topics

Example: if topic name should be short and crisp
{
  "topics": [
    {
      "name": "Product-specific topic name",
      "description": "How this topic relates to the product",
      "keywords": ["product-related keyword1", "keyword2", "keyword3"],
      "priority": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'productTopics');
  }

  // Product Task 4: Identify product personas
  async identifyProductPersonas(websiteData, productData) {
    const prompt = `
Based on this SPECIFIC PRODUCT, identify user personas who would use THIS PRODUCT.

IMPORTANT: Identify personas for THIS SPECIFIC PRODUCT, not general business customers.

Product Analysis:
- Product: ${productData?.productName || 'Unknown Product'}
- Product Type: ${productData?.productType || 'General'}
- Features: ${productData?.features.slice(0, 8).join(', ') || 'Not specified'}
- Use Cases: ${productData?.useCases.slice(0, 5).join(', ') || 'Not specified'}
- Target Audience: [Analyze from content]

Identify 3-4 PRODUCT-SPECIFIC user personas:
{
  "personas": [
    {
      "type": "Persona type specific to this product",
      "description": "How this persona uses THIS specific product",
      "painPoints": ["Problems THIS product solves for them"],
      "goals": ["Goals THIS product helps them achieve"],
      "relevance": "High/Medium/Low"
    }
  ]
}

Focus on:
- Who needs THIS specific product
- What problems THIS product solves
- What situations lead to needing THIS product
- What features matter most to them
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'productPersonas');
  }

  // ===== CATEGORY-LEVEL ANALYSIS METHODS =====

  // Category Task 1: Analyze category context
  async analyzeCategoryContext(websiteData, url, categoryData) {
    const prompt = `
Analyze this CATEGORY PAGE and provide category-level insights.

Category Information:
- Category: ${categoryData?.categoryName || 'Unknown Category'}
- URL: ${url}
- Page Title: ${websiteData.title}
- Description: ${websiteData.description}
- Subcategories: ${categoryData?.subcategories.slice(0, 10).join(', ') || 'Not specified'}

Provide a structured category analysis:
{
  "categoryName": "string",
  "categoryType": "string",
  "targetMarket": "string",
  "productTypes": ["string"],
  "marketTrends": ["string"]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryContext');
  }

  // Category Task 2: Find category competitors
  async findCategoryCompetitors(websiteData, url, categoryData) {
    const prompt = `
Find competitors in the SAME PRODUCT CATEGORY with SIMILAR BUSINESS METRICS.

CRITICAL: Find competitors that match these key factors:
1. **REVENUE RANGE**: Similar annual revenue (within 2-3x range)
2. **CATEGORY**: Exact same product category
3. **SEGMENT**: Same market segment (B2B/B2C, enterprise/SMB, etc.)
4. **FUNDING STAGE**: Similar funding stage (startup/scale-up/enterprise)

Category Analysis:
- Category: ${categoryData?.categoryName || 'Unknown Category'}
- URL: ${url}
- Subcategories: ${categoryData?.subcategories.slice(0, 5).join(', ') || 'Not specified'}
- Target Market: ${categoryData?.targetMarket || 'Not specified'}

COMPETITOR SELECTION CRITERIA:
- **Revenue Match**: Find companies with similar revenue size in this category
- **Category Match**: Same product category and subcategories
- **Segment Match**: Same target market segment
- **Funding Match**: Similar funding stage and investment level
- **Geographic Match**: Same or similar geographic markets
- **Business Model Match**: Similar monetization and business model

SEARCH STRATEGY:
1. Search for "[Category] companies with similar revenue to [Category Name]"
2. Search for "[Category] competitors in [Segment] market"
3. Search for "[Category] companies with similar funding stage"
4. Look for companies in the same category with comparable metrics

EXAMPLES OF GOOD COMPETITORS:
- For SaaS categories: Other SaaS companies with similar ARR and funding
- For e-commerce categories: Other e-commerce companies with similar GMV and funding
- For fintech categories: Other fintech companies with similar transaction volume and funding

EXAMPLES OF BAD COMPETITORS (DO NOT INCLUDE):
- Companies in different revenue brackets
- Companies in different market segments
- Companies with vastly different funding stages
- Companies in different geographic markets

Use web search to find competitors offering similar product categories with comparable business metrics:

{
  "competitors": [
    {
      "name": "Competitor Company Name",
      "url": "https://competitor-website.com",
      "revenue": "Estimated annual revenue range",
      "category": "Product/service category",
      "segment": "Market segment (B2B/B2C, enterprise/SMB)",
      "funding": "Funding stage and amount",
      "reason": "Why they are a direct competitor (revenue, category, segment, funding match)",
      "similarity": "High/Medium/Low"
    }
  ]
}

Search for actual competitors with similar business metrics in this category.
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryCompetitors');
  }

  // Category Task 3: Extract category topics
  async extractCategoryTopics(websiteData, categoryData) {
    const prompt = `
Extract topics relevant to THIS PRODUCT CATEGORY that would be relevant for those type of users for whome products in this category have been made and who would show buying intent.

Category: ${categoryData?.categoryName || 'Unknown Category'}
Subcategories: ${categoryData?.subcategories.slice(0, 10).join(', ') || 'Not specified'}

Extract 8-10 short quality category-level topics

Example: if topic name should be short and crisp
{
  "topics": [
    {
      "name": "string",
      "description": "string",
      "keywords": ["string"],
      "priority": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryTopics');
  }

  // Category Task 4: Identify category personas
  async identifyCategoryPersonas(websiteData, categoryData) {
    const prompt = `
Identify personas interested in THIS PRODUCT CATEGORY.

Category: ${categoryData?.categoryName || 'Unknown Category'}

Identify 3-4 category-level personas:
{
  "personas": [
    {
      "type": "string",
      "description": "string",
      "painPoints": ["string"],
      "goals": ["string"],
      "relevance": "High/Medium/Low"
    }
  ]
}
`;

    return await this.callOpenRouter(prompt, 'perplexity/sonar', 'categoryPersonas');
  }

  // ===== UTILITY METHODS =====

  // Utility function to wait for a specified time
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Call OpenRouter API with error handling and retry logic
  async callOpenRouter(prompt, model = 'perplexity/sonar', analysisType = 'general', retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds base delay
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
        max_tokens: 2000
        // Note: Perplexity doesn't support response_format, relies on prompt instructions
      }, {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rankly.ai',
          'X-Title': process.env.OPENROUTER_APP_NAME || 'Rankly'
        },
        timeout: 300000 // 5 minutes timeout for LLM calls (some operations can take longer)
      });

      // Check if response structure is valid
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error(`❌ Invalid response structure for ${analysisType}:`, response.data);
        console.warn(`⚠️  Returning default response for ${analysisType}`);
        return this.getDefaultResponse(analysisType);
      }

      let content = response.data.choices[0].message.content;
      
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
        console.error(`❌ API returned error message instead of JSON for ${analysisType}:`, content);
        console.warn(`⚠️  Returning default response for ${analysisType}`);
        return this.getDefaultResponse(analysisType);
      }
      
      // Remove markdown code blocks if present (Perplexity sometimes wraps JSON)
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Parse JSON response
      try {
        const parsed = JSON.parse(content);
        console.log(`✅ Successfully parsed ${analysisType} analysis`);
        console.log(`   Raw data keys: ${Object.keys(parsed).join(', ')}`);
        const normalized = this.validateAndNormalizeResponse(parsed, analysisType);
        console.log(`   Normalized keys: ${Object.keys(normalized).join(', ')}`);
        if (analysisType === 'competitors') console.log(`   Competitors count: ${normalized.competitors?.length || 0}`);
        if (analysisType === 'topics') console.log(`   Topics count: ${normalized.topics?.length || 0}`);
        if (analysisType === 'personas') console.log(`   Personas count: ${normalized.personas?.length || 0}`);
        return normalized;
      } catch (parseError) {
        console.warn(`Failed to parse JSON for ${analysisType}:`, parseError.message);
        console.warn(`   Content preview: ${content.substring(0, 200)}...`);
        
        // Check if the content looks like an error message
        if (content.toLowerCase().includes('too many requests') || 
            content.toLowerCase().includes('rate limit') ||
            content.startsWith('Too many') ||
            content.startsWith('Rate limit')) {
          console.error(`❌ Detected rate limiting error in content for ${analysisType}:`, content.substring(0, 100));
          console.warn(`⚠️  Returning default response for ${analysisType}`);
          return this.getDefaultResponse(analysisType);
        }
        
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            console.log(`✅ Successfully extracted JSON from content`);
            return this.validateAndNormalizeResponse(extracted, analysisType);
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e.message);
          }
        }
        
        // Return default response on parse failure
        console.warn(`⚠️  Returning default response for ${analysisType}`);
        return this.getDefaultResponse(analysisType);
      }
      
    } catch (error) {
      console.error(`❌ OpenRouter API error (${model} - ${analysisType}):`, error.response?.data || error.message);
      console.error('   Full error:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        
        // Handle specific HTTP status codes with retry logic
        if (error.response.status === 429 && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`   Rate limit exceeded - retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await this.sleep(delay);
          return this.callOpenRouter(prompt, model, analysisType, retryCount + 1);
        } else if (error.response.status === 429) {
          console.error('   Rate limit exceeded - max retries reached, returning default response');
        } else if (error.response.status === 401) {
          console.error('   Unauthorized - check API key');
        } else if (error.response.status === 403) {
          console.error('   Forbidden - check API permissions');
        }
      }
      console.warn(`⚠️  Returning default response for ${analysisType}`);
      return this.getDefaultResponse(analysisType);
    }
  }

  // Validate and normalize response structure
  validateAndNormalizeResponse(data, analysisType) {
    switch (analysisType) {
      // Company-level
      case 'brandContext':
        return this.normalizeBrandContext(data);
      case 'competitors':
        return this.normalizeCompetitors(data);
      case 'topics':
        return this.normalizeTopics(data);
      case 'personas':
        return this.normalizePersonas(data);
      // Product-level
      case 'productContext':
        return this.normalizeProductContext(data);
      case 'productCompetitors':
        return this.normalizeCompetitors(data); // Same structure
      case 'productTopics':
        return this.normalizeTopics(data); // Same structure
      case 'productPersonas':
        return this.normalizePersonas(data); // Same structure
      // Category-level
      case 'categoryContext':
        return this.normalizeCategoryContext(data);
      case 'categoryCompetitors':
        return this.normalizeCompetitors(data); // Same structure
      case 'categoryTopics':
        return this.normalizeTopics(data); // Same structure
      case 'categoryPersonas':
        return this.normalizePersonas(data); // Same structure
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

  // Normalize product context response
  normalizeProductContext(data) {
    let companyName = data.companyName || data.company_name || 'Unknown Brand';
    let productName = data.productName || data.product_name || 'Unknown Product';
    // Ensure productName starts with brand if not already included
    if (
      companyName &&
      productName &&
      !productName.toLowerCase().startsWith(companyName.toLowerCase())
    ) {
      productName = `${companyName} ${productName}`;
    }
    return {
      companyName,
      productName,
      productCategory: data.productCategory || data.product_category || 'General',
      productType: data.productType || data.product_type || 'General',
      targetAudience: data.targetAudience || data.target_audience || 'General',
      valueProposition: data.valueProposition || data.value_proposition || 'Not specified',
      keyFeatures: Array.isArray(data.keyFeatures)
        ? data.keyFeatures
        : Array.isArray(data.key_features)
        ? data.key_features
        : Array.isArray(data.features)
        ? data.features
        : ['Feature'],
      useCases: Array.isArray(data.useCases)
        ? data.useCases
        : Array.isArray(data.use_cases)
        ? data.use_cases
        : ['Use case'],
      marketPosition: data.marketPosition || data.market_position || 'Mid-market',
    };
  }

  // Normalize category context response
  normalizeCategoryContext(data) {
    return {
      categoryName: data.categoryName || data.category_name || 'Unknown Category',
      categoryType: data.categoryType || data.category_type || 'General',
      targetMarket: data.targetMarket || data.target_market || 'General',
      productTypes: Array.isArray(data.productTypes) ? data.productTypes :
                    Array.isArray(data.product_types) ? data.product_types : ['Product'],
      marketTrends: Array.isArray(data.marketTrends) ? data.marketTrends :
                    Array.isArray(data.market_trends) ? data.market_trends : []
    };
  }

  // Get default response structure
  getDefaultResponse(analysisType) {
    switch (analysisType) {
      // Company-level defaults
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
      case 'productCompetitors':
      case 'categoryCompetitors':
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
      case 'productTopics':
      case 'categoryTopics':
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
      case 'productPersonas':
      case 'categoryPersonas':
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
      // Product-level defaults
      case 'productContext':
        return {
          companyName: 'Unknown Brand',
          productName: 'Unknown Product',
          productCategory: 'General',
          productType: 'General',
          targetAudience: 'General',
          valueProposition: 'Not specified',
          keyFeatures: ['Feature'],
          useCases: ['Use case'],
          marketPosition: 'Mid-market'
        };
      // Category-level defaults
      case 'categoryContext':
        return {
          categoryName: 'Unknown Category',
          categoryType: 'General',
          targetMarket: 'General',
          productTypes: ['Product'],
          marketTrends: []
        };
      default:
        return {};
    }
  }
}

module.exports = new WebsiteAnalysisService();
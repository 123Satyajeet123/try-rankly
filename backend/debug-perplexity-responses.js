/**
 * DEBUG SCRIPT: Perplexity Response Inspector
 * 
 * This will show us EXACTLY what Perplexity is returning
 * so we can fix the parsing/normalization logic
 */

const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1';

// Test data from Stripe scraping (simplified)
const websiteData = {
  title: "Stripe | Financial Infrastructure to Grow Your Revenue",
  description: "Stripe powers online and in-person payment processing and financial solutions for businesses of all sizes.",
  businessInfo: {
    companyName: "Stripe",
    tagline: "Financial infrastructure for the internet",
    services: ["Payment processing", "Billing", "Fraud prevention", "Banking"]
  },
  headings: {
    h1: ["Financial infrastructure for the internet"],
    h2: ["Accept payments", "Grow revenue", "Manage finances"],
    h3: []
  },
  paragraphs: [
    "Stripe is a financial infrastructure platform for businesses.",
    "Millions of companies use Stripe to accept payments, send payouts, and manage their businesses online."
  ]
};

async function testPerplexityAnalysis() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 PERPLEXITY API RESPONSE DEBUG');
  console.log('='.repeat(80));
  console.log(`\n🔑 API Key configured: ${OPENROUTER_API_KEY ? 'YES' : 'NO'}\n`);

  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in environment variables!');
    process.exit(1);
  }

  // Test 1: Brand Context
  await testAnalysisTask('BRAND CONTEXT', `
Analyze this website data and provide a comprehensive brand context analysis.

Website Data:
- URL: https://stripe.com
- Title: ${websiteData.title}
- Description: ${websiteData.description}
- Company Name: ${websiteData.businessInfo.companyName}
- Tagline: ${websiteData.businessInfo.tagline}
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
`);

  // Test 2: Competitors
  await testAnalysisTask('COMPETITORS', `
Based on this website analysis, identify the top 4-6 direct competitors in the same industry.

Website Analysis:
- Company: Stripe
- Industry: Financial Technology / Payment Processing
- Services: ${websiteData.businessInfo.services.join(', ')}

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
`);

  // Test 3: Topics
  await testAnalysisTask('TOPICS', `
Analyze this website content and extract the main topics and themes that would be relevant for content marketing and SEO.

Website Content:
- Title: ${websiteData.title}
- Business: Payment processing and financial infrastructure
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
`);

  // Test 4: Personas
  await testAnalysisTask('PERSONAS', `
Based on this website analysis, identify the key user personas that this business targets.

Website Analysis:
- Company: Stripe
- Industry: Payment Processing / Financial Technology
- Services: ${websiteData.businessInfo.services.join(', ')}

Identify 3-4 primary user personas:

{
  "personas": [
    {
      "type": "Persona Type (e.g., Developer, CTO, Product Manager)",
      "description": "Detailed description",
      "painPoints": ["pain point 1", "pain point 2"],
      "goals": ["goal 1", "goal 2"],
      "relevance": "High/Medium/Low"
    }
  ]
}
`);
}

async function testAnalysisTask(taskName, prompt) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 TESTING: ${taskName}`);
  console.log('='.repeat(80));
  
  try {
    console.log('\n📤 Sending request to Perplexity...');
    
    const response = await axios.post(`${BASE_URL}/chat/completions`, {
      model: 'perplexity/sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst. You MUST return ONLY valid JSON. No explanations, no markdown, no additional text. Just the JSON object.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rankly.ai',
        'X-Title': 'Rankly'
      },
      timeout: 60000
    });

    const content = response.data.choices[0].message.content;
    
    console.log('✅ Response received!');
    console.log('\n📄 RAW RESPONSE:');
    console.log('-'.repeat(80));
    console.log(content);
    console.log('-'.repeat(80));

    // Try to parse
    try {
      const parsed = JSON.parse(content);
      console.log('\n✅ JSON PARSING: SUCCESS');
      console.log('\n📊 PARSED DATA:');
      console.log(JSON.stringify(parsed, null, 2));
      
      // Check structure
      console.log('\n🔍 STRUCTURE CHECK:');
      console.log(`   Keys found: ${Object.keys(parsed).join(', ')}`);
      
      if (taskName === 'COMPETITORS') {
        console.log(`   Competitors array: ${Array.isArray(parsed.competitors) ? 'YES' : 'NO'}`);
        console.log(`   Number of competitors: ${parsed.competitors?.length || 0}`);
      } else if (taskName === 'TOPICS') {
        console.log(`   Topics array: ${Array.isArray(parsed.topics) ? 'YES' : 'NO'}`);
        console.log(`   Number of topics: ${parsed.topics?.length || 0}`);
      } else if (taskName === 'PERSONAS') {
        console.log(`   Personas array: ${Array.isArray(parsed.personas) ? 'YES' : 'NO'}`);
        console.log(`   Number of personas: ${parsed.personas?.length || 0}`);
      }
      
    } catch (parseError) {
      console.log('\n❌ JSON PARSING: FAILED');
      console.log(`   Error: ${parseError.message}`);
      
      // Try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('\n🔄 Attempting to extract JSON...');
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted JSON successfully:');
          console.log(JSON.stringify(extracted, null, 2));
        } catch (e) {
          console.log('❌ Extraction also failed:', e.message);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ API ERROR:', error.message);
    
    if (error.response) {
      console.error('\n📄 Error Response:');
      console.error(JSON.stringify(error.response.data, null, 2));
      console.error(`Status: ${error.response.status}`);
    }
  }
}

// Run the debug tests
if (require.main === module) {
  testPerplexityAnalysis()
    .then(() => {
      console.log('\n\n' + '='.repeat(80));
      console.log('✅ DEBUG COMPLETE');
      console.log('='.repeat(80));
      console.log('\nNext steps:');
      console.log('1. Review the responses above');
      console.log('2. Check if JSON structure matches expectations');
      console.log('3. Update normalization logic if needed\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}


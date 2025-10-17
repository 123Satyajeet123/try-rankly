const express = require('express');
const router = express.Router();
const devAuth = require('../middleware/devAuth');
const PromptTest = require('../models/PromptTest');
const UrlAnalysis = require('../models/UrlAnalysis');

/**
 * Test endpoint to debug citation data
 * GET /api/dashboard/citations/debug
 */
router.get('/debug', devAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get all prompt tests with brand metrics
    const promptTests = await PromptTest.find({
      userId,
      'brandMetrics': { $exists: true, $ne: [] }
    }).lean();
    
    const debugInfo = promptTests.map(test => ({
      id: test._id,
      brandNames: test.brandMetrics?.map(bm => bm.brandName) || [],
      hasCitations: test.brandMetrics?.some(bm => bm.citations && bm.citations.length > 0) || false,
      citationCount: test.brandMetrics?.reduce((total, bm) => total + (bm.citations?.length || 0), 0) || 0
    }));
    
    res.json({
      success: true,
      data: {
        totalPromptTests: promptTests.length,
        promptTestsWithBrandMetrics: promptTests.filter(t => t.brandMetrics && t.brandMetrics.length > 0).length,
        debugInfo: debugInfo.slice(0, 5) // Show first 5 for debugging
      }
    });
  } catch (error) {
    console.error('❌ Debug citations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug citations'
    });
  }
});

/**
 * Test endpoint to debug specific brand citations
 * GET /api/dashboard/citations/debug/:brandName
 */
router.get('/debug/:brandName', devAuth, async (req, res) => {
  try {
    const { brandName } = req.params;
    const userId = req.userId;
    
    console.log(`📊 [CITATIONS TEST] Testing brand: "${brandName}"`);
    
    // Get all prompt tests with brand metrics
    const allPromptTests = await PromptTest.find({
      userId,
      'brandMetrics.brandName': new RegExp(brandName, 'i')
    }).lean();
    
    console.log(`📊 [CITATIONS TEST] Found ${allPromptTests.length} prompt tests with brand "${brandName}"`);
    
    const testResults = allPromptTests.map(test => {
      const matchingBrands = test.brandMetrics?.filter(bm => 
        bm.brandName && bm.brandName.toLowerCase().includes(brandName.toLowerCase())
      ) || [];
      
      return {
        id: test._id,
        matchingBrands: matchingBrands.map(bm => ({
          brandName: bm.brandName,
          hasCitations: bm.citations && bm.citations.length > 0,
          citationCount: bm.citations?.length || 0,
          citations: bm.citations?.map(c => c.url) || []
        }))
      };
    });
    
    res.json({
      success: true,
      data: {
        brandName,
        totalPromptTests: allPromptTests.length,
        testResults: testResults.slice(0, 3) // Show first 3 for debugging
      }
    });
  } catch (error) {
    console.error('❌ Test citations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test citations'
    });
  }
});

/**
 * Get detailed citations for a specific brand and type
 * GET /api/dashboard/citations/:brandName/:type
 */
router.get('/:brandName/:type', devAuth, async (req, res) => {
  try {
    console.log(`🚀 [CITATIONS] Route hit! Params:`, req.params);
    const { brandName, type } = req.params;
    const userId = req.userId;

    console.log(`📊 [CITATIONS] Fetching ${type} citations for ${brandName}, User: ${userId}`);

    // Get the latest URL analysis for the user
    const urlAnalysis = await UrlAnalysis.findOne({ userId })
      .sort({ analysisDate: -1 })
      .lean();

    if (!urlAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No URL analysis found for user'
      });
    }

    // Build query to find prompt tests with citations for this brand
    console.log(`📊 [CITATIONS] Query params: userId=${userId}, urlAnalysisId=${urlAnalysis._id}, brandName="${brandName}"`);
    
    // First, let's try a simpler query to see if we can find the documents
    const allPromptTests = await PromptTest.find({
      userId,
      urlAnalysisId: urlAnalysis._id,
      'brandMetrics.brandName': new RegExp(brandName, 'i')
    }).lean();
    
    console.log(`📊 [CITATIONS] Found ${allPromptTests.length} prompt tests with brand "${brandName}"`);
    
    // Filter for documents that actually have citations
    const promptTests = allPromptTests.filter(test => {
      const hasMatchingBrand = test.brandMetrics?.some(bm => {
        const brandMatches = bm.brandName && bm.brandName.toLowerCase().includes(brandName.toLowerCase());
        const hasCitations = bm.citations && bm.citations.length > 0;
        console.log(`📊 [CITATIONS] Brand: "${bm.brandName}", Matches: ${brandMatches}, HasCitations: ${hasCitations}`);
        return brandMatches && hasCitations;
      });
      return hasMatchingBrand;
    });
    
    console.log(`📊 [CITATIONS] Found ${promptTests.length} prompt tests with citations for brand "${brandName}"`);

    console.log(`📊 [CITATIONS] Found ${promptTests.length} prompt tests with ${type} citations`);
    console.log(`📊 [CITATIONS] Brand name: "${brandName}", Type: "${type}"`);
    
    if (promptTests.length > 0) {
      console.log(`📊 [CITATIONS] Sample prompt test:`, JSON.stringify(promptTests[0]?.brandMetrics, null, 2));
    } else {
      console.log(`📊 [CITATIONS] No prompt tests found. Let me check without the citations filter...`);
      
      // Try without the citations filter to see if we can find the brand
      const promptTestsWithoutCitationFilter = await PromptTest.find({
        userId,
        urlAnalysisId: urlAnalysis._id,
        'brandMetrics.brandName': new RegExp(brandName, 'i')
      }).lean();
      
      console.log(`📊 [CITATIONS] Found ${promptTestsWithoutCitationFilter.length} prompt tests with brand "${brandName}"`);
      if (promptTestsWithoutCitationFilter.length > 0) {
        console.log(`📊 [CITATIONS] Sample brand metrics:`, JSON.stringify(promptTestsWithoutCitationFilter[0]?.brandMetrics, null, 2));
      }
    }

    // For now, let's return a simple test response to see if the endpoint is working
    res.json({
      success: true,
      data: {
        brandName,
        type,
        details: [
          {
            url: "https://www.nerdwallet.com/credit-cards/best/travel",
            platforms: ["perplexity"],
            prompts: [
              {
                promptText: "What are the top credit cards for premium travel perks in 2025?",
                llmProvider: "perplexity",
                createdAt: new Date()
              }
            ]
          },
          {
            url: "https://thepointsguy.com/credit-cards/best-premium-travel-rewards-cards/",
            platforms: ["perplexity"],
            prompts: [
              {
                promptText: "What are the top credit cards for premium travel perks in 2025?",
                llmProvider: "perplexity",
                createdAt: new Date()
              }
            ]
          }
        ]
      }
    });

    return; // Early return for testing

    // Extract and group citations by URL
    const citationGroups = {};
    
    // Helper function to extract URLs from raw response
    const extractUrlsFromResponse = (rawResponse) => {
      const urlRegex = /https?:\/\/[^\s\)\]\}]+\b/g;
      return rawResponse.match(urlRegex) || [];
    };

    // Helper function to map citation references to URLs
    const mapCitationReferencesToUrls = (rawResponse, citationRefs) => {
      const urls = extractUrlsFromResponse(rawResponse);
      console.log(`📊 [CITATIONS] Extracted URLs from response:`, urls);
      console.log(`📊 [CITATIONS] Citation refs to map:`, citationRefs);
      
      const mappedCitations = [];
      
      citationRefs.forEach(ref => {
        // Try to extract citation number from reference like "citation_2"
        const match = ref.match(/citation_(\d+)/);
        if (match) {
          const citationNum = parseInt(match[1]);
          console.log(`📊 [CITATIONS] Mapping citation_${citationNum} to URL index ${citationNum - 1}`);
          
          // Map citation number to URL index (citation_1 = first URL, citation_2 = second URL, etc.)
          if (citationNum <= urls.length) {
            const mappedUrl = urls[citationNum - 1];
            console.log(`📊 [CITATIONS] Mapped citation_${citationNum} to: ${mappedUrl}`);
            mappedCitations.push(mappedUrl);
          } else {
            console.log(`📊 [CITATIONS] Citation_${citationNum} exceeds URL count (${urls.length}), using fallback`);
            // Fallback to original reference if no URL found
            mappedCitations.push(ref);
          }
        } else if (ref.startsWith('http')) {
          // Already a URL
          console.log(`📊 [CITATIONS] Already a URL: ${ref}`);
          mappedCitations.push(ref);
        } else {
          // Fallback to original reference
          console.log(`📊 [CITATIONS] Unknown reference format: ${ref}`);
          mappedCitations.push(ref);
        }
      });
      
      console.log(`📊 [CITATIONS] Final mapped citations:`, mappedCitations);
      return mappedCitations;
    };
    
    promptTests.forEach(test => {
      // Find brand metrics for the requested brand
      const brandMetric = test.brandMetrics?.find(bm => 
        bm.brandName && bm.brandName.toLowerCase().includes(brandName.toLowerCase())
      );
      
      if (brandMetric && brandMetric.citations) {
        // Filter citations by type
        const filteredCitations = brandMetric.citations.filter(citation => 
          citation.type === type.toLowerCase()
        );
        
        if (filteredCitations.length > 0) {
          // Map citation references to actual URLs
          const citationUrls = mapCitationReferencesToUrls(test.rawResponse, 
            filteredCitations.map(c => c.url)
          );
          
          citationUrls.forEach(url => {
            if (!citationGroups[url]) {
              citationGroups[url] = {
                url: url,
                platforms: new Set(),
                prompts: []
              };
            }
            
            // Add platform
            citationGroups[url].platforms.add(test.llmProvider);
            
            // Add prompt
            citationGroups[url].prompts.push({
              promptText: test.promptText,
              llmProvider: test.llmProvider,
              createdAt: test.createdAt
            });
          });
        }
      }
    });

    // Convert to array format expected by frontend
    const citationDetails = Object.values(citationGroups).map(group => ({
      url: group.url,
      platforms: Array.from(group.platforms),
      prompts: group.prompts
    }));

    console.log(`✅ [CITATIONS] Returning ${citationDetails.length} citation groups`);

    res.json({
      success: true,
      data: {
        brandName,
        type,
        details: citationDetails
      }
    });

  } catch (error) {
    console.error('❌ Get citation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get citation details'
    });
  }
});

module.exports = router;

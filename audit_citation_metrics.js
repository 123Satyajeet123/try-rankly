/**
 * Citation Metrics Audit Script
 * User ID: 690c6a8846e7547328bd8408
 * URL Analysis ID: 690c857fb1979e03f1b14579
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const UrlAnalysis = require('./backend/src/models/UrlAnalysis');
const Competitor = require('./backend/src/models/Competitor');
const PromptTest = require('./backend/src/models/PromptTest');

const userId = '690c6a8846e7547328bd8408';
const urlAnalysisId = '690c857fb1979e03f1b14579';

async function auditCitationMetrics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Get URL Analysis
    const urlAnalysis = await UrlAnalysis.findById(urlAnalysisId);
    if (!urlAnalysis) {
      throw new Error('URL Analysis not found');
    }

    const expectedBrand = urlAnalysis.brandContext?.companyName || 'Unknown Brand';
    console.log('📋 EXPECTED BRAND:', expectedBrand);
    console.log('');

    // 2. Get Selected Competitors
    const competitors = await Competitor.find({
      userId,
      urlAnalysisId,
      selected: true
    });

    const expectedCompetitors = competitors.map(c => c.name);
    console.log('📋 EXPECTED COMPETITORS (Selected):');
    expectedCompetitors.forEach((comp, idx) => {
      console.log(`   ${idx + 1}. ${comp}`);
    });
    console.log('');

    // 3. Get All Prompt Tests
    const promptTests = await PromptTest.find({
      userId,
      urlAnalysisId
    });

    console.log(`📊 Total Prompt Tests: ${promptTests.length}`);
    console.log('');

    // 4. Analyze Citation Extraction and Categorization
    const citationStats = {
      totalCitations: 0,
      byType: { brand: 0, earned: 0, social: 0, unknown: 0 },
      byBrand: new Map(),
      urlSet: new Set(),
      invalidUrls: [],
      categorizationIssues: []
    };

    const allExpectedBrands = [expectedBrand, ...expectedCompetitors];
    
    // Initialize brand citation counters
    allExpectedBrands.forEach(brand => {
      citationStats.byBrand.set(brand, {
        brand: 0,
        earned: 0,
        social: 0,
        total: 0,
        urls: new Set(),
        invalidCategorizations: []
      });
    });

    promptTests.forEach((test, testIdx) => {
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          const brandName = bm.brandName;
          
          // Only process expected brands
          if (!allExpectedBrands.includes(brandName)) {
            return;
          }

          const brandStats = citationStats.byBrand.get(brandName);
          if (!brandStats) {
            citationStats.byBrand.set(brandName, {
              brand: 0,
              earned: 0,
              social: 0,
              total: 0,
              urls: new Set(),
              invalidCategorizations: []
            });
          }

          const stats = citationStats.byBrand.get(brandName);

          // Process citations array
          if (bm.citations && Array.isArray(bm.citations)) {
            bm.citations.forEach(citation => {
              if (!citation || !citation.url) {
                citationStats.categorizationIssues.push({
                  test: testIdx,
                  brand: brandName,
                  issue: 'Citation missing URL',
                  citation
                });
                return;
              }

              const url = citation.url;
              const type = citation.type;
              const confidence = citation.confidence || 0.8;

              // Track unique URLs
              citationStats.urlSet.add(url);
              stats.urls.add(url);

              // Validate citation type
              const validTypes = ['brand', 'earned', 'social'];
              if (!validTypes.includes(type)) {
                citationStats.categorizationIssues.push({
                  test: testIdx,
                  brand: brandName,
                  issue: `Invalid citation type: ${type}`,
                  url,
                  citation
                });
                citationStats.byType.unknown++;
                return;
              }

              // Count citations with confidence weighting
              const typeWeight = type === 'brand' ? 1.0 : type === 'earned' ? 0.9 : 0.8;
              const weightedCount = confidence * typeWeight;

              stats[type] += weightedCount;
              stats.total += weightedCount;
              citationStats.byType[type] += weightedCount;
              citationStats.totalCitations += weightedCount;

              // Check for potential false positive brand citations
              if (type === 'brand') {
                // Check if URL domain matches brand name
                try {
                  const urlObj = new URL(url);
                  const domain = urlObj.hostname.toLowerCase();
                  const brandLower = brandName.toLowerCase();
                  
                  // Basic check: domain should contain brand name (or abbreviation)
                  const brandWords = brandLower.split(/\s+/).filter(w => w.length > 3);
                  const domainContainsBrand = brandWords.some(word => 
                    domain.includes(word.toLowerCase().replace(/[^a-z0-9]/g, ''))
                  );

                  if (!domainContainsBrand && domain.length > 5) {
                    citationStats.categorizationIssues.push({
                      test: testIdx,
                      brand: brandName,
                      issue: 'Potential false positive brand citation - domain does not match brand',
                      url,
                      domain,
                      citation
                    });
                  }
                } catch (e) {
                  citationStats.invalidUrls.push({ url, error: e.message });
                }
              }
            });
          }

          // Also check citationMetrics (fallback)
          if (bm.citationMetrics) {
            const cm = bm.citationMetrics;
            if (cm.brandCitations) stats.brand += cm.brandCitations;
            if (cm.earnedCitations) stats.earned += cm.earnedCitations;
            if (cm.socialCitations) stats.social += cm.socialCitations;
            stats.total += (cm.brandCitations || 0) + (cm.earnedCitations || 0) + (cm.socialCitations || 0);
          }
        });
      }
    });

    // 5. Calculate Citation Share
    console.log('📊 CITATION STATISTICS:');
    console.log('─'.repeat(80));
    console.log(`Total Citations (weighted): ${citationStats.totalCitations.toFixed(2)}`);
    console.log(`Unique URLs: ${citationStats.urlSet.size}`);
    console.log('');
    console.log('By Type:');
    console.log(`  Brand: ${citationStats.byType.brand.toFixed(2)} (${((citationStats.byType.brand / citationStats.totalCitations) * 100).toFixed(2)}%)`);
    console.log(`  Earned: ${citationStats.byType.earned.toFixed(2)} (${((citationStats.byType.earned / citationStats.totalCitations) * 100).toFixed(2)}%)`);
    console.log(`  Social: ${citationStats.byType.social.toFixed(2)} (${((citationStats.byType.social / citationStats.totalCitations) * 100).toFixed(2)}%)`);
    console.log(`  Unknown: ${citationStats.byType.unknown}`);
    console.log('');

    // 6. Citation Share by Brand
    console.log('📈 CITATION SHARE BY BRAND:');
    console.log('─'.repeat(80));
    
    const sortedBrands = Array.from(citationStats.byBrand.entries())
      .sort((a, b) => b[1].total - a[1].total);

    sortedBrands.forEach(([brandName, stats]) => {
      const citationShare = citationStats.totalCitations > 0
        ? ((stats.total / citationStats.totalCitations) * 100).toFixed(2)
        : '0.00';
      
      const isExpected = allExpectedBrands.includes(brandName);
      const status = isExpected ? '✅ EXPECTED' : '❌ UNEXPECTED';
      
      console.log(`${brandName}: ${status}`);
      console.log(`  Total Citations: ${stats.total.toFixed(2)}`);
      console.log(`  Citation Share: ${citationShare}%`);
      console.log(`  Breakdown:`);
      console.log(`    Brand: ${stats.brand.toFixed(2)}`);
      console.log(`    Earned: ${stats.earned.toFixed(2)}`);
      console.log(`    Social: ${stats.social.toFixed(2)}`);
      console.log(`  Unique URLs: ${stats.urls.size}`);
      console.log('');
    });

    // 7. Check for Issues
    if (citationStats.categorizationIssues.length > 0) {
      console.log('⚠️  CITATION CATEGORIZATION ISSUES:');
      console.log('─'.repeat(80));
      citationStats.categorizationIssues.slice(0, 10).forEach((issue, idx) => {
        console.log(`${idx + 1}. Test ${issue.test}, Brand: ${issue.brand}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.url) console.log(`   URL: ${issue.url}`);
        if (issue.domain) console.log(`   Domain: ${issue.domain}`);
        console.log('');
      });
      if (citationStats.categorizationIssues.length > 10) {
        console.log(`   ... and ${citationStats.categorizationIssues.length - 10} more issues`);
      }
    } else {
      console.log('✅ No citation categorization issues found');
    }

    if (citationStats.invalidUrls.length > 0) {
      console.log('⚠️  INVALID URLs:');
      console.log('─'.repeat(80));
      citationStats.invalidUrls.slice(0, 5).forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.url}`);
        console.log(`   Error: ${item.error}`);
        console.log('');
      });
    }

    // 8. Verify Citation Share Calculation
    console.log('🔍 CITATION SHARE VERIFICATION:');
    console.log('─'.repeat(80));
    console.log('Formula: Citation Share = (Brand citations / Total citations of all brands) × 100');
    console.log('');
    
    const totalCitationsAllBrands = Array.from(citationStats.byBrand.values())
      .reduce((sum, stats) => sum + stats.total, 0);
    
    console.log(`Total citations across all brands: ${totalCitationsAllBrands.toFixed(2)}`);
    console.log('');
    
    sortedBrands.forEach(([brandName, stats]) => {
      const calculatedShare = totalCitationsAllBrands > 0
        ? ((stats.total / totalCitationsAllBrands) * 100).toFixed(2)
        : '0.00';
      console.log(`${brandName}: ${calculatedShare}% (${stats.total.toFixed(2)} / ${totalCitationsAllBrands.toFixed(2)})`);
    });

    // 9. Summary
    console.log('\n📊 AUDIT SUMMARY:');
    console.log('─'.repeat(80));
    console.log(`Total Citations: ${citationStats.totalCitations.toFixed(2)}`);
    console.log(`Unique URLs: ${citationStats.urlSet.size}`);
    console.log(`Categorization Issues: ${citationStats.categorizationIssues.length}`);
    console.log(`Invalid URLs: ${citationStats.invalidUrls.length}`);
    console.log(`Brands with Citations: ${citationStats.byBrand.size}`);
    
    const unexpectedBrands = Array.from(citationStats.byBrand.keys())
      .filter(b => !allExpectedBrands.includes(b));
    
    if (unexpectedBrands.length > 0) {
      console.log(`\n❌ Unexpected brands with citations: ${unexpectedBrands.length}`);
      unexpectedBrands.forEach(b => console.log(`   - ${b}`));
    } else {
      console.log('\n✅ All citations belong to expected brands');
    }

    await mongoose.disconnect();
    console.log('\n✅ Audit complete');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

auditCitationMetrics();


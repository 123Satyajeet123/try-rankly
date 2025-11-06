/**
 * System Audit Script for Brand and Competitor Extraction
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

async function auditBrandExtraction() {
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

    // 4. Analyze Brand Extraction
    const detectedBrands = new Map();
    const brandMentionCounts = new Map();
    
    promptTests.forEach(test => {
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          const brandName = bm.brandName;
          if (!detectedBrands.has(brandName)) {
            detectedBrands.set(brandName, {
              name: brandName,
              isOwner: bm.isOwner || false,
              isExpectedBrand: brandName === expectedBrand,
              isExpectedCompetitor: expectedCompetitors.includes(brandName),
              isUnexpected: brandName !== expectedBrand && !expectedCompetitors.includes(brandName),
              mentionCount: 0,
              testCount: 0
            });
          }
          
          const brandData = detectedBrands.get(brandName);
          if (bm.mentioned) {
            brandData.mentionCount += bm.mentionCount || 1;
            brandData.testCount += 1;
          }
        });
      }
    });

    console.log('🔍 DETECTED BRANDS IN PROMPT TESTS:');
    console.log('─'.repeat(80));
    
    const sortedBrands = Array.from(detectedBrands.values()).sort((a, b) => b.testCount - a.testCount);
    
    sortedBrands.forEach((brand, idx) => {
      const status = brand.isExpectedBrand ? '✅ EXPECTED (User Brand)' :
                     brand.isExpectedCompetitor ? '✅ EXPECTED (Competitor)' :
                     '❌ UNEXPECTED (False Positive)';
      
      console.log(`${idx + 1}. ${brand.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Mentioned in ${brand.testCount} tests`);
      console.log(`   Total mentions: ${brand.mentionCount}`);
      console.log('');
    });

    // 5. Calculate Visibility Scores
    console.log('📈 VISIBILITY SCORE CALCULATION:');
    console.log('─'.repeat(80));
    console.log(`Total Tests: ${promptTests.length}`);
    console.log('');

    const allExpectedBrands = [expectedBrand, ...expectedCompetitors];
    
    allExpectedBrands.forEach(brandName => {
      const brandData = detectedBrands.get(brandName);
      const testsWithBrand = brandData ? brandData.testCount : 0;
      const visibilityScore = promptTests.length > 0 
        ? ((testsWithBrand / promptTests.length) * 100).toFixed(2)
        : '0.00';
      
      const status = brandData ? '✅ Found' : '❌ Not Found';
      console.log(`${brandName}:`);
      console.log(`   Status: ${status}`);
      console.log(`   Tests with brand: ${testsWithBrand} / ${promptTests.length}`);
      console.log(`   Visibility Score: ${visibilityScore}%`);
      console.log('');
    });

    // 6. Check for False Positives
    const falsePositives = sortedBrands.filter(b => b.isUnexpected);
    if (falsePositives.length > 0) {
      console.log('⚠️  FALSE POSITIVES DETECTED:');
      console.log('─'.repeat(80));
      falsePositives.forEach((fp, idx) => {
        console.log(`${idx + 1}. ${fp.name} (mentioned in ${fp.testCount} tests)`);
      });
      console.log('');
      console.log('❌ ISSUE: Brand extraction is detecting brands that are NOT in the expected list!');
      console.log('   This will cause incorrect visibility scores.');
    } else {
      console.log('✅ No false positives detected');
    }

    // 7. Summary
    console.log('\n📊 AUDIT SUMMARY:');
    console.log('─'.repeat(80));
    console.log(`Expected Brand: ${expectedBrand}`);
    console.log(`Expected Competitors: ${expectedCompetitors.length}`);
    console.log(`Total Detected Brands: ${detectedBrands.size}`);
    console.log(`False Positives: ${falsePositives.length}`);
    console.log(`Total Tests: ${promptTests.length}`);
    
    const expectedBrandFound = detectedBrands.has(expectedBrand);
    const allCompetitorsFound = expectedCompetitors.every(c => detectedBrands.has(c));
    
    console.log('');
    console.log('✅ Expected brand found:', expectedBrandFound ? 'YES' : 'NO');
    console.log('✅ All competitors found:', allCompetitorsFound ? 'YES' : 'NO');
    console.log('✅ No false positives:', falsePositives.length === 0 ? 'YES' : 'NO');

    await mongoose.disconnect();
    console.log('\n✅ Audit complete');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

auditBrandExtraction();


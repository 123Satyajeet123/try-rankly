/**
 * Comprehensive System Verification Script
 * User ID: 690c6a8846e7547328bd8408
 * URL Analysis ID: 690c857fb1979e03f1b14579
 * 
 * This script verifies:
 * 1. Data structure and completeness
 * 2. Brand extraction accuracy
 * 3. Visibility score calculations
 * 4. Citation metrics accuracy
 * 5. Data isolation (urlAnalysisId)
 * 6. Metrics consistency
 */

const mongoose = require('mongoose');
require('dotenv').config();

const UrlAnalysis = require('./backend/src/models/UrlAnalysis');
const Competitor = require('./backend/src/models/Competitor');
const PromptTest = require('./backend/src/models/PromptTest');
const AggregatedMetrics = require('./backend/src/models/AggregatedMetrics');

const userId = '690c6a8846e7547328bd8408';
const urlAnalysisId = '690c857fb1979e03f1b14579';

async function comprehensiveVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    console.log('='.repeat(80));
    console.log('🔍 COMPREHENSIVE SYSTEM VERIFICATION');
    console.log('='.repeat(80));
    console.log(`User ID: ${userId}`);
    console.log(`URL Analysis ID: ${urlAnalysisId}`);
    console.log('='.repeat(80));
    console.log('');

    // ==========================================
    // 1. VERIFY URL ANALYSIS DATA
    // ==========================================
    console.log('📋 STEP 1: VERIFYING URL ANALYSIS DATA');
    console.log('─'.repeat(80));
    
    const urlAnalysis = await UrlAnalysis.findById(urlAnalysisId);
    if (!urlAnalysis) {
      throw new Error(`URL Analysis ${urlAnalysisId} not found`);
    }

    const expectedBrand = urlAnalysis.brandContext?.companyName || 'Unknown Brand';
    console.log(`✅ URL Analysis found: ${urlAnalysis.url}`);
    console.log(`✅ Expected Brand: ${expectedBrand}`);
    console.log(`✅ Analysis Level: ${urlAnalysis.analysisLevel || 'N/A'}`);
    console.log(`✅ Status: ${urlAnalysis.status || 'N/A'}`);
    console.log('');

    // ==========================================
    // 2. VERIFY COMPETITORS
    // ==========================================
    console.log('📋 STEP 2: VERIFYING COMPETITORS');
    console.log('─'.repeat(80));
    
    const allCompetitors = await Competitor.find({
      userId,
      urlAnalysisId
    });

    const selectedCompetitors = allCompetitors.filter(c => c.selected);
    const unselectedCompetitors = allCompetitors.filter(c => !c.selected);

    console.log(`✅ Total Competitors: ${allCompetitors.length}`);
    console.log(`✅ Selected Competitors: ${selectedCompetitors.length}`);
    console.log(`⚠️  Unselected Competitors: ${unselectedCompetitors.length}`);
    console.log('');

    console.log('Selected Competitors:');
    selectedCompetitors.forEach((comp, idx) => {
      console.log(`   ${idx + 1}. ${comp.name} (${comp.url || 'No URL'})`);
    });
    console.log('');

    const expectedBrands = [expectedBrand, ...selectedCompetitors.map(c => c.name)];
    console.log(`✅ Expected Brands List: ${expectedBrands.length} brands`);
    expectedBrands.forEach((brand, idx) => {
      console.log(`   ${idx + 1}. ${brand}`);
    });
    console.log('');

    // ==========================================
    // 3. VERIFY PROMPT TESTS
    // ==========================================
    console.log('📋 STEP 3: VERIFYING PROMPT TESTS');
    console.log('─'.repeat(80));
    
    const promptTests = await PromptTest.find({
      userId,
      urlAnalysisId,
      status: 'completed'
    }).lean();

    console.log(`✅ Total Completed Tests: ${promptTests.length}`);
    
    if (promptTests.length === 0) {
      console.log('⚠️  WARNING: No completed tests found!');
      console.log('   This may indicate tests are still running or failed.');
      return;
    }

    // Verify data isolation
    const testsWithWrongAnalysis = await PromptTest.find({
      userId,
      status: 'completed',
      urlAnalysisId: { $ne: urlAnalysisId }
    }).countDocuments();

    if (testsWithWrongAnalysis > 0) {
      console.log(`⚠️  WARNING: Found ${testsWithWrongAnalysis} tests from other analyses`);
      console.log('   This may indicate data isolation issues.');
    } else {
      console.log('✅ Data Isolation: All tests belong to this analysis');
    }
    console.log('');

    // Test distribution by LLM provider
    const providerCounts = {};
    promptTests.forEach(test => {
      providerCounts[test.llmProvider] = (providerCounts[test.llmProvider] || 0) + 1;
    });
    
    console.log('Test Distribution by LLM Provider:');
    Object.entries(providerCounts).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count} tests`);
    });
    console.log('');

    // ==========================================
    // 4. VERIFY BRAND EXTRACTION
    // ==========================================
    console.log('📋 STEP 4: VERIFYING BRAND EXTRACTION');
    console.log('─'.repeat(80));
    
    const detectedBrands = new Map();
    const brandMentionStats = new Map();
    
    promptTests.forEach(test => {
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          const brandName = bm.brandName;
          
          if (!detectedBrands.has(brandName)) {
            detectedBrands.set(brandName, {
              name: brandName,
              isExpected: expectedBrands.includes(brandName),
              isOwner: bm.isOwner || false,
              mentionCount: 0,
              testCount: 0,
              totalMentions: 0
            });
          }
          
          const stats = detectedBrands.get(brandName);
          if (bm.mentioned) {
            stats.testCount += 1;
            stats.totalMentions += bm.mentionCount || 1;
            stats.mentionCount += bm.mentionCount || 1;
          }
        });
      }
    });

    console.log(`✅ Total Brands Detected: ${detectedBrands.size}`);
    console.log('');

    const sortedBrands = Array.from(detectedBrands.values())
      .sort((a, b) => b.testCount - a.testCount);

    console.log('Brand Detection Summary:');
    sortedBrands.forEach((brand, idx) => {
      const status = brand.isExpected 
        ? (brand.isOwner ? '✅ EXPECTED (User Brand)' : '✅ EXPECTED (Competitor)')
        : '❌ UNEXPECTED (False Positive)';
      
      console.log(`${idx + 1}. ${brand.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Mentioned in: ${brand.testCount} tests`);
      console.log(`   Total mentions: ${brand.totalMentions}`);
      console.log('');
    });

    const falsePositives = sortedBrands.filter(b => !b.isExpected);
    if (falsePositives.length > 0) {
      console.log(`❌ ISSUE: Found ${falsePositives.length} false positive brands!`);
      falsePositives.forEach(fp => {
        console.log(`   - ${fp.name} (mentioned in ${fp.testCount} tests)`);
      });
      console.log('');
    } else {
      console.log('✅ No false positive brands detected');
      console.log('');
    }

    // ==========================================
    // 5. VERIFY VISIBILITY SCORES
    // ==========================================
    console.log('📋 STEP 5: VERIFYING VISIBILITY SCORES');
    console.log('─'.repeat(80));
    
    console.log(`Total Tests: ${promptTests.length}`);
    console.log('');

    const visibilityCalculations = {};
    
    expectedBrands.forEach(brandName => {
      const brandStats = detectedBrands.get(brandName);
      const testsWithBrand = brandStats ? brandStats.testCount : 0;
      const calculatedVisibility = promptTests.length > 0
        ? ((testsWithBrand / promptTests.length) * 100).toFixed(2)
        : '0.00';
      
      visibilityCalculations[brandName] = {
        testsWithBrand,
        totalTests: promptTests.length,
        calculatedVisibility: parseFloat(calculatedVisibility),
        found: !!brandStats
      };
      
      console.log(`${brandName}:`);
      console.log(`   Tests with brand: ${testsWithBrand} / ${promptTests.length}`);
      console.log(`   Calculated Visibility: ${calculatedVisibility}%`);
      console.log(`   Status: ${brandStats ? '✅ Found' : '❌ Not Found'}`);
      console.log('');
    });

    // ==========================================
    // 6. VERIFY CITATION METRICS
    // ==========================================
    console.log('📋 STEP 6: VERIFYING CITATION METRICS');
    console.log('─'.repeat(80));
    
    const citationStats = {
      byBrand: new Map(),
      byType: { brand: 0, earned: 0, social: 0 },
      total: 0,
      uniqueUrls: new Set(),
      issues: []
    };

    expectedBrands.forEach(brand => {
      citationStats.byBrand.set(brand, {
        brand: 0,
        earned: 0,
        social: 0,
        total: 0,
        urls: new Set()
      });
    });

    promptTests.forEach((test, testIdx) => {
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          const brandName = bm.brandName;
          
          // Only process expected brands
          if (!expectedBrands.includes(brandName)) {
            return;
          }

          const stats = citationStats.byBrand.get(brandName);
          if (!stats) return;

          // Process citations array
          if (bm.citations && Array.isArray(bm.citations)) {
            bm.citations.forEach(citation => {
              if (!citation || !citation.url) {
                citationStats.issues.push({
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

              citationStats.uniqueUrls.add(url);
              stats.urls.add(url);

              const validTypes = ['brand', 'earned', 'social'];
              if (!validTypes.includes(type)) {
                citationStats.issues.push({
                  test: testIdx,
                  brand: brandName,
                  issue: `Invalid citation type: ${type}`,
                  url
                });
                return;
              }

              // Count with confidence weighting
              const typeWeight = type === 'brand' ? 1.0 : type === 'earned' ? 0.9 : 0.8;
              const weightedCount = confidence * typeWeight;

              stats[type] += weightedCount;
              stats.total += weightedCount;
              citationStats.byType[type] += weightedCount;
              citationStats.total += weightedCount;

              // Check for false positive brand citations
              if (type === 'brand') {
                try {
                  const urlObj = new URL(url);
                  const domain = urlObj.hostname.toLowerCase();
                  const brandLower = brandName.toLowerCase();
                  
                  const brandWords = brandLower.split(/\s+/).filter(w => w.length > 3);
                  const domainContainsBrand = brandWords.some(word => 
                    domain.includes(word.toLowerCase().replace(/[^a-z0-9]/g, ''))
                  );

                  if (!domainContainsBrand && domain.length > 5) {
                    citationStats.issues.push({
                      test: testIdx,
                      brand: brandName,
                      issue: 'Potential false positive brand citation - domain does not match brand',
                      url,
                      domain
                    });
                  }
                } catch (e) {
                  citationStats.issues.push({
                    test: testIdx,
                    brand: brandName,
                    issue: `Invalid URL format: ${e.message}`,
                    url
                  });
                }
              }
            });
          }

          // Also check citationMetrics
          if (bm.citationMetrics) {
            const cm = bm.citationMetrics;
            // Note: citationMetrics might be pre-calculated, so we'll verify consistency
            const actualBrand = bm.citations?.filter(c => c.type === 'brand' && c.brand === brandName).length || 0;
            const actualEarned = bm.citations?.filter(c => c.type === 'earned').length || 0;
            const actualSocial = bm.citations?.filter(c => c.type === 'social').length || 0;
            
            if (cm.brandCitations !== actualBrand || cm.earnedCitations !== actualEarned || cm.socialCitations !== actualSocial) {
              citationStats.issues.push({
                test: testIdx,
                brand: brandName,
                issue: 'Citation metrics mismatch',
                citationMetrics: cm,
                actual: { brand: actualBrand, earned: actualEarned, social: actualSocial }
              });
            }
          }
        });
      }
    });

    console.log(`Total Citations (weighted): ${citationStats.total.toFixed(2)}`);
    console.log(`Unique URLs: ${citationStats.uniqueUrls.size}`);
    console.log('');
    console.log('By Type:');
    console.log(`  Brand: ${citationStats.byType.brand.toFixed(2)} (${((citationStats.byType.brand / citationStats.total) * 100).toFixed(2)}%)`);
    console.log(`  Earned: ${citationStats.byType.earned.toFixed(2)} (${((citationStats.byType.earned / citationStats.total) * 100).toFixed(2)}%)`);
    console.log(`  Social: ${citationStats.byType.social.toFixed(2)} (${((citationStats.byType.social / citationStats.total) * 100).toFixed(2)}%)`);
    console.log('');

    console.log('Citation Share by Brand:');
    const sortedBrandsForCitations = Array.from(citationStats.byBrand.entries())
      .sort((a, b) => b[1].total - a[1].total);

    sortedBrandsForCitations.forEach(([brandName, stats]) => {
      const citationShare = citationStats.total > 0
        ? ((stats.total / citationStats.total) * 100).toFixed(2)
        : '0.00';
      
      console.log(`${brandName}:`);
      console.log(`  Total Citations: ${stats.total.toFixed(2)}`);
      console.log(`  Citation Share: ${citationShare}%`);
      console.log(`  Breakdown: Brand=${stats.brand.toFixed(2)}, Earned=${stats.earned.toFixed(2)}, Social=${stats.social.toFixed(2)}`);
      console.log(`  Unique URLs: ${stats.urls.size}`);
      console.log('');
    });

    if (citationStats.issues.length > 0) {
      console.log(`⚠️  Citation Issues Found: ${citationStats.issues.length}`);
      citationStats.issues.slice(0, 10).forEach((issue, idx) => {
        console.log(`${idx + 1}. Test ${issue.test}, Brand: ${issue.brand}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.url) console.log(`   URL: ${issue.url}`);
        if (issue.domain) console.log(`   Domain: ${issue.domain}`);
        console.log('');
      });
      if (citationStats.issues.length > 10) {
        console.log(`   ... and ${citationStats.issues.length - 10} more issues`);
      }
    } else {
      console.log('✅ No citation issues found');
    }
    console.log('');

    // ==========================================
    // 7. VERIFY AGGREGATED METRICS
    // ==========================================
    console.log('📋 STEP 7: VERIFYING AGGREGATED METRICS');
    console.log('─'.repeat(80));
    
    const aggregatedMetrics = await AggregatedMetrics.find({
      userId,
      urlAnalysisId
    }).sort({ lastCalculated: -1 }).lean();

    console.log(`✅ Found ${aggregatedMetrics.length} aggregated metric documents`);
    console.log('');

    if (aggregatedMetrics.length > 0) {
      const overallMetrics = aggregatedMetrics.find(m => m.scope === 'overall');
      
      if (overallMetrics) {
        console.log('Overall Metrics:');
        console.log(`  Total Prompts: ${overallMetrics.totalPrompts || 0}`);
        console.log(`  Total Responses: ${overallMetrics.totalResponses || 0}`);
        console.log(`  Total Brands: ${overallMetrics.totalBrands || 0}`);
        console.log(`  Last Calculated: ${overallMetrics.lastCalculated || 'N/A'}`);
        console.log('');

        if (overallMetrics.brandMetrics && Array.isArray(overallMetrics.brandMetrics)) {
          console.log('Brand Metrics from Database:');
          overallMetrics.brandMetrics.forEach((bm, idx) => {
            console.log(`${idx + 1}. ${bm.brandName} (${bm.isOwner ? 'User Brand' : 'Competitor'})`);
            console.log(`   Visibility Score: ${bm.visibilityScore || 0}%`);
            console.log(`   Citation Share: ${bm.citationShare || 0}%`);
            console.log(`   Total Mentions: ${bm.totalMentions || 0}`);
            console.log(`   Total Citations: ${bm.totalCitations || 0}`);
            console.log(`   Brand Citations: ${bm.brandCitationsTotal || 0}`);
            console.log(`   Earned Citations: ${bm.earnedCitationsTotal || 0}`);
            console.log(`   Social Citations: ${bm.socialCitationsTotal || 0}`);
            console.log('');
          });

          // Compare with calculated values
          console.log('Verification: Comparing Database vs Calculated Values');
          console.log('─'.repeat(80));
          
          overallMetrics.brandMetrics.forEach(dbBrand => {
            const brandName = dbBrand.brandName;
            const calculated = visibilityCalculations[brandName];
            const citationData = citationStats.byBrand.get(brandName);
            
            if (calculated) {
              const dbVisibility = dbBrand.visibilityScore || 0;
              const calcVisibility = calculated.calculatedVisibility;
              const diff = Math.abs(dbVisibility - calcVisibility);
              
              if (diff > 0.01) {
                console.log(`⚠️  ${brandName}: Visibility Score Mismatch!`);
                console.log(`   Database: ${dbVisibility}%`);
                console.log(`   Calculated: ${calcVisibility}%`);
                console.log(`   Difference: ${diff.toFixed(2)}%`);
              } else {
                console.log(`✅ ${brandName}: Visibility Score matches (${calcVisibility}%)`);
              }
            }
            
            if (citationData) {
              const totalCitationsAllBrands = Array.from(citationStats.byBrand.values())
                .reduce((sum, stats) => sum + stats.total, 0);
              
              const calcCitationShare = totalCitationsAllBrands > 0
                ? ((citationData.total / totalCitationsAllBrands) * 100).toFixed(2)
                : '0.00';
              
              const dbCitationShare = dbBrand.citationShare || 0;
              const diff = Math.abs(dbCitationShare - parseFloat(calcCitationShare));
              
              if (diff > 0.01) {
                console.log(`⚠️  ${brandName}: Citation Share Mismatch!`);
                console.log(`   Database: ${dbCitationShare}%`);
                console.log(`   Calculated: ${calcCitationShare}%`);
                console.log(`   Difference: ${diff.toFixed(2)}%`);
              } else {
                console.log(`✅ ${brandName}: Citation Share matches (${calcCitationShare}%)`);
              }
            }
          });
        }
      } else {
        console.log('⚠️  No overall metrics found');
      }
    } else {
      console.log('⚠️  WARNING: No aggregated metrics found!');
      console.log('   Metrics may need to be recalculated.');
    }
    console.log('');

    // ==========================================
    // 8. FINAL SUMMARY
    // ==========================================
    console.log('📊 FINAL VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    
    const summary = {
      urlAnalysis: !!urlAnalysis,
      competitors: {
        total: allCompetitors.length,
        selected: selectedCompetitors.length
      },
      promptTests: promptTests.length,
      dataIsolation: testsWithWrongAnalysis === 0,
      brandExtraction: {
        total: detectedBrands.size,
        expected: expectedBrands.length,
        falsePositives: falsePositives.length
      },
      citationIssues: citationStats.issues.length,
      aggregatedMetrics: aggregatedMetrics.length > 0
    };

    console.log('Data Completeness:');
    console.log(`  ✅ URL Analysis: ${summary.urlAnalysis ? 'Found' : 'Missing'}`);
    console.log(`  ✅ Competitors: ${summary.competitors.selected} selected`);
    console.log(`  ✅ Prompt Tests: ${summary.promptTests} completed`);
    console.log(`  ✅ Aggregated Metrics: ${summary.aggregatedMetrics ? 'Found' : 'Missing'}`);
    console.log('');

    console.log('Data Quality:');
    console.log(`  ${summary.dataIsolation ? '✅' : '❌'} Data Isolation: ${summary.dataIsolation ? 'OK' : 'ISSUES FOUND'}`);
    console.log(`  ${summary.brandExtraction.falsePositives === 0 ? '✅' : '❌'} Brand Extraction: ${summary.brandExtraction.falsePositives === 0 ? 'No false positives' : `${summary.brandExtraction.falsePositives} false positives`}`);
    console.log(`  ${summary.citationIssues === 0 ? '✅' : '⚠️ '} Citation Issues: ${summary.citationIssues}`);
    console.log('');

    // Recommendations
    console.log('🔧 RECOMMENDATIONS:');
    console.log('─'.repeat(80));
    
    const recommendations = [];
    
    if (summary.promptTests === 0) {
      recommendations.push('❌ CRITICAL: No completed tests found. Run prompt testing first.');
    }
    
    if (!summary.aggregatedMetrics) {
      recommendations.push('⚠️  HIGH: No aggregated metrics found. Run metrics aggregation.');
    }
    
    if (summary.brandExtraction.falsePositives > 0) {
      recommendations.push('❌ CRITICAL: False positive brands detected. Review brand extraction logic.');
    }
    
    if (summary.citationIssues > 0) {
      recommendations.push('⚠️  MEDIUM: Citation issues found. Review citation categorization.');
    }
    
    if (!summary.dataIsolation) {
      recommendations.push('❌ CRITICAL: Data isolation issues. Some tests belong to other analyses.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All checks passed! System is working correctly.');
    }
    
    recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec}`);
    });
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Verification complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

comprehensiveVerification();


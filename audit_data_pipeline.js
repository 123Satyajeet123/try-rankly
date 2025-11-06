/**
 * Comprehensive Data Pipeline Audit Script
 * 
 * This script audits the entire data pipeline:
 * 1. URL Analysis → Prompt Tests
 * 2. Visibility Score Validation
 * 3. Citation Share Validation
 * 4. Citation Grouping Validation
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly';

async function auditPipeline() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('rankly');
    
    // Use the URL analysis from the audit
    const urlAnalysisId = '690b8ed750a6369eb72d1de3';
    
    console.log('='.repeat(80));
    console.log('📊 DATA PIPELINE AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(`URL Analysis ID: ${urlAnalysisId}\n`);
    
    // Step 1: Get URL Analysis
    const urlAnalysis = await db.collection('urlanalyses').findOne({ _id: new require('mongodb').ObjectId(urlAnalysisId) });
    if (!urlAnalysis) {
      console.error('❌ URL Analysis not found!');
      return;
    }
    
    console.log('✅ STEP 1: URL Analysis Found');
    console.log(`   Brand: ${urlAnalysis.brandContext.companyName}`);
    console.log(`   Competitors: ${urlAnalysis.competitors.map(c => c.name).join(', ')}`);
    console.log(`   Total Competitors: ${urlAnalysis.competitors.length}\n`);
    
    // Step 2: Get all Prompt Tests
    const promptTests = await db.collection('prompttests')
      .find({ urlAnalysisId: new require('mongodb').ObjectId(urlAnalysisId) })
      .toArray();
    
    console.log(`✅ STEP 2: Found ${promptTests.length} Prompt Tests\n`);
    
    // Step 3: Get selected competitors
    const selectedCompetitors = await db.collection('competitors')
      .find({ 
        urlAnalysisId: new require('mongodb').ObjectId(urlAnalysisId),
        selected: true 
      })
      .toArray();
    
    console.log(`✅ STEP 3: Found ${selectedCompetitors.length} Selected Competitors`);
    console.log(`   Selected: ${selectedCompetitors.map(c => c.name).join(', ')}\n`);
    
    // Step 4: Get Aggregated Metrics
    const aggregatedMetrics = await db.collection('aggregatedmetrics')
      .findOne({ 
        urlAnalysisId: new require('mongodb').ObjectId(urlAnalysisId),
        scope: 'overall'
      });
    
    if (!aggregatedMetrics) {
      console.error('❌ Aggregated Metrics not found!');
      return;
    }
    
    console.log(`✅ STEP 4: Aggregated Metrics Found`);
    console.log(`   Total Prompts: ${aggregatedMetrics.totalPrompts}`);
    console.log(`   Total Responses: ${aggregatedMetrics.totalResponses}`);
    console.log(`   Total Brands: ${aggregatedMetrics.totalBrands}\n`);
    
    // Step 5: Validate Visibility Scores
    console.log('='.repeat(80));
    console.log('🔍 VALIDATING VISIBILITY SCORES');
    console.log('='.repeat(80));
    
    const allBrandNames = [urlAnalysis.brandContext.companyName, ...selectedCompetitors.map(c => c.name)];
    const uniquePrompts = new Set();
    const brandMentionCounts = {};
    
    allBrandNames.forEach(brand => {
      brandMentionCounts[brand] = new Set();
    });
    
    promptTests.forEach(test => {
      if (test.promptId) {
        uniquePrompts.add(test.promptId.toString());
      }
      
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          if (bm.mentioned && allBrandNames.includes(bm.brandName)) {
            if (test.promptId) {
              brandMentionCounts[bm.brandName].add(test.promptId.toString());
            }
          }
        });
      }
    });
    
    const totalUniquePrompts = uniquePrompts.size;
    console.log(`\n📊 Visibility Score Calculation:`);
    console.log(`   Total Unique Prompts: ${totalUniquePrompts}`);
    console.log(`   Total Tests: ${promptTests.length}\n`);
    
    aggregatedMetrics.brandMetrics.forEach(brandMetric => {
      const brandName = brandMetric.brandName;
      const actualMentions = brandMentionCounts[brandName]?.size || 0;
      const expectedVisibility = totalUniquePrompts > 0 
        ? (actualMentions / totalUniquePrompts) * 100 
        : 0;
      const storedVisibility = brandMetric.visibilityScore;
      const difference = Math.abs(expectedVisibility - storedVisibility);
      
      console.log(`\n   ${brandName}:`);
      console.log(`     Mentions in prompts: ${actualMentions}/${totalUniquePrompts}`);
      console.log(`     Expected visibility: ${expectedVisibility.toFixed(2)}%`);
      console.log(`     Stored visibility: ${storedVisibility}%`);
      console.log(`     Difference: ${difference.toFixed(2)}%`);
      
      if (difference > 1) {
        console.log(`     ⚠️  WARNING: Difference > 1%`);
      } else {
        console.log(`     ✅ PASS: Visibility score matches`);
      }
    });
    
    // Step 6: Validate Citation Share
    console.log('\n' + '='.repeat(80));
    console.log('🔗 VALIDATING CITATION SHARE');
    console.log('='.repeat(80));
    
    const citationCounts = {};
    const citationTypeCounts = {};
    
    allBrandNames.forEach(brand => {
      citationCounts[brand] = {
        brand: 0,
        earned: 0,
        social: 0,
        total: 0
      };
    });
    
    promptTests.forEach(test => {
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          if (allBrandNames.includes(bm.brandName)) {
            if (bm.citations && Array.isArray(bm.citations)) {
              bm.citations.forEach(citation => {
                if (citation.type === 'brand' || citation.type === 'earned' || citation.type === 'social') {
                  const confidence = citation.confidence !== undefined ? citation.confidence : 0.8;
                  const typeWeight = citation.type === 'brand' ? 1.0 : 
                                   citation.type === 'earned' ? 0.9 : 0.8;
                  const weightedCount = confidence * typeWeight;
                  
                  citationCounts[bm.brandName][citation.type] += weightedCount;
                  citationCounts[bm.brandName].total += weightedCount;
                }
              });
            } else if (bm.citationMetrics) {
              // Fallback to citationMetrics
              const confidence = 0.8; // Default
              const brandWeighted = (bm.citationMetrics.brandCitations || 0) * 1.0 * confidence;
              const earnedWeighted = (bm.citationMetrics.earnedCitations || 0) * 0.9 * confidence;
              const socialWeighted = (bm.citationMetrics.socialCitations || 0) * 0.8 * confidence;
              
              citationCounts[bm.brandName].brand += brandWeighted;
              citationCounts[bm.brandName].earned += earnedWeighted;
              citationCounts[bm.brandName].social += socialWeighted;
              citationCounts[bm.brandName].total += brandWeighted + earnedWeighted + socialWeighted;
            }
          }
        });
      }
    });
    
    const totalCitationsAllBrands = Object.values(citationCounts).reduce((sum, counts) => sum + counts.total, 0);
    console.log(`\n📊 Citation Share Calculation:`);
    console.log(`   Total Citations (weighted): ${totalCitationsAllBrands.toFixed(2)}\n`);
    
    aggregatedMetrics.brandMetrics.forEach(brandMetric => {
      const brandName = brandMetric.brandName;
      const actualCitations = citationCounts[brandName]?.total || 0;
      const rawCitationShare = totalCitationsAllBrands > 0
        ? (actualCitations / totalCitationsAllBrands) * 100
        : 0;
      
      // Apply Bayesian smoothing if needed
      const MIN_CITATION_SAMPLE = 10;
      let expectedCitationShare = rawCitationShare;
      if (totalCitationsAllBrands < MIN_CITATION_SAMPLE) {
        const priorWeight = (MIN_CITATION_SAMPLE - totalCitationsAllBrands) / MIN_CITATION_SAMPLE;
        const equalShare = 100 / allBrandNames.length;
        expectedCitationShare = rawCitationShare * (1 - priorWeight) + equalShare * priorWeight;
      }
      
      const storedCitationShare = brandMetric.citationShare;
      const difference = Math.abs(expectedCitationShare - storedCitationShare);
      
      console.log(`\n   ${brandName}:`);
      console.log(`     Total citations (weighted): ${actualCitations.toFixed(2)}`);
      console.log(`     Brand citations: ${citationCounts[brandName]?.brand.toFixed(2)}`);
      console.log(`     Earned citations: ${citationCounts[brandName]?.earned.toFixed(2)}`);
      console.log(`     Social citations: ${citationCounts[brandName]?.social.toFixed(2)}`);
      console.log(`     Raw citation share: ${rawCitationShare.toFixed(2)}%`);
      console.log(`     Expected citation share (with smoothing): ${expectedCitationShare.toFixed(2)}%`);
      console.log(`     Stored citation share: ${storedCitationShare}%`);
      console.log(`     Difference: ${difference.toFixed(2)}%`);
      
      if (difference > 2) {
        console.log(`     ⚠️  WARNING: Difference > 2%`);
      } else {
        console.log(`     ✅ PASS: Citation share matches`);
      }
    });
    
    // Step 7: Validate Citation Grouping
    console.log('\n' + '='.repeat(80));
    console.log('🔍 VALIDATING CITATION GROUPING');
    console.log('='.repeat(80));
    
    const citationGroups = {};
    const citationIssues = [];
    
    promptTests.forEach(test => {
      if (test.brandMetrics && Array.isArray(test.brandMetrics)) {
        test.brandMetrics.forEach(bm => {
          if (bm.citations && Array.isArray(bm.citations)) {
            bm.citations.forEach((citation, index) => {
              if (!citation.url) {
                citationIssues.push({
                  testId: test._id,
                  brand: bm.brandName,
                  issue: 'Citation missing URL',
                  citation: citation
                });
                return;
              }
              
              if (!citation.type || !['brand', 'earned', 'social'].includes(citation.type)) {
                citationIssues.push({
                  testId: test._id,
                  brand: bm.brandName,
                  issue: `Invalid citation type: ${citation.type}`,
                  citation: citation
                });
              }
              
              // Check if citation URL is properly formatted
              try {
                const url = new URL(citation.url);
                const domain = url.hostname.replace(/^www\./, '').toLowerCase();
                
                if (!citationGroups[domain]) {
                  citationGroups[domain] = {
                    domain,
                    type: citation.type,
                    brand: citation.brand || bm.brandName,
                    count: 0,
                    platforms: new Set(),
                    citations: []
                  };
                }
                
                citationGroups[domain].count++;
                if (test.llmProvider) {
                  citationGroups[domain].platforms.add(test.llmProvider);
                }
                citationGroups[domain].citations.push({
                  url: citation.url,
                  type: citation.type,
                  brand: citation.brand,
                  confidence: citation.confidence,
                  testId: test._id
                });
              } catch (e) {
                citationIssues.push({
                  testId: test._id,
                  brand: bm.brandName,
                  issue: `Invalid URL format: ${citation.url}`,
                  citation: citation
                });
              }
            });
          }
        });
      }
    });
    
    console.log(`\n📊 Citation Grouping Analysis:`);
    console.log(`   Unique citation domains: ${Object.keys(citationGroups).length}`);
    console.log(`   Citation issues found: ${citationIssues.length}\n`);
    
    if (citationIssues.length > 0) {
      console.log(`   ⚠️  ISSUES FOUND:\n`);
      citationIssues.slice(0, 10).forEach(issue => {
        console.log(`     - ${issue.issue}`);
        console.log(`       Brand: ${issue.brand}, Test: ${issue.testId}`);
        if (issue.citation.url) {
          console.log(`       URL: ${issue.citation.url}`);
        }
        console.log('');
      });
      
      if (citationIssues.length > 10) {
        console.log(`     ... and ${citationIssues.length - 10} more issues\n`);
      }
    } else {
      console.log(`   ✅ PASS: No citation grouping issues found\n`);
    }
    
    // Show sample citation groups
    console.log(`   Sample Citation Groups (first 5):`);
    Object.values(citationGroups).slice(0, 5).forEach(group => {
      console.log(`\n     Domain: ${group.domain}`);
      console.log(`       Type: ${group.type}`);
      console.log(`       Brand: ${group.brand || 'N/A'}`);
      console.log(`       Count: ${group.count}`);
      console.log(`       Platforms: ${Array.from(group.platforms).join(', ')}`);
    });
    
    // Step 8: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 AUDIT SUMMARY');
    console.log('='.repeat(80));
    
    const visibilityIssues = aggregatedMetrics.brandMetrics.filter(bm => {
      const actualMentions = brandMentionCounts[bm.brandName]?.size || 0;
      const expectedVisibility = totalUniquePrompts > 0 
        ? (actualMentions / totalUniquePrompts) * 100 
        : 0;
      return Math.abs(expectedVisibility - bm.visibilityScore) > 1;
    }).length;
    
    const citationIssuesCount = aggregatedMetrics.brandMetrics.filter(bm => {
      const actualCitations = citationCounts[bm.brandName]?.total || 0;
      const rawCitationShare = totalCitationsAllBrands > 0
        ? (actualCitations / totalCitationsAllBrands) * 100
        : 0;
      const MIN_CITATION_SAMPLE = 10;
      let expectedCitationShare = rawCitationShare;
      if (totalCitationsAllBrands < MIN_CITATION_SAMPLE) {
        const priorWeight = (MIN_CITATION_SAMPLE - totalCitationsAllBrands) / MIN_CITATION_SAMPLE;
        const equalShare = 100 / allBrandNames.length;
        expectedCitationShare = rawCitationShare * (1 - priorWeight) + equalShare * priorWeight;
      }
      return Math.abs(expectedCitationShare - bm.citationShare) > 2;
    }).length;
    
    console.log(`\n✅ Visibility Scores: ${aggregatedMetrics.brandMetrics.length - visibilityIssues}/${aggregatedMetrics.brandMetrics.length} brands pass`);
    console.log(`✅ Citation Shares: ${aggregatedMetrics.brandMetrics.length - citationIssuesCount}/${aggregatedMetrics.brandMetrics.length} brands pass`);
    console.log(`✅ Citation Grouping: ${citationIssues.length === 0 ? 'PASS' : `${citationIssues.length} issues found`}`);
    console.log(`\n📊 Total Issues: ${visibilityIssues + citationIssuesCount + citationIssues.length}`);
    
    if (visibilityIssues + citationIssuesCount + citationIssues.length === 0) {
      console.log(`\n🎉 ALL CHECKS PASSED! Data pipeline is consistent.\n`);
    } else {
      console.log(`\n⚠️  SOME ISSUES FOUND. Please review the details above.\n`);
    }
    
  } catch (error) {
    console.error('❌ Audit Error:', error);
  } finally {
    await client.close();
  }
}

// Run audit
auditPipeline().catch(console.error);


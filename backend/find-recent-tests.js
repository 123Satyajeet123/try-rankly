require('dotenv').config();
const mongoose = require('mongoose');
const PromptTest = require('./src/models/PromptTest');

async function findRecentTests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find tests with brandMetrics that have 'mentioned=true'
    const testsWithMetrics = await PromptTest.find({
      status: 'completed',
      'brandMetrics.mentioned': true
    })
    .sort({ testedAt: -1 })
    .limit(10)
    .lean();

    console.log(`Found ${testsWithMetrics.length} tests with brand mentions\n`);

    if (testsWithMetrics.length > 0) {
      const test = testsWithMetrics[0];
      console.log(`Most Recent Test:`);
      console.log(`  ID: ${test._id}`);
      console.log(`  User ID: ${test.userId}`);
      console.log(`  URL Analysis ID: ${test.urlAnalysisId}`);
      console.log(`  Platform: ${test.llmProvider}`);
      console.log(`  Tested At: ${test.testedAt}`);
      console.log(`  \nBrand Metrics:`);
      
      test.brandMetrics?.forEach(bm => {
        if (bm.mentioned) {
          console.log(`    - ${bm.brandName}: ${bm.mentionCount} mentions, position: ${bm.firstPosition}`);
          console.log(`      Sentences: ${bm.sentences?.length || 0}`);
          console.log(`      Sentiment: ${bm.sentiment || 'N/A'} (${bm.sentimentScore || 0})`);
        }
      });
      
      console.log(`\n  Scorecard:`);
      console.log(`    brandMentioned: ${test.scorecard?.brandMentioned}`);
      console.log(`    brandPosition: ${test.scorecard?.brandPosition}`);
      console.log(`    citations: brand=${test.scorecard?.brandCitations}, earned=${test.scorecard?.earnedCitations}, social=${test.scorecard?.socialCitations}`);
      
      console.log(`\n  Response Metadata:`);
      console.log(`    totalSentences: ${test.responseMetadata?.totalSentences || 0}`);
      console.log(`    totalWords: ${test.responseMetadata?.totalWords || 0}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findRecentTests();







require('dotenv').config();
const mongoose = require('mongoose');
const PromptTest = require('./src/models/PromptTest');
const UrlAnalysis = require('./src/models/UrlAnalysis');

async function inspectTests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get Stripe analysis
    const analysis = await UrlAnalysis.findOne({ url: 'https://stripe.com' });
    
    if (!analysis) {
      console.log('No Stripe analysis found');
      return;
    }

    console.log(`Stripe Analysis ID: ${analysis._id}\n`);

    // Get tests
    const tests = await PromptTest.find({
      urlAnalysisId: analysis._id,
      status: 'completed'
    }).lean();

    console.log(`Found ${tests.length} completed tests\n`);

    tests.forEach((test, idx) => {
      console.log(`\nTest ${idx + 1}:`);
      console.log(`  ID: ${test._id}`);
      console.log(`  Platform: ${test.llmProvider}`);
      console.log(`  Status: ${test.status}`);
      console.log(`  Brand Metrics: ${test.brandMetrics?.length || 0} brands`);
      
      if (test.brandMetrics && test.brandMetrics.length > 0) {
        test.brandMetrics.forEach(bm => {
          console.log(`    - ${bm.brandName}: mentioned=${bm.mentioned}, count=${bm.mentionCount || 0}`);
        });
      } else {
        console.log(`    (No brand metrics)`);
      }
      
      console.log(`  Scorecard exists: ${!!test.scorecard}`);
      if (test.scorecard) {
        console.log(`    brandMentioned: ${test.scorecard.brandMentioned}`);
        console.log(`    brandMentionCount: ${test.scorecard.brandMentionCount || 0}`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

inspectTests();


require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const UrlAnalysis = require('./src/models/UrlAnalysis');
const PromptTest = require('./src/models/PromptTest');

async function findStripeUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find Stripe analysis
    const stripeAnalysis = await UrlAnalysis.findOne({ url: 'https://stripe.com' })
      .sort({ analyzedAt: -1 });

    if (!stripeAnalysis) {
      console.log('No Stripe analysis found');
      return;
    }

    console.log('Found Stripe analysis:');
    console.log(`  ID: ${stripeAnalysis._id}`);
    console.log(`  User ID: ${stripeAnalysis.userId}`);
    console.log(`  Analyzed At: ${stripeAnalysis.analyzedAt}`);

    // Get user
    const user = await User.findById(stripeAnalysis.userId);
    if (user) {
      console.log(`  User Email: ${user.email}\n`);
    }

    // Count tests
    const testCount = await PromptTest.countDocuments({
      userId: stripeAnalysis.userId,
      urlAnalysisId: stripeAnalysis._id,
      status: 'completed'
    });

    console.log(`Tests: ${testCount} completed tests\n`);

    if (testCount > 0) {
      console.log(`✅ Use this user for testing: ${user.email}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findStripeUser();


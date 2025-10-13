require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const UrlAnalysis = require('./src/models/UrlAnalysis');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({});
    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log(`- ${user.email} (ID: ${user._id})`);
      
      const analyses = await UrlAnalysis.countDocuments({ userId: user._id });
      console.log(`  URL Analyses: ${analyses}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();








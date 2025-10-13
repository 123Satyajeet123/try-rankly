require('dotenv').config();
const mongoose = require('mongoose');
const Competitor = require('./src/models/Competitor');
const Topic = require('./src/models/Topic');
const Persona = require('./src/models/Persona');
const User = require('./src/models/User');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected\n');

    const user = await User.findOne({ email: 'satyajeetdas225@gmail.com' });
    console.log(`User ID: ${user._id}`);
    console.log(`User ID type: ${typeof user._id}\n`);

    const allCompetitors = await Competitor.find({ userId: user._id }).lean();
    console.log(`Competitors for this user: ${allCompetitors.length}`);
    if (allCompetitors.length > 0) {
      console.log('Sample competitor:', JSON.stringify(allCompetitors[0], null, 2));
    }

    const allTopics = await Topic.find({ userId: user._id }).lean();
    console.log(`\nTopics for this user: ${allTopics.length}`);
    if (allTopics.length > 0) {
      console.log('Sample topic:', JSON.stringify(allTopics[0], null, 2));
    }

    const allPersonas = await Persona.find({ userId: user._id }).lean();
    console.log(`\nPersonas for this user: ${allPersonas.length}`);
    if (allPersonas.length > 0) {
      console.log('Sample persona:', JSON.stringify(allPersonas[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

debug();








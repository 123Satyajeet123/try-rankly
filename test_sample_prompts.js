// Test script for samplePrompts functionality
const PromptTestingService = require('./backend/src/services/promptTestingService');

// Create mock prompts for testing
const createMockPrompts = () => {
  const mockPrompts = [];
  
  // Create prompts for 2 topics × 2 personas = 4 combinations
  const topics = [
    { _id: 'topic1', name: 'Reward Points' },
    { _id: 'topic2', name: 'Online Shopping' }
  ];
  
  const personas = [
    { _id: 'persona1', type: 'First-Time Credit Card User' },
    { _id: 'persona2', type: 'Low-Spending Online Shopper' }
  ];
  
  // Generate 20 prompts per combination (80 total)
  let promptIndex = 1;
  topics.forEach(topic => {
    personas.forEach(persona => {
      for (let i = 0; i < 20; i++) {
        mockPrompts.push({
          _id: `prompt${promptIndex++}`,
          text: `Prompt ${promptIndex - 1} for ${topic.name} × ${persona.type}`,
          topicId: topic,
          personaId: persona,
          queryType: 'Commercial'
        });
      }
    });
  });
  
  return mockPrompts;
};

// Test function
const testSamplePrompts = () => {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING: samplePrompts Function');
  console.log('='.repeat(80) + '\n');
  
  const mockPrompts = createMockPrompts();
  console.log(`📊 Created ${mockPrompts.length} mock prompts`);
  console.log(`   - Expected: 4 combinations (2 topics × 2 personas) × 20 prompts each = 80 total`);
  console.log(`   - Combinations:`);
  console.log(`     • Reward Points × First-Time Credit Card User: 20 prompts`);
  console.log(`     • Reward Points × Low-Spending Online Shopper: 20 prompts`);
  console.log(`     • Online Shopping × First-Time Credit Card User: 20 prompts`);
  console.log(`     • Online Shopping × Low-Spending Online Shopper: 20 prompts\n`);
  
  // Test different limits
  const testLimits = [5, 10, 20, 40, 80];
  
  testLimits.forEach(limit => {
    console.log('\n' + '-'.repeat(80));
    console.log(`📋 TEST: Sampling ${limit} prompts from ${mockPrompts.length} total`);
    console.log('-'.repeat(80));
    
    // Call the samplePrompts method directly
    const sampled = PromptTestingService.samplePrompts(mockPrompts, limit);
    
    // Analyze distribution
    const distribution = {};
    sampled.forEach(prompt => {
      const topicName = prompt.topicId.name;
      const personaName = prompt.personaId.type;
      const key = `${topicName} × ${personaName}`;
      
      if (!distribution[key]) {
        distribution[key] = 0;
      }
      distribution[key]++;
    });
    
    console.log(`\n📊 Distribution Analysis:`);
    const expectedPerCombination = Math.floor(limit / 4);
    const remainder = limit % 4;
    
    let allEqual = true;
    Object.entries(distribution).sort().forEach(([key, count]) => {
      const shouldBe = expectedPerCombination + (remainder > 0 ? 1 : 0);
      const status = count === shouldBe ? '✅' : '❌';
      if (count !== shouldBe) allEqual = false;
      console.log(`   ${status} ${key}: ${count} prompts (expected: ${shouldBe})`);
      if (remainder > 0) remainder--;
    });
    
    if (allEqual) {
      console.log(`\n✅ UNIFORM DISTRIBUTION: All combinations have exactly ${expectedPerCombination} prompts (plus ${limit % 4} combinations got 1 extra)`);
    } else {
      console.log(`\n❌ NON-UNIFORM DISTRIBUTION: Some combinations have incorrect counts`);
    }
  });
  
  // Test consistency across multiple runs
  console.log('\n' + '='.repeat(80));
  console.log('🔄 CONSISTENCY TEST: Running 10 iterations with limit=20');
  console.log('='.repeat(80) + '\n');
  
  const results = [];
  for (let i = 0; i < 10; i++) {
    const sampled = PromptTestingService.samplePrompts(mockPrompts, 20);
    const distribution = {};
    sampled.forEach(prompt => {
      const key = `${prompt.topicId.name} × ${prompt.personaId.type}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });
    results.push(distribution);
  }
  
  // Check if all runs have uniform distribution
  const allUniform = results.every(dist => {
    const counts = Object.values(dist);
    return counts.every(count => count === 5); // 20 / 4 = 5 per combination
  });
  
  console.log('📊 Results across 10 runs:');
  results.forEach((dist, idx) => {
    const counts = Object.values(dist).sort();
    const uniform = counts.every(count => count === 5);
    console.log(`   Run ${idx + 1}: ${JSON.stringify(counts)} ${uniform ? '✅' : '❌'}`);
  });
  
  if (allUniform) {
    console.log('\n✅ CONSISTENCY PASS: All runs produced uniform distribution (5 prompts per combination)');
  } else {
    console.log('\n❌ CONSISTENCY FAIL: Some runs produced non-uniform distribution');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 TEST COMPLETE');
  console.log('='.repeat(80) + '\n');
};

// Run the test
testSamplePrompts();


/**
 * VALIDATION TEST: Analysis Consistency Checker
 * 
 * Ensures that Perplexity analysis always returns consistent data structure
 */

const fs = require('fs');

function validateAnalysisResponse(analysis) {
  const errors = [];
  const warnings = [];

  console.log('\n' + '='.repeat(80));
  console.log('🔍 VALIDATING ANALYSIS RESPONSE CONSISTENCY');
  console.log('='.repeat(80));

  // 1. Check top-level structure
  console.log('\n1️⃣  Checking top-level structure...');
  const requiredTopLevel = ['status', 'brandContext', 'competitors', 'topics', 'personas', 'analysisDate'];
  requiredTopLevel.forEach(field => {
    if (!analysis.hasOwnProperty(field)) {
      errors.push(`Missing top-level field: ${field}`);
    } else {
      console.log(`   ✅ ${field}: Present`);
    }
  });

  // 2. Validate Brand Context
  console.log('\n2️⃣  Validating Brand Context...');
  const requiredBrandFields = [
    'companyName', 'industry', 'businessModel', 'targetMarket', 
    'valueProposition', 'keyServices', 'brandTone', 'marketPosition'
  ];
  
  if (analysis.brandContext) {
    requiredBrandFields.forEach(field => {
      if (!analysis.brandContext[field]) {
        errors.push(`Missing brandContext.${field}`);
      } else {
        console.log(`   ✅ ${field}: ${typeof analysis.brandContext[field]}`);
      }
    });

    // Check keyServices is array
    if (!Array.isArray(analysis.brandContext.keyServices)) {
      errors.push('brandContext.keyServices must be an array');
    } else {
      console.log(`   ✅ keyServices count: ${analysis.brandContext.keyServices.length}`);
      if (analysis.brandContext.keyServices.length === 0) {
        warnings.push('keyServices array is empty');
      }
    }
  } else {
    errors.push('brandContext is missing or null');
  }

  // 3. Validate Competitors
  console.log('\n3️⃣  Validating Competitors...');
  if (!Array.isArray(analysis.competitors)) {
    errors.push('competitors must be an array');
  } else {
    console.log(`   ✅ Competitors count: ${analysis.competitors.length}`);
    
    if (analysis.competitors.length === 0) {
      warnings.push('No competitors found');
    } else {
      // Check first competitor structure
      const firstComp = analysis.competitors[0];
      const requiredCompFields = ['name', 'url', 'reason', 'similarity'];
      
      requiredCompFields.forEach(field => {
        if (!firstComp[field]) {
          errors.push(`Competitor missing field: ${field}`);
        } else {
          console.log(`   ✅ Competitor.${field}: ${typeof firstComp[field]}`);
        }
      });

      // Validate URLs
      analysis.competitors.forEach((comp, index) => {
        if (!comp.url.startsWith('http')) {
          errors.push(`Competitor ${index + 1} has invalid URL: ${comp.url}`);
        }
      });
    }
  }

  // 4. Validate Topics
  console.log('\n4️⃣  Validating Topics...');
  if (!Array.isArray(analysis.topics)) {
    errors.push('topics must be an array');
  } else {
    console.log(`   ✅ Topics count: ${analysis.topics.length}`);
    
    if (analysis.topics.length === 0) {
      warnings.push('No topics found');
    } else {
      // Check first topic structure
      const firstTopic = analysis.topics[0];
      const requiredTopicFields = ['name', 'description', 'keywords', 'priority'];
      
      requiredTopicFields.forEach(field => {
        if (!firstTopic[field]) {
          errors.push(`Topic missing field: ${field}`);
        } else {
          console.log(`   ✅ Topic.${field}: ${typeof firstTopic[field]}`);
        }
      });

      // Check keywords is array
      if (!Array.isArray(firstTopic.keywords)) {
        errors.push('Topic.keywords must be an array');
      } else {
        console.log(`   ✅ Keywords count (first topic): ${firstTopic.keywords.length}`);
      }

      // Check priority values
      const validPriorities = ['High', 'Medium', 'Low'];
      analysis.topics.forEach((topic, index) => {
        if (!validPriorities.includes(topic.priority)) {
          warnings.push(`Topic ${index + 1} has non-standard priority: ${topic.priority}`);
        }
      });
    }
  }

  // 5. Validate Personas
  console.log('\n5️⃣  Validating Personas...');
  if (!Array.isArray(analysis.personas)) {
    errors.push('personas must be an array');
  } else {
    console.log(`   ✅ Personas count: ${analysis.personas.length}`);
    
    if (analysis.personas.length === 0) {
      warnings.push('No personas found');
    } else {
      // Check first persona structure
      const firstPersona = analysis.personas[0];
      const requiredPersonaFields = ['type', 'description', 'painPoints', 'goals', 'relevance'];
      
      requiredPersonaFields.forEach(field => {
        if (!firstPersona[field]) {
          errors.push(`Persona missing field: ${field}`);
        } else {
          console.log(`   ✅ Persona.${field}: ${typeof firstPersona[field]}`);
        }
      });

      // Check painPoints and goals are arrays
      if (!Array.isArray(firstPersona.painPoints)) {
        errors.push('Persona.painPoints must be an array');
      } else {
        console.log(`   ✅ Pain points count (first persona): ${firstPersona.painPoints.length}`);
      }

      if (!Array.isArray(firstPersona.goals)) {
        errors.push('Persona.goals must be an array');
      } else {
        console.log(`   ✅ Goals count (first persona): ${firstPersona.goals.length}`);
      }

      // Check relevance values
      const validRelevance = ['High', 'Medium', 'Low'];
      analysis.personas.forEach((persona, index) => {
        if (!validRelevance.includes(persona.relevance)) {
          warnings.push(`Persona ${index + 1} has non-standard relevance: ${persona.relevance}`);
        }
      });
    }
  }

  // 6. Validate Date
  console.log('\n6️⃣  Validating Analysis Date...');
  try {
    const date = new Date(analysis.analysisDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid analysisDate format');
    } else {
      console.log(`   ✅ Analysis date: ${date.toISOString()}`);
    }
  } catch (e) {
    errors.push('analysisDate parsing failed');
  }

  // Print Results
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(80));

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n🎉 PERFECT! All validations passed!');
    console.log('\n✅ Data structure is 100% consistent and complete');
    return { valid: true, errors: [], warnings: [] };
  }

  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${err}`);
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warn, index) => {
      console.log(`   ${index + 1}. ${warn}`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Run validation on saved test data
if (require.main === module) {
  try {
    const testData = JSON.parse(fs.readFileSync(__dirname + '/test-flow-data.json', 'utf8'));
    
    console.log('\n📁 Loaded test data from: test-flow-data.json');
    console.log(`📅 Timestamp: ${testData.timestamp}`);
    console.log(`🌐 URL: ${testData.url}`);
    
    const result = validateAnalysisResponse(testData.analysis);
    
    if (result.valid) {
      console.log('\n✅ VALIDATION PASSED - Response format is consistent!\n');
      process.exit(0);
    } else {
      console.log('\n❌ VALIDATION FAILED - Please fix errors before proceeding\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  }
}

module.exports = validateAnalysisResponse;




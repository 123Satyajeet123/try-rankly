const axios = require('axios');

async function testBackend() {
  try {
    console.log('🧪 Testing backend dashboard endpoint...');
    
    // Test the dashboard endpoint
    const response = await axios.get('http://localhost:3001/api/dashboard/all', {
      headers: {
        'Authorization': 'Bearer test-token' // You might need to adjust this
      }
    });
    
    console.log('✅ Backend response received');
    console.log('📊 Response data structure:');
    console.log('  - Overall metrics:', response.data.data.overall ? 'Present' : 'Missing');
    console.log('  - Platform metrics:', response.data.data.platforms?.length || 0, 'items');
    console.log('  - Topic metrics:', response.data.data.topics?.length || 0, 'items');
    console.log('  - Persona metrics:', response.data.data.personas?.length || 0, 'items');
    console.log('  - Topic rankings:', response.data.data.metrics?.topicRankings?.length || 0, 'items');
    console.log('  - Persona rankings:', response.data.data.metrics?.personaRankings?.length || 0, 'items');
    
    if (response.data.data.metrics?.topicRankings?.length > 0) {
      console.log('📊 Sample topic ranking:', response.data.data.metrics.topicRankings[0]);
    }
    
    if (response.data.data.metrics?.personaRankings?.length > 0) {
      console.log('📊 Sample persona ranking:', response.data.data.metrics.personaRankings[0]);
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testBackend();

const axios = require('axios');
const fs = require('fs');
const step4Data = JSON.parse(fs.readFileSync(__dirname + '/test-flow-step4-data.json', 'utf8'));

axios.get('http://localhost:5000/api/prompts/tests/all?limit=1', {
  headers: { 'Authorization': `Bearer ${step4Data.token}` }
})
.then(response => {
  const test = response.data.data.tests[0];
  console.log(JSON.stringify(test, null, 2));
})
.catch(error => console.error('Error:', error.message));




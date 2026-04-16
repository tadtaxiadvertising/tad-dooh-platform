
const fetch = require('node-fetch');

async function testSim() {
  const baseUrl = 'http://localhost:3000/api/v1/simulation';
  
  console.log('Testing GET /state...');
  const stateRes = await fetch(`${baseUrl}/state`);
  console.log('STATE STATUS:', stateRes.status);
  const stateData = await stateRes.json();
  console.log('STATE DATA:', stateData);

  console.log('\nTesting POST /scenario...');
  const res = await fetch(`${baseUrl}/scenario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-simulator-key': 'tad_prod_v10_bypass_0416_secure_key'
    },
    body: JSON.stringify({
      activeNodes: 10,
      centerLat: 19.4517,
      centerLng: -70.6970,
      radiusKm: 5
    })
  });
  
  console.log('POST STATUS:', res.status);
  const data = await res.json();
  console.log('POST RESPONSE:', data);
}

testSim().catch(err => console.error('TEST ERROR:', err));

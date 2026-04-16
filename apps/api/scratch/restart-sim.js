
const fetch = require('node-fetch');

async function purgeAndStart() {
  const simKey = 'tad_prod_v10_bypass_0416_secure_key';
  const baseUrl = 'http://localhost:3000/api/v1'; // Assuming local dev for this script

  console.log('🧹 Purging simulation data...');
  const purgeRes = await fetch(`${baseUrl}/simulation/purge`, {
    method: 'DELETE',
    headers: { 'x-simulator-key': simKey }
  });
  console.log('Purge Result:', await purgeRes.json());

  console.log('🚀 Starting Santiago Scenario (150 nodes)...');
  const startRes = await fetch(`${baseUrl}/simulation/scenario`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-simulator-key': simKey
    },
    body: JSON.stringify({
      config: {
        name: 'Santiago Pro Live',
        activeNodes: 150,
        centerLat: 19.4517,
        centerLng: -70.697,
        radiusKm: 12
      }
    })
  });
  console.log('Start Result:', await startRes.json());
}

purgeAndStart().catch(err => console.error('Error:', err));

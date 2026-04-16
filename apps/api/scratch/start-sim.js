
const fetch = require('node-fetch');

async function startSim() {
  const url = 'http://localhost:3000/api/v1/simulation/scenario';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-simulator-key': 'tad_prod_v10_bypass_0416_secure_key'
    },
    body: JSON.stringify({
      activeNodes: 150,
      centerLat: 19.4517,
      centerLng: -70.6970,
      radiusKm: 10
    })
  });
  
  const data = await res.json();
  console.log('START RESPONSE:', data);
}

startSim().catch(err => console.error('START ERROR:', err));

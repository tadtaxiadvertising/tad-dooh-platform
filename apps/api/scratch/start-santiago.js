
const fetch = require('node-fetch');

async function startSantiagoSim() {
  const url = 'http://localhost:3000/api/v1/simulation/scenario';
  console.log('Starting Santiago Simulation (150 nodes)...');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-simulator-key': 'tad_prod_v10_bypass_0416_secure_key'
    },
    body: JSON.stringify({
      name: 'Santiago Fleet V10',
      activeNodes: 150,
      centerLat: 19.4517,
      centerLng: -70.6970,
      radiusKm: 12,
      minSpeed: 10,
      maxSpeed: 65
    })
  });
  
  const data = await res.json();
  console.log('START RESPONSE:', data);
}

startSantiagoSim().catch(err => console.error('START ERROR:', err));

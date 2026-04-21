
const fetch = require('node-fetch');

async function checkFleet() {
  const url = 'http://localhost:3000/api/v1/monitoring/fleet-status';
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('FLEET STATUS COUNT:', data.length);
  const simDevs = data.filter(d => d.deviceId.includes('SIM'));
  console.log('SIMULATED DEVS FOUND:', simDevs.length);
  if (simDevs.length > 0) {
    console.log('Sample Sim Dev:', simDevs[0]);
  }
}

checkFleet().catch(err => console.error(err));

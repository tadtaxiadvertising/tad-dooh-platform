
const fetch = require('node-fetch');

async function debugUrls() {
  const root = 'http://localhost:3000';
  const urls = [
    '/',
    '/health',
    '/api/v1',
    '/api/v1/health',
    '/simulation/state',
    '/api/v1/simulation/state'
  ];
  
  for (const path of urls) {
    try {
      const res = await fetch(`${root}${path}`);
      console.log(`[${path}] Status: ${res.status}`);
    } catch (e) {
      console.log(`[${path}] Error: ${e.message}`);
    }
  }
}

debugUrls();

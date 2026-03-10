const axios = require('axios');

async function check() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@tad.do',
      password: 'TadAdmin2026!'
    });
    const token = loginRes.data.access_token;
    console.log('Login successful. Token acquired.');

    console.log('Fetching campaigns...');
    const campaignsRes = await axios.get('http://localhost:3000/api/campaigns', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (campaignsRes.data.length === 0) {
      console.log('No campaigns found.');
      return;
    }

    const campaignId = campaignsRes.data[0].id;
    console.log(`Checking distribution for campaign ID: ${campaignId}`);
    
    try {
      const distRes = await axios.get(`http://localhost:3000/api/campaigns/stats/${campaignId}/distribution`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Distribution Response:', JSON.stringify(distRes.data, null, 2));
    } catch (e) {
      console.error('Distribution error:', e.response ? e.response.status : e.message);
      if (e.response) console.error(e.response.data);
    }

  } catch (e) {
    console.error('Error:', e.response ? e.response.status : e.message);
    if (e.response) console.error(e.response.data);
  }
}

check();

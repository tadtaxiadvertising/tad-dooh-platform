const axios = require('axios');

async function test() {
  try {
    const res = await axios.post(process.env.API_URL || 'http://127.0.0.1:3005/api/v1/fleet/track-batch', {
      driverId: 'test',
      deviceId: 'test',
      points: []
    });
    console.log('Success:', res.status);
  } catch (err) {
    console.log('Error:', err.response?.status, err.response?.data || err.message);
  }
}

test();

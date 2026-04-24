/**
 * TAD v12 Financial Logic E2E Test
 * Validates the formula: (Ads * 500) + (Referrals * 500)
 */
const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/api/.env') });

// Prioridad: 1. Env Var, 2. tad-api production, 3. localhost
const API_BASE = process.env.API_BASE || 'https://tad-api.rewvid.easypanel.host/api/v1';

async function request(method, path, body = null) {
  const url = `${API_BASE}${path}`;
  const client = url.startsWith('https') ? https : http;
  
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  return new Promise((resolve, reject) => {
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) { }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log(`🧪 Starting V12 Financial Logic Validation against: ${API_BASE}`);

  try {
    // 1. Create a Driver
    console.log('\nSTEP 1: Registering Test Driver...');
    const driverEmail = `tester-${Date.now()}@tadtaxi.do`;
    const regRes = await request('POST', '/drivers', {
      fullName: "Test Financial Driver",
      email: driverEmail,
      phone: `829${Math.floor(Math.random()*9000000 + 1000000)}`,
      licensePlate: `TEST-${Date.now()}`,
      password: "password123",
      contractAccepted: true,
      agreementVersion: "2.0"
    });
    
    if (regRes.status !== 201 && regRes.status !== 200) {
       console.error('❌ Driver registration failed:', regRes.data);
       return;
    }
    const driverId = regRes.data.id;
    console.log(`✅ Driver created with ID: ${driverId}`);

    // 2. Initial Balance Check
    console.log('\nSTEP 2: Checking Initial Balance (Expected: 0)...');
    const hubRes = await request('GET', `/drivers/${driverId}/hub`);
    let balance = hubRes.data?.balance || 0; 
    console.log(`Current Balance: RD$${balance}`);

    // 3. Assign an Active Ad
    console.log('\nSTEP 3: Assigning 1 Active Ad (Expected: +500)...');
    
    // Create Campaign (as Admin)
    const campRes = await request('POST', '/campaigns', {
        name: "Financial Test Campaign",
        advertiser: "TAD Testing",
        budget: 1500,
        active: true,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    });
    const campaignId = campRes.data.id;
    console.log(`✅ Campaign created: ${campaignId}`);

    // Link Driver to Active Ad (This triggers the DB function via active_ads table)
    const linkRes = await request('POST', `/drivers/${driverId}/active-ads`, { campaignId });
    console.log(`POST /drivers/${driverId}/active-ads -> ${linkRes.status}`);
    
    // Wait for DB trigger to process
    await new Promise(r => setTimeout(r, 2000));

    const hubRes2 = await request('GET', `/drivers/${driverId}/hub`);
    balance = hubRes2.data?.balance || 0;
    console.log(`Current Balance: RD$${balance}`);
    if (balance >= 500) console.log('✅ Ad Bonus logic verified!');
    else console.error(`❌ Ad Bonus logic failed. Expected >= 500, got ${balance}`);

    // 4. Referral Test
    console.log('\nSTEP 4: Simulating Referral (Expected: +500)...');
    const referralEmail = `referred-${Date.now()}@tadtaxi.do`;
    await request('POST', '/drivers', {
      fullName: "Referred Driver",
      email: referralEmail,
      phone: `829${Math.floor(Math.random()*9000000 + 1000000)}`,
      licensePlate: `REF-${Date.now()}`,
      referredBy: driverId, 
      password: "password123",
      contractAccepted: true,
      subscriptionPaid: true, 
      status: "ACTIVE"
    });

    await new Promise(r => setTimeout(r, 2000));
    
    const hubRes3 = await request('GET', `/drivers/${driverId}/hub`);
    balance = hubRes3.data?.balance || 0;
    console.log(`Current Balance: RD$${balance}`);
    if (balance >= 1000) console.log('✅ Referral Bonus logic verified!');
    else console.error(`❌ Referral Bonus logic failed. Expected >= 1000, got ${balance}`);

    console.log('\n🌟 V12 FINANCIAL TEST COMPLETED');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

runTests();

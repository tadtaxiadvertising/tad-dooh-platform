
async function testTracking() {
    console.log('🧪 Testing Hybrid Tracking Batch...');
    const API = 'http://localhost:3000/api';
    
    // Auth login to get token
    const authRes = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@tad.do', password: 'TadAdmin2026!' })
    });
    const { access_token } = await authRes.json();

    const TEST_DRIVER = 'test-driver-id'; 
    const TEST_DEVICE = 'TAD-TEST-001'; 

    const payload = {
        driverId: TEST_DRIVER,
        deviceId: TEST_DEVICE,
        locations: [
            { lat: 18.4861, lng: -69.9312, speed: 30, ts: Date.now() },
            { lat: 18.4865, lng: -69.9315, speed: 35, ts: Date.now() + 1000 }
        ]
    };

    try {
        const res = await fetch(`${API}/fleet/track-batch`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            console.log('✅ Tracking Batch Success:', data);
        } else {
            console.error('❌ Tracking Batch Failed:', res.status, data);
        }
    } catch (err) {
        console.error('❌ Tracking Batch Error:', err.message);
    }
}

testTracking();

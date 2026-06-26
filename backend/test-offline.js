const BASE_URL = 'http://localhost:5001';

async function runOfflineTest() {
  console.log('🔌 Starting Offline Integration Test (ML Backend Offline)');
  console.log('========================================================');

  // 1. Authenticate guest user
  console.log('🔑 Authenticating guest user...');
  const authResponse = await fetch(`${BASE_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const authData = await authResponse.json();
  const token = authData.data.token;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const payload = {
    title: 'Broken Street Light',
    description: 'The street light is broken and not working since 3 days',
    category: 'Street Lighting',
    location: {
      name: 'Sagar Landmark, Bhopal',
      coordinates: { latitude: 23.3101, longitude: 77.4601 }
    },
    images: [{ url: `${BASE_URL}/uploads/streetlight.png` }]
  };

  try {
    const response = await fetch(`${BASE_URL}/api/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`HTTP Status Code: ${response.status}`);
    console.log(`Response message: "${data.message || ''}"`);

    if (response.status === 400 && data.message === 'Unable to verify uploaded image.') {
      console.log(`✅ Offline test PASSED successfully!`);
      process.exit(0);
    } else {
      console.error(`❌ Offline test FAILED!`);
      console.error(`Expected Status: 400, Got: ${response.status}`);
      console.error(`Expected Message: "Unable to verify uploaded image.", Got: "${data.message}"`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`💥 Error in offline test:`, err.message);
    process.exit(1);
  }
}

runOfflineTest();

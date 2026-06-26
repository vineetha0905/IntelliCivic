const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('🚀 Starting Integration Tests for ML Validation Pipeline');
  console.log('========================================================');

  // 1. Authenticate guest user
  console.log('🔑 Authenticating guest user...');
  const authResponse = await fetch(`${BASE_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const authData = await authResponse.json();
  if (!authData.success) {
    console.error('❌ Authentication failed:', authData);
    process.exit(1);
  }
  
  const token = authData.data.token;
  console.log('✅ Guest authenticated successfully.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  let passed = 0;
  let failed = 0;

  async function assertSubmit(testName, payload, expectedStatus, expectedReasonSubstr) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🧪 Running Test: ${testName}`);
    console.log(`Payload Category: "${payload.category || 'None'}"`);
    console.log(`Payload Description: "${payload.description}"`);
    console.log(`Payload Image URL: "${payload.images?.[0]?.url || 'None'}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/issues`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log(`HTTP Status Code: ${response.status}`);
      console.log(`Response message: "${data.message || ''}"`);
      if (data.reason) {
        console.log(`Response reason: "${data.reason}"`);
      }

      const statusMatches = response.status === expectedStatus;
      let reasonMatches = true;

      if (expectedReasonSubstr) {
        const actualMessage = (data.message || '').toLowerCase();
        const actualReason = (data.reason || '').toLowerCase();
        const searchSubstr = expectedReasonSubstr.toLowerCase();
        reasonMatches = actualMessage.includes(searchSubstr) || actualReason.includes(searchSubstr);
      }

      if (statusMatches && reasonMatches) {
        console.log(`✅ test PASSED`);
        passed++;
      } else {
        console.error(`❌ test FAILED`);
        console.error(`Expected Status: ${expectedStatus}, Got: ${response.status}`);
        if (expectedReasonSubstr) {
          console.error(`Expected Reason Substring: "${expectedReasonSubstr}"`);
        }
        failed++;
      }
    } catch (err) {
      console.error(`💥 test ERROR:`, err.message);
      failed++;
    }
  }

  // TEST 1: Garbage image + Streetlight category -> Should reject: Image does not match the selected category, issue title, or complaint description.
  await assertSubmit(
    'Garbage image with Streetlight category',
    {
      title: 'Broken Street Light',
      description: 'The street light is broken and not working since 3 days',
      category: 'Street Lighting',
      location: {
        name: 'Sagar Landmark, Bhopal',
        coordinates: { latitude: 23.2599, longitude: 77.4126 }
      },
      images: [{ url: `${BASE_URL}/uploads/garbage.png` }]
    },
    400,
    'Image does not match the selected category, issue title, or complaint description.'
  );

  // TEST 2: Streetlight image + Garbage category -> Should reject: Image does not match the selected category, issue title, or complaint description.
  await assertSubmit(
    'Streetlight image with Garbage category',
    {
      title: 'Trash Piled Up',
      description: 'A large dump of garbage is accumulated at the street corner',
      category: 'Garbage & Sanitation',
      location: {
        name: 'Sagar Landmark, Bhopal',
        coordinates: { latitude: 23.2699, longitude: 77.4226 } // Unique coordinates to avoid duplicate matching
      },
      images: [{ url: `${BASE_URL}/uploads/streetlight.png` }]
    },
    400,
    'Image does not match the selected category, issue title, or complaint description.'
  );

  // TEST 3: Garbage image + Garbage category but Mismatched Description -> Should reject: Image does not match the selected category, issue title, or complaint description.
  await assertSubmit(
    'Garbage image + Garbage category but Streetlight description',
    {
      title: 'Broken Street Light',
      description: 'The street light is completely broken and dark', // street light keywords -> Street Lighting
      category: 'Garbage & Sanitation',
      location: {
        name: 'Sagar Landmark, Bhopal',
        coordinates: { latitude: 23.2799, longitude: 77.4326 }
      },
      images: [{ url: `${BASE_URL}/uploads/garbage.png` }]
    },
    400,
    'Image does not match the selected category, issue title, or complaint description.'
  );

  // TEST 4: Abusive Language -> Should reject: Abusive language detected
  await assertSubmit(
    'Abusive language check',
    {
      title: 'Broken Street Light',
      description: 'This is a fucking piece of shit street light that needs fixing immediately',
      category: 'Street Lighting',
      location: {
        name: 'Sagar Landmark, Bhopal',
        coordinates: { latitude: 23.2899, longitude: 77.4426 }
      },
      images: [{ url: `${BASE_URL}/uploads/streetlight.png` }]
    },
    400,
    'Abusive language detected. Please remove inappropriate words before submitting your complaint.'
  );

  // TEST 5: Keyboard Mash / Spam Description -> Should reject: Invalid or spam description
  await assertSubmit(
    'Spam keyboard mashing description',
    {
      title: 'Broken Street Light',
      description: 'asdfghjklqwertyuiop',
      category: 'Street Lighting',
      location: {
        name: 'Sagar Landmark, Bhopal',
        coordinates: { latitude: 23.2999, longitude: 77.4526 }
      },
      images: [{ url: `${BASE_URL}/uploads/streetlight.png` }]
    },
    400,
    'Invalid or spam description.'
  );

  // TEST 6: Valid Streetlight Report -> Should succeed (201)
  const validReportPayload = {
    title: 'Broken Street Light',
    description: 'The street light is broken and not working since 3 days',
    category: 'Street Lighting',
    location: {
      name: 'Sagar Landmark, Bhopal',
      coordinates: { latitude: 23.3101, longitude: 77.4601 }
    },
    images: [{ url: `${BASE_URL}/uploads/streetlight.png` }]
  };

  await assertSubmit(
    'Valid Streetlight report submission',
    validReportPayload,
    201,
    'Issue created successfully'
  );

  // TEST 7: Duplicate Report -> Should reject: Duplicate report detected
  await assertSubmit(
    'Duplicate submission of valid report',
    validReportPayload,
    400,
    'Duplicate report detected.'
  );

  console.log('\n========================================================');
  console.log(`📊 Integration Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.error('❌ Integration tests FAILED!');
    process.exit(1);
  } else {
    console.log('✅ All integration tests PASSED successfully!');
    process.exit(0);
  }
}

runTests();

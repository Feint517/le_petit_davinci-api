/**
 * Test Google OAuth Authentication
 * 
 * This script tests the Google OAuth endpoints
 */

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Testing Google OAuth Implementation\n');
console.log('═'.repeat(50));

async function testGoogleOAuth() {
  try {
    console.log('\n📝 TEST 1: Generate Google OAuth URL');
    console.log('─'.repeat(50));
    
    const response = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ SUCCESS: Google OAuth URL generated');
      console.log(`   Provider: ${data.data.provider}`);
      console.log(`   URL (preview): ${data.data.url.substring(0, 80)}...`);
      console.log('\n   🔗 Full OAuth URL:');
      console.log(`   ${data.data.url}`);
      console.log('\n   📋 To test the complete flow:');
      console.log('   1. Copy the URL above');
      console.log('   2. Open it in your browser');
      console.log('   3. Sign in with Google');
      console.log('   4. You\'ll be redirected with a code parameter');
      console.log('   5. Use that code with: GET /auth/callback?code=YOUR_CODE');
      
      return true;
    } else {
      console.error('❌ FAILED:', data.message || 'Unknown error');
      console.error('   Response:', JSON.stringify(data, null, 2));
      return false;
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.cause) {
      console.error('   Make sure the server is running on port 3000');
      console.error('   Run: npm run dev');
    }
    return false;
  }
}

async function testCallbackEndpoint() {
  console.log('\n\n📝 TEST 2: Verify Callback Endpoint Exists');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${BASE_URL}/auth/callback?code=test_code`, {
      method: 'GET'
    });

    // We expect an error since we're using a fake code
    // But the endpoint should exist (not 404)
    if (response.status === 404) {
      console.error('❌ FAILED: Callback endpoint not found (404)');
      console.error('   The /auth/callback route might not be registered');
      return false;
    } else if (response.status === 400) {
      console.log('✅ SUCCESS: Callback endpoint exists');
      console.log('   (Got expected 400 error for invalid test code)');
      return true;
    } else {
      const data = await response.json();
      console.log('✅ SUCCESS: Callback endpoint exists');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
      return true;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

// Run tests
(async () => {
  const test1 = await testGoogleOAuth();
  const test2 = await testCallbackEndpoint();
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log(`  OAuth URL Generation: ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Callback Endpoint:    ${test2 ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = test1 && test2;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Google OAuth is ready to use.');
    console.log('\n📚 Next Steps:');
    console.log('   1. Copy the OAuth URL from TEST 1 above');
    console.log('   2. Open it in a browser to test the full flow');
    console.log('   3. Implement frontend integration (see docs/GOOGLE-OAUTH-GUIDE.md)');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    console.log('   Make sure the server is running: npm run dev');
  }
  
  process.exit(allPassed ? 0 : 1);
})();


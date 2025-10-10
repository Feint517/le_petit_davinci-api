const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function debugRefreshToken() {
    try {
        console.log('🔍 Debugging refresh token validation issue...\n');

        // Step 1: Create a test user
        console.log('📝 Step 1: Creating test user...');
        const testEmail = `debug-test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';

        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Debug',
            lastName: 'User',
            email: testEmail,
            password: testPassword
        });

        console.log('✅ User created:', registerResponse.data.data.id);

        // Step 2: Login and get tokens
        console.log('\n🔐 Step 2: Logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/validate-credentials`, {
            email: testEmail,
            password: testPassword
        });

        console.log('✅ Credentials validated, PIN:', loginResponse.data.data.debugPin);

        // Step 3: Validate PIN
        console.log('\n🔢 Step 3: Validating PIN...');
        const pinResponse = await axios.post(`${API_BASE_URL}/auth/validate-pin`, {
            userId: loginResponse.data.data.userId,
            pin: loginResponse.data.data.debugPin
        });

        console.log('✅ PIN validated');

        // Step 4: Complete login and get tokens
        console.log('\n📍 Step 4: Completing login...');
        const locationResponse = await axios.post(`${API_BASE_URL}/auth/validate-location`, {
            userId: loginResponse.data.data.userId,
            latitude: 40.7128,
            longitude: -74.0060
        });

        const accessToken = locationResponse.data.data.accessToken;
        const refreshToken = locationResponse.data.data.refreshToken;

        console.log('✅ Login completed');
        console.log('Access Token (first 50 chars):', accessToken.substring(0, 50) + '...');
        console.log('Refresh Token (first 50 chars):', refreshToken.substring(0, 50) + '...');

        // Step 5: Test refresh token validation
        console.log('\n🔄 Step 5: Testing refresh token validation...');

        try {
            const checkResponse = await axios.post(`${API_BASE_URL}/auth/check-refresh-token`, {
                refreshToken: refreshToken
            });
            console.log('✅ Refresh token check successful:', checkResponse.data);
        } catch (error) {
            console.log('❌ Refresh token check failed:', error.response?.data || error.message);
        }

        // Step 6: Test token refresh
        console.log('\n🔄 Step 6: Testing token refresh...');

        try {
            const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-tokens`, {
                refreshToken: refreshToken
            });
            console.log('✅ Token refresh successful:', refreshResponse.data);
        } catch (error) {
            console.log('❌ Token refresh failed:', error.response?.data || error.message);
        }

        // Step 7: Decode the refresh token to see what's in it
        console.log('\n🔍 Step 7: Decoding refresh token...');
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(refreshToken);
            console.log('Decoded refresh token:', decoded);
        } catch (error) {
            console.log('❌ Failed to decode token:', error.message);
        }

        // Step 8: Check what's actually in the database
        console.log('\n🗄️ Step 8: Checking database state...');
        console.log('User ID from login:', loginResponse.data.data.userId);
        console.log('Refresh token from response:', refreshToken.substring(0, 20) + '...');

    } catch (error) {
        console.error('❌ Debug failed:', error.response?.data || error.message);
    }
}

// Run the debug
debugRefreshToken();
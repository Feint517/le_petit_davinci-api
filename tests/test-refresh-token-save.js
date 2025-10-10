/**
 * Test Refresh Token Save
 * 
 * This script tests if the refresh token is being saved to the database properly
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
    email: 'save.test@example.com',
    password: '4n%BqXW07W$7Cs?1y&Xg'
};

async function testRefreshTokenSave() {
    console.log('🔍 Testing Refresh Token Save');
    console.log('============================');

    try {
        // Step 1: Create user
        console.log('\n1. Creating user...');
        const registerResult = await axios.post(`${BASE_URL}/auth/register`, {
            email: TEST_CREDENTIALS.email,
            password: TEST_CREDENTIALS.password,
            firstName: 'Save',
            lastName: 'Test'
        });
        console.log('✅ User created');

        // Step 2: Complete auth flow
        console.log('\n2. Completing authentication flow...');

        const credentialResult = await axios.post(`${BASE_URL}/auth/validate-credentials`, {
            email: TEST_CREDENTIALS.email,
            password: TEST_CREDENTIALS.password
        });

        const userData = credentialResult.data.data;
        console.log(`✅ Credentials validated, User ID: ${userData.userId}`);

        const pinResult = await axios.post(`${BASE_URL}/auth/validate-pin`, {
            userId: userData.userId,
            pin: userData.debugPin
        });
        console.log('✅ PIN validated');

        const locationResult = await axios.post(`${BASE_URL}/auth/validate-location`, {
            userId: userData.userId,
            latitude: 37.7749,
            longitude: -122.4194
        });

        const tokens = locationResult.data.data;
        console.log('✅ Location validated, tokens generated');
        console.log(`   Refresh Token: ${tokens.refreshToken.substring(0, 30)}...`);

        // Step 3: Wait a moment for database update
        console.log('\n3. Waiting for database update...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 4: Test refresh token validation
        console.log('\n4. Testing refresh token validation...');
        try {
            const refreshResult = await axios.post(`${BASE_URL}/auth/check-refresh-token`, {
                refreshToken: tokens.refreshToken
            });
            console.log('✅ Refresh token validation successful');
            console.log(`   User ID: ${refreshResult.data.data.userId}`);
        } catch (error) {
            console.log('❌ Refresh token validation failed');
            console.log(`   Error: ${JSON.stringify(error.response?.data)}`);
            console.log(`   Status: ${error.response?.status}`);
        }

        // Step 5: Test token refresh
        console.log('\n5. Testing token refresh...');
        try {
            const refreshResult = await axios.post(`${BASE_URL}/auth/refresh-tokens`, {
                refreshToken: tokens.refreshToken
            });
            console.log('✅ Token refresh successful');
            console.log(`   New Access Token: ${refreshResult.data.data.accessToken.substring(0, 30)}...`);
        } catch (error) {
            console.log('❌ Token refresh failed');
            console.log(`   Error: ${JSON.stringify(error.response?.data)}`);
            console.log(`   Status: ${error.response?.status}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
    }
}

if (require.main === module) {
    testRefreshTokenSave().catch(console.error);
}

module.exports = { testRefreshTokenSave };

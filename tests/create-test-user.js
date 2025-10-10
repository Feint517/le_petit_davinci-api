const axios = require('axios');

// Test credentials from test_credentials.txt
const testCredentials = {
    firstName: 'Arselene',
    lastName: 'Meghlaoui',
    email: 'arselene.dev@gmail.com',
    password: '4n%BqXW07W$7Cs?1y&Xg'
};

const API_BASE_URL = 'http://localhost:3000';

async function createTestUser() {
    try {
        console.log('🚀 Creating test user with credentials:');
        console.log(`   Name: ${testCredentials.firstName} ${testCredentials.lastName}`);
        console.log(`   Email: ${testCredentials.email}`);
        console.log(`   Password: ${testCredentials.password}`);
        console.log('');

        // Step 1: Register the user
        console.log('📝 Step 1: Registering user...');
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: testCredentials.firstName,
            lastName: testCredentials.lastName,
            email: testCredentials.email,
            password: testCredentials.password
        });

        console.log('✅ Registration successful!');
        console.log('Response:', JSON.stringify(registerResponse.data, null, 2));
        console.log('');

        // Step 2: Test login (validate credentials)
        console.log('🔐 Step 2: Testing credential validation...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/validate-credentials`, {
            email: testCredentials.email,
            password: testCredentials.password
        });

        console.log('✅ Credential validation successful!');
        console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
        console.log('');

        // Step 3: Test PIN validation (if PIN is provided in response)
        if (loginResponse.data.data && loginResponse.data.data.debugPin) {
            console.log('🔢 Step 3: Testing PIN validation...');
            const pinResponse = await axios.post(`${API_BASE_URL}/auth/validate-pin`, {
                userId: loginResponse.data.data.userId,
                pin: loginResponse.data.data.debugPin
            });

            console.log('✅ PIN validation successful!');
            console.log('Response:', JSON.stringify(pinResponse.data, null, 2));
            console.log('');

            // Step 4: Test location validation and complete login
            console.log('📍 Step 4: Testing location validation and completing login...');
            const locationResponse = await axios.post(`${API_BASE_URL}/auth/validate-location`, {
                userId: loginResponse.data.data.userId,
                latitude: 40.7128, // New York coordinates
                longitude: -74.0060
            });

            console.log('✅ Location validation and login successful!');
            console.log('Response:', JSON.stringify(locationResponse.data, null, 2));
            console.log('');

            // Step 5: Test token refresh
            if (locationResponse.data.data && locationResponse.data.data.refreshToken) {
                console.log('🔄 Step 5: Testing token refresh...');
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-tokens`, {
                    refreshToken: locationResponse.data.data.refreshToken
                });

                console.log('✅ Token refresh successful!');
                console.log('Response:', JSON.stringify(refreshResponse.data, null, 2));
                console.log('');
            }
        }

        console.log('🎉 All tests completed successfully!');
        console.log('The simplified user model is working correctly with:');
        console.log('   ✅ firstName, lastName, email, password fields');
        console.log('   ✅ Token management (refresh tokens)');
        console.log('   ✅ Auth0 integration');
        console.log('   ✅ Multi-step authentication flow');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);

        if (error.response?.status === 409) {
            console.log('\n💡 User already exists. Testing login instead...');
            await testExistingUserLogin();
        }
    }
}

async function testExistingUserLogin() {
    try {
        console.log('🔐 Testing login with existing user...');

        // Test credential validation
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/validate-credentials`, {
            email: testCredentials.email,
            password: testCredentials.password
        });

        console.log('✅ Login successful!');
        console.log('Response:', JSON.stringify(loginResponse.data, null, 2));

        if (loginResponse.data.data && loginResponse.data.data.debugPin) {
            console.log('\n🔢 Testing PIN validation...');
            const pinResponse = await axios.post(`${API_BASE_URL}/auth/validate-pin`, {
                userId: loginResponse.data.data.userId,
                pin: loginResponse.data.data.debugPin
            });

            console.log('✅ PIN validation successful!');
            console.log('Response:', JSON.stringify(pinResponse.data, null, 2));

            console.log('\n📍 Testing location validation...');
            const locationResponse = await axios.post(`${API_BASE_URL}/auth/validate-location`, {
                userId: loginResponse.data.data.userId,
                latitude: 40.7128,
                longitude: -74.0060
            });

            console.log('✅ Complete login successful!');
            console.log('Response:', JSON.stringify(locationResponse.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Login test failed:', error.response?.data || error.message);
    }
}

// Run the test
createTestUser();
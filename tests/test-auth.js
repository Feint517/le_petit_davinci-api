/**
 * Authentication System Test Script
 * 
 * This script tests the complete legacy authentication flow:
 * 1. Creates a test user in the database
 * 2. Tests the 3-step authentication process
 * 3. Tests token refresh and logout
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
    email: 'build.test@example.com',
    password: '4n%BqXW07W$7Cs?1y&Xg',
    firstName: 'Build',
    lastName: 'Test'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper function to log with colors
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// Test 1: Check server health
async function testServerHealth() {
    log('\n🔍 Testing server health...', 'cyan');

    const result = await makeRequest('GET', '/auth/health');

    if (result.success) {
        log('✅ Server is healthy', 'green');
        log(`   Response: ${result.data.message}`, 'blue');
        log(`   Auth0 configured: ${result.data.auth0Configured}`, 'blue');
        log(`   Timestamp: ${result.data.timestamp}`, 'blue');
        return true;
    } else {
        log('❌ Server health check failed', 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        return false;
    }
}

// Test 2: Register a test user
async function testUserRegistration() {
    log('\n👤 Testing user registration...', 'cyan');

    const result = await makeRequest('POST', '/auth/register', TEST_USER);

    if (result.success) {
        log('✅ User registered successfully', 'green');
        log(`   User ID: ${result.data.data.id}`, 'blue');
        log(`   Email: ${result.data.data.email}`, 'blue');
        return result.data.data.id;
    } else {
        if (result.status === 409) {
            log('⚠️  User already exists (this is expected)', 'yellow');
            return 'existing_user';
        } else {
            log('❌ User registration failed', 'red');
            log(`   Error: ${JSON.stringify(result.error)}`, 'red');
            return null;
        }
    }
}

// Test 3: Step 1 - Validate credentials
async function testCredentialValidation() {
    log('\n🔐 Testing credential validation (Step 1)...', 'cyan');

    const result = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_USER.email,
        password: TEST_USER.password
    });

    if (result.success) {
        log('✅ Credentials validated successfully', 'green');
        log(`   User ID: ${result.data.data.userId}`, 'blue');
        log(`   Step: ${result.data.data.step}`, 'blue');
        log(`   Debug PIN: ${result.data.data.debugPin}`, 'yellow');
        return {
            userId: result.data.data.userId,
            pin: result.data.data.debugPin
        };
    } else {
        log('❌ Credential validation failed', 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        return null;
    }
}

// Test 4: Step 2 - Validate PIN
async function testPinValidation(userId, pin) {
    log('\n🔢 Testing PIN validation (Step 2)...', 'cyan');

    const result = await makeRequest('POST', '/auth/validate-pin', {
        userId: userId,
        pin: pin
    });

    if (result.success) {
        log('✅ PIN validated successfully', 'green');
        log(`   User ID: ${result.data.data.userId}`, 'blue');
        log(`   Step: ${result.data.data.step}`, 'blue');
        return result.data.data.userId;
    } else {
        log('❌ PIN validation failed', 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        return null;
    }
}

// Test 5: Step 3 - Validate location and complete login
async function testLocationValidation(userId) {
    log('\n📍 Testing location validation (Step 3)...', 'cyan');

    const result = await makeRequest('POST', '/auth/validate-location', {
        userId: userId,
        latitude: 40.7128,
        longitude: -74.0060
    });

    if (result.success) {
        log('✅ Location validated and login completed', 'green');
        log(`   Access Token: ${result.data.data.accessToken.substring(0, 20)}...`, 'blue');
        log(`   Refresh Token: ${result.data.data.refreshToken.substring(0, 20)}...`, 'blue');
        log(`   User: ${result.data.data.user.firstName} ${result.data.data.user.lastName}`, 'blue');
        return {
            accessToken: result.data.data.accessToken,
            refreshToken: result.data.data.refreshToken,
            user: result.data.data.user
        };
    } else {
        log('❌ Location validation failed', 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        return null;
    }
}

// Test 6: Test refresh token validation
async function testRefreshTokenValidation(refreshToken) {
    log('\n🔄 Testing refresh token validation...', 'cyan');

    const result = await makeRequest('POST', '/auth/check-refresh-token', {
        refreshToken: refreshToken
    });

    if (result.success) {
        log('✅ Refresh token is valid', 'green');
        log(`   User ID: ${result.data.data.userId}`, 'blue');
        return true;
    } else {
        log('❌ Refresh token validation failed', 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        return false;
    }
}

// Test 7: Test token refresh
async function testTokenRefresh(refreshToken) {
    log('\n🔄 Testing token refresh...', 'cyan');

    const result = await makeRequest('POST', '/auth/refresh-tokens', {
        refreshToken: refreshToken
    });

    if (result.success) {
        log('✅ Tokens refreshed successfully', 'green');
        log(`   New Access Token: ${result.data.data.accessToken.substring(0, 20)}...`, 'blue');
        log(`   New Refresh Token: ${result.data.data.refreshToken.substring(0, 20)}...`, 'blue');
        return {
            accessToken: result.data.data.accessToken,
            refreshToken: result.data.data.refreshToken
        };
    } else {
        log('❌ Token refresh failed', 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        return null;
    }
}

// Test 8: Test logout
async function testLogout(refreshToken) {
    log('\n🚪 Testing logout...', 'cyan');

    const result = await makeRequest('POST', '/auth/logout', {
        refreshToken: refreshToken
    });

    if (result.success) {
        log('✅ Logout successful', 'green');
        return true;
    } else {
        log('❌ Logout failed', 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        return false;
    }
}

// Test 9: Test invalid credentials
async function testInvalidCredentials() {
    log('\n🚫 Testing invalid credentials...', 'cyan');

    const result = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_USER.email,
        password: 'WrongPassword123!'
    });

    if (!result.success && result.status === 401) {
        log('✅ Invalid credentials properly rejected', 'green');
        return true;
    } else {
        log('❌ Invalid credentials not properly handled', 'red');
        log(`   Expected 401, got ${result.status}`, 'red');
        return false;
    }
}

// Test 10: Test invalid PIN
async function testInvalidPin(userId) {
    log('\n🚫 Testing invalid PIN...', 'cyan');

    const result = await makeRequest('POST', '/auth/validate-pin', {
        userId: userId,
        pin: '9999'
    });

    if (!result.success && (result.status === 400 || result.status === 401)) {
        if (result.status === 400) {
            log('✅ Invalid PIN properly rejected (validation error)', 'green');
            log('   Enhanced validation is working correctly', 'blue');
        } else {
            log('✅ Invalid PIN properly rejected', 'green');
        }
        return true;
    } else {
        log('❌ Invalid PIN not properly handled', 'red');
        log(`   Expected 400 or 401, got ${result.status}`, 'red');
        return false;
    }
}

// Main test function
async function runTests() {
    log('🧪 Starting Authentication System Tests', 'bright');
    log('=====================================', 'bright');

    let testResults = {
        serverHealth: false,
        userRegistration: false,
        credentialValidation: false,
        pinValidation: false,
        locationValidation: false,
        refreshTokenValidation: false,
        tokenRefresh: false,
        logout: false,
        invalidCredentials: false,
        invalidPin: false
    };

    try {

        // Test 1: Server Health
        testResults.serverHealth = await testServerHealth();
        if (!testResults.serverHealth) {
            log('\n❌ Server is not running. Please start the server with: npm run dev', 'red');
            return;
        }

        // Test 2: User Registration
        const userId = await testUserRegistration();
        testResults.userRegistration = userId !== null;

        // Test 3: Credential Validation
        const credentialResult = await testCredentialValidation();
        testResults.credentialValidation = credentialResult !== null;

        if (credentialResult) {
            // Test 4: PIN Validation
            const pinResult = await testPinValidation(credentialResult.userId, credentialResult.pin);
            testResults.pinValidation = pinResult !== null;

            if (pinResult) {
                // Test 5: Location Validation
                const locationResult = await testLocationValidation(pinResult);
                testResults.locationValidation = locationResult !== null;

                if (locationResult) {
                    // Test 6: Refresh Token Validation (before logout)
                    testResults.refreshTokenValidation = await testRefreshTokenValidation(locationResult.refreshToken);

                    // Test 7: Token Refresh (before logout)
                    const refreshResult = await testTokenRefresh(locationResult.refreshToken);
                    testResults.tokenRefresh = refreshResult !== null;

                    // Test 8: Logout (this will invalidate the refresh token)
                    testResults.logout = await testLogout(locationResult.refreshToken);
                }
            }
        }

        // Test 9: Invalid Credentials
        testResults.invalidCredentials = await testInvalidCredentials();

        // Test 10: Invalid PIN
        if (credentialResult) {
            testResults.invalidPin = await testInvalidPin(credentialResult.userId);
        }

    } catch (error) {
        log(`\n💥 Test execution error: ${error.message}`, 'red');
    }

    // Print test summary
    log('\n📊 Test Results Summary', 'bright');
    log('======================', 'bright');

    const tests = [
        { name: 'Server Health', result: testResults.serverHealth },
        { name: 'User Registration', result: testResults.userRegistration },
        { name: 'Credential Validation', result: testResults.credentialValidation },
        { name: 'PIN Validation', result: testResults.pinValidation },
        { name: 'Location Validation', result: testResults.locationValidation },
        { name: 'Refresh Token Validation', result: testResults.refreshTokenValidation },
        { name: 'Token Refresh', result: testResults.tokenRefresh },
        { name: 'Logout', result: testResults.logout },
        { name: 'Invalid Credentials Handling', result: testResults.invalidCredentials },
        { name: 'Invalid PIN Handling', result: testResults.invalidPin }
    ];

    let passedTests = 0;
    tests.forEach(test => {
        const status = test.result ? '✅ PASS' : '❌ FAIL';
        const color = test.result ? 'green' : 'red';
        log(`${status} ${test.name}`, color);
        if (test.result) passedTests++;
    });

    log(`\n🎯 Results: ${passedTests}/${tests.length} tests passed`, passedTests === tests.length ? 'green' : 'yellow');

    if (passedTests === tests.length) {
        log('\n🎉 All tests passed! Authentication system is working correctly.', 'green');
    } else {
        log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
    }
}

// Run the tests
if (require.main === module) {
    runTests().catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { runTests };

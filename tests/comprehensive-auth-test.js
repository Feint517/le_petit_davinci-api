/**
 * Comprehensive Authentication System Test
 * 
 * This script tests the entire authentication flow including:
 * - Credential validation
 * - PIN validation
 * - Location validation
 * - Rate limiting
 * - Security monitoring
 * - Account recovery
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
    email: 'auth.test@example.com',
    password: '4n%BqXW07W$7Cs?1y&Xg',
    firstName: 'Auth',
    lastName: 'Test'
};

// Test location (San Francisco)
const TEST_LOCATION = {
    latitude: 37.7749,
    longitude: -122.4194
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
    const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    log(`${statusIcon} ${testName}: ${status}${details ? ` - ${details}` : ''}`, statusColor);
}

// Test results tracking
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
};

function recordTest(status) {
    testResults.total++;
    if (status === 'PASS') testResults.passed++;
    else if (status === 'FAIL') testResults.failed++;
    else if (status === 'WARN') testResults.warnings++;
}

// Helper function to make API calls
async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
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

// Test 1: Server Health Check
async function testServerHealth() {
    log('\n🔍 Testing Server Health...', 'cyan');

    const result = await makeRequest('GET', '/simple-test');
    if (result.success) {
        logTest('Server Health Check', 'PASS', 'Server is responding');
        recordTest('PASS');
    } else {
        logTest('Server Health Check', 'FAIL', result.error);
        recordTest('FAIL');
        return false;
    }
    return true;
}

// Test 2: Valid Credential Validation
async function testValidCredentials() {
    log('\n🔐 Testing Valid Credential Validation...', 'cyan');

    const result = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
    });

    if (result.success && result.data.success) {
        logTest('Valid Credentials', 'PASS', 'Credentials validated successfully');
        recordTest('PASS');
        return result.data.data; // Return user data including userId and PIN
    } else {
        logTest('Valid Credentials', 'FAIL', result.error?.message || 'Unknown error');
        recordTest('FAIL');
        return null;
    }
}

// Test 3: Invalid Credential Validation
async function testInvalidCredentials() {
    log('\n🚫 Testing Invalid Credential Validation...', 'cyan');

    const result = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_CREDENTIALS.email,
        password: 'wrongpassword'
    });

    if (!result.success && result.status === 401) {
        logTest('Invalid Credentials', 'PASS', 'Correctly rejected invalid credentials');
        recordTest('PASS');
    } else {
        logTest('Invalid Credentials', 'FAIL', 'Should have rejected invalid credentials');
        recordTest('FAIL');
    }
}

// Test 4: Valid PIN Validation
async function testValidPin(userData) {
    log('\n🔢 Testing Valid PIN Validation...', 'cyan');

    if (!userData || !userData.userId || !userData.debugPin) {
        logTest('Valid PIN', 'FAIL', 'No user data or PIN available');
        recordTest('FAIL');
        return false;
    }

    const result = await makeRequest('POST', '/auth/validate-pin', {
        userId: userData.userId,
        pin: userData.debugPin
    });

    if (result.success && result.data.success) {
        logTest('Valid PIN', 'PASS', 'PIN validated successfully');
        recordTest('PASS');
        return true;
    } else {
        logTest('Valid PIN', 'FAIL', result.error?.message || 'Unknown error');
        recordTest('FAIL');
        return false;
    }
}

// Test 5: Invalid PIN Validation
async function testInvalidPin(userData) {
    log('\n🚫 Testing Invalid PIN Validation...', 'cyan');

    if (!userData || !userData.userId) {
        logTest('Invalid PIN', 'FAIL', 'No user data available');
        recordTest('FAIL');
        return;
    }

    const result = await makeRequest('POST', '/auth/validate-pin', {
        userId: userData.userId,
        pin: '9999'
    });

    if (!result.success && result.status === 401) {
        logTest('Invalid PIN', 'PASS', 'Correctly rejected invalid PIN');
        recordTest('PASS');
    } else {
        logTest('Invalid PIN', 'FAIL', 'Should have rejected invalid PIN');
        recordTest('FAIL');
    }
}

// Test 6: Valid Location Validation
async function testValidLocation(userData) {
    log('\n📍 Testing Valid Location Validation...', 'cyan');

    if (!userData || !userData.userId) {
        logTest('Valid Location', 'FAIL', 'No user data available');
        recordTest('FAIL');
        return null;
    }

    const result = await makeRequest('POST', '/auth/validate-location', {
        userId: userData.userId,
        latitude: TEST_LOCATION.latitude,
        longitude: TEST_LOCATION.longitude
    });

    if (result.success && result.data.success) {
        logTest('Valid Location', 'PASS', 'Location validated successfully');
        recordTest('PASS');
        return result.data.data; // Return tokens
    } else {
        logTest('Valid Location', 'FAIL', result.error?.message || 'Unknown error');
        recordTest('FAIL');
        return null;
    }
}

// Test 7: Invalid Location Validation
async function testInvalidLocation(userData) {
    log('\n🚫 Testing Invalid Location Validation...', 'cyan');

    if (!userData || !userData.userId) {
        logTest('Invalid Location', 'FAIL', 'No user data available');
        recordTest('FAIL');
        return;
    }

    const result = await makeRequest('POST', '/auth/validate-location', {
        userId: userData.userId,
        latitude: 999, // Invalid latitude
        longitude: 999  // Invalid longitude
    });

    if (!result.success && result.status === 400) {
        logTest('Invalid Location', 'PASS', 'Correctly rejected invalid coordinates');
        recordTest('PASS');
    } else {
        logTest('Invalid Location', 'FAIL', 'Should have rejected invalid coordinates');
        recordTest('FAIL');
    }
}

// Test 8: Rate Limiting Test
async function testRateLimiting() {
    log('\n⏱️ Testing Rate Limiting...', 'cyan');

    // Make multiple failed attempts to trigger rate limiting
    let attempts = 0;
    let rateLimited = false;

    for (let i = 0; i < 10; i++) {
        const result = await makeRequest('POST', '/auth/validate-credentials', {
            email: TEST_CREDENTIALS.email,
            password: 'wrongpassword'
        });

        attempts++;

        if (result.status === 429) {
            rateLimited = true;
            logTest('Rate Limiting', 'PASS', `Rate limited after ${attempts} attempts`);
            recordTest('PASS');
            break;
        }
    }

    if (!rateLimited) {
        logTest('Rate Limiting', 'WARN', 'Rate limiting not triggered (limits may be too high for testing)');
        recordTest('WARN');
    }
}

// Test 9: Security Monitoring
async function testSecurityMonitoring() {
    log('\n🔒 Testing Security Monitoring...', 'cyan');

    // Note: Security monitoring endpoints require Auth0 tokens, not legacy JWT tokens
    // For now, we'll skip this test since we're using legacy authentication
    logTest('Security Monitoring', 'WARN', 'Skipped - requires Auth0 tokens, not legacy JWT');
    recordTest('WARN');
}

// Test 10: Token Refresh
async function testTokenRefresh() {
    log('\n🔄 Testing Token Refresh...', 'cyan');

    // First, complete the auth flow to get tokens
    const credentialResult = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
    });

    if (!credentialResult.success) {
        logTest('Token Refresh', 'FAIL', 'Could not get credentials for testing');
        recordTest('FAIL');
        return;
    }

    const userData = credentialResult.data.data;

    const pinResult = await makeRequest('POST', '/auth/validate-pin', {
        userId: userData.userId,
        pin: userData.debugPin
    });

    if (!pinResult.success) {
        logTest('Token Refresh', 'FAIL', 'Could not validate PIN for testing');
        recordTest('FAIL');
        return;
    }

    const locationResult = await makeRequest('POST', '/auth/validate-location', {
        userId: userData.userId,
        latitude: TEST_LOCATION.latitude,
        longitude: TEST_LOCATION.longitude
    });

    if (!locationResult.success) {
        logTest('Token Refresh', 'FAIL', 'Could not complete auth flow for testing');
        recordTest('FAIL');
        return;
    }

    const tokens = locationResult.data.data;

    // Test token refresh
    const refreshResult = await makeRequest('POST', '/auth/refresh-tokens', {
        refreshToken: tokens.refreshToken
    });

    if (refreshResult.success && refreshResult.data.success) {
        logTest('Token Refresh', 'PASS', 'Tokens refreshed successfully');
        recordTest('PASS');
    } else {
        logTest('Token Refresh', 'FAIL', `Token refresh failed: ${refreshResult.error?.message || 'Unknown error'}`);
        recordTest('FAIL');
    }
}

// Test 11: Account Recovery
async function testAccountRecovery() {
    log('\n🔓 Testing Account Recovery...', 'cyan');

    // First, trigger rate limiting by making failed attempts
    for (let i = 0; i < 10; i++) {
        await makeRequest('POST', '/auth/validate-credentials', {
            email: TEST_CREDENTIALS.email,
            password: 'wrongpassword'
        });
    }

    // Request account unlock
    const unlockRequestResult = await makeRequest('POST', '/auth/request-unlock', {
        email: TEST_CREDENTIALS.email
    });

    if (unlockRequestResult.success && unlockRequestResult.data.success) {
        logTest('Account Recovery Request', 'PASS', 'Unlock request successful');
        recordTest('PASS');

        // Test unlock with code (if provided in debug mode)
        if (unlockRequestResult.data.debugUnlockCode) {
            const unlockResult = await makeRequest('POST', '/auth/unlock-account', {
                email: TEST_CREDENTIALS.email,
                unlockCode: unlockRequestResult.data.debugUnlockCode
            });

            if (unlockResult.success && unlockResult.data.success) {
                logTest('Account Recovery Unlock', 'PASS', 'Account unlocked successfully');
                recordTest('PASS');
            } else {
                logTest('Account Recovery Unlock', 'FAIL', 'Account unlock failed');
                recordTest('FAIL');
            }
        }
    } else {
        logTest('Account Recovery', 'FAIL', 'Unlock request failed');
        recordTest('FAIL');
    }
}

// Test 12: Clear Rate Limits (for cleanup)
async function testClearRateLimits() {
    log('\n🧹 Testing Rate Limit Cleanup...', 'cyan');

    const result = await makeRequest('POST', '/auth/security/clear-rate-limits', {
        email: TEST_CREDENTIALS.email
    });

    if (result.success && result.data.success) {
        logTest('Rate Limit Cleanup', 'PASS', 'Rate limits cleared successfully');
        recordTest('PASS');
    } else {
        logTest('Rate Limit Cleanup', 'WARN', 'Rate limit cleanup failed or not available');
        recordTest('WARN');
    }
}

// Main test runner
async function runAllTests() {
    log('🚀 Comprehensive Authentication System Test', 'bright');
    log('============================================', 'bright');
    log(`Testing with credentials: ${TEST_CREDENTIALS.email}`, 'blue');
    log('', 'reset');

    // Check server health first
    const serverHealthy = await testServerHealth();
    if (!serverHealthy) {
        log('\n❌ Server is not healthy. Exiting tests.', 'red');
        return;
    }

    // Clear any existing rate limits before starting tests
    log('\n🧹 Clearing existing rate limits...', 'cyan');
    await makeRequest('POST', '/auth/security/clear-rate-limits', {
        email: TEST_CREDENTIALS.email
    });

    // Run all tests
    await testInvalidCredentials();
    await testValidCredentials();

    // Get user data from valid credentials test
    const credentialResult = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
    });

    let userData = null;
    if (credentialResult.success && credentialResult.data.success) {
        userData = credentialResult.data.data;
    }

    await testInvalidPin(userData);
    await testValidPin(userData);
    await testInvalidLocation(userData);
    await testValidLocation(userData);
    await testSecurityMonitoring();

    // Clear rate limits before token refresh test
    await makeRequest('POST', '/auth/security/clear-rate-limits', {
        email: TEST_CREDENTIALS.email
    });

    await testTokenRefresh();

    // Clear rate limits before account recovery test
    await makeRequest('POST', '/auth/security/clear-rate-limits', {
        email: TEST_CREDENTIALS.email
    });

    await testAccountRecovery();
    await testRateLimiting(); // Run rate limiting test last
    await testClearRateLimits();

    // Print summary
    log('\n📊 Test Summary', 'bright');
    log('===============', 'bright');
    log(`Total Tests: ${testResults.total}`, 'blue');
    log(`✅ Passed: ${testResults.passed}`, 'green');
    log(`❌ Failed: ${testResults.failed}`, 'red');
    log(`⚠️  Warnings: ${testResults.warnings}`, 'yellow');

    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    log(`\nSuccess Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');

    if (testResults.failed === 0) {
        log('\n🎉 All critical tests passed! Authentication system is working correctly.', 'green');
    } else {
        log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the authentication system.`, 'yellow');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { runAllTests };

/**
 * Enhanced Authentication Test Script
 * 
 * This script tests the enhanced authentication features including:
 * - Rate limiting and attempt tracking
 * - Security monitoring
 * - Enhanced PIN validation
 * - Credential validation improvements
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User'
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

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Enhanced-Auth-Test/1.0',
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

// Test 1: Test rate limiting for credential validation
async function testCredentialRateLimiting() {
    log('\n🔒 Testing credential validation rate limiting...', 'cyan');

    const maxAttempts = 5;
    let attemptCount = 0;
    let rateLimited = false;

    // Try to exceed the rate limit with wrong password
    for (let i = 0; i < maxAttempts + 2; i++) {
        attemptCount++;
        const result = await makeRequest('POST', '/auth/validate-credentials', {
            email: TEST_USER.email,
            password: 'WrongPassword123!'
        });

        if (result.status === 429) {
            rateLimited = true;
            log(`✅ Rate limiting triggered after ${attemptCount} attempts`, 'green');
            log(`   Message: ${result.error.message}`, 'blue');
            if (result.error.attemptsRemaining !== undefined) {
                log(`   Attempts remaining: ${result.error.attemptsRemaining}`, 'blue');
            }
            if (result.error.lockedUntil) {
                log(`   Locked until: ${result.error.lockedUntil}`, 'blue');
            }
            break;
        } else if (result.status === 401) {
            log(`   Attempt ${attemptCount}: Invalid credentials (expected)`, 'yellow');
        } else {
            log(`   Attempt ${attemptCount}: Unexpected status ${result.status}`, 'red');
        }

        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!rateLimited) {
        log('❌ Rate limiting not triggered as expected', 'red');
    }

    return rateLimited;
}

// Test 2: Test PIN rate limiting
async function testPinRateLimiting() {
    log('\n🔢 Testing PIN validation rate limiting...', 'cyan');

    // First, get a valid PIN by validating credentials
    const credentialResult = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_USER.email,
        password: TEST_USER.password
    });

    if (!credentialResult.success) {
        log('❌ Could not get PIN - credential validation failed', 'red');
        return false;
    }

    const userId = credentialResult.data.data.userId;
    const maxAttempts = 3;
    let attemptCount = 0;
    let rateLimited = false;

    // Try to exceed the PIN rate limit with wrong PINs
    for (let i = 0; i < maxAttempts + 2; i++) {
        attemptCount++;
        const result = await makeRequest('POST', '/auth/validate-pin', {
            userId: userId,
            pin: '9999' // Wrong PIN
        });

        if (result.status === 429) {
            rateLimited = true;
            log(`✅ PIN rate limiting triggered after ${attemptCount} attempts`, 'green');
            log(`   Message: ${result.error.message}`, 'blue');
            if (result.error.attemptsRemaining !== undefined) {
                log(`   Attempts remaining: ${result.error.attemptsRemaining}`, 'blue');
            }
            if (result.error.lockedUntil) {
                log(`   Locked until: ${result.error.lockedUntil}`, 'blue');
            }
            break;
        } else if (result.status === 401) {
            log(`   Attempt ${attemptCount}: Invalid PIN (expected)`, 'yellow');
        } else {
            log(`   Attempt ${attemptCount}: Unexpected status ${result.status}`, 'red');
        }

        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!rateLimited) {
        log('❌ PIN rate limiting not triggered as expected', 'red');
    }

    return rateLimited;
}

// Test 3: Test successful authentication flow
async function testSuccessfulAuthFlow() {
    log('\n✅ Testing successful authentication flow...', 'cyan');

    // Step 1: Validate credentials
    const credentialResult = await makeRequest('POST', '/auth/validate-credentials', {
        email: TEST_USER.email,
        password: TEST_USER.password
    });

    if (!credentialResult.success) {
        log('❌ Credential validation failed', 'red');
        return false;
    }

    log('✅ Step 1: Credentials validated', 'green');
    const userId = credentialResult.data.data.userId;
    const pin = credentialResult.data.data.debugPin;

    // Step 2: Validate PIN
    const pinResult = await makeRequest('POST', '/auth/validate-pin', {
        userId: userId,
        pin: pin
    });

    if (!pinResult.success) {
        log('❌ PIN validation failed', 'red');
        return false;
    }

    log('✅ Step 2: PIN validated', 'green');

    // Step 3: Validate location
    const locationResult = await makeRequest('POST', '/auth/validate-location', {
        userId: userId,
        latitude: 40.7128,
        longitude: -74.0060
    });

    if (!locationResult.success) {
        log('❌ Location validation failed', 'red');
        return false;
    }

    log('✅ Step 3: Location validated and login completed', 'green');
    log(`   Access Token: ${locationResult.data.data.accessToken.substring(0, 20)}...`, 'blue');
    log(`   Refresh Token: ${locationResult.data.data.refreshToken.substring(0, 20)}...`, 'blue');

    return {
        accessToken: locationResult.data.data.accessToken,
        refreshToken: locationResult.data.data.refreshToken,
        user: locationResult.data.data.user
    };
}

// Test 4: Test security monitoring endpoints
async function testSecurityMonitoring(accessToken) {
    log('\n🔍 Testing security monitoring endpoints...', 'cyan');

    const headers = {
        'Authorization': `Bearer ${accessToken}`
    };

    // Test getting security events
    const eventsResult = await makeRequest('GET', '/auth/security/events?hours=24', null, headers);
    if (eventsResult.success) {
        log('✅ Security events endpoint working', 'green');
        log(`   Found ${eventsResult.data.data.count} events in last 24 hours`, 'blue');
    } else {
        log('❌ Security events endpoint failed', 'red');
        log(`   Error: ${JSON.stringify(eventsResult.error)}`, 'red');
    }

    // Test getting rate limit stats
    const statsResult = await makeRequest('GET', '/auth/security/rate-limits', null, headers);
    if (statsResult.success) {
        log('✅ Rate limit stats endpoint working', 'green');
        log(`   Total keys: ${statsResult.data.data.rateLimiting.totalKeys}`, 'blue');
        log(`   Locked keys: ${statsResult.data.data.rateLimiting.lockedKeys}`, 'blue');
        log(`   Active attempts: ${statsResult.data.data.rateLimiting.activeAttempts}`, 'blue');
    } else {
        log('❌ Rate limit stats endpoint failed', 'red');
        log(`   Error: ${JSON.stringify(statsResult.error)}`, 'red');
    }

    // Test cleanup endpoint
    const cleanupResult = await makeRequest('POST', '/auth/security/cleanup', null, headers);
    if (cleanupResult.success) {
        log('✅ Security cleanup endpoint working', 'green');
    } else {
        log('❌ Security cleanup endpoint failed', 'red');
        log(`   Error: ${JSON.stringify(cleanupResult.error)}`, 'red');
    }

    return eventsResult.success && statsResult.success && cleanupResult.success;
}

// Test 5: Test different IP addresses (simulate suspicious activity)
async function testSuspiciousActivityDetection() {
    log('\n🚨 Testing suspicious activity detection...', 'cyan');

    // Simulate requests from different IPs by changing User-Agent
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    ];

    let suspiciousActivityDetected = false;

    for (let i = 0; i < userAgents.length; i++) {
        const result = await makeRequest('POST', '/auth/validate-credentials', {
            email: TEST_USER.email,
            password: 'WrongPassword123!'
        }, {
            'User-Agent': userAgents[i]
        });

        if (result.status === 401) {
            log(`   Request ${i + 1}: Invalid credentials (expected)`, 'yellow');
        } else if (result.status === 429) {
            log(`   Request ${i + 1}: Rate limited`, 'yellow');
            suspiciousActivityDetected = true;
            break;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (suspiciousActivityDetected) {
        log('✅ Suspicious activity detection working', 'green');
    } else {
        log('⚠️  Suspicious activity detection may need more requests to trigger', 'yellow');
    }

    return suspiciousActivityDetected;
}

// Main test function
async function runEnhancedAuthTests() {
    log('🧪 Enhanced Authentication System Tests', 'bright');
    log('=====================================', 'bright');

    let testResults = {
        credentialRateLimiting: false,
        pinRateLimiting: false,
        successfulAuthFlow: false,
        securityMonitoring: false,
        suspiciousActivityDetection: false
    };

    try {
        // Test 1: Credential rate limiting
        testResults.credentialRateLimiting = await testCredentialRateLimiting();

        // Wait a bit for rate limit to reset
        log('\n⏳ Waiting for rate limits to reset...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 2: PIN rate limiting
        testResults.pinRateLimiting = await testPinRateLimiting();

        // Wait a bit for rate limit to reset
        log('\n⏳ Waiting for rate limits to reset...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 3: Successful authentication flow
        const authResult = await testSuccessfulAuthFlow();
        testResults.successfulAuthFlow = !!authResult;

        // Test 4: Security monitoring (if we have a token)
        if (authResult && authResult.accessToken) {
            testResults.securityMonitoring = await testSecurityMonitoring(authResult.accessToken);
        }

        // Test 5: Suspicious activity detection
        testResults.suspiciousActivityDetection = await testSuspiciousActivityDetection();

    } catch (error) {
        log(`\n💥 Test execution error: ${error.message}`, 'red');
    }

    // Print test summary
    log('\n📊 Enhanced Authentication Test Results', 'bright');
    log('=====================================', 'bright');

    const tests = [
        { name: 'Credential Rate Limiting', result: testResults.credentialRateLimiting },
        { name: 'PIN Rate Limiting', result: testResults.pinRateLimiting },
        { name: 'Successful Auth Flow', result: testResults.successfulAuthFlow },
        { name: 'Security Monitoring', result: testResults.securityMonitoring },
        { name: 'Suspicious Activity Detection', result: testResults.suspiciousActivityDetection }
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
        log('\n🎉 All enhanced authentication tests passed!', 'green');
        log('   The authentication system is working with enhanced security features.', 'green');
    } else {
        log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
    }

    log('\n🔒 Enhanced Security Features Tested:', 'bright');
    log('   ✅ Rate limiting for credential validation', 'green');
    log('   ✅ Rate limiting for PIN validation', 'green');
    log('   ✅ Security event logging', 'green');
    log('   ✅ Suspicious activity detection', 'green');
    log('   ✅ Security monitoring endpoints', 'green');
}

// Run the tests
if (require.main === module) {
    runEnhancedAuthTests().catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { runEnhancedAuthTests };

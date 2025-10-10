/**
 * Simple Server Test Script
 * 
 * This script tests basic server functionality without requiring database setup
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
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
        const success = response.status === expectedStatus;

        log(`${success ? '✅' : '❌'} ${method} ${endpoint} - Status: ${response.status}`, success ? 'green' : 'red');

        if (response.data) {
            log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`, 'blue');
        }

        return { success, status: response.status, data: response.data };
    } catch (error) {
        const status = error.response?.status || 0;
        const success = status === expectedStatus;

        log(`${success ? '✅' : '❌'} ${method} ${endpoint} - Status: ${status}`, success ? 'green' : 'red');

        if (error.response?.data) {
            log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`, 'red');
        } else {
            log(`   Error: ${error.message}`, 'red');
        }

        return { success, status, data: error.response?.data, error: error.message };
    }
}

async function runServerTests() {
    log('🧪 Server Endpoint Tests', 'bright');
    log('========================', 'bright');

    const tests = [
        // Basic server tests
        { method: 'GET', endpoint: '/simple-test', expectedStatus: 200 },
        { method: 'GET', endpoint: '/test', expectedStatus: 200 },
        { method: 'GET', endpoint: '/auth/health', expectedStatus: 200 },

        // Auth endpoint tests (these will fail without proper setup, but we can see the responses)
        {
            method: 'POST', endpoint: '/auth/register', data: {
                email: 'test@example.com',
                password: 'SecurePass123!',
                firstName: 'Test',
                lastName: 'User'
            }, expectedStatus: 500
        }, // Expected to fail without Supabase setup

        {
            method: 'POST', endpoint: '/auth/validate-credentials', data: {
                email: 'test@example.com',
                password: 'SecurePass123!'
            }, expectedStatus: 500
        }, // Expected to fail without Supabase setup

        // Test invalid endpoints
        { method: 'GET', endpoint: '/nonexistent', expectedStatus: 404 },
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        const result = await testEndpoint(test.method, test.endpoint, test.data, test.expectedStatus);
        if (result.success) {
            passedTests++;
        }
        log(''); // Empty line for readability
    }

    log('📊 Test Results Summary', 'bright');
    log('======================', 'bright');
    log(`✅ Passed: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');

    if (passedTests === totalTests) {
        log('\n🎉 All server tests passed!', 'green');
    } else {
        log('\n⚠️  Some tests failed (this is expected without proper database setup)', 'yellow');
    }

    log('\n💡 Next Steps:', 'bright');
    log('   1. Set up Supabase environment variables in .env file', 'blue');
    log('   2. Run: npm run test:user (to create test user)', 'blue');
    log('   3. Run: npm run test:auth (to test full authentication flow)', 'blue');
}

if (require.main === module) {
    runServerTests().catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { runServerTests };

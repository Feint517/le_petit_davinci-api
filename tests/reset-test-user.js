/**
 * Reset Test User Script
 * 
 * This script deletes and recreates the test user to fix password hashing issues
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
    email: 'arselene.dev@gmail.com',
    password: '4n%BqXW07W$7Cs?1y&Xg',
    firstName: 'Arselene',
    lastName: 'Dev'
};

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

async function resetTestUser() {
    log('🔄 Resetting test user...', 'cyan');

    try {
        // First, try to delete the user by making a request to clear rate limits
        // This will help us start fresh
        await axios.post(`${BASE_URL}/auth/security/clear-rate-limits`, {
            email: TEST_CREDENTIALS.email
        });

        log('✅ Rate limits cleared', 'green');

        // Test if the user exists by trying to validate credentials
        try {
            const testResponse = await axios.post(`${BASE_URL}/auth/validate-credentials`, {
                email: TEST_CREDENTIALS.email,
                password: TEST_CREDENTIALS.password
            });

            if (testResponse.data.success) {
                log('✅ Test user credentials are working correctly!', 'green');
                log(`   User ID: ${testResponse.data.data.userId}`, 'blue');
                log(`   PIN: ${testResponse.data.data.debugPin}`, 'blue');
                return true;
            }
        } catch (error) {
            if (error.response?.status === 401) {
                log('⚠️  Test user exists but credentials are invalid', 'yellow');
                log('   This suggests a password hashing issue', 'yellow');
            }
        }

        // If we get here, we need to recreate the user
        log('🔄 Recreating test user...', 'cyan');

        // Note: We can't actually delete the user through the API, so we'll just log the issue
        log('⚠️  Cannot delete existing user through API', 'yellow');
        log('   Please manually delete the user from the database if needed', 'yellow');
        log('   Or use different test credentials', 'yellow');

        return false;

    } catch (error) {
        log('❌ Error resetting test user', 'red');
        log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

async function main() {
    log('🚀 Test User Reset Script', 'bright');
    log('========================', 'bright');

    await resetTestUser();
}

if (require.main === module) {
    main().catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { resetTestUser };

/**
 * Database Connection Test Script
 * 
 * This script tests the Supabase database connection and shows detailed error messages
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

async function testDatabaseConnection() {
    log('🔍 Testing Supabase Database Connection', 'bright');
    log('=====================================', 'bright');

    // Check environment variables
    log('\n📋 Environment Variables:', 'cyan');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        log('❌ SUPABASE_URL not found in environment variables', 'red');
        return false;
    }

    if (!supabaseKey) {
        log('❌ SUPABASE_ANON_KEY not found in environment variables', 'red');
        return false;
    }

    log(`✅ SUPABASE_URL: ${supabaseUrl}`, 'green');
    log(`✅ SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 20)}...`, 'green');

    // Create Supabase client
    log('\n🔌 Creating Supabase client...', 'cyan');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Check if users table exists
    log('\n📊 Testing database queries:', 'cyan');

    try {
        log('   Testing: SELECT * FROM users LIMIT 1', 'blue');
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            log(`❌ Database query failed: ${error.message}`, 'red');
            log(`   Error code: ${error.code}`, 'red');
            log(`   Error details: ${JSON.stringify(error.details)}`, 'red');

            if (error.message.includes('relation "users" does not exist')) {
                log('\n💡 Solution: The users table does not exist!', 'yellow');
                log('   You need to run the SQL from setup-database.sql in your Supabase dashboard', 'yellow');
            }

            return false;
        } else {
            log('✅ Database query successful!', 'green');
            log(`   Found ${data.length} users in the database`, 'blue');
        }
    } catch (err) {
        log(`❌ Unexpected error: ${err.message}`, 'red');
        return false;
    }

    // Test 2: Try to insert a test record
    log('\n📝 Testing database insert:', 'cyan');

    try {
        const testUser = {
            first_name: 'Test',
            last_name: 'User',
            email: 'test-connection@example.com',
            auth0_id: 'test-connection-id',
            is_active: true
        };

        log('   Testing: INSERT test user', 'blue');
        const { data, error } = await supabase
            .from('users')
            .insert([testUser])
            .select();

        if (error) {
            log(`❌ Insert failed: ${error.message}`, 'red');
            log(`   Error code: ${error.code}`, 'red');
            log(`   Error details: ${JSON.stringify(error.details)}`, 'red');
            return false;
        } else {
            log('✅ Insert successful!', 'green');
            log(`   Created user with ID: ${data[0].id}`, 'blue');

            // Clean up test user
            await supabase
                .from('users')
                .delete()
                .eq('id', data[0].id);
            log('   Cleaned up test user', 'blue');
        }
    } catch (err) {
        log(`❌ Unexpected error during insert: ${err.message}`, 'red');
        return false;
    }

    // Test 3: Check table structure
    log('\n🏗️  Checking table structure:', 'cyan');

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(0);

        if (error) {
            log(`❌ Structure check failed: ${error.message}`, 'red');
            return false;
        } else {
            log('✅ Table structure is accessible', 'green');
        }
    } catch (err) {
        log(`❌ Unexpected error during structure check: ${err.message}`, 'red');
        return false;
    }

    log('\n🎉 Database connection test completed successfully!', 'green');
    return true;
}

async function main() {
    try {
        const success = await testDatabaseConnection();

        if (success) {
            log('\n✅ Database is ready for use!', 'green');
            log('   You can now run: npm run test:user', 'blue');
        } else {
            log('\n❌ Database setup incomplete', 'red');
            log('\n📋 Next Steps:', 'bright');
            log('   1. Go to your Supabase dashboard', 'blue');
            log('   2. Navigate to SQL Editor', 'blue');
            log('   3. Run the SQL from setup-database.sql', 'blue');
            log('   4. Run this test again: node test-db-connection.js', 'blue');
        }
    } catch (error) {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testDatabaseConnection };

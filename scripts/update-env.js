/**
 * Update Environment Variables Script
 * 
 * This script updates the existing .env file with proper JWT secrets
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

function updateEnvFile() {
    const envPath = path.join(__dirname, '.env');

    // Check if .env exists
    if (!fs.existsSync(envPath)) {
        log('❌ .env file not found!', 'red');
        log('   Please run: npm run setup', 'yellow');
        return false;
    }

    // Read current .env content
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Generate new JWT secrets
    const jwtSecret = generateRandomString(32);
    const jwtRefreshSecret = generateRandomString(32);

    // Update JWT secrets
    envContent = envContent.replace(
        /ACCESS_TOKEN_SECRET=.*/,
        `JWT_SECRET=${jwtSecret}`
    );

    envContent = envContent.replace(
        /REFRESH_TOKEN_SECRET=.*/,
        `JWT_REFRESH_SECRET=${jwtRefreshSecret}`
    );

    // Write updated content
    try {
        fs.writeFileSync(envPath, envContent);
        log('✅ .env file updated successfully!', 'green');
        log('   - Generated new JWT secrets', 'blue');
        log('   - Updated variable names to match code', 'blue');
        return true;
    } catch (error) {
        log('❌ Failed to update .env file', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

function checkSupabaseConfig() {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const hasSupabaseUrl = envContent.includes('SUPABASE_URL=https://') &&
        !envContent.includes('SUPABASE_URL=your-');
    const hasSupabaseKey = envContent.includes('SUPABASE_ANON_KEY=eyJ') &&
        !envContent.includes('SUPABASE_ANON_KEY=your-');

    log('\n🔍 Checking Supabase Configuration:', 'cyan');

    if (hasSupabaseUrl) {
        log('✅ SUPABASE_URL is configured', 'green');
    } else {
        log('❌ SUPABASE_URL needs to be configured', 'red');
    }

    if (hasSupabaseKey) {
        log('✅ SUPABASE_ANON_KEY is configured', 'green');
    } else {
        log('❌ SUPABASE_ANON_KEY needs to be configured', 'red');
    }

    return hasSupabaseUrl && hasSupabaseKey;
}

function showNextSteps() {
    log('\n📋 Next Steps:', 'bright');
    log('=============', 'bright');

    log('\n1. 🗄️  Set Up Database Schema:', 'cyan');
    log('   - Go to your Supabase project dashboard', 'blue');
    log('   - Navigate to SQL Editor', 'blue');
    log('   - Copy and run the SQL from SUPABASE_MIGRATION.md', 'blue');

    log('\n2. 🧪 Test the Connection:', 'cyan');
    log('   - Run: npm run test:user', 'blue');
    log('   - Run: npm run test:auth', 'blue');

    log('\n📖 Documentation:', 'yellow');
    log('   - SUPABASE_MIGRATION.md (database schema)', 'blue');
    log('   - TEST_SCRIPTS_README.md (testing guide)', 'blue');
}

async function main() {
    log('🔧 Environment Update Script', 'bright');
    log('============================', 'bright');

    // Update JWT secrets
    log('\n📝 Updating JWT secrets...', 'cyan');
    const updateSuccess = updateEnvFile();

    if (!updateSuccess) {
        log('\n❌ Update failed. Please check the errors above.', 'red');
        return;
    }

    // Check Supabase configuration
    const supabaseConfigured = checkSupabaseConfig();

    if (supabaseConfigured) {
        log('\n🎉 Configuration looks good!', 'green');
        showNextSteps();
    } else {
        log('\n⚠️  Supabase configuration incomplete', 'yellow');
        log('   Please update your Supabase credentials in the .env file', 'yellow');
    }
}

if (require.main === module) {
    main().catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { updateEnvFile, checkSupabaseConfig };

/**
 * Environment Setup Script
 * 
 * This script helps you create the .env file with the correct configuration
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
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateRandomString(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function createEnvFile() {
    const envPath = path.join(__dirname, '.env');

    // Check if .env already exists
    if (fs.existsSync(envPath)) {
        log('⚠️  .env file already exists!', 'yellow');
        log('   If you want to recreate it, please delete the existing .env file first.', 'yellow');
        return false;
    }

    // Generate random JWT secrets
    const jwtSecret = generateRandomString(32);
    const jwtRefreshSecret = generateRandomString(32);

    const envContent = `# Server Configuration
PORT=3000

# Supabase Configuration
# Get these from your Supabase project settings > API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Configuration
# Generated random secrets (keep these secure!)
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}

# Auth0 Configuration (optional - for Auth0 integration)
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=your-auth0-audience

# Development Settings
NODE_ENV=development
`;

    try {
        fs.writeFileSync(envPath, envContent);
        log('✅ .env file created successfully!', 'green');
        log(`   Location: ${envPath}`, 'blue');
        return true;
    } catch (error) {
        log('❌ Failed to create .env file', 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

function showInstructions() {
    log('\n📋 Next Steps:', 'bright');
    log('=============', 'bright');

    log('\n1. 🔧 Update Supabase Credentials:', 'cyan');
    log('   - Open the .env file in your editor', 'blue');
    log('   - Replace SUPABASE_URL with your project URL', 'blue');
    log('   - Replace SUPABASE_ANON_KEY with your anon key', 'blue');

    log('\n2. 🗄️  Set Up Database Schema:', 'cyan');
    log('   - Go to your Supabase project dashboard', 'blue');
    log('   - Navigate to SQL Editor', 'blue');
    log('   - Run the SQL from SUPABASE_MIGRATION.md', 'blue');

    log('\n3. 🧪 Test the Connection:', 'cyan');
    log('   - Run: npm run test:user', 'blue');
    log('   - Run: npm run test:auth', 'blue');

    log('\n📖 For detailed instructions, see:', 'yellow');
    log('   - SUPABASE_MIGRATION.md (database schema)', 'blue');
    log('   - TEST_SCRIPTS_README.md (testing guide)', 'blue');
}

function showSupabaseInstructions() {
    log('\n🚀 Supabase Setup Instructions:', 'bright');
    log('==============================', 'bright');

    log('\n1. 📝 Create Supabase Project:', 'cyan');
    log('   - Go to https://supabase.com', 'blue');
    log('   - Sign up/Login to your account', 'blue');
    log('   - Click "New Project"', 'blue');
    log('   - Enter project name: "le-petit-davinci-api"', 'blue');
    log('   - Choose region and create strong database password', 'blue');
    log('   - Wait for project to be created (2-3 minutes)', 'blue');

    log('\n2. 🔑 Get Your Credentials:', 'cyan');
    log('   - Go to Project Settings (gear icon)', 'blue');
    log('   - Click "API" in the left sidebar', 'blue');
    log('   - Copy "Project URL" (looks like https://xxxxx.supabase.co)', 'blue');
    log('   - Copy "anon public" key (starts with eyJ...)', 'blue');

    log('\n3. 🗄️  Create Database Schema:', 'cyan');
    log('   - Go to SQL Editor in your Supabase dashboard', 'blue');
    log('   - Copy the SQL from SUPABASE_MIGRATION.md', 'blue');
    log('   - Paste and run the SQL to create the users table', 'blue');
}

async function main() {
    log('🔧 Environment Setup Script', 'bright');
    log('===========================', 'bright');

    // Show Supabase setup instructions
    showSupabaseInstructions();

    // Create .env file
    log('\n📝 Creating .env file...', 'cyan');
    const success = createEnvFile();

    if (success) {
        showInstructions();

        log('\n🎯 Summary:', 'bright');
        log('==========', 'bright');
        log('✅ .env file created with generated JWT secrets', 'green');
        log('⚠️  You need to update Supabase credentials manually', 'yellow');
        log('⚠️  You need to create the database schema', 'yellow');

    } else {
        log('\n❌ Setup incomplete. Please check the errors above.', 'red');
    }
}

if (require.main === module) {
    main().catch(error => {
        log(`\n💥 Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { createEnvFile, showInstructions };

const { User } = require('../dist/models/user_model');

async function checkDatabase() {
    try {
        console.log('🗄️ Checking database state for refresh token issue...\n');

        // Get the user ID from the debug test
        const userId = '26a193e8-2fb5-4fec-a4ba-e819293411df';

        console.log('🔍 Looking up user by ID:', userId);
        const user = await User.findById(userId);

        if (!user) {
            console.log('❌ User not found in database');
            return;
        }

        console.log('✅ User found in database');
        console.log('User details:');
        console.log('  - ID:', user._id);
        console.log('  - Email:', user.email);
        console.log('  - First Name:', user.firstName);
        console.log('  - Last Name:', user.lastName);
        console.log('  - Auth0 ID:', user.auth0Id);
        console.log('  - Is Active:', user.isActive);
        console.log('  - Created At:', user.createdAt);
        console.log('  - Updated At:', user.updatedAt);
        console.log('  - Last Login:', user.lastLogin);

        console.log('\n🔑 Token information:');
        console.log('  - Has Refresh Token:', !!user.refreshToken);
        if (user.refreshToken) {
            console.log('  - Refresh Token (first 50 chars):', user.refreshToken.substring(0, 50) + '...');
            console.log('  - Refresh Token Length:', user.refreshToken.length);
        } else {
            console.log('  - ❌ No refresh token stored!');
        }

        console.log('  - Has Refresh Token Expires At:', !!user.refreshTokenExpiresAt);
        if (user.refreshTokenExpiresAt) {
            console.log('  - Refresh Token Expires At:', user.refreshTokenExpiresAt);
            console.log('  - Is Expired:', new Date() > user.refreshTokenExpiresAt);
        } else {
            console.log('  - ❌ No expiration date set!');
        }

        // Let's also check the raw database data
        console.log('\n🔍 Raw user data from database:');
        console.log(JSON.stringify(user.data, null, 2));

    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the check
checkDatabase();

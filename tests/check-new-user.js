const { User } = require('../dist/models/user_model');

async function checkNewUser() {
    try {
        console.log('🔍 Checking new user database state...\n');

        const userId = '53d139b2-0b63-44bf-b968-d9cd091996cd';

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

    } catch (error) {
        console.error('❌ Check failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the check
checkNewUser();

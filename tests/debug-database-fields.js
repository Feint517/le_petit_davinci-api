const { User } = require('../dist/models/user_model');

async function debugDatabaseFields() {
    try {
        console.log('🔍 Debugging database field mapping...\n');

        const userId = '26a193e8-2fb5-4fec-a4ba-e819293411df';

        // Let's check what the raw database query returns
        console.log('📊 Checking raw database data structure...');

        // We need to access the supabase client directly to see the raw data
        const supabase = require('../dist/utils/init_supabase').default;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.log('❌ Database query error:', error);
            return;
        }

        console.log('✅ Raw database data:');
        console.log(JSON.stringify(data, null, 2));

        console.log('\n🔍 Field analysis:');
        console.log('Available fields:', Object.keys(data));

        // Check specific fields
        console.log('\n🔑 Token fields:');
        console.log('refresh_token:', data.refresh_token);
        console.log('refreshToken:', data.refreshToken);
        console.log('refresh_token_expires_at:', data.refresh_token_expires_at);
        console.log('refreshTokenExpiresAt:', data.refreshTokenExpiresAt);

        // Now let's see what the User model conversion does
        console.log('\n🔄 Testing User model conversion...');
        const user = await User.findById(userId);

        if (user) {
            console.log('User model data:');
            console.log('  refreshToken:', user.refreshToken);
            console.log('  refreshTokenExpiresAt:', user.refreshTokenExpiresAt);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugDatabaseFields();

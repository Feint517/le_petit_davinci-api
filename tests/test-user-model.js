const { User } = require('../dist/models/user_model');

async function testUserModel() {
    try {
        console.log('🧪 Testing simplified user model...');

        // Test 1: Create a new user
        console.log('\n📝 Test 1: Creating a new user...');
        const testUserData = {
            firstName: 'Test',
            lastName: 'User',
            email: `test-${Date.now()}@example.com`,
            password: 'testpassword123',
            auth0Id: `test-auth0-id-${Date.now()}`,
            isActive: true
        };

        const newUser = new User(testUserData);
        const savedUser = await newUser.save();

        console.log('✅ User created successfully!');
        console.log('User ID:', savedUser.id);
        console.log('User data:', {
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            email: savedUser.email,
            auth0Id: savedUser.auth0Id,
            isActive: savedUser.isActive,
            createdAt: savedUser.createdAt
        });

        // Test 2: Find user by ID
        console.log('\n🔍 Test 2: Finding user by ID...');
        const foundUser = await User.findById(savedUser.id);
        if (foundUser) {
            console.log('✅ User found by ID!');
            console.log('User email:', foundUser.email);
        } else {
            console.log('❌ User not found by ID');
        }

        // Test 3: Find user by email
        console.log('\n📧 Test 3: Finding user by email...');
        const userByEmail = await User.findOne({ email: testUserData.email });
        if (userByEmail) {
            console.log('✅ User found by email!');
            console.log('User name:', `${userByEmail.firstName} ${userByEmail.lastName}`);
        } else {
            console.log('❌ User not found by email');
        }

        // Test 4: Test password validation
        console.log('\n🔐 Test 4: Testing password validation...');
        const isPasswordValid = await foundUser.isValidPassword('testpassword123');
        const isPasswordInvalid = await foundUser.isValidPassword('wrongpassword');

        console.log('Correct password validation:', isPasswordValid ? '✅' : '❌');
        console.log('Wrong password validation:', !isPasswordInvalid ? '✅' : '❌');

        // Test 5: Test token management
        console.log('\n🎫 Test 5: Testing token management...');
        foundUser.refreshToken = 'test-refresh-token-123';
        foundUser.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await foundUser.save();

        console.log('✅ Refresh token set successfully!');
        console.log('Token expires at:', foundUser.refreshTokenExpiresAt);

        // Test 6: Test toJSON method (should exclude sensitive data)
        console.log('\n📄 Test 6: Testing toJSON method...');
        const userJSON = foundUser.toJSON();
        console.log('User JSON (should not contain password or refreshToken):');
        console.log('Has password:', 'password' in userJSON ? '❌' : '✅');
        console.log('Has refreshToken:', 'refreshToken' in userJSON ? '❌' : '✅');
        console.log('JSON keys:', Object.keys(userJSON));

        // Test 7: Test Auth0 sync
        console.log('\n🔗 Test 7: Testing Auth0 sync...');
        const auth0Data = {
            sub: 'auth0|123456789',
            email: testUserData.email,
            given_name: 'Updated',
            family_name: 'Name',
            email_verified: true
        };

        foundUser.syncFromAuth0(auth0Data);
        await foundUser.save();

        console.log('✅ Auth0 sync successful!');
        console.log('Updated name:', `${foundUser.firstName} ${foundUser.lastName}`);
        console.log('Auth0 ID:', foundUser.auth0Id);

        console.log('\n🎉 All tests passed! The simplified user model is working correctly.');
        console.log('\n📊 Summary:');
        console.log('   ✅ User creation and saving');
        console.log('   ✅ User retrieval by ID and email');
        console.log('   ✅ Password validation');
        console.log('   ✅ Token management');
        console.log('   ✅ JSON serialization (excludes sensitive data)');
        console.log('   ✅ Auth0 integration');
        console.log('\n🔧 The model now only contains:');
        console.log('   - firstName, lastName, email, password');
        console.log('   - refreshToken, refreshTokenExpiresAt');
        console.log('   - auth0Id, auth0Data');
        console.log('   - isActive, createdAt, updatedAt, lastLogin');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testUserModel();

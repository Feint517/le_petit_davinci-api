# Setup Guide - Supabase Authentication

## ✅ Current Status

Your Supabase credentials are already configured! The system is ready to set up.

## 📋 Prerequisites Checklist

- ✅ Supabase project created
- ✅ Environment variables set
- ⏳ Database migration pending
- ⏳ Testing pending

## 🔧 Step 1: Verify Environment Variables

Make sure your `.env` file contains:

```env
# Supabase Configuration (Already Set ✅)
SUPABASE_URL=https://vncsfhiujnoymnzsjqvo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY3NmaGl1am5veW1uenNqcXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDUyMzksImV4cCI6MjA3NTMyMTIzOX0.D5d5n_EckjxPV87k2z8YrCvB5P4GpqKdzi4HyUnYwmg

# JWT Secret (ADD THIS)
ACCESS_TOKEN_SECRET=your-super-secret-random-string-here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Generate a Strong JWT Secret

Run this command to generate a secure secret:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Or use any random 32+ character string:**
```
ACCESS_TOKEN_SECRET=MySecretKey123!@#RandomString456$%^SecureToken789
```

## 🗄️ Step 2: Run Database Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/vncsfhiujnoymnzsjqvo
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `sql/create-profiles-table.sql`
5. Paste into the editor
6. Click **Run** (or press `Ctrl+Enter`)

You should see: ✅ Success. No rows returned

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref vncsfhiujnoymnzsjqvo

# Run the migration
supabase db push --file sql/create-profiles-table.sql
```

### Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Check if profiles table exists
SELECT * FROM profiles LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

You should see the empty profiles table and 4 RLS policies.

## 🚀 Step 3: Start the Server

```bash
# Install dependencies (if not done)
npm install

# Start the development server
npm run dev
```

You should see:
```
✅ Supabase client initialized
🚀 Server running on port 3000
📍 Environment: development
```

## 🧪 Step 4: Test the API

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T..."
}
```

### Test 2: Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User"
    },
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "...",
      "expires_in": 3600
    }
  }
}
```

**Save the `access_token` for the next tests!**

### Test 3: Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!@#"
  }'
```

You should get a session token and a list of profiles (including the default profile created during registration).

### Test 4: Get Profiles

```bash
# Replace YOUR_TOKEN with the access_token from login
curl -X GET http://localhost:3000/auth/profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile-uuid",
        "user_id": "user-uuid",
        "profile_name": "Test's Profile",
        "avatar": null,
        "is_active": true,
        "created_at": "2025-10-10T..."
      }
    ],
    "count": 1
  }
}
```

### Test 5: Create a New Profile

```bash
curl -X POST http://localhost:3000/auth/profiles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_name": "Kids Profile",
    "pin": "1234"
  }'
```

### Test 6: Validate Profile PIN

```bash
# Replace PROFILE_ID with the id from previous step
curl -X POST http://localhost:3000/auth/profiles/validate-pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "PROFILE_ID",
    "pin": "1234"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "PIN validated successfully",
  "data": {
    "profileToken": "eyJhbGc...",
    "profile": { ... }
  }
}
```

Now you have both tokens:
- **Supabase Token**: For account-level operations
- **Profile Token**: For profile-specific operations

## 📱 Step 5: Update Your Frontend

Your frontend should now:

1. **Login Flow**:
   ```javascript
   // 1. User enters email/password
   const loginResponse = await fetch('/auth/login', {
     method: 'POST',
     body: JSON.stringify({ email, password })
   });
   
   // 2. Save Supabase token
   const { session, profiles } = loginResponse.data;
   localStorage.setItem('supabase_token', session.access_token);
   
   // 3. Show profile selection screen
   showProfileSelector(profiles);
   ```

2. **Profile Selection Flow**:
   ```javascript
   // 4. User selects profile and enters PIN
   const pinResponse = await fetch('/auth/profiles/validate-pin', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${supabaseToken}`
     },
     body: JSON.stringify({ profile_id, pin })
   });
   
   // 5. Save profile token
   const { profileToken } = pinResponse.data;
   localStorage.setItem('profile_token', profileToken);
   
   // 6. Now use both tokens for app requests
   ```

3. **Making Authenticated Requests**:
   ```javascript
   // For profile-specific operations
   fetch('/api/some-endpoint', {
     headers: {
       'Authorization': `Bearer ${supabaseToken}`,
       'X-Profile-Token': profileToken
     }
   });
   ```

## 🔒 Security Checklist

- [ ] Change `ACCESS_TOKEN_SECRET` to a strong random string
- [ ] Enable email verification in Supabase (Settings → Auth)
- [ ] Set up password policies in Supabase
- [ ] Enable RLS on profiles table (already done by migration)
- [ ] Test with different user accounts
- [ ] Test profile limit (try creating 6 profiles)
- [ ] Test invalid PINs
- [ ] Test token expiration handling

## 📚 Documentation

- **API Guide**: See `docs/SUPABASE-AUTH-GUIDE.md` for complete API documentation
- **Implementation Details**: See `docs/IMPLEMENTATION-SUMMARY.md`
- **Migration Guide**: See `sql/README-PROFILES.md`

## 🐛 Troubleshooting

### Error: "Supabase URL or API key not provided"
- Check your `.env` file exists and contains the keys
- Restart your server after adding environment variables

### Error: "relation 'profiles' does not exist"
- Run the database migration (Step 2)
- Verify in Supabase Dashboard → Database → Tables

### Error: "Invalid token" when registering
- Check that Supabase Auth is enabled in your project
- Verify email/password auth is enabled (Settings → Auth → Providers)

### Error: "Access token is required"
- Make sure you're including the Authorization header
- Format: `Authorization: Bearer YOUR_TOKEN`
- Check token hasn't expired (1 hour default)

### Error: "Profile not found"
- Ensure the profile was created successfully
- Check the profile belongs to the authenticated user
- Verify profile_id is a valid UUID

## ✅ Verification Checklist

After completing all steps:

- [ ] Server starts without errors
- [ ] Can register a new user
- [ ] Can login with credentials
- [ ] Can see profiles list
- [ ] Can create new profile
- [ ] Can validate profile PIN
- [ ] Receive both tokens (Supabase + Profile)
- [ ] Tokens work for protected routes

## 🎉 Success!

Once all tests pass, your Supabase authentication with multi-profile support is fully operational!

## 📞 Next Steps

1. **Update Frontend**: Modify your client application to use the new authentication flow
2. **Test Edge Cases**: Try invalid credentials, expired tokens, etc.
3. **Add Features**: Implement password reset, profile avatars, etc.
4. **Deploy**: Deploy to production when ready
5. **Monitor**: Check Supabase Dashboard for user activity

## 💡 Tips

- **Default PIN**: New profiles get PIN `0000` - users should change it immediately
- **Profile Limit**: Currently set to 5 profiles max (configurable in `services/profileService.ts`)
- **Token Expiry**: Supabase tokens expire in 1 hour, profile tokens in 24 hours
- **Email Verification**: Enable this in Supabase for better security

---

**Need Help?** Check the detailed guides in the `docs/` folder!


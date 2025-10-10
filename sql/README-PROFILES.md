# Profiles Table Migration

This document explains how to set up the profiles table for the multi-profile system (Netflix-style).

## Overview

The profiles table enables multiple profiles per user account, each with its own PIN protection. This is similar to Netflix's profile system where one account can have multiple user profiles.

## Prerequisites

- Supabase project set up and configured
- Database connection established
- Supabase CLI installed (optional, for command-line execution)

## Running the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** section
3. Click **New Query**
4. Copy and paste the contents of `create-profiles-table.sql`
5. Click **Run** or press `Ctrl/Cmd + Enter`

### Option 2: Supabase CLI

```bash
# Make sure you're in the project root directory
supabase db push --file sql/create-profiles-table.sql
```

### Option 3: Direct SQL Execution

If you have direct database access:

```bash
psql -h <your-supabase-host> -U postgres -d postgres -f sql/create-profiles-table.sql
```

## What the Migration Creates

1. **profiles table**
   - `id`: UUID primary key
   - `user_id`: Reference to Supabase auth.users
   - `profile_name`: Display name for the profile
   - `pin_hash`: Bcrypt hashed 4-digit PIN
   - `avatar`: Optional avatar URL
   - `is_active`: Soft delete flag
   - `created_at`, `updated_at`: Timestamps

2. **Indexes**
   - `idx_profiles_user_id`: Fast lookups by user ID
   - `idx_profiles_name`: Fast lookups by profile name

3. **Row Level Security (RLS)**
   - Users can only view, create, update, and delete their own profiles
   - Automatic enforcement at the database level

4. **Triggers**
   - Auto-update `updated_at` timestamp on row changes

## Verification

After running the migration, verify it was successful:

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'profiles';
```

## Testing the Table

You can test the profiles table with these queries:

```sql
-- Insert a test profile (replace with actual user_id from auth.users)
INSERT INTO profiles (user_id, profile_name, pin_hash)
VALUES (
  'your-supabase-user-id-here',
  'Test Profile',
  '$2a$12$examplehashedpin' -- This should be a real bcrypt hash
);

-- Query profiles for a user
SELECT * FROM profiles WHERE user_id = 'your-supabase-user-id-here';

-- Update a profile
UPDATE profiles 
SET profile_name = 'Updated Name'
WHERE id = 'profile-id-here';

-- Soft delete a profile
UPDATE profiles 
SET is_active = false
WHERE id = 'profile-id-here';
```

## Profile System Features

### Maximum Profiles
- Default: 5 profiles per account (configurable in `services/profileService.ts`)

### PIN Requirements
- Exactly 4 digits
- Numeric only
- Bcrypt hashed for security
- Default PIN for new accounts: `0000` (should be changed immediately)

### Profile Management Flow

1. **User Registration**
   - User creates account with email/password
   - System automatically creates a default profile
   - User should update the default PIN

2. **Profile Creation**
   - User must be authenticated
   - Provide profile name and 4-digit PIN
   - System checks profile limit
   - Profile is created and hashed PIN stored

3. **Profile Selection**
   - User selects a profile
   - Enters 4-digit PIN
   - System validates PIN
   - Returns profile-specific JWT token

4. **Profile-Specific Operations**
   - All subsequent requests include profile token
   - System knows which profile is active
   - Can track profile-specific data/preferences

## Security Considerations

1. **PIN Storage**
   - PINs are hashed with bcrypt (12 rounds)
   - Never stored in plain text
   - Cannot be retrieved, only validated

2. **Row Level Security**
   - Database-level security enforcement
   - Users can only access their own profiles
   - No additional application-level checks needed

3. **Profile Token**
   - Short-lived JWT (24 hours)
   - Contains profile ID and user ID
   - Verified on every request

## Rollback

If you need to rollback this migration:

```sql
-- Drop the trigger first
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop the table (this will also drop indexes and policies)
DROP TABLE IF EXISTS profiles CASCADE;
```

## Support

For issues or questions:
1. Check the Supabase dashboard for error messages
2. Review the SQL file for any syntax issues
3. Ensure your Supabase project has the `uuid-ossp` extension enabled
4. Check that Row Level Security is enabled on your project

## Next Steps

After running this migration:
1. Test profile creation via the API: `POST /auth/profiles`
2. Test profile PIN validation: `POST /auth/profiles/validate-pin`
3. Update default profile PINs from `0000` to secure PINs
4. Configure profile limits if needed
5. Add profile avatars or additional profile metadata as required


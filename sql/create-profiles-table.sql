-- =============================================
-- Profiles Table for Multi-Profile System
-- =============================================
-- This table stores multiple profiles per Supabase auth user
-- Similar to Netflix's profile system - one account, many profiles
-- Each profile has its own PIN for access control

-- profiles table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_name VARCHAR(50) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_profile_name UNIQUE(user_id, profile_name)
);

-- Index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Index for faster queries by profile name
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(profile_name);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profiles
CREATE POLICY "Users can view their own profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own profiles
CREATE POLICY "Users can create their own profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profiles
CREATE POLICY "Users can update their own profiles"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own profiles
CREATE POLICY "Users can delete their own profiles"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- Trigger for updated_at timestamp
-- =============================================

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Comments for documentation
-- =============================================

COMMENT ON TABLE profiles IS 'Stores multiple profiles per user account (Netflix-style). Each profile has a PIN for access control.';
COMMENT ON COLUMN profiles.id IS 'Unique profile identifier';
COMMENT ON COLUMN profiles.user_id IS 'Reference to Supabase auth.users - the account owner';
COMMENT ON COLUMN profiles.profile_name IS 'Display name for the profile (must be unique per user)';
COMMENT ON COLUMN profiles.pin_hash IS 'Bcrypt hashed 4-digit PIN for profile access';
COMMENT ON COLUMN profiles.avatar IS 'Optional avatar URL or identifier';
COMMENT ON COLUMN profiles.is_active IS 'Soft delete flag - false means profile is deactivated';


-- Le Petit Davinci API - Database Schema Setup
-- Run this SQL in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core user fields
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT,
    
    -- Token fields
    refresh_token TEXT,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Auth0 specific fields
    auth0_id VARCHAR(255) NOT NULL UNIQUE,
    auth0_data JSONB,
    
    -- Additional fields
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_refresh_token ON users(refresh_token);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust as needed for your use case)
-- For now, we'll create basic policies that allow all operations
-- In production, you should create more restrictive policies

-- Policy for SELECT operations
CREATE POLICY "Allow all SELECT operations" ON users
    FOR SELECT USING (true);

-- Policy for INSERT operations
CREATE POLICY "Allow all INSERT operations" ON users
    FOR INSERT WITH CHECK (true);

-- Policy for UPDATE operations
CREATE POLICY "Allow all UPDATE operations" ON users
    FOR UPDATE USING (true);

-- Policy for DELETE operations
CREATE POLICY "Allow all DELETE operations" ON users
    FOR DELETE USING (true);

-- Insert a test user (optional - for testing)
-- You can remove this if you don't want a test user in the database
INSERT INTO users (
    first_name,
    last_name,
    email,
    auth0_id,
    is_active
) VALUES (
    'Test',
    'User',
    'test@example.com',
    'test-auth0-id',
    true
) ON CONFLICT (email) DO NOTHING;

-- Verify the table was created successfully
SELECT 'Users table created successfully!' as status;
SELECT COUNT(*) as user_count FROM users;

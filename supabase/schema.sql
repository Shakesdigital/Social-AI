-- =====================================================
-- SUPABASE SCHEMA FOR SOCIAL AI
-- Run this SQL in your Supabase SQL Editor to create
-- all necessary tables for full cloud persistence
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- Stores user company profiles (supports multiple per user)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    industry TEXT DEFAULT '',
    description TEXT DEFAULT '',
    target_audience TEXT DEFAULT '',
    brand_voice TEXT DEFAULT '',
    goals TEXT DEFAULT '',
    website TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite unique constraint for user_id + profile_id
    UNIQUE(user_id, profile_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_id ON profiles(profile_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own profiles
CREATE POLICY "Users can view own profiles" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- USER DATA TABLE
-- Stores all user data (calendar, leads, email, blog, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('calendar', 'leads', 'email', 'blog', 'research', 'strategy')),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite unique constraint
    UNIQUE(user_id, profile_id, data_type)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_profile_id ON user_data(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_data_type ON user_data(data_type);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- ONBOARDING STATUS TABLE
-- Tracks whether user has completed onboarding
-- =====================================================
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding" ON user_onboarding
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding" ON user_onboarding
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding" ON user_onboarding
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON user_data TO authenticated;
GRANT ALL ON user_onboarding TO authenticated;

-- =====================================================
-- DONE!
-- After running this:
-- 1. Go to Netlify and add these environment variables:
--    - VITE_SUPABASE_URL = your Supabase project URL
--    - VITE_SUPABASE_ANON_KEY = your Supabase anon/public key
-- 2. Redeploy your Netlify site
-- =====================================================

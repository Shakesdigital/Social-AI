-- =====================================================
-- FIX FOR EXISTING PROFILES TABLE
-- Run this if you already have a profiles table but
-- it's missing some columns
-- =====================================================

-- Add missing columns to profiles table (ignores if they already exist)
DO $$ 
BEGIN
    -- Add profile_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_id') THEN
        ALTER TABLE profiles ADD COLUMN profile_id TEXT;
        -- Set default values for existing rows
        UPDATE profiles SET profile_id = 'profile_' || SUBSTRING(user_id::text, 1, 8) WHERE profile_id IS NULL;
        ALTER TABLE profiles ALTER COLUMN profile_id SET NOT NULL;
    END IF;

    -- Add industry column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'industry') THEN
        ALTER TABLE profiles ADD COLUMN industry TEXT DEFAULT '';
    END IF;

    -- Add description column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'description') THEN
        ALTER TABLE profiles ADD COLUMN description TEXT DEFAULT '';
    END IF;

    -- Add target_audience column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_audience') THEN
        ALTER TABLE profiles ADD COLUMN target_audience TEXT DEFAULT '';
    END IF;

    -- Add brand_voice column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'brand_voice') THEN
        ALTER TABLE profiles ADD COLUMN brand_voice TEXT DEFAULT '';
    END IF;

    -- Add goals column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'goals') THEN
        ALTER TABLE profiles ADD COLUMN goals TEXT DEFAULT '';
    END IF;

    -- Add website column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN
        ALTER TABLE profiles ADD COLUMN website TEXT DEFAULT '';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add created_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add unique constraint on user_id + profile_id (if not exists)
-- First drop any existing single-column unique constraint on user_id
DO $$
BEGIN
    -- Try to add the composite unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_id_profile_id_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_profile_id_key UNIQUE (user_id, profile_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint may already exist or there was an issue: %', SQLERRM;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_id ON profiles(profile_id);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

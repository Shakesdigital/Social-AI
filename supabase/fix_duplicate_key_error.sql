-- =====================================================
-- FIX: REMOVE CONFLICTING UNIQUE CONSTRAINT
-- =====================================================
-- The error "duplicate key value violates unique constraint 'profiles_user_id_key'"
-- means there's a single-column unique constraint on user_id that needs to be replaced
-- with a composite constraint on (user_id, profile_id)
-- =====================================================

-- Step 1: Drop the existing single-column unique constraint on user_id
-- (This constraint was preventing multiple profiles per user)
DO $$ 
BEGIN
    -- Try to drop the problematic constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_user_id_key;
        RAISE NOTICE 'Dropped constraint: profiles_user_id_key';
    END IF;
    
    -- Also try with other common naming patterns
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_unique'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_user_id_unique;
        RAISE NOTICE 'Dropped constraint: profiles_user_id_unique';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_id'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT unique_user_id;
        RAISE NOTICE 'Dropped constraint: unique_user_id';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping constraint: %', SQLERRM;
END $$;

-- Step 2: Add the correct composite unique constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_id_profile_id_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_profile_id_key 
            UNIQUE (user_id, profile_id);
        RAISE NOTICE 'Added composite constraint: profiles_user_id_profile_id_key';
    ELSE
        RAISE NOTICE 'Composite constraint already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;

-- Step 3: Verify the constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass;

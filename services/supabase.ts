import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY &&
        SUPABASE_URL !== '' &&
        SUPABASE_ANON_KEY !== '';
};

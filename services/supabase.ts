import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Log Supabase configuration status on startup
console.log('[Supabase] Configuration status:', {
    urlConfigured: !!SUPABASE_URL && SUPABASE_URL !== '',
    keyConfigured: !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== '',
    url: SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET'
});

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
    const configured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY &&
        SUPABASE_URL !== '' &&
        SUPABASE_ANON_KEY !== '';

    if (!configured) {
        console.warn('[Supabase] ⚠️ NOT CONFIGURED - Cloud sync disabled. Profiles will only persist in localStorage.');
    }

    return configured;
};

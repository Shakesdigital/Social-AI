import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    created: string;
}

export interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

// Convert Supabase user to AuthUser
const toAuthUser = (user: User): AuthUser => ({
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
    avatar: user.user_metadata?.avatar_url,
    created: user.created_at,
});

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
};

// Get current user
export const getCurrentUser = async (): Promise<AuthUser | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? toAuthUser(user) : null;
};

// Get current session
export const getSession = async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Login with email and password
export const login = async (email: string, password: string): Promise<AuthUser> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('[AuthService] Login failed:', error);
        if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password');
        }
        throw new Error(error.message || 'Login failed. Please try again.');
    }

    if (!data.user) {
        throw new Error('Login failed. Please try again.');
    }

    return toAuthUser(data.user);
};

// Register new user
export const signup = async (email: string, password: string, name?: string): Promise<AuthUser> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name || email.split('@')[0],
            },
        },
    });

    if (error) {
        console.error('[AuthService] Signup failed:', error);
        if (error.message.includes('already registered')) {
            throw new Error('This email is already registered');
        }
        throw new Error(error.message || 'Signup failed. Please try again.');
    }

    if (!data.user) {
        throw new Error('Signup failed. Please try again.');
    }

    return toAuthUser(data.user);
};

// Login with OAuth provider
export const loginWithOAuth = async (provider: 'google' | 'github'): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: window.location.origin,
        },
    });

    if (error) {
        console.error('[AuthService] OAuth failed:', error);
        throw new Error(error.message || 'OAuth login failed. Please try again.');
    }
};

// Logout
export const logout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('[AuthService] Logout failed:', error);
    }
};

// Request password reset
export const requestPasswordReset = async (email: string): Promise<void> => {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
        console.error('[AuthService] Password reset request failed:', error);
        throw new Error('Failed to send reset email. Please try again.');
    }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: AuthUser | null) => void): (() => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            callback(toAuthUser(session.user));
        } else {
            callback(null);
        }
    });

    return () => subscription.unsubscribe();
};

// Update user profile
export const updateProfile = async (updates: { name?: string; avatar?: string }): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
        data: {
            full_name: updates.name,
            avatar_url: updates.avatar,
        },
    });

    if (error) {
        throw new Error(error.message || 'Failed to update profile');
    }
};

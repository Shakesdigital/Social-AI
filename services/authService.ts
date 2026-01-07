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

// Mark onboarding as completed in user metadata
export const markOnboardingComplete = async (): Promise<boolean> => {
    try {
        const { error } = await supabase.auth.updateUser({
            data: {
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString(),
            },
        });

        if (error) {
            console.error('[AuthService] Failed to mark onboarding complete:', error);
            return false;
        }
        console.log('[AuthService] Onboarding marked as complete in user metadata');
        return true;
    } catch (e) {
        console.error('[AuthService] Error marking onboarding complete:', e);
        return false;
    }
};

// Check if user has completed onboarding (from user metadata)
export const hasCompletedOnboarding = async (): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const completed = user.user_metadata?.onboarding_completed === true;
        console.log('[AuthService] Onboarding completed check:', completed);
        return completed;
    } catch (e) {
        console.error('[AuthService] Error checking onboarding status:', e);
        return false;
    }
};

// Check if user account was created within the last N minutes (helps identify new signups)
export const isNewlyCreatedAccount = async (thresholdMinutes: number = 2): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const createdAt = new Date(user.created_at);
        const now = new Date();
        const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        const isNew = ageMinutes < thresholdMinutes;
        console.log('[AuthService] Account age check:', {
            createdAt: user.created_at,
            ageMinutes: ageMinutes.toFixed(1),
            isNew
        });
        return isNew;
    } catch (e) {
        console.error('[AuthService] Error checking account age:', e);
        return false;
    }
};

// Get detailed auth event info for routing decisions
export type AuthEventType = 'SIGNED_IN' | 'SIGNED_UP' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY';

export interface AuthEventInfo {
    event: AuthEventType;
    user: AuthUser | null;
    isNewSignup: boolean;
    onboardingCompleted: boolean;
}

// Enhanced auth state change listener with more context
export const onAuthStateChangeDetailed = (
    callback: (eventInfo: AuthEventInfo) => void
): (() => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        let user: AuthUser | null = null;
        let isNewSignup = false;
        let onboardingCompleted = false;

        if (session?.user) {
            user = toAuthUser(session.user);

            // Check if this is a new signup
            const createdAt = new Date(session.user.created_at);
            const now = new Date();
            const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
            isNewSignup = ageMinutes < 2; // Account created within last 2 minutes

            // Check onboarding status from metadata
            onboardingCompleted = session.user.user_metadata?.onboarding_completed === true;
        }

        const eventInfo: AuthEventInfo = {
            event: event as AuthEventType,
            user,
            isNewSignup,
            onboardingCompleted
        };

        console.log('[AuthService] Auth event:', {
            event,
            userId: user?.id?.substring(0, 8) || 'none',
            isNewSignup,
            onboardingCompleted
        });

        callback(eventInfo);
    });

    return () => subscription.unsubscribe();
};

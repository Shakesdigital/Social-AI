import { pb, isPocketBaseConfigured } from './pocketbase';
import type { RecordModel } from 'pocketbase';

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    verified: boolean;
    created: string;
}

export interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

// Convert PocketBase user to AuthUser
const toAuthUser = (record: RecordModel): AuthUser => ({
    id: record.id,
    email: record.email,
    name: record.name || record.email?.split('@')[0],
    avatar: record.avatar ? pb.files.getUrl(record, record.avatar) : undefined,
    verified: record.verified,
    created: record.created,
});

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
    return pb.authStore.isValid;
};

// Get current user
export const getCurrentUser = (): AuthUser | null => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
        return null;
    }
    return toAuthUser(pb.authStore.model);
};

// Login with email and password
export const login = async (email: string, password: string): Promise<AuthUser> => {
    if (!isPocketBaseConfigured()) {
        throw new Error('PocketBase is not configured. Please set VITE_POCKETBASE_URL in your .env file.');
    }

    try {
        const authData = await pb.collection('users').authWithPassword(email, password);
        return toAuthUser(authData.record);
    } catch (error: any) {
        console.error('[AuthService] Login failed:', error);
        if (error.status === 400) {
            throw new Error('Invalid email or password');
        }
        throw new Error(error.message || 'Login failed. Please try again.');
    }
};

// Register new user
export const signup = async (email: string, password: string, name?: string): Promise<AuthUser> => {
    if (!isPocketBaseConfigured()) {
        throw new Error('PocketBase is not configured. Please set VITE_POCKETBASE_URL in your .env file.');
    }

    try {
        // Create the user
        const userData = {
            email,
            password,
            passwordConfirm: password,
            name: name || email.split('@')[0],
        };

        const record = await pb.collection('users').create(userData);

        // Auto-login after signup
        await pb.collection('users').authWithPassword(email, password);

        return toAuthUser(record);
    } catch (error: any) {
        console.error('[AuthService] Signup failed:', error);
        if (error.data?.email) {
            throw new Error('This email is already registered');
        }
        if (error.data?.password) {
            throw new Error('Password must be at least 8 characters');
        }
        throw new Error(error.message || 'Signup failed. Please try again.');
    }
};

// Logout
export const logout = (): void => {
    pb.authStore.clear();
};

// Request password reset
export const requestPasswordReset = async (email: string): Promise<void> => {
    if (!isPocketBaseConfigured()) {
        throw new Error('PocketBase is not configured.');
    }

    try {
        await pb.collection('users').requestPasswordReset(email);
    } catch (error: any) {
        console.error('[AuthService] Password reset request failed:', error);
        throw new Error('Failed to send reset email. Please try again.');
    }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: AuthUser | null) => void): () => void => {
    // Initial call with current state
    callback(getCurrentUser());

    // Subscribe to auth store changes
    const unsubscribe = pb.authStore.onChange(() => {
        callback(getCurrentUser());
    });

    return unsubscribe;
};

// Refresh auth token
export const refreshAuth = async (): Promise<void> => {
    if (pb.authStore.isValid) {
        try {
            await pb.collection('users').authRefresh();
        } catch (error) {
            console.error('[AuthService] Token refresh failed:', error);
            pb.authStore.clear();
        }
    }
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    AuthUser,
    AuthState,
    getCurrentUser,
    login as authLogin,
    signup as authSignup,
    logout as authLogout,
    loginWithOAuth as authLoginWithOAuth,
    onAuthStateChange
} from '../services/authService';
import { isSupabaseConfigured } from '../services/supabase';

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name?: string) => Promise<void>;
    loginWithOAuth: (provider: 'google' | 'github') => Promise<void>;
    logout: () => Promise<void>;
    isSupabaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,
    });

    const [supabaseConfigured] = useState(() => isSupabaseConfigured());

    // Initialize auth state
    useEffect(() => {
        if (!supabaseConfigured) {
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
            return;
        }

        // Get initial user
        getCurrentUser().then((user) => {
            setState({
                user,
                isAuthenticated: !!user,
                isLoading: false,
            });
        });

        // Subscribe to auth changes
        const unsubscribe = onAuthStateChange((user) => {
            setState({
                user,
                isAuthenticated: !!user,
                isLoading: false,
            });
        });

        return unsubscribe;
    }, [supabaseConfigured]);

    const login = useCallback(async (email: string, password: string) => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const user = await authLogin(email, password);
            setState({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            setState(prev => ({ ...prev, isLoading: false }));
            throw error;
        }
    }, []);

    const signup = useCallback(async (email: string, password: string, name?: string) => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const user = await authSignup(email, password, name);
            setState({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            setState(prev => ({ ...prev, isLoading: false }));
            throw error;
        }
    }, []);

    const loginWithOAuth = useCallback(async (provider: 'google' | 'github') => {
        await authLoginWithOAuth(provider);
    }, []);

    const logout = useCallback(async () => {
        await authLogout();
        setState({ user: null, isAuthenticated: false, isLoading: false });
    }, []);

    return (
        <AuthContext.Provider value={{
            ...state,
            login,
            signup,
            loginWithOAuth,
            logout,
            isSupabaseConfigured: supabaseConfigured
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

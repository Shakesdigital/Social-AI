import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    AuthUser,
    AuthState,
    getCurrentUser,
    login as authLogin,
    signup as authSignup,
    logout as authLogout,
    onAuthStateChange,
    refreshAuth
} from '../services/authService';
import { isPocketBaseConfigured } from '../services/pocketbase';

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => void;
    isPocketBaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,
    });

    const [pbConfigured] = useState(() => isPocketBaseConfigured());

    // Initialize auth state
    useEffect(() => {
        // Refresh token on mount
        refreshAuth().finally(() => {
            setState({
                user: getCurrentUser(),
                isAuthenticated: !!getCurrentUser(),
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
    }, []);

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

    const logout = useCallback(() => {
        authLogout();
        setState({ user: null, isAuthenticated: false, isLoading: false });
    }, []);

    return (
        <AuthContext.Provider value={{
            ...state,
            login,
            signup,
            logout,
            isPocketBaseConfigured: pbConfigured
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

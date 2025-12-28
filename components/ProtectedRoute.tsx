import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthPage } from './AuthPage';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    fallback
}) => {
    const { isAuthenticated, isLoading, isPocketBaseConfigured } = useAuth();

    // If PocketBase is not configured, allow access (local-only mode)
    if (!isPocketBaseConfigured) {
        return <>{children}</>;
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show fallback or default auth page
    if (!isAuthenticated) {
        if (fallback) {
            return <>{fallback}</>;
        }
        return null; // Will be handled by parent
    }

    // Authenticated - render children
    return <>{children}</>;
};

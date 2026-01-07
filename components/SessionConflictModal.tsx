import React, { useState, useEffect } from 'react';
import { AlertTriangle, LogOut, ArrowRight, X, Users } from 'lucide-react';
import { getAndClearSessionConflict } from '../services/sessionService';

interface SessionConflictModalProps {
    onDismiss: () => void;
    conflictingEmail?: string | null;
}

/**
 * Modal that appears when a user signs in with a different account
 * on the same browser where another account was previously active.
 */
export const SessionConflictModal: React.FC<SessionConflictModalProps> = ({
    onDismiss,
    conflictingEmail: propConflictingEmail
}) => {
    const [conflictingEmail, setConflictingEmail] = useState<string | null>(propConflictingEmail || null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check for session conflict on mount
        const conflict = propConflictingEmail || getAndClearSessionConflict();
        if (conflict) {
            setConflictingEmail(conflict);
            setIsVisible(true);
        }
    }, [propConflictingEmail]);

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss();
    };

    if (!isVisible || !conflictingEmail) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Account Switched
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Different account detected
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6">
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-slate-600">
                            You were previously signed in as:
                        </p>
                        <p className="font-medium text-slate-900 mt-1 truncate">
                            {conflictingEmail}
                        </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-amber-800">
                                Your session has been switched to the new account.
                                All data from the previous account is securely stored
                                and will be available when you log back in with that account.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6">
                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                    >
                        Continue to App
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Modal for prompting user to log out when session conflicts occur
 */
interface LogoutPromptModalProps {
    currentUserEmail: string;
    onLogout: () => void;
    onContinue: () => void;
}

export const LogoutPromptModal: React.FC<LogoutPromptModalProps> = ({
    currentUserEmail,
    onLogout,
    onContinue
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Switch Account?
                            </h3>
                            <p className="text-sm text-slate-500">
                                You have an active session
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6">
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-slate-600">
                            Currently signed in as:
                        </p>
                        <p className="font-medium text-slate-900 mt-1 truncate">
                            {currentUserEmail}
                        </p>
                    </div>

                    <p className="text-sm text-slate-600 mb-4">
                        Would you like to log out of the current account to sign in with a different one?
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onContinue}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Stay Signed In
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
};

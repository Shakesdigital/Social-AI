/**
 * Session Management Service
 * Handles multi-account session management on the same browser
 */

import { supabase, isSupabaseConfigured } from './supabase';

// Session info stored in browser
export interface SessionInfo {
    userId: string;
    email: string;
    loginTime: string;
    isNewUser: boolean; // True if this was a fresh signup
    onboardingCompleted: boolean;
}

// Track all sessions from this browser (for account switching)
export interface BrowserSessionStore {
    currentSession: SessionInfo | null;
    previousSessions: SessionInfo[]; // History of accounts used on this browser
    lastActiveUserId: string | null;
}

const SESSION_STORAGE_KEY = 'socialai_browser_sessions';
const CURRENT_SESSION_KEY = 'socialai_current_session';
const ACTIVE_SESSION_CONFLICT_KEY = 'socialai_session_conflict';

/**
 * Get the current browser session store
 */
export const getBrowserSessions = (): BrowserSessionStore => {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('[SessionService] Error reading sessions:', e);
    }

    return {
        currentSession: null,
        previousSessions: [],
        lastActiveUserId: null
    };
};

/**
 * Save the browser session store
 */
const saveBrowserSessions = (store: BrowserSessionStore): void => {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
        console.error('[SessionService] Error saving sessions:', e);
    }
};

/**
 * Get current active session
 */
export const getCurrentSession = (): SessionInfo | null => {
    try {
        const stored = localStorage.getItem(CURRENT_SESSION_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('[SessionService] Error reading current session:', e);
    }
    return null;
};

/**
 * Create a new session for a user (used on login/signup)
 * Returns whether this creates a conflict with an existing session
 */
export const createSession = (
    userId: string,
    email: string,
    isNewUser: boolean,
    onboardingCompleted: boolean
): { session: SessionInfo; hasConflict: boolean; conflictingUser: string | null } => {
    const store = getBrowserSessions();
    const currentSession = getCurrentSession();

    let hasConflict = false;
    let conflictingUser: string | null = null;

    // Check if there's an active session from a different user
    if (currentSession && currentSession.userId !== userId) {
        hasConflict = true;
        conflictingUser = currentSession.email;

        // Move the old session to previous sessions
        const existingIndex = store.previousSessions.findIndex(s => s.userId === currentSession.userId);
        if (existingIndex === -1) {
            store.previousSessions.push(currentSession);
        } else {
            store.previousSessions[existingIndex] = currentSession;
        }

        console.log(`[SessionService] Session conflict detected: switching from ${conflictingUser} to ${email}`);
    }

    // Create new session
    const newSession: SessionInfo = {
        userId,
        email,
        loginTime: new Date().toISOString(),
        isNewUser,
        onboardingCompleted
    };

    // Update session store
    store.currentSession = newSession;
    store.lastActiveUserId = userId;

    // Add to previous sessions if not already there
    const existingIndex = store.previousSessions.findIndex(s => s.userId === userId);
    if (existingIndex !== -1) {
        store.previousSessions[existingIndex] = newSession;
    }

    // Save
    saveBrowserSessions(store);
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(newSession));

    return { session: newSession, hasConflict, conflictingUser };
};

/**
 * Mark current session's onboarding as complete
 */
export const markSessionOnboardingComplete = (): void => {
    const session = getCurrentSession();
    if (session) {
        session.onboardingCompleted = true;
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));

        // Also update in the store
        const store = getBrowserSessions();
        if (store.currentSession && store.currentSession.userId === session.userId) {
            store.currentSession.onboardingCompleted = true;
        }
        const idx = store.previousSessions.findIndex(s => s.userId === session.userId);
        if (idx !== -1) {
            store.previousSessions[idx].onboardingCompleted = true;
        }
        saveBrowserSessions(store);
    }
};

/**
 * Clear the current session (used on logout)
 */
export const clearCurrentSession = (): void => {
    const session = getCurrentSession();
    const store = getBrowserSessions();

    if (session) {
        // Add to previous sessions before clearing
        const existingIndex = store.previousSessions.findIndex(s => s.userId === session.userId);
        if (existingIndex === -1) {
            store.previousSessions.push(session);
        } else {
            store.previousSessions[existingIndex] = session;
        }
    }

    store.currentSession = null;
    saveBrowserSessions(store);
    localStorage.removeItem(CURRENT_SESSION_KEY);

    console.log('[SessionService] Session cleared');
};

/**
 * Check if there's a previous session for a returning user
 */
export const getPreviousSessionForUser = (userId: string): SessionInfo | null => {
    const store = getBrowserSessions();
    return store.previousSessions.find(s => s.userId === userId) || null;
};

/**
 * Check if user has completed onboarding (from session data)
 */
export const hasSessionOnboardingCompleted = (userId: string): boolean => {
    const current = getCurrentSession();
    if (current && current.userId === userId) {
        return current.onboardingCompleted;
    }

    const previous = getPreviousSessionForUser(userId);
    return previous?.onboardingCompleted || false;
};

/**
 * Determine user status and routing based on account state
 * This is the MAIN FUNCTION for determining login vs signup flow
 */
export interface UserRoutingDecision {
    route: 'onboarding' | 'dashboard';
    reason: string;
    isNewUser: boolean;
    isReturningUser: boolean;
    hasPreviousSession: boolean;
}

export const determineUserRoute = async (
    userId: string,
    email: string,
    accountCreatedAt: string,
    hasCloudProfile: boolean,
    hasLocalProfiles: boolean,
    userMetadataOnboardingCompleted?: boolean
): Promise<UserRoutingDecision> => {
    const previousSession = getPreviousSessionForUser(userId);
    const hasPreviousSession = !!previousSession;

    // Calculate account age
    const accountAgeMs = Date.now() - new Date(accountCreatedAt).getTime();
    const accountAgeMinutes = accountAgeMs / (1000 * 60);
    const isAccountJustCreated = accountAgeMinutes < 2;

    console.log('[SessionService] Determining route:', {
        userId: userId.substring(0, 8) + '...',
        email,
        accountAgeMinutes: accountAgeMinutes.toFixed(1),
        hasCloudProfile,
        hasLocalProfiles,
        hasPreviousSession,
        userMetadataOnboardingCompleted
    });

    // Priority 1: Cloud profile exists -> Dashboard (EXISTING USER)
    if (hasCloudProfile) {
        return {
            route: 'dashboard',
            reason: 'Cloud profile found - existing user',
            isNewUser: false,
            isReturningUser: true,
            hasPreviousSession
        };
    }

    // Priority 2: User metadata says onboarding completed -> Dashboard
    if (userMetadataOnboardingCompleted) {
        return {
            route: 'dashboard',
            reason: 'User metadata indicates onboarding completed',
            isNewUser: false,
            isReturningUser: true,
            hasPreviousSession
        };
    }

    // Priority 3: Previous session with completed onboarding -> Dashboard
    if (previousSession?.onboardingCompleted) {
        return {
            route: 'dashboard',
            reason: 'Previous session had completed onboarding',
            isNewUser: false,
            isReturningUser: true,
            hasPreviousSession
        };
    }

    // Priority 4: Has local profiles for this user -> Dashboard
    if (hasLocalProfiles) {
        return {
            route: 'dashboard',
            reason: 'Local profiles found for this user',
            isNewUser: false,
            isReturningUser: true,
            hasPreviousSession
        };
    }

    // Priority 5: Account age check
    if (!isAccountJustCreated) {
        // Account is older than 2 minutes but has no profile
        // This is likely an existing user whose data was lost
        return {
            route: 'dashboard',
            reason: 'Account age > 2 minutes - treating as existing user with lost data',
            isNewUser: false,
            isReturningUser: true,
            hasPreviousSession
        };
    }

    // Default: New user -> Onboarding
    return {
        route: 'onboarding',
        reason: 'New user - account just created, no existing data',
        isNewUser: true,
        isReturningUser: false,
        hasPreviousSession
    };
};

/**
 * Set a session conflict flag (used to show warning modal)
 */
export const setSessionConflict = (conflictingEmail: string): void => {
    localStorage.setItem(ACTIVE_SESSION_CONFLICT_KEY, conflictingEmail);
};

/**
 * Get and clear session conflict (returns the conflicting email if any)
 */
export const getAndClearSessionConflict = (): string | null => {
    const conflict = localStorage.getItem(ACTIVE_SESSION_CONFLICT_KEY);
    if (conflict) {
        localStorage.removeItem(ACTIVE_SESSION_CONFLICT_KEY);
    }
    return conflict;
};

/**
 * Clear all session data (used for complete reset)
 */
export const clearAllSessions = (): void => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    localStorage.removeItem(ACTIVE_SESSION_CONFLICT_KEY);
    console.log('[SessionService] All sessions cleared');
};

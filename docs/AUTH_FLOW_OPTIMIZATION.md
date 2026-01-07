# Authentication Flow Optimization

## Overview

This document describes the optimized sign-up and login processes implemented for the Social AI application. The implementation ensures seamless user flows and proper redirects for both new and existing users.

## User Flows

### 1. New User Signup

**Flow:**
1. User clicks "Sign Up" or "Get Started" on the landing page
2. User completes authentication (email/password or OAuth)
3. System detects new user (account created within last 2 minutes + no cloud profile)
4. User is redirected to **Onboarding** page
5. User completes profile setup (company info, industry, goals, etc.)
6. System saves profile to cloud and marks onboarding complete
7. User is redirected to **Dashboard**

**Detection Logic:**
- Account age < 2 minutes
- No cloud profile exists
- No local profiles for this user
- User metadata `onboarding_completed` is false

### 2. Existing User Login

**Flow:**
1. User clicks "Login" on the landing page
2. User completes authentication
3. System detects existing user (cloud profile exists OR account age > 2 minutes)
4. User is redirected directly to **Dashboard**
5. Cloud data is synchronized to local storage

**Detection Logic (Priority Order):**
1. Cloud profile exists → Dashboard
2. User metadata has `onboarding_completed: true` → Dashboard
3. Previous session has `onboardingCompleted: true` → Dashboard
4. Local profiles exist for this user → Dashboard
5. Account age > 2 minutes → Dashboard (with recovery profile)
6. Otherwise → Onboarding (new user)

### 3. Multiple Accounts on Same Browser

#### Scenario A: New Account Sign-up on Same Browser

**Flow:**
1. User logs out or a different user signs up
2. System detects different user ID
3. All local data from previous user is cleared
4. Session conflict modal shows (informational)
5. New user is treated as fresh signup → Onboarding

**Key Points:**
- Previous user's data is NOT accessible
- New user gets a clean slate
- Session conflict notification informs user of the switch

#### Scenario B: Previous Account Login on Same Browser

**Flow:**
1. User logs in with previously used account
2. System detects this is a returning user
3. Cloud profile is fetched and restored
4. User is redirected to their original Dashboard
5. All their data is restored from cloud

**Key Points:**
- User's data is restored from cloud
- No cross-account data mixing
- Seamless continuation of previous session

## Session Management

### Session Storage Structure

```typescript
interface SessionInfo {
    userId: string;
    email: string;
    loginTime: string;
    isNewUser: boolean;
    onboardingCompleted: boolean;
}

interface BrowserSessionStore {
    currentSession: SessionInfo | null;
    previousSessions: SessionInfo[];
    lastActiveUserId: string | null;
}
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `createSession()` | Creates new session, detects conflicts |
| `clearCurrentSession()` | Clears session on logout |
| `getCurrentSession()` | Gets active session info |
| `determineUserRoute()` | Decides onboarding vs dashboard |
| `markSessionOnboardingComplete()` | Updates session after onboarding |

## Conflict Handling

### When User Switches Accounts

1. **Detection:** System compares `localStorage.socialai_user_id` with current user ID
2. **Notification:** `SessionConflictModal` displays informational message
3. **Action:** All previous user data is cleared from local storage
4. **Result:** New user proceeds with their own fresh or existing data

### Session Conflict Modal

The modal informs users when:
- They were previously logged in as a different account
- Their session has been switched to the new account
- Previous account data is safely stored (accessible on re-login)

## Data Isolation

### Per-User Data Storage

All user data is stored with user-specific prefixes:
- `socialai_user_id` - Current user identifier
- `socialai_profiles` - All profiles for current user
- `socialai_calendar_${profileId}` - Calendar data per profile
- `socialai_leads_${profileId}` - Leads data per profile
- etc.

### Cloud Synchronization

- Primary source of truth: **Supabase Cloud**
- Local storage: **Cache/Fallback**
- On login: Cloud data is fetched and merged
- On changes: Data is synced to cloud in real-time

## Best Practices Implemented

### Token/Cookie Handling
- Supabase handles authentication tokens automatically
- Session tokens are stored in secure httpOnly cookies
- Refresh tokens are managed by Supabase SDK

### Session Security
- Sessions are scoped to user ID
- Cross-account access is prevented by clearing data on switch
- User ID verification on every authenticated request

### State Management
- React state is cleared on user switch
- localStorage is cleared for new users
- Cloud sync ensures data persistence across devices

## File Changes Summary

### New Files
- `services/sessionService.ts` - Session management utilities
- `components/SessionConflictModal.tsx` - UI for session conflicts

### Modified Files
- `App.tsx` - Integrated session service, added conflict modal
- `services/authService.ts` - Added enhanced auth event handling

## Testing Scenarios

1. **New User Signup:** Complete signup → Should go to onboarding → Complete onboarding → Should go to dashboard
2. **Existing User Login:** Login with existing account → Should go directly to dashboard
3. **Account Switch (New):** Logout → Signup new account → Should clear old data → Go to onboarding
4. **Account Switch (Existing):** Logout → Login different existing account → Should restore that account's data
5. **Same User Re-login:** Logout → Login same account → Should restore all previous data

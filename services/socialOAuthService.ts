/**
 * Social Media OAuth Connection Service
 * Handles OAuth flows for connecting user social media accounts
 */

// OAuth configuration
const OAUTH_CONFIG = {
    facebook: {
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        scopes: ['pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'],
    },
    twitter: {
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    },
    linkedin: {
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        scopes: ['w_member_social', 'r_liteprofile'],
    },
    tiktok: {
        authUrl: 'https://www.tiktok.com/auth/authorize/',
        tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
        scopes: ['user.info.basic', 'video.upload'],
    },
};

// Get the base URL for redirects
const getBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return import.meta.env?.VITE_APP_URL || 'https://your-app.netlify.app';
};

// Generate a random state for CSRF protection
const generateState = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Store state in sessionStorage for verification
const storeOAuthState = (platform: string, state: string): void => {
    sessionStorage.setItem(`oauth_state_${platform}`, state);
};

const getStoredOAuthState = (platform: string): string | null => {
    return sessionStorage.getItem(`oauth_state_${platform}`);
};

const clearOAuthState = (platform: string): void => {
    sessionStorage.removeItem(`oauth_state_${platform}`);
};

export interface OAuthCallbackResult {
    success: boolean;
    platform: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    userId?: string;
    username?: string;
    error?: string;
}

/**
 * Initiate OAuth flow for a platform
 */
export function initiateOAuth(platform: string): void {
    const config = OAUTH_CONFIG[platform.toLowerCase() as keyof typeof OAUTH_CONFIG];
    if (!config) {
        console.error(`[OAuth] Unknown platform: ${platform}`);
        return;
    }

    const state = generateState();
    storeOAuthState(platform, state);

    const redirectUri = `${getBaseUrl()}/oauth/callback/${platform}`;

    let clientId = '';
    switch (platform.toLowerCase()) {
        case 'facebook':
            clientId = import.meta.env?.VITE_FACEBOOK_APP_ID || '';
            break;
        case 'twitter':
            clientId = import.meta.env?.VITE_TWITTER_CLIENT_ID || '';
            break;
        case 'linkedin':
            clientId = import.meta.env?.VITE_LINKEDIN_CLIENT_ID || '';
            break;
        case 'tiktok':
            clientId = import.meta.env?.VITE_TIKTOK_CLIENT_KEY || '';
            break;
    }

    if (!clientId) {
        console.error(`[OAuth] No client ID configured for ${platform}`);
        alert(`${platform} OAuth is not configured. Please add your app credentials.`);
        return;
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes.join(' '),
        response_type: 'code',
        state: state,
    });

    // Platform-specific params
    if (platform.toLowerCase() === 'twitter') {
        params.set('code_challenge', state); // Simplified PKCE
        params.set('code_challenge_method', 'plain');
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;
    console.log(`[OAuth] Redirecting to ${platform} OAuth...`);

    // Open in popup or redirect
    window.location.href = authUrl;
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(
    platform: string,
    code: string,
    state: string
): Promise<OAuthCallbackResult> {
    // Verify state
    const storedState = getStoredOAuthState(platform);
    if (state !== storedState) {
        clearOAuthState(platform);
        return {
            success: false,
            platform,
            error: 'Invalid state - possible CSRF attack',
        };
    }
    clearOAuthState(platform);

    // Exchange code for token via serverless function
    try {
        const response = await fetch('/.netlify/functions/oauth-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform,
                code,
                redirectUri: `${getBaseUrl()}/oauth/callback/${platform}`,
            }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            return {
                success: false,
                platform,
                error: data.error || 'Failed to exchange token',
            };
        }

        return {
            success: true,
            platform,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
            userId: data.user_id,
            username: data.username,
        };
    } catch (error: any) {
        return {
            success: false,
            platform,
            error: error.message || 'Network error',
        };
    }
}

/**
 * Save connection to Supabase
 */
export async function saveConnection(
    userId: string,
    profileId: string,
    result: OAuthCallbackResult
): Promise<boolean> {
    if (!result.success || !result.accessToken) {
        return false;
    }

    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[OAuth] Supabase not configured');
        // Fall back to localStorage
        const connections = JSON.parse(localStorage.getItem('social_connections') || '[]');
        connections.push({
            platform: result.platform,
            userId: result.userId,
            username: result.username,
            connectedAt: new Date().toISOString(),
        });
        localStorage.setItem('social_connections', JSON.stringify(connections));
        return true;
    }

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/social_connections`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
                user_id: userId,
                profile_id: profileId,
                platform: result.platform,
                platform_user_id: result.userId,
                platform_username: result.username,
                access_token: result.accessToken, // Should be encrypted in production
                refresh_token: result.refreshToken,
                token_expires_at: result.expiresIn
                    ? new Date(Date.now() + result.expiresIn * 1000).toISOString()
                    : null,
                is_active: true,
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('[OAuth] Failed to save connection:', error);
        return false;
    }
}

/**
 * Get user's connected accounts
 */
export async function getConnectedAccounts(userId: string, profileId: string): Promise<any[]> {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // Fall back to localStorage
        return JSON.parse(localStorage.getItem('social_connections') || '[]');
    }

    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/social_connections?user_id=eq.${userId}&profile_id=eq.${profileId}&is_active=eq.true`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch connections');
        }

        return await response.json();
    } catch (error) {
        console.error('[OAuth] Failed to get connections:', error);
        return JSON.parse(localStorage.getItem('social_connections') || '[]');
    }
}

/**
 * Disconnect an account
 */
export async function disconnectAccount(connectionId: string): Promise<boolean> {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // Fall back to localStorage
        const connections = JSON.parse(localStorage.getItem('social_connections') || '[]');
        const filtered = connections.filter((c: any) => c.id !== connectionId);
        localStorage.setItem('social_connections', JSON.stringify(filtered));
        return true;
    }

    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/social_connections?id=eq.${connectionId}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: false }),
            }
        );

        return response.ok;
    } catch (error) {
        console.error('[OAuth] Failed to disconnect:', error);
        return false;
    }
}

/**
 * Check if we're returning from OAuth callback
 */
export function checkOAuthCallback(): { platform: string; code: string; state: string } | null {
    const url = new URL(window.location.href);
    const pathMatch = url.pathname.match(/\/oauth\/callback\/(\w+)/);

    if (pathMatch) {
        const platform = pathMatch[1];
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (code && state) {
            return { platform, code, state };
        }
    }

    return null;
}

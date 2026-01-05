import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * OAuth Token Exchange Function
 * Exchanges authorization codes for access tokens
 */

interface TokenExchangeRequest {
    platform: string;
    code: string;
    redirectUri: string;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const { platform, code, redirectUri }: TokenExchangeRequest = JSON.parse(event.body || '{}');

        if (!platform || !code || !redirectUri) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters' }),
            };
        }

        let result;
        switch (platform.toLowerCase()) {
            case 'facebook':
                result = await exchangeFacebookToken(code, redirectUri);
                break;
            case 'twitter':
                result = await exchangeTwitterToken(code, redirectUri);
                break;
            case 'linkedin':
                result = await exchangeLinkedInToken(code, redirectUri);
                break;
            case 'tiktok':
                result = await exchangeTikTokToken(code, redirectUri);
                break;
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: `Unsupported platform: ${platform}` }),
                };
        }

        if (result.error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: result.error }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        console.error('[OAuth Exchange] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal error' }),
        };
    }
};

async function exchangeFacebookToken(code: string, redirectUri: string) {
    const appId = process.env.FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.VITE_FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
        return { error: 'Facebook app credentials not configured' };
    }

    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);

    const response = await fetch(tokenUrl.toString());
    const data = await response.json();

    if (data.error) {
        return { error: data.error.message };
    }

    // Get user info
    const userResponse = await fetch(
        `https://graph.facebook.com/me?access_token=${data.access_token}&fields=id,name`
    );
    const userData = await userResponse.json();

    return {
        access_token: data.access_token,
        expires_in: data.expires_in,
        user_id: userData.id,
        username: userData.name,
    };
}

async function exchangeTwitterToken(code: string, redirectUri: string) {
    const clientId = process.env.TWITTER_CLIENT_ID || process.env.VITE_TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.VITE_TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return { error: 'Twitter app credentials not configured' };
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code_verifier: code, // Simplified PKCE
        }),
    });

    const data = await response.json();

    if (data.error) {
        return { error: data.error_description || data.error };
    }

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
            'Authorization': `Bearer ${data.access_token}`,
        },
    });
    const userData = await userResponse.json();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user_id: userData.data?.id,
        username: userData.data?.username,
    };
}

async function exchangeLinkedInToken(code: string, redirectUri: string) {
    const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.VITE_LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.VITE_LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return { error: 'LinkedIn app credentials not configured' };
    }

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    const data = await response.json();

    if (data.error) {
        return { error: data.error_description || data.error };
    }

    // Get user info
    const userResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
            'Authorization': `Bearer ${data.access_token}`,
        },
    });
    const userData = await userResponse.json();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user_id: userData.id,
        username: `${userData.localizedFirstName} ${userData.localizedLastName}`,
    };
}

async function exchangeTikTokToken(code: string, redirectUri: string) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.VITE_TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET || process.env.VITE_TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
        return { error: 'TikTok app credentials not configured' };
    }

    const response = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
        }),
    });

    const data = await response.json();

    if (data.data?.error_code) {
        return { error: data.data.description || 'TikTok error' };
    }

    return {
        access_token: data.data?.access_token,
        refresh_token: data.data?.refresh_token,
        expires_in: data.data?.expires_in,
        user_id: data.data?.open_id,
        username: null, // TikTok requires additional API call for username
    };
}

export { handler };

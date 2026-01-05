import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * Twitter/X Publishing Serverless Function
 * Handles OAuth 1.0a signing which must be done server-side
 */

// OAuth 1.0a signature generation
function generateOAuthSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string,
    tokenSecret: string
): string {
    // Sort params by key
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    // Create signature base string
    const signatureBaseString = [
        method.toUpperCase(),
        encodeURIComponent(url),
        encodeURIComponent(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

    // HMAC-SHA1 signature (using Web Crypto API for Node.js)
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha1', signingKey);
    hmac.update(signatureBaseString);
    return hmac.digest('base64');
}

// Generate OAuth 1.0a header
function generateOAuthHeader(
    method: string,
    url: string,
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string
): string {
    const oauthParams: Record<string, string> = {
        oauth_consumer_key: apiKey,
        oauth_nonce: Math.random().toString(36).substring(2),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: accessToken,
        oauth_version: '1.0',
    };

    // Generate signature
    oauthParams.oauth_signature = generateOAuthSignature(
        method,
        url,
        oauthParams,
        apiSecret,
        accessTokenSecret
    );

    // Build Authorization header
    const headerParams = Object.keys(oauthParams)
        .sort()
        .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
        .join(', ');

    return `OAuth ${headerParams}`;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle preflight
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
        // Get credentials from environment
        const apiKey = process.env.TWITTER_API_KEY || process.env.VITE_TWITTER_API_KEY;
        const apiSecret = process.env.TWITTER_API_SECRET || process.env.VITE_TWITTER_API_SECRET;
        const accessToken = process.env.TWITTER_ACCESS_TOKEN || process.env.VITE_TWITTER_ACCESS_TOKEN;
        const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || process.env.VITE_TWITTER_ACCESS_TOKEN_SECRET;

        if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Twitter API credentials not configured',
                    configured: {
                        apiKey: !!apiKey,
                        apiSecret: !!apiSecret,
                        accessToken: !!accessToken,
                        accessTokenSecret: !!accessTokenSecret,
                    }
                }),
            };
        }

        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { text, imageUrl } = body;

        if (!text) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Tweet text is required' }),
            };
        }

        // Twitter API v2 endpoint
        const tweetUrl = 'https://api.twitter.com/2/tweets';

        // Generate OAuth header
        const authHeader = generateOAuthHeader(
            'POST',
            tweetUrl,
            apiKey,
            apiSecret,
            accessToken,
            accessTokenSecret
        );

        // Prepare tweet data
        const tweetData: any = {
            text: text.slice(0, 280), // Twitter's character limit
        };

        // TODO: Handle image upload if imageUrl is provided
        // Twitter requires media to be uploaded separately first

        // Post the tweet
        const response = await fetch(tweetUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tweetData),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('[Twitter] API error:', responseData);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: responseData.detail || responseData.title || 'Failed to post tweet',
                    details: responseData,
                }),
            };
        }

        console.log('[Twitter] Tweet posted successfully:', responseData.data?.id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                id: responseData.data?.id,
                url: `https://twitter.com/i/status/${responseData.data?.id}`,
            }),
        };

    } catch (error: any) {
        console.error('[Twitter] Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Internal server error',
            }),
        };
    }
};

export { handler };

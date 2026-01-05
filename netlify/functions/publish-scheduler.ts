import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { schedule } from '@netlify/functions';

/**
 * Scheduled Publishing Function
 * Runs every 5 minutes to check for and publish scheduled posts
 * 
 * Configure in netlify.toml:
 * [functions."publish-scheduler"]
 *   schedule = "*/5 * * * * "
    */

// Supabase client initialization
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

interface ScheduledPost {
    id: string;
    user_id: string;
    profile_id: string;
    platform: string;
    caption: string;
    image_url?: string;
    scheduled_at: string;
    status: string;
}

interface PublishResult {
    success: boolean;
    postId?: string;
    error?: string;
}

// Platform publishing functions
async function publishToFacebook(caption: string, imageUrl?: string): Promise<PublishResult> {
    const accessToken = process.env.VITE_FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    const pageId = process.env.VITE_FACEBOOK_PAGE_ID || process.env.FACEBOOK_PAGE_ID;

    if (!accessToken || !pageId) {
        return { success: false, error: 'Facebook not configured' };
    }

    try {
        let endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
        const params: any = { message: caption, access_token: accessToken };

        if (imageUrl) {
            endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
            params.url = imageUrl;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        const data = await response.json();

        if (data.error) {
            return { success: false, error: data.error.message };
        }

        return { success: true, postId: data.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function publishToInstagram(caption: string, imageUrl?: string): Promise<PublishResult> {
    const accessToken = process.env.VITE_FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    const igAccountId = process.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    if (!accessToken || !igAccountId || !imageUrl) {
        return { success: false, error: 'Instagram requires image and credentials' };
    }

    try {
        // Create container
        const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
        });
        const containerData = await containerRes.json();

        if (containerData.error) {
            return { success: false, error: containerData.error.message };
        }

        // Publish
        const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
        });
        const publishData = await publishRes.json();

        if (publishData.error) {
            return { success: false, error: publishData.error.message };
        }

        return { success: true, postId: publishData.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function publishToTwitter(caption: string): Promise<PublishResult> {
    const accessToken = process.env.VITE_TWITTER_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.VITE_TWITTER_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_TOKEN_SECRET;
    const apiKey = process.env.VITE_TWITTER_API_KEY || process.env.TWITTER_API_KEY;
    const apiSecret = process.env.VITE_TWITTER_API_SECRET || process.env.TWITTER_API_SECRET;

    if (!accessToken || !accessTokenSecret || !apiKey || !apiSecret) {
        return { success: false, error: 'Twitter not configured' };
    }

    try {
        // Generate OAuth 1.0a signature
        const crypto = require('crypto');
        const url = 'https://api.twitter.com/2/tweets';
        const oauthParams: Record<string, string> = {
            oauth_consumer_key: apiKey,
            oauth_nonce: Math.random().toString(36).substring(2),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: accessToken,
            oauth_version: '1.0',
        };

        const sortedParams = Object.keys(oauthParams).sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
            .join('&');

        const signatureBaseString = `POST&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
        const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;

        const hmac = crypto.createHmac('sha1', signingKey);
        hmac.update(signatureBaseString);
        oauthParams.oauth_signature = hmac.digest('base64');

        const authHeader = 'OAuth ' + Object.keys(oauthParams).sort()
            .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: caption.slice(0, 280) }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.detail || 'Failed to tweet' };
        }

        return { success: true, postId: data.data?.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function publishToLinkedIn(caption: string): Promise<PublishResult> {
    const accessToken = process.env.VITE_LINKEDIN_ACCESS_TOKEN || process.env.LINKEDIN_ACCESS_TOKEN;

    if (!accessToken) {
        return { success: false, error: 'LinkedIn not configured' };
    }

    try {
        // Get user URN
        const profileRes = await fetch('https://api.linkedin.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const profileData = await profileRes.json();

        if (!profileData.id) {
            return { success: false, error: 'Failed to get LinkedIn profile' };
        }

        const postData = {
            author: `urn:li:person:${profileData.id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: caption },
                    shareMediaCategory: 'NONE',
                },
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        };

        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(postData),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.message || 'Failed to post' };
        }

        return { success: true, postId: data.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Main publish function
async function publishPost(post: ScheduledPost): Promise<PublishResult> {
    const platform = post.platform.toLowerCase();

    switch (platform) {
        case 'facebook':
            return publishToFacebook(post.caption, post.image_url);
        case 'instagram':
            return publishToInstagram(post.caption, post.image_url);
        case 'twitter':
        case 'x':
            return publishToTwitter(post.caption);
        case 'linkedin':
            return publishToLinkedIn(post.caption);
        default:
            return { success: false, error: `Unsupported platform: ${platform}` };
    }
}

// The scheduled handler
const scheduledHandler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    console.log('[Scheduler] Running publish scheduler at', new Date().toISOString());

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.log('[Scheduler] Supabase not configured');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Supabase not configured' }),
        };
    }

    try {
        // Fetch posts that are due for publishing
        const now = new Date().toISOString();
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/scheduled_posts?select=*&scheduled_at=lte.${now}&status=eq.scheduled`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.log('[Scheduler] No scheduled_posts table or error:', response.status);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No posts to publish or table not found' }),
            };
        }

        const posts: ScheduledPost[] = await response.json();
        console.log(`[Scheduler] Found ${posts.length} posts to publish`);

        const results = [];
        for (const post of posts) {
            console.log(`[Scheduler] Publishing post ${post.id} to ${post.platform}`);

            // Update status to 'publishing'
            await fetch(`${SUPABASE_URL}/rest/v1/scheduled_posts?id=eq.${post.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'publishing', updated_at: new Date().toISOString() }),
            });

            // Publish
            const result = await publishPost(post);

            // Update with result
            await fetch(`${SUPABASE_URL}/rest/v1/scheduled_posts?id=eq.${post.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: result.success ? 'published' : 'failed',
                    external_post_id: result.postId,
                    error_message: result.error,
                    published_at: result.success ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                }),
            });

            results.push({ postId: post.id, platform: post.platform, ...result });
            console.log(`[Scheduler] Post ${post.id} result:`, result.success ? 'success' : result.error);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Processed ${posts.length} posts`,
                results,
            }),
        };
    } catch (error: any) {
        console.error('[Scheduler] Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

// Export as scheduled function (runs every 5 minutes)
export const handler = schedule('*/5 * * * *', scheduledHandler);

/**
 * Social Media Publishing Service
 * Handles publishing content to connected social media platforms
 */

export interface PublishResult {
    success: boolean;
    platform: string;
    postId?: string;
    postUrl?: string;
    error?: string;
    publishedAt?: Date;
}

export interface PostContent {
    caption: string;
    imageUrl?: string;
    platform: string;
}

// Environment variable helpers
const getEnvVar = (key: string): string | undefined => {
    return (import.meta as any).env?.[key] || undefined;
};

// ============================================
// PLATFORM CONFIGURATION
// ============================================

export const SOCIAL_PLATFORMS_CONFIG = {
    facebook: {
        name: 'Facebook',
        icon: '👤',
        color: 'bg-blue-600',
        enabled: () => !!getEnvVar('VITE_FACEBOOK_ACCESS_TOKEN'),
    },
    instagram: {
        name: 'Instagram',
        icon: '📸',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        enabled: () => !!getEnvVar('VITE_FACEBOOK_ACCESS_TOKEN') && !!getEnvVar('VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID'),
    },
    twitter: {
        name: 'X (Twitter)',
        icon: '𝕏',
        color: 'bg-slate-900',
        enabled: () => !!getEnvVar('VITE_TWITTER_ACCESS_TOKEN'),
    },
    linkedin: {
        name: 'LinkedIn',
        icon: '💼',
        color: 'bg-blue-700',
        enabled: () => !!getEnvVar('VITE_LINKEDIN_ACCESS_TOKEN'),
    },
    tiktok: {
        name: 'TikTok',
        icon: '🎵',
        color: 'bg-slate-800',
        enabled: () => !!getEnvVar('VITE_TIKTOK_CLIENT_KEY'),
    },
    youtube: {
        name: 'YouTube',
        icon: '▶️',
        color: 'bg-red-600',
        enabled: () => !!getEnvVar('VITE_YOUTUBE_API_KEY'),
    },
    whatsapp: {
        name: 'WhatsApp',
        icon: '💬',
        color: 'bg-green-500',
        enabled: () => !!getEnvVar('VITE_WHATSAPP_ACCESS_TOKEN'),
    },
};

// Check if any publishing platform is configured
export const isPublishingConfigured = (): boolean => {
    return Object.values(SOCIAL_PLATFORMS_CONFIG).some(p => p.enabled());
};

// Get list of configured platforms
export const getConfiguredPlatforms = (): string[] => {
    return Object.entries(SOCIAL_PLATFORMS_CONFIG)
        .filter(([_, config]) => config.enabled())
        .map(([key]) => key);
};

// ============================================
// FACEBOOK PUBLISHING
// ============================================

export async function publishToFacebook(content: PostContent): Promise<PublishResult> {
    const accessToken = getEnvVar('VITE_FACEBOOK_ACCESS_TOKEN');
    const pageId = getEnvVar('VITE_FACEBOOK_PAGE_ID');

    if (!accessToken || !pageId) {
        return {
            success: false,
            platform: 'facebook',
            error: 'Facebook credentials not configured',
        };
    }

    try {
        let endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
        const params: any = {
            message: content.caption,
            access_token: accessToken,
        };

        // If there's an image, use photos endpoint instead
        if (content.imageUrl) {
            endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
            params.url = content.imageUrl;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        const data = await response.json();

        if (data.error) {
            console.error('[Facebook] Publish error:', data.error);
            return {
                success: false,
                platform: 'facebook',
                error: data.error.message || 'Failed to publish',
            };
        }

        console.log('[Facebook] Published successfully:', data.id);
        return {
            success: true,
            platform: 'facebook',
            postId: data.id,
            postUrl: `https://facebook.com/${data.id}`,
            publishedAt: new Date(),
        };
    } catch (error: any) {
        console.error('[Facebook] Publish error:', error);
        return {
            success: false,
            platform: 'facebook',
            error: error.message || 'Network error',
        };
    }
}

// ============================================
// INSTAGRAM PUBLISHING
// ============================================

export async function publishToInstagram(content: PostContent): Promise<PublishResult> {
    const accessToken = getEnvVar('VITE_FACEBOOK_ACCESS_TOKEN');
    const igAccountId = getEnvVar('VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID');

    if (!accessToken || !igAccountId) {
        return {
            success: false,
            platform: 'instagram',
            error: 'Instagram credentials not configured. Requires Facebook access token and Instagram Business Account ID.',
        };
    }

    if (!content.imageUrl) {
        return {
            success: false,
            platform: 'instagram',
            error: 'Instagram requires an image to publish',
        };
    }

    try {
        // Step 1: Create media container
        const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}/media`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: content.imageUrl,
                    caption: content.caption,
                    access_token: accessToken,
                }),
            }
        );

        const containerData = await containerResponse.json();

        if (containerData.error) {
            console.error('[Instagram] Container error:', containerData.error);
            return {
                success: false,
                platform: 'instagram',
                error: containerData.error.message || 'Failed to create media container',
            };
        }

        // Step 2: Publish the container
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: containerData.id,
                    access_token: accessToken,
                }),
            }
        );

        const publishData = await publishResponse.json();

        if (publishData.error) {
            console.error('[Instagram] Publish error:', publishData.error);
            return {
                success: false,
                platform: 'instagram',
                error: publishData.error.message || 'Failed to publish',
            };
        }

        console.log('[Instagram] Published successfully:', publishData.id);
        return {
            success: true,
            platform: 'instagram',
            postId: publishData.id,
            postUrl: `https://instagram.com/p/${publishData.id}`,
            publishedAt: new Date(),
        };
    } catch (error: any) {
        console.error('[Instagram] Publish error:', error);
        return {
            success: false,
            platform: 'instagram',
            error: error.message || 'Network error',
        };
    }
}

// ============================================
// TWITTER / X PUBLISHING
// ============================================

export async function publishToTwitter(content: PostContent): Promise<PublishResult> {
    const accessToken = getEnvVar('VITE_TWITTER_ACCESS_TOKEN');
    const accessTokenSecret = getEnvVar('VITE_TWITTER_ACCESS_TOKEN_SECRET');

    if (!accessToken || !accessTokenSecret) {
        return {
            success: false,
            platform: 'twitter',
            error: 'Twitter credentials not configured',
        };
    }

    try {
        // Twitter requires OAuth 1.0a signature which is complex to implement client-side
        // We'll use a serverless function proxy for this
        const response = await fetch('/.netlify/functions/twitter-publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: content.caption.slice(0, 280), // Twitter's character limit
                imageUrl: content.imageUrl,
            }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('[Twitter] Publish error:', data);
            return {
                success: false,
                platform: 'twitter',
                error: data.error || 'Failed to publish to Twitter',
            };
        }

        console.log('[Twitter] Published successfully:', data.id);
        return {
            success: true,
            platform: 'twitter',
            postId: data.id,
            postUrl: data.url || `https://twitter.com/i/status/${data.id}`,
            publishedAt: new Date(),
        };
    } catch (error: any) {
        console.error('[Twitter] Publish error:', error);
        return {
            success: false,
            platform: 'twitter',
            error: error.message || 'Network error',
        };
    }
}

// ============================================
// LINKEDIN PUBLISHING
// ============================================

export async function publishToLinkedIn(content: PostContent): Promise<PublishResult> {
    const accessToken = getEnvVar('VITE_LINKEDIN_ACCESS_TOKEN');

    if (!accessToken) {
        return {
            success: false,
            platform: 'linkedin',
            error: 'LinkedIn credentials not configured',
        };
    }

    try {
        // First, get the user's URN
        const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const profileData = await profileResponse.json();

        if (!profileData.id) {
            return {
                success: false,
                platform: 'linkedin',
                error: 'Failed to get LinkedIn profile',
            };
        }

        const authorUrn = `urn:li:person:${profileData.id}`;

        // Create the post
        const postData: any = {
            author: authorUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: content.caption,
                    },
                    shareMediaCategory: content.imageUrl ? 'IMAGE' : 'NONE',
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        };

        // If there's an image, we need to upload it first (complex process)
        // For now, just post text
        if (!content.imageUrl) {
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

            if (!response.ok || data.error) {
                console.error('[LinkedIn] Publish error:', data);
                return {
                    success: false,
                    platform: 'linkedin',
                    error: data.message || 'Failed to publish',
                };
            }

            console.log('[LinkedIn] Published successfully:', data.id);
            return {
                success: true,
                platform: 'linkedin',
                postId: data.id,
                publishedAt: new Date(),
            };
        } else {
            // For images, we'd need to implement the asset upload flow
            // For now, just post without image
            postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'NONE';

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
                return {
                    success: false,
                    platform: 'linkedin',
                    error: data.message || 'Failed to publish',
                };
            }

            return {
                success: true,
                platform: 'linkedin',
                postId: data.id,
                publishedAt: new Date(),
            };
        }
    } catch (error: any) {
        console.error('[LinkedIn] Publish error:', error);
        return {
            success: false,
            platform: 'linkedin',
            error: error.message || 'Network error',
        };
    }
}

// ============================================
// TIKTOK PUBLISHING
// ============================================

export async function publishToTikTok(content: PostContent): Promise<PublishResult> {
    const clientKey = getEnvVar('VITE_TIKTOK_CLIENT_KEY');

    if (!clientKey) {
        return {
            success: false,
            platform: 'tiktok',
            error: 'TikTok credentials not configured',
        };
    }

    // TikTok requires video content and has a complex OAuth + upload flow
    // For now, return a placeholder response
    return {
        success: false,
        platform: 'tiktok',
        error: 'TikTok publishing requires video content and is not yet fully implemented. Coming soon!',
    };
}

// ============================================
// WHATSAPP PUBLISHING
// ============================================

export async function publishToWhatsApp(content: PostContent): Promise<PublishResult> {
    const accessToken = getEnvVar('VITE_WHATSAPP_ACCESS_TOKEN');

    if (!accessToken) {
        return {
            success: false,
            platform: 'whatsapp',
            error: 'WhatsApp Business API credentials not configured',
        };
    }

    // WhatsApp Business API requires specific setup and typically uses templates
    // This is a placeholder for future implementation
    return {
        success: false,
        platform: 'whatsapp',
        error: 'WhatsApp publishing via Business API is coming soon! For now, use the copy feature to share content.',
    };
}

// ============================================
// MAIN PUBLISH FUNCTION
// ============================================

export async function publishToSocialMedia(
    platform: string,
    content: PostContent
): Promise<PublishResult> {
    console.log(`[SocialPublish] Publishing to ${platform}...`);

    switch (platform.toLowerCase()) {
        case 'facebook':
            return publishToFacebook(content);
        case 'instagram':
            return publishToInstagram(content);
        case 'twitter':
        case 'x':
            return publishToTwitter(content);
        case 'linkedin':
            return publishToLinkedIn(content);
        case 'tiktok':
            return publishToTikTok(content);
        case 'whatsapp':
            return publishToWhatsApp(content);
        default:
            return {
                success: false,
                platform,
                error: `Unknown platform: ${platform}`,
            };
    }
}

// Publish to multiple platforms at once
export async function publishToMultiplePlatforms(
    platforms: string[],
    content: PostContent
): Promise<PublishResult[]> {
    const results = await Promise.all(
        platforms.map(platform => publishToSocialMedia(platform, content))
    );
    return results;
}

// Check if a specific platform is configured
export function isPlatformConfigured(platform: string): boolean {
    const config = SOCIAL_PLATFORMS_CONFIG[platform.toLowerCase() as keyof typeof SOCIAL_PLATFORMS_CONFIG];
    return config ? config.enabled() : false;
}

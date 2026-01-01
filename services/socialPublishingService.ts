/**
 * Social Media Publishing Service
 * 
 * Handles OAuth connections, scheduled posting, and auto-publishing
 * to connected social media platforms.
 */

import { SocialPlatform, SocialConnection, ScheduledPost, SocialPost } from '../types';

// ============================================
// CONNECTION STORAGE
// ============================================

const CONNECTIONS_KEY = 'social_connections';
const SCHEDULED_POSTS_KEY = 'scheduled_posts';

// Get all social connections
export function getSocialConnections(): SocialConnection[] {
    try {
        const stored = localStorage.getItem(CONNECTIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Get connection for a specific platform
export function getConnection(platform: SocialPlatform): SocialConnection | null {
    const connections = getSocialConnections();
    return connections.find(c => c.platform === platform) || null;
}

// Save a social connection
export function saveConnection(connection: SocialConnection): void {
    const connections = getSocialConnections();
    const index = connections.findIndex(c => c.platform === connection.platform);

    if (index >= 0) {
        connections[index] = connection;
    } else {
        connections.push(connection);
    }

    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}

// Remove a social connection
export function disconnectPlatform(platform: SocialPlatform): void {
    const connections = getSocialConnections().filter(c => c.platform !== platform);
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}

// Check if platform is connected
export function isConnected(platform: SocialPlatform): boolean {
    const connection = getConnection(platform);
    return connection?.isConnected || false;
}

// ============================================
// OAUTH URL GENERATORS (Placeholder - needs backend)
// ============================================

// These would normally be handled by a backend server for security
// The frontend would redirect to these URLs, and the backend would handle the callback

export function getOAuthUrl(platform: SocialPlatform): string {
    // In production, this would call your backend to get the proper OAuth URL
    // For now, return placeholder URLs that explain the integration requirements

    const oauthEndpoints: Record<SocialPlatform, string> = {
        instagram: 'https://api.instagram.com/oauth/authorize', // Requires Facebook App
        facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
        twitter: 'https://twitter.com/i/oauth2/authorize',
        linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
        tiktok: 'https://www.tiktok.com/auth/authorize/',
        youtube: 'https://accounts.google.com/o/oauth2/v2/auth',
        pinterest: 'https://api.pinterest.com/oauth/',
        threads: 'https://threads.net/oauth/', // Uses Instagram API
    };

    return oauthEndpoints[platform];
}

// Simulate OAuth connection (for demo purposes)
export function simulateConnect(platform: SocialPlatform, profileUrl?: string): SocialConnection {
    const connection: SocialConnection = {
        platform,
        isConnected: true,
        profileUrl: profileUrl || `https://${platform}.com/demo`,
        profileName: `@demo_${platform}`,
        lastSync: new Date(),
        followerCount: Math.floor(Math.random() * 10000) + 100,
    };

    saveConnection(connection);
    return connection;
}

// ============================================
// SCHEDULED POSTS MANAGEMENT
// ============================================

// Get all scheduled posts
export function getScheduledPosts(): ScheduledPost[] {
    try {
        const stored = localStorage.getItem(SCHEDULED_POSTS_KEY);
        const posts = stored ? JSON.parse(stored) : [];
        // Parse dates
        return posts.map((p: any) => ({
            ...p,
            date: new Date(p.date),
            scheduledTime: new Date(p.scheduledTime),
            publishedAt: p.publishedAt ? new Date(p.publishedAt) : undefined,
        }));
    } catch {
        return [];
    }
}

// Save scheduled posts
function saveScheduledPosts(posts: ScheduledPost[]): void {
    localStorage.setItem(SCHEDULED_POSTS_KEY, JSON.stringify(posts));
}

// Schedule a post for auto-publishing
export function schedulePost(post: SocialPost, scheduledTime: Date, platforms: SocialPlatform[]): ScheduledPost {
    const scheduledPost: ScheduledPost = {
        ...post,
        scheduledTime,
        platforms,
        autoPublish: true,
        status: 'Scheduled',
    };

    const posts = getScheduledPosts();
    posts.push(scheduledPost);
    saveScheduledPosts(posts);

    console.log(`[Scheduler] Post scheduled for ${scheduledTime.toISOString()} on ${platforms.join(', ')}`);
    return scheduledPost;
}

// Update a scheduled post
export function updateScheduledPost(postId: string, updates: Partial<ScheduledPost>): void {
    const posts = getScheduledPosts();
    const index = posts.findIndex(p => p.id === postId);

    if (index >= 0) {
        posts[index] = { ...posts[index], ...updates };
        saveScheduledPosts(posts);
    }
}

// Remove a scheduled post
export function removeScheduledPost(postId: string): void {
    const posts = getScheduledPosts().filter(p => p.id !== postId);
    saveScheduledPosts(posts);
}

// ============================================
// AUTO-PUBLISHING ENGINE
// ============================================

let publisherInterval: NodeJS.Timeout | null = null;

// Start the auto-publisher (checks every minute for posts to publish)
export function startAutoPublisher(): void {
    if (publisherInterval) return; // Already running

    console.log('[AutoPublisher] Starting scheduler...');

    // Check immediately
    checkAndPublishDuePosts();

    // Then check every minute
    publisherInterval = setInterval(checkAndPublishDuePosts, 60000);
}

// Stop the auto-publisher
export function stopAutoPublisher(): void {
    if (publisherInterval) {
        clearInterval(publisherInterval);
        publisherInterval = null;
        console.log('[AutoPublisher] Stopped');
    }
}

// Check for posts that are due and publish them
async function checkAndPublishDuePosts(): Promise<void> {
    const now = new Date();
    const posts = getScheduledPosts();

    const duePosts = posts.filter(post =>
        post.autoPublish &&
        post.status === 'Scheduled' &&
        new Date(post.scheduledTime) <= now
    );

    if (duePosts.length === 0) return;

    console.log(`[AutoPublisher] Found ${duePosts.length} posts due for publishing`);

    for (const post of duePosts) {
        await publishPost(post);
    }
}

// Publish a single post to all its platforms
async function publishPost(post: ScheduledPost): Promise<void> {
    console.log(`[AutoPublisher] Publishing post ${post.id} to ${post.platforms.join(', ')}`);

    const errors: string[] = [];

    for (const platform of post.platforms) {
        try {
            const success = await publishToPlatform(post, platform);
            if (!success) {
                errors.push(`${platform}: Failed to publish`);
            }
        } catch (e: any) {
            errors.push(`${platform}: ${e.message}`);
        }
    }

    // Update post status
    if (errors.length === 0) {
        updateScheduledPost(post.id, {
            status: 'Published',
            publishedAt: new Date(),
        });
        console.log(`[AutoPublisher] Post ${post.id} published successfully!`);
    } else {
        const retryCount = (post.retryCount || 0) + 1;
        if (retryCount >= 3) {
            updateScheduledPost(post.id, {
                status: 'Draft', // Failed after retries
                publishError: errors.join('; '),
                retryCount,
            });
            console.error(`[AutoPublisher] Post ${post.id} failed after ${retryCount} attempts:`, errors);
        } else {
            // Will retry next cycle
            updateScheduledPost(post.id, {
                publishError: errors.join('; '),
                retryCount,
            });
            console.warn(`[AutoPublisher] Post ${post.id} failed (attempt ${retryCount}), will retry:`, errors);
        }
    }
}

// Publish to a specific platform
async function publishToPlatform(post: ScheduledPost, platform: SocialPlatform): Promise<boolean> {
    const connection = getConnection(platform);

    if (!connection?.isConnected) {
        console.warn(`[AutoPublisher] ${platform} is not connected`);
        return false;
    }

    // In production, this would call the actual API for each platform
    // For now, simulate the API call

    console.log(`[AutoPublisher] Publishing to ${platform}:`, {
        caption: post.caption.substring(0, 50) + '...',
        image: post.imageUrl,
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate success (in production, actually call the API)
    // Example for each platform:
    switch (platform) {
        case 'facebook':
            // await publishToFacebook(post, connection.accessToken);
            break;
        case 'instagram':
            // await publishToInstagram(post, connection.accessToken);
            break;
        case 'twitter':
            // await publishToTwitter(post, connection.accessToken);
            break;
        case 'linkedin':
            // await publishToLinkedIn(post, connection.accessToken);
            break;
        case 'tiktok':
            // await publishToTikTok(post, connection.accessToken);
            break;
        case 'youtube':
            // await publishToYouTube(post, connection.accessToken);
            break;
        default:
            console.log(`[AutoPublisher] ${platform} publishing not yet implemented`);
    }

    return true;
}

// ============================================
// PUBLISHING STATUS
// ============================================

export interface PublishingStatus {
    isRunning: boolean;
    pendingPosts: number;
    lastCheck?: Date;
    connectedPlatforms: SocialPlatform[];
}

export function getPublishingStatus(): PublishingStatus {
    const connections = getSocialConnections().filter(c => c.isConnected);
    const pendingPosts = getScheduledPosts().filter(p =>
        p.status === 'Scheduled' && p.autoPublish
    ).length;

    return {
        isRunning: publisherInterval !== null,
        pendingPosts,
        lastCheck: new Date(),
        connectedPlatforms: connections.map(c => c.platform),
    };
}

// ============================================
// PLATFORM-SPECIFIC API STUBS
// ============================================

// These would be implemented with actual API calls in production

/*
async function publishToFacebook(post: ScheduledPost, accessToken: string): Promise<boolean> {
    const response = await fetch('https://graph.facebook.com/v18.0/me/feed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
            message: post.caption,
            link: post.imageUrl,
        }),
    });
    return response.ok;
}

async function publishToInstagram(post: ScheduledPost, accessToken: string): Promise<boolean> {
    // Instagram requires a two-step process: create media, then publish
    // 1. Create media container
    // 2. Publish the container
    return true;
}

async function publishToTwitter(post: ScheduledPost, accessToken: string): Promise<boolean> {
    const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: post.caption }),
    });
    return response.ok;
}

async function publishToLinkedIn(post: ScheduledPost, accessToken: string): Promise<boolean> {
    // LinkedIn API requires user URN and specific formatting
    return true;
}
*/

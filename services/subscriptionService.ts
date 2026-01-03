// Subscription and usage tracking service

import { supabase, isSupabaseConfigured } from './supabase';
import {
    SubscriptionTier,
    Subscription,
    UsageStats,
    UsageType,
    TIER_LIMITS,
    isUnlimited
} from '../types/subscription';

// Default subscription for non-authenticated users or new users
const DEFAULT_SUBSCRIPTION: Omit<Subscription, 'id' | 'userId'> = {
    tier: 'free',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
};

// Get the start of the current billing period (first of the month)
const getCurrentPeriodStart = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

// ============================================
// SUBSCRIPTION FUNCTIONS
// ============================================

/**
 * Fetch user's subscription from Supabase
 */
export const fetchSubscription = async (userId: string): Promise<Subscription | null> => {
    if (!isSupabaseConfigured()) {
        console.log('[SubscriptionService] Supabase not configured, using free tier');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No subscription found - user is on free tier
                console.log('[SubscriptionService] No subscription found, user is on free tier');
                return null;
            }
            console.error('[SubscriptionService] Error fetching subscription:', error);
            return null;
        }

        return {
            id: data.id,
            userId: data.user_id,
            tier: data.tier as SubscriptionTier,
            stripeCustomerId: data.stripe_customer_id,
            stripeSubscriptionId: data.stripe_subscription_id,
            currentPeriodStart: new Date(data.current_period_start),
            currentPeriodEnd: new Date(data.current_period_end),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        };
    } catch (error) {
        console.error('[SubscriptionService] Error fetching subscription:', error);
        return null;
    }
};

/**
 * Create or update subscription in Supabase
 */
export const upsertSubscription = async (
    userId: string,
    tier: SubscriptionTier,
    stripeData?: { customerId?: string; subscriptionId?: string }
): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.log('[SubscriptionService] Supabase not configured');
        return false;
    }

    try {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

        const { error } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: userId,
                tier,
                stripe_customer_id: stripeData?.customerId,
                stripe_subscription_id: stripeData?.subscriptionId,
                current_period_start: new Date().toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (error) {
            console.error('[SubscriptionService] Error upserting subscription:', error);
            return false;
        }

        console.log('[SubscriptionService] Subscription updated to:', tier);
        return true;
    } catch (error) {
        console.error('[SubscriptionService] Error upserting subscription:', error);
        return false;
    }
};

// ============================================
// USAGE TRACKING FUNCTIONS
// ============================================

/**
 * Fetch current period usage for a user
 */
export const fetchUsage = async (userId: string): Promise<UsageStats | null> => {
    if (!isSupabaseConfigured()) {
        console.log('[SubscriptionService] Supabase not configured, using local usage');
        return getLocalUsage(userId);
    }

    try {
        const periodStart = getCurrentPeriodStart();
        const periodStartStr = periodStart.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('usage')
            .select('*')
            .eq('user_id', userId)
            .eq('period_start', periodStartStr)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No usage record for this period - create one
                return createUsageRecord(userId);
            }
            console.error('[SubscriptionService] Error fetching usage:', error);
            return null;
        }

        return {
            id: data.id,
            userId: data.user_id,
            periodStart: new Date(data.period_start),
            contentGenerations: data.content_generations || 0,
            researchReports: data.research_reports || 0,
            strategies: data.strategies || 0,
            leadsResearched: data.leads_researched || 0,
            emailCampaigns: data.email_campaigns || 0,
            blogPosts: data.blog_posts || 0,
            chatMessages: data.chat_messages || 0,
            updatedAt: new Date(data.updated_at),
        };
    } catch (error) {
        console.error('[SubscriptionService] Error fetching usage:', error);
        return null;
    }
};

/**
 * Create a new usage record for the current period
 */
const createUsageRecord = async (userId: string): Promise<UsageStats | null> => {
    if (!isSupabaseConfigured()) {
        return getLocalUsage(userId);
    }

    try {
        const periodStart = getCurrentPeriodStart();
        const periodStartStr = periodStart.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('usage')
            .insert({
                user_id: userId,
                period_start: periodStartStr,
                content_generations: 0,
                research_reports: 0,
                strategies: 0,
                leads_researched: 0,
                email_campaigns: 0,
                blog_posts: 0,
                chat_messages: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('[SubscriptionService] Error creating usage record:', error);
            return null;
        }

        return {
            id: data.id,
            userId: data.user_id,
            periodStart: new Date(data.period_start),
            contentGenerations: 0,
            researchReports: 0,
            strategies: 0,
            leadsResearched: 0,
            emailCampaigns: 0,
            blogPosts: 0,
            chatMessages: 0,
            updatedAt: new Date(),
        };
    } catch (error) {
        console.error('[SubscriptionService] Error creating usage record:', error);
        return null;
    }
};

/**
 * Increment usage for a specific type
 */
export const incrementUsage = async (
    userId: string,
    usageType: UsageType,
    amount: number = 1
): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        return incrementLocalUsage(userId, usageType, amount);
    }

    try {
        const periodStart = getCurrentPeriodStart();
        const periodStartStr = periodStart.toISOString().split('T')[0];

        // Map usage type to column name
        const columnMap: Record<UsageType, string> = {
            content_generations: 'content_generations',
            research_reports: 'research_reports',
            strategies: 'strategies',
            leads_researched: 'leads_researched',
            email_campaigns: 'email_campaigns',
            blog_posts: 'blog_posts',
            chat_messages: 'chat_messages',
        };

        const column = columnMap[usageType];

        // Upsert to handle case where record doesn't exist
        const { error } = await supabase.rpc('increment_usage', {
            p_user_id: userId,
            p_period_start: periodStartStr,
            p_column: column,
            p_amount: amount,
        });

        // If RPC doesn't exist, fall back to manual increment
        if (error) {
            console.warn('[SubscriptionService] RPC not available, using fallback');
            return await incrementUsageFallback(userId, usageType, amount);
        }

        return true;
    } catch (error) {
        console.error('[SubscriptionService] Error incrementing usage:', error);
        return false;
    }
};

/**
 * Fallback increment method using fetch-update pattern
 */
const incrementUsageFallback = async (
    userId: string,
    usageType: UsageType,
    amount: number
): Promise<boolean> => {
    try {
        const periodStart = getCurrentPeriodStart();
        const periodStartStr = periodStart.toISOString().split('T')[0];

        // First, try to get existing record
        let { data: existing } = await supabase
            .from('usage')
            .select('*')
            .eq('user_id', userId)
            .eq('period_start', periodStartStr)
            .single();

        const columnMap: Record<UsageType, string> = {
            content_generations: 'content_generations',
            research_reports: 'research_reports',
            strategies: 'strategies',
            leads_researched: 'leads_researched',
            email_campaigns: 'email_campaigns',
            blog_posts: 'blog_posts',
            chat_messages: 'chat_messages',
        };

        const column = columnMap[usageType];

        if (!existing) {
            // Create new record
            const insertData: any = {
                user_id: userId,
                period_start: periodStartStr,
                content_generations: 0,
                research_reports: 0,
                strategies: 0,
                leads_researched: 0,
                email_campaigns: 0,
                blog_posts: 0,
                chat_messages: 0,
            };
            insertData[column] = amount;

            const { error } = await supabase.from('usage').insert(insertData);
            return !error;
        } else {
            // Update existing
            const newValue = (existing[column] || 0) + amount;
            const { error } = await supabase
                .from('usage')
                .update({ [column]: newValue, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            return !error;
        }
    } catch (error) {
        console.error('[SubscriptionService] Fallback increment error:', error);
        return false;
    }
};

// ============================================
// LOCAL STORAGE FALLBACK (for offline/blocked)
// ============================================

const LOCAL_USAGE_KEY = 'socialai_usage';

const getLocalUsage = (userId: string): UsageStats => {
    try {
        const stored = localStorage.getItem(`${LOCAL_USAGE_KEY}_${userId}`);
        if (stored) {
            const data = JSON.parse(stored);
            // Check if it's the current period
            const currentPeriod = getCurrentPeriodStart().toISOString().split('T')[0];
            if (data.periodStart === currentPeriod) {
                return data;
            }
        }
    } catch (e) {
        console.error('[SubscriptionService] Error reading local usage:', e);
    }

    // Return fresh usage stats
    return {
        id: 'local',
        userId,
        periodStart: getCurrentPeriodStart(),
        contentGenerations: 0,
        researchReports: 0,
        strategies: 0,
        leadsResearched: 0,
        emailCampaigns: 0,
        blogPosts: 0,
        chatMessages: 0,
        updatedAt: new Date(),
    };
};

const incrementLocalUsage = (userId: string, usageType: UsageType, amount: number): boolean => {
    try {
        const usage = getLocalUsage(userId);

        const fieldMap: Record<UsageType, keyof UsageStats> = {
            content_generations: 'contentGenerations',
            research_reports: 'researchReports',
            strategies: 'strategies',
            leads_researched: 'leadsResearched',
            email_campaigns: 'emailCampaigns',
            blog_posts: 'blogPosts',
            chat_messages: 'chatMessages',
        };

        const field = fieldMap[usageType];
        (usage[field] as number) += amount;
        usage.updatedAt = new Date();

        localStorage.setItem(
            `${LOCAL_USAGE_KEY}_${userId}`,
            JSON.stringify({
                ...usage,
                periodStart: getCurrentPeriodStart().toISOString().split('T')[0],
            })
        );

        return true;
    } catch (e) {
        console.error('[SubscriptionService] Error saving local usage:', e);
        return false;
    }
};

// ============================================
// USAGE LIMIT CHECKING
// ============================================

export interface UsageLimitResult {
    canUse: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    isUnlimited: boolean;
}

/**
 * Check if user can use a feature based on their subscription and usage
 */
export const checkUsageLimit = async (
    userId: string,
    tier: SubscriptionTier,
    usageType: UsageType
): Promise<UsageLimitResult> => {
    const limits = TIER_LIMITS[tier];
    const usage = await fetchUsage(userId) || getLocalUsage(userId);

    const limitMap: Record<UsageType, keyof typeof limits> = {
        content_generations: 'contentGenerations',
        research_reports: 'researchReports',
        strategies: 'strategies',
        leads_researched: 'leadsResearched',
        email_campaigns: 'emailCampaigns',
        blog_posts: 'blogPosts',
        chat_messages: 'chatMessages',
    };

    const usageFieldMap: Record<UsageType, keyof UsageStats> = {
        content_generations: 'contentGenerations',
        research_reports: 'researchReports',
        strategies: 'strategies',
        leads_researched: 'leadsResearched',
        email_campaigns: 'emailCampaigns',
        blog_posts: 'blogPosts',
        chat_messages: 'chatMessages',
    };

    const limitField = limitMap[usageType];
    const usageField = usageFieldMap[usageType];

    const limit = limits[limitField] as number;
    const currentUsage = usage[usageField] as number;

    // -1 means unlimited
    if (isUnlimited(limit)) {
        return {
            canUse: true,
            currentUsage,
            limit: -1,
            remaining: -1,
            isUnlimited: true,
        };
    }

    const remaining = Math.max(0, limit - currentUsage);
    const canUse = currentUsage < limit;

    return {
        canUse,
        currentUsage,
        limit,
        remaining,
        isUnlimited: false,
    };
};

/**
 * Check if a feature is enabled for a tier (for boolean features)
 */
export const isFeatureEnabled = (
    tier: SubscriptionTier,
    feature: 'autoPilotEnabled' | 'autoPilotAutoApprove' | 'googleWorkspaceEnabled'
): boolean => {
    return TIER_LIMITS[tier][feature];
};

/**
 * Get profile limit for a tier
 */
export const getProfileLimit = (tier: SubscriptionTier): number => {
    return TIER_LIMITS[tier].profiles;
};

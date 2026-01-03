// Subscription tier types and constants

export type SubscriptionTier = 'free' | 'pro' | 'pro_plus';

export interface TierLimits {
    profiles: number;
    contentGenerations: number;
    researchReports: number;
    strategies: number;
    leadsResearched: number;
    emailCampaigns: number;
    blogPosts: number;
    chatMessages: number;
    autoPilotEnabled: boolean;
    autoPilotAutoApprove: boolean;
    googleWorkspaceEnabled: boolean;
}

export interface Subscription {
    id: string;
    userId: string;
    tier: SubscriptionTier;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface UsageStats {
    id: string;
    userId: string;
    periodStart: Date;
    contentGenerations: number;
    researchReports: number;
    strategies: number;
    leadsResearched: number;
    emailCampaigns: number;
    blogPosts: number;
    chatMessages: number;
    updatedAt: Date;
}

export type UsageType =
    | 'content_generations'
    | 'research_reports'
    | 'strategies'
    | 'leads_researched'
    | 'email_campaigns'
    | 'blog_posts'
    | 'chat_messages';

// Tier limits configuration - Conservative to prevent token burnout
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    free: {
        profiles: 1,
        contentGenerations: 5,      // Reduced from 10
        researchReports: 1,          // Reduced from 2
        strategies: 1,
        leadsResearched: 15,         // Reduced from 25
        emailCampaigns: 1,           // Reduced from 2
        blogPosts: 1,                // Reduced from 2
        chatMessages: 10,            // per day - reduced from 20
        autoPilotEnabled: false,
        autoPilotAutoApprove: false,
        googleWorkspaceEnabled: false,
    },
    pro: {
        profiles: 3,
        contentGenerations: 60,      // Reduced from 100
        researchReports: 10,         // Reduced from 20
        strategies: 5,               // Reduced from 10
        leadsResearched: 100,        // Reduced from 200
        emailCampaigns: 10,          // Reduced from 20
        blogPosts: 10,               // Reduced from 20
        chatMessages: 50,            // per day - reduced from 100
        autoPilotEnabled: true,
        autoPilotAutoApprove: false,
        googleWorkspaceEnabled: true,
    },
    pro_plus: {
        profiles: 5,                 // Not unlimited - prevents abuse
        contentGenerations: 150,     // High but not unlimited
        researchReports: 30,
        strategies: 15,
        leadsResearched: 300,
        emailCampaigns: 30,
        blogPosts: 30,
        chatMessages: 150,           // per day
        autoPilotEnabled: true,
        autoPilotAutoApprove: true,
        googleWorkspaceEnabled: true,
    },
};

// Pricing information
export interface PricingPlan {
    tier: SubscriptionTier;
    name: string;
    price: number; // monthly price in USD
    yearlyPrice: number; // yearly price (with discount)
    description: string;
    features: string[];
    highlighted?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
    {
        tier: 'free',
        name: 'Free Forever',
        price: 0,
        yearlyPrice: 0,
        description: 'Perfect for trying out Market MI',
        features: [
            '1 Business Profile',
            '5 AI Content Generations/month',
            '1 Market Research Report/month',
            '1 Marketing Strategy/month',
            '15 Lead Researches/month',
            '1 Email Campaign/month',
            '1 Blog Post/month',
            '10 Chat Messages/day',
        ],
    },
    {
        tier: 'pro',
        name: 'Pro',
        price: 12,
        yearlyPrice: 120, // Save $24 (2 months free)
        description: 'For growing businesses',
        features: [
            '3 Business Profiles',
            '60 AI Content Generations/month',
            '10 Market Research Reports/month',
            '5 Marketing Strategies/month',
            '100 Lead Researches/month',
            '10 Email Campaigns/month',
            '10 Blog Posts/month',
            '50 Chat Messages/day',
            'Auto-Pilot Mode (Manual Approval)',
            'Google Workspace Export',
            'Priority Email Support',
        ],
        highlighted: true,
    },
    {
        tier: 'pro_plus',
        name: 'Pro Plus',
        price: 19,
        yearlyPrice: 190, // Save $38 (2 months free)
        description: 'For agencies & power users',
        features: [
            '5 Business Profiles',
            '150 AI Content Generations/month',
            '30 Market Research Reports/month',
            '15 Marketing Strategies/month',
            '300 Lead Researches/month',
            '30 Email Campaigns/month',
            '30 Blog Posts/month',
            '150 Chat Messages/day',
            'Full Auto-Pilot (Auto-Approve)',
            'Google Workspace Export',
            'Priority Support + Live Chat',
            'Early Access to New Features',
        ],
    },
];

// Helper function to get tier display name
export const getTierDisplayName = (tier: SubscriptionTier): string => {
    const plan = PRICING_PLANS.find(p => p.tier === tier);
    return plan?.name || 'Free Forever';
};

// Helper function to check if a limit is unlimited (-1)
export const isUnlimited = (limit: number): boolean => limit === -1;

// Helper to get limit value or "Unlimited" string for display
export const formatLimit = (limit: number): string => {
    return limit === -1 ? 'Unlimited' : limit.toString();
};

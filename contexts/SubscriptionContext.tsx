// Subscription Context - Global subscription and usage state

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
    SubscriptionTier,
    UsageStats,
    UsageType,
    TIER_LIMITS,
    PRICING_PLANS,
    TierLimits
} from '../types/subscription';
import {
    fetchSubscription,
    fetchUsage,
    incrementUsage,
    checkUsageLimit,
    isFeatureEnabled,
    getProfileLimit,
    UsageLimitResult
} from '../services/subscriptionService';

interface SubscriptionContextType {
    // Current state
    tier: SubscriptionTier;
    usage: UsageStats | null;
    limits: TierLimits;
    isLoading: boolean;

    // Usage checking
    checkLimit: (usageType: UsageType) => Promise<UsageLimitResult>;
    trackUsage: (usageType: UsageType, amount?: number) => Promise<boolean>;
    refreshUsage: () => Promise<void>;

    // Feature checks
    canUseAutoPilot: boolean;
    canAutoApprove: boolean;
    canUseGoogleWorkspace: boolean;
    profileLimit: number;

    // Upgrade prompts
    showUpgradeModal: boolean;
    upgradeReason: string | null;
    triggerUpgradeModal: (reason: string) => void;
    closeUpgradeModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

interface SubscriptionProviderProps {
    children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    const [tier, setTier] = useState<SubscriptionTier>('free');
    const [usage, setUsage] = useState<UsageStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

    // Load subscription and usage on auth change
    useEffect(() => {
        const loadSubscriptionData = async () => {
            if (!isAuthenticated || !user) {
                setTier('free');
                setUsage(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch subscription
                const subscription = await fetchSubscription(user.id);
                if (subscription) {
                    setTier(subscription.tier);
                } else {
                    setTier('free');
                }

                // Fetch usage
                const currentUsage = await fetchUsage(user.id);
                setUsage(currentUsage);
            } catch (error) {
                console.error('[SubscriptionContext] Error loading subscription data:', error);
                setTier('free');
            } finally {
                setIsLoading(false);
            }
        };

        loadSubscriptionData();
    }, [isAuthenticated, user]);

    // Get limits for current tier
    const limits = TIER_LIMITS[tier];

    // Check if user can use a feature
    const checkLimit = useCallback(async (usageType: UsageType): Promise<UsageLimitResult> => {
        if (!user) {
            return {
                canUse: false,
                currentUsage: 0,
                limit: TIER_LIMITS.free[usageType === 'content_generations' ? 'contentGenerations' :
                    usageType === 'research_reports' ? 'researchReports' :
                        usageType === 'strategies' ? 'strategies' :
                            usageType === 'leads_researched' ? 'leadsResearched' :
                                usageType === 'email_campaigns' ? 'emailCampaigns' :
                                    usageType === 'blog_posts' ? 'blogPosts' : 'chatMessages'
                ],
                remaining: 0,
                isUnlimited: false,
            };
        }
        return checkUsageLimit(user.id, tier, usageType);
    }, [user, tier]);

    // Track usage (increment counter)
    const trackUsage = useCallback(async (usageType: UsageType, amount: number = 1): Promise<boolean> => {
        if (!user) return false;

        const success = await incrementUsage(user.id, usageType, amount);

        // Refresh usage after tracking
        if (success) {
            const updatedUsage = await fetchUsage(user.id);
            setUsage(updatedUsage);
        }

        return success;
    }, [user]);

    // Refresh usage data
    const refreshUsage = useCallback(async () => {
        if (!user) return;
        const currentUsage = await fetchUsage(user.id);
        setUsage(currentUsage);
    }, [user]);

    // Feature availability
    const canUseAutoPilot = isFeatureEnabled(tier, 'autoPilotEnabled');
    const canAutoApprove = isFeatureEnabled(tier, 'autoPilotAutoApprove');
    const canUseGoogleWorkspace = isFeatureEnabled(tier, 'googleWorkspaceEnabled');
    const profileLimit = getProfileLimit(tier);

    // Upgrade modal handlers
    const triggerUpgradeModal = useCallback((reason: string) => {
        setUpgradeReason(reason);
        setShowUpgradeModal(true);
    }, []);

    const closeUpgradeModal = useCallback(() => {
        setShowUpgradeModal(false);
        setUpgradeReason(null);
    }, []);

    const value: SubscriptionContextType = {
        tier,
        usage,
        limits,
        isLoading,
        checkLimit,
        trackUsage,
        refreshUsage,
        canUseAutoPilot,
        canAutoApprove,
        canUseGoogleWorkspace,
        profileLimit,
        showUpgradeModal,
        upgradeReason,
        triggerUpgradeModal,
        closeUpgradeModal,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};

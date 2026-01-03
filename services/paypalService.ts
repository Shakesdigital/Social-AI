// PayPal Payment Integration Service

import { supabase, isSupabaseConfigured } from './supabase';
import { SubscriptionTier, PRICING_PLANS } from '../types/subscription';

// PayPal configuration from environment variables
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const PAYPAL_MODE = import.meta.env.VITE_PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

// PayPal API base URLs
const PAYPAL_API_BASE = PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// PayPal Plan IDs (you'll set these after creating plans in PayPal)
export const PAYPAL_PLAN_IDS = {
    pro_monthly: import.meta.env.VITE_PAYPAL_PRO_MONTHLY_PLAN_ID || '',
    pro_yearly: import.meta.env.VITE_PAYPAL_PRO_YEARLY_PLAN_ID || '',
    pro_plus_monthly: import.meta.env.VITE_PAYPAL_PRO_PLUS_MONTHLY_PLAN_ID || '',
    pro_plus_yearly: import.meta.env.VITE_PAYPAL_PRO_PLUS_YEARLY_PLAN_ID || '',
};

export interface PayPalSubscriptionData {
    subscriptionId: string;
    payerId: string;
    status: string;
    planId: string;
}

/**
 * Check if PayPal is configured
 */
export const isPayPalConfigured = (): boolean => {
    return !!PAYPAL_CLIENT_ID;
};

/**
 * Get PayPal client ID for the SDK
 */
export const getPayPalClientId = (): string => {
    return PAYPAL_CLIENT_ID;
};

/**
 * Get the PayPal plan ID for a tier
 */
export const getPayPalPlanId = (tier: SubscriptionTier, billingCycle: 'monthly' | 'yearly'): string => {
    if (tier === 'pro') {
        return billingCycle === 'monthly' ? PAYPAL_PLAN_IDS.pro_monthly : PAYPAL_PLAN_IDS.pro_yearly;
    }
    if (tier === 'pro_plus') {
        return billingCycle === 'monthly' ? PAYPAL_PLAN_IDS.pro_plus_monthly : PAYPAL_PLAN_IDS.pro_plus_yearly;
    }
    return '';
};

/**
 * Handle successful PayPal subscription
 * Called after user approves the subscription on PayPal
 */
export const handlePayPalSubscriptionSuccess = async (
    userId: string,
    subscriptionData: PayPalSubscriptionData,
    tier: SubscriptionTier
): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.error('[PayPal] Supabase not configured');
        return false;
    }

    try {
        // Calculate subscription period
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month for monthly

        // Upsert subscription in database
        const { error } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: userId,
                tier,
                paypal_subscription_id: subscriptionData.subscriptionId,
                paypal_payer_id: subscriptionData.payerId,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                status: 'active',
                updated_at: now.toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (error) {
            console.error('[PayPal] Error saving subscription:', error);
            return false;
        }

        console.log('[PayPal] Subscription saved successfully:', tier);
        return true;
    } catch (error) {
        console.error('[PayPal] Error handling subscription success:', error);
        return false;
    }
};

/**
 * Cancel a PayPal subscription
 */
export const cancelPayPalSubscription = async (userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        console.error('[PayPal] Supabase not configured');
        return false;
    }

    try {
        // Get current subscription
        const { data: subscription, error: fetchError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (fetchError || !subscription) {
            console.error('[PayPal] No subscription found');
            return false;
        }

        // Update subscription status to cancelled
        // Note: In production, you'd also call PayPal API to cancel the subscription
        const { error } = await supabase
            .from('subscriptions')
            .update({
                status: 'cancelled',
                tier: 'free',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (error) {
            console.error('[PayPal] Error cancelling subscription:', error);
            return false;
        }

        console.log('[PayPal] Subscription cancelled');
        return true;
    } catch (error) {
        console.error('[PayPal] Error cancelling subscription:', error);
        return false;
    }
};

/**
 * Get subscription status from database
 */
export const getSubscriptionStatus = async (userId: string): Promise<{
    tier: SubscriptionTier;
    status: string;
    periodEnd: Date | null;
} | null> => {
    if (!isSupabaseConfigured()) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('tier, status, current_period_end')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return { tier: 'free', status: 'active', periodEnd: null };
        }

        return {
            tier: data.tier as SubscriptionTier,
            status: data.status,
            periodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
        };
    } catch (error) {
        console.error('[PayPal] Error getting subscription status:', error);
        return null;
    }
};

/**
 * Generate PayPal button configuration
 */
export const getPayPalButtonConfig = (
    tier: SubscriptionTier,
    billingCycle: 'monthly' | 'yearly'
) => {
    const plan = PRICING_PLANS.find(p => p.tier === tier);
    if (!plan) return null;

    const planId = getPayPalPlanId(tier, billingCycle);
    if (!planId) return null;

    return {
        planId,
        style: {
            shape: 'rect' as const,
            color: 'blue' as const,
            layout: 'vertical' as const,
            label: 'subscribe' as const,
        },
    };
};

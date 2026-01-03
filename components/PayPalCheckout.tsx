// PayPal Checkout Component
// Uses PayPal JavaScript SDK for subscription buttons

import React, { useEffect, useRef, useState } from 'react';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { SubscriptionTier, PRICING_PLANS } from '../types/subscription';
import {
    isPayPalConfigured,
    getPayPalClientId,
    getPayPalPlanId,
    handlePayPalSubscriptionSuccess,
    PayPalSubscriptionData
} from '../services/paypalService';
import { useAuth } from '../contexts/AuthContext';

interface PayPalCheckoutProps {
    tier: SubscriptionTier;
    billingCycle: 'monthly' | 'yearly';
    onSuccess: () => void;
    onError: (error: string) => void;
    onCancel: () => void;
}

declare global {
    interface Window {
        paypal?: any;
    }
}

export const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({
    tier,
    billingCycle,
    onSuccess,
    onError,
    onCancel,
}) => {
    const { user } = useAuth();
    const paypalRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const plan = PRICING_PLANS.find(p => p.tier === tier);
    const planId = getPayPalPlanId(tier, billingCycle);

    useEffect(() => {
        if (!isPayPalConfigured()) {
            setError('PayPal is not configured. Please add VITE_PAYPAL_CLIENT_ID to your environment variables.');
            setIsLoading(false);
            return;
        }

        if (!planId) {
            setError('PayPal subscription plan not configured for this tier.');
            setIsLoading(false);
            return;
        }

        // Load PayPal SDK
        const loadPayPalScript = () => {
            // Check if script already loaded
            if (window.paypal) {
                renderButtons();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${getPayPalClientId()}&vault=true&intent=subscription`;
            script.async = true;
            script.onload = () => renderButtons();
            script.onerror = () => {
                setError('Failed to load PayPal SDK');
                setIsLoading(false);
            };
            document.body.appendChild(script);
        };

        const renderButtons = () => {
            if (!paypalRef.current || !window.paypal) return;

            // Clear any existing buttons
            paypalRef.current.innerHTML = '';

            window.paypal.Buttons({
                style: {
                    shape: 'rect',
                    color: 'blue',
                    layout: 'vertical',
                    label: 'subscribe',
                },
                createSubscription: function (data: any, actions: any) {
                    return actions.subscription.create({
                        plan_id: planId,
                    });
                },
                onApprove: async function (data: any, actions: any) {
                    setIsProcessing(true);

                    try {
                        // Get subscription details
                        const subscriptionData: PayPalSubscriptionData = {
                            subscriptionId: data.subscriptionID,
                            payerId: data.payerID || '',
                            status: 'ACTIVE',
                            planId: planId,
                        };

                        // Save to database
                        if (user) {
                            const success = await handlePayPalSubscriptionSuccess(
                                user.id,
                                subscriptionData,
                                tier
                            );

                            if (success) {
                                onSuccess();
                            } else {
                                onError('Failed to save subscription. Please contact support.');
                            }
                        } else {
                            onError('User not authenticated');
                        }
                    } catch (err) {
                        console.error('PayPal subscription error:', err);
                        onError('An error occurred processing your subscription');
                    } finally {
                        setIsProcessing(false);
                    }
                },
                onCancel: function () {
                    onCancel();
                },
                onError: function (err: any) {
                    console.error('PayPal error:', err);
                    onError('PayPal encountered an error');
                },
            }).render(paypalRef.current).then(() => {
                setIsLoading(false);
            }).catch((err: any) => {
                console.error('PayPal render error:', err);
                setError('Failed to render PayPal buttons');
                setIsLoading(false);
            });
        };

        loadPayPalScript();

        // Cleanup
        return () => {
            if (paypalRef.current) {
                paypalRef.current.innerHTML = '';
            }
        };
    }, [tier, billingCycle, planId, user, onSuccess, onError, onCancel]);

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="text-sm text-red-700 font-medium">Configuration Error</p>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
            </div>
        );
    }

    if (isProcessing) {
        return (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 text-center">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-brand-700 font-medium">Processing your subscription...</p>
                <p className="text-xs text-brand-600 mt-1">Please wait, do not close this window.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Plan Summary */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-slate-800">{plan?.name}</h3>
                        <p className="text-sm text-slate-500">{plan?.description}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">
                            ${billingCycle === 'yearly'
                                ? Math.round((plan?.yearlyPrice || 0) / 12)
                                : plan?.price}
                            <span className="text-sm font-normal text-slate-500">/mo</span>
                        </p>
                        {billingCycle === 'yearly' && (
                            <p className="text-xs text-teal-600">Billed ${plan?.yearlyPrice}/year</p>
                        )}
                    </div>
                </div>
            </div>

            {/* PayPal Button Container */}
            <div className="relative min-h-[120px]">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <div className="text-center">
                            <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Loading PayPal...</p>
                        </div>
                    </div>
                )}
                <div ref={paypalRef} className={isLoading ? 'opacity-0' : 'opacity-100'} />
            </div>

            {/* Security Note */}
            <p className="text-xs text-slate-400 text-center">
                🔒 Secure payment via PayPal • Cancel anytime
            </p>
        </div>
    );
};

// Success confirmation component
export const PaymentSuccess: React.FC<{ tier: SubscriptionTier; onContinue: () => void }> = ({
    tier,
    onContinue
}) => {
    const plan = PRICING_PLANS.find(p => p.tier === tier);

    return (
        <div className="text-center py-8">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to {plan?.name}!</h2>
            <p className="text-slate-600 mb-6">
                Your subscription is now active. Enjoy all your new features!
            </p>
            <button
                onClick={onContinue}
                className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors"
            >
                Start Using Market MI
            </button>
        </div>
    );
};

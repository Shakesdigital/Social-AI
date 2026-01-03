// Pricing Page Component - Full pricing comparison view

import React, { useState } from 'react';
import { Check, X, Zap, Crown, Sparkles, ArrowLeft } from 'lucide-react';
import { PRICING_PLANS, SubscriptionTier, TIER_LIMITS } from '../types/subscription';
import { PayPalCheckout, PaymentSuccess } from './PayPalCheckout';
import { isPayPalConfigured } from '../services/paypalService';

interface PricingPageProps {
    currentTier?: SubscriptionTier;
    onSelectPlan: (tier: SubscriptionTier) => void;
    onBack?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
    currentTier = 'free',
    onSelectPlan,
    onBack,
}) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
    const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'checkout' | 'success' | 'error'>('idle');
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    const handleSelectPlan = (tier: SubscriptionTier) => {
        if (tier === 'free') {
            // Downgrade to free - just call onSelectPlan
            onSelectPlan(tier);
            return;
        }
        // For paid plans, show checkout
        setSelectedTier(tier);
        setShowCheckout(true);
        setCheckoutStatus('checkout');
    };

    const handleCheckoutSuccess = () => {
        setCheckoutStatus('success');
    };

    const handleCheckoutError = (error: string) => {
        setCheckoutError(error);
        setCheckoutStatus('error');
    };

    const handleCheckoutCancel = () => {
        setShowCheckout(false);
        setSelectedTier(null);
        setCheckoutStatus('idle');
    };

    const handleContinueAfterSuccess = () => {
        if (selectedTier) {
            onSelectPlan(selectedTier);
        }
        setShowCheckout(false);
        setCheckoutStatus('idle');
    };

    const getButtonText = (planTier: SubscriptionTier) => {
        if (planTier === currentTier) return 'Current Plan';
        if (planTier === 'free') return 'Downgrade';
        return 'Upgrade Now';
    };

    const getButtonStyle = (planTier: SubscriptionTier, isHighlighted: boolean) => {
        if (planTier === currentTier) {
            return 'bg-slate-100 text-slate-500 cursor-default';
        }
        if (isHighlighted) {
            return 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200';
        }
        return 'bg-slate-800 text-white hover:bg-slate-900';
    };

    // Tier icons
    const tierIcons = {
        free: '🆓',
        pro: '⭐',
        pro_plus: '🚀',
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            Back
                        </button>
                    )}
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Scale your marketing with AI-powered tools. Start free, upgrade anytime.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
                            Monthly
                        </span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className={`relative w-14 h-7 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                        >
                            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${billingCycle === 'yearly' ? 'left-8' : 'left-1'
                                }`} />
                        </button>
                        <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
                            Yearly
                        </span>
                        {billingCycle === 'yearly' && (
                            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-full">
                                Save 2 months
                            </span>
                        )}
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PRICING_PLANS.map((plan) => {
                        const isCurrentPlan = plan.tier === currentTier;
                        const price = billingCycle === 'yearly'
                            ? Math.round(plan.yearlyPrice / 12)
                            : plan.price;
                        const showYearlySavings = billingCycle === 'yearly' && plan.price > 0;

                        return (
                            <div
                                key={plan.tier}
                                className={`relative rounded-2xl border-2 p-8 transition-all ${plan.highlighted
                                    ? 'border-brand-500 bg-white shadow-xl shadow-brand-100/50 scale-105'
                                    : 'border-slate-200 bg-white hover:shadow-lg'
                                    } ${isCurrentPlan ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}
                            >
                                {/* Popular Badge */}
                                {plan.highlighted && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
                                        <Sparkles size={14} /> Most Popular
                                    </div>
                                )}

                                {/* Current Plan Badge */}
                                {isCurrentPlan && (
                                    <div className="absolute -top-4 right-4 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        Current
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className="text-center mb-6">
                                    <span className="text-4xl mb-3 block">{tierIcons[plan.tier]}</span>
                                    <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                                </div>

                                {/* Price */}
                                <div className="text-center mb-6">
                                    <div className="flex items-baseline justify-center">
                                        <span className="text-5xl font-bold text-slate-900">${price}</span>
                                        <span className="text-slate-500 ml-1">/mo</span>
                                    </div>
                                    {showYearlySavings && (
                                        <p className="text-xs text-teal-600 font-medium mt-1">
                                            ${plan.yearlyPrice}/year • Save ${(plan.price * 12) - plan.yearlyPrice}
                                        </p>
                                    )}
                                    {plan.price === 0 && (
                                        <p className="text-xs text-slate-400 mt-1">Free forever</p>
                                    )}
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={() => !isCurrentPlan && handleSelectPlan(plan.tier)}
                                    disabled={isCurrentPlan}
                                    className={`w-full py-3.5 rounded-xl font-bold transition-all mb-6 ${getButtonStyle(plan.tier, plan.highlighted || false)
                                        }`}
                                >
                                    {getButtonText(plan.tier)}
                                </button>

                                {/* Features List */}
                                <ul className="space-y-3">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm">
                                            <Check size={18} className="text-teal-500 shrink-0 mt-0.5" />
                                            <span className="text-slate-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {/* Feature Comparison Table */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
                        Detailed Comparison
                    </h2>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Feature</th>
                                    <th className="text-center py-4 px-4 font-semibold text-slate-700">Free</th>
                                    <th className="text-center py-4 px-4 font-semibold text-slate-700 bg-brand-50">Pro</th>
                                    <th className="text-center py-4 px-4 font-semibold text-slate-700">Pro Plus</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">Business Profiles</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.free.profiles}</td>
                                    <td className="text-center py-3 px-4 text-sm bg-brand-50/50">{TIER_LIMITS.pro.profiles}</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.pro_plus.profiles}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">AI Content/month</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.free.contentGenerations}</td>
                                    <td className="text-center py-3 px-4 text-sm bg-brand-50/50">{TIER_LIMITS.pro.contentGenerations}</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.pro_plus.contentGenerations}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">Research Reports/month</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.free.researchReports}</td>
                                    <td className="text-center py-3 px-4 text-sm bg-brand-50/50">{TIER_LIMITS.pro.researchReports}</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.pro_plus.researchReports}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">Strategies/month</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.free.strategies}</td>
                                    <td className="text-center py-3 px-4 text-sm bg-brand-50/50">{TIER_LIMITS.pro.strategies}</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.pro_plus.strategies}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">Leads Research/month</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.free.leadsResearched}</td>
                                    <td className="text-center py-3 px-4 text-sm bg-brand-50/50">{TIER_LIMITS.pro.leadsResearched}</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.pro_plus.leadsResearched}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">Chat Messages/day</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.free.chatMessages}</td>
                                    <td className="text-center py-3 px-4 text-sm bg-brand-50/50">{TIER_LIMITS.pro.chatMessages}</td>
                                    <td className="text-center py-3 px-4 text-sm">{TIER_LIMITS.pro_plus.chatMessages}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">Auto-Pilot Mode</td>
                                    <td className="text-center py-3 px-4"><X size={18} className="mx-auto text-slate-300" /></td>
                                    <td className="text-center py-3 px-4 bg-brand-50/50 text-xs text-brand-600 font-medium">Manual</td>
                                    <td className="text-center py-3 px-4 text-xs text-teal-600 font-medium">Auto-Approve</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-6 text-sm text-slate-600">Google Workspace</td>
                                    <td className="text-center py-3 px-4"><X size={18} className="mx-auto text-slate-300" /></td>
                                    <td className="text-center py-3 px-4 bg-brand-50/50"><Check size={18} className="mx-auto text-teal-500" /></td>
                                    <td className="text-center py-3 px-4"><Check size={18} className="mx-auto text-teal-500" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ or Trust Badges */}
                <div className="mt-16 text-center">
                    <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔒</span> Secure Payments
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💳</span> Cancel Anytime
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📧</span> 24/7 Support
                        </div>
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && selectedTier && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={handleCheckoutCancel}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={handleCheckoutCancel}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        >
                            <X size={20} />
                        </button>

                        {checkoutStatus === 'success' ? (
                            <PaymentSuccess
                                tier={selectedTier}
                                onContinue={handleContinueAfterSuccess}
                            />
                        ) : checkoutStatus === 'error' ? (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-10 h-10 text-red-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Failed</h2>
                                <p className="text-slate-600 mb-4">{checkoutError}</p>
                                <button
                                    onClick={() => setCheckoutStatus('checkout')}
                                    className="px-6 py-2 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-4 text-center">
                                    Complete Your Upgrade
                                </h2>

                                {isPayPalConfigured() ? (
                                    <PayPalCheckout
                                        tier={selectedTier}
                                        billingCycle={billingCycle}
                                        onSuccess={handleCheckoutSuccess}
                                        onError={handleCheckoutError}
                                        onCancel={handleCheckoutCancel}
                                    />
                                ) : (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                        <p className="text-amber-700 text-sm font-medium mb-2">
                                            PayPal Not Configured
                                        </p>
                                        <p className="text-amber-600 text-xs">
                                            Please add PayPal credentials to enable payments.
                                            See .env.example for setup instructions.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

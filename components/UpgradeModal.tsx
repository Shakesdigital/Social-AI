// Upgrade Modal - Shown when users hit their usage limits

import React from 'react';
import { X, Zap, Check, Crown, Sparkles } from 'lucide-react';
import { PRICING_PLANS, SubscriptionTier } from '../types/subscription';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason?: string;
    currentTier: SubscriptionTier;
    onUpgrade: (tier: SubscriptionTier) => void;
}

// Map usage types to friendly names
const usageTypeNames: Record<string, string> = {
    content_generations: 'AI Content Generations',
    research_reports: 'Market Research Reports',
    strategies: 'Marketing Strategies',
    leads_researched: 'Lead Researches',
    email_campaigns: 'Email Campaigns',
    blog_posts: 'Blog Posts',
    chat_messages: 'Chat Messages',
    profiles: 'Business Profiles',
    auto_pilot: 'Auto-Pilot Mode',
    google_workspace: 'Google Workspace Export',
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    reason,
    currentTier,
    onUpgrade,
}) => {
    if (!isOpen) return null;

    const friendlyReason = reason ? (usageTypeNames[reason] || reason) : 'this feature';

    // Filter plans to show upgrade options
    const upgradePlans = PRICING_PLANS.filter(plan => {
        if (currentTier === 'free') return plan.tier !== 'free';
        if (currentTier === 'pro') return plan.tier === 'pro_plus';
        return false;
    });

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 z-10"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-purple-600 text-white p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                        <Zap size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">You've Hit Your Limit</h2>
                    <p className="text-white/80">
                        Upgrade to get more <span className="font-semibold text-white">{friendlyReason}</span>
                    </p>
                </div>

                {/* Plans */}
                <div className="p-6">
                    {upgradePlans.length === 0 ? (
                        <div className="text-center py-8">
                            <Crown size={48} className="mx-auto text-amber-500 mb-4" />
                            <h3 className="text-lg font-bold text-slate-800 mb-2">You're on Our Top Plan!</h3>
                            <p className="text-slate-500">
                                You've reached the limit for this feature even on Pro Plus.
                                <br />
                                Please contact support if you need higher limits.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {upgradePlans.map((plan) => (
                                <div
                                    key={plan.tier}
                                    className={`relative rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${plan.highlighted
                                            ? 'border-brand-500 bg-brand-50/50'
                                            : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    {plan.highlighted && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                            <Sparkles size={12} /> Most Popular
                                        </div>
                                    )}

                                    <div className="text-center mb-4">
                                        <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                                        <div className="mt-2">
                                            <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                                            <span className="text-slate-500">/month</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            or ${plan.yearlyPrice}/year (save 2 months)
                                        </p>
                                    </div>

                                    <ul className="space-y-2 mb-6">
                                        {plan.features.slice(0, 6).map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                <Check size={16} className="text-teal-500 shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                        {plan.features.length > 6 && (
                                            <li className="text-xs text-slate-400 pl-6">
                                                +{plan.features.length - 6} more features
                                            </li>
                                        )}
                                    </ul>

                                    <button
                                        onClick={() => onUpgrade(plan.tier)}
                                        className={`w-full py-3 rounded-xl font-bold transition-all ${plan.highlighted
                                                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                    >
                                        Upgrade to {plan.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 p-4 bg-slate-50 text-center">
                    <button
                        onClick={onClose}
                        className="text-sm text-slate-500 hover:text-slate-700"
                    >
                        Maybe later
                    </button>
                    <p className="text-xs text-slate-400 mt-2">
                        🔒 Secure payment via Stripe • Cancel anytime
                    </p>
                </div>
            </div>
        </div>
    );
};

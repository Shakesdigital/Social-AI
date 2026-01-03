// Pricing Landing Page - Full standalone page with header/footer

import React, { useState } from 'react';
import { Check, X, Sparkles, ArrowRight, Crown, Zap, Shield, Clock, Users, Star, ChevronDown } from 'lucide-react';
import { PRICING_PLANS, SubscriptionTier, TIER_LIMITS } from '../types/subscription';
import { PayPalCheckout, PaymentSuccess } from './PayPalCheckout';
import { isPayPalConfigured } from '../services/paypalService';

interface PricingPageProps {
    currentTier?: SubscriptionTier;
    onSelectPlan: (tier: SubscriptionTier) => void;
    onBack?: () => void;
    onSignIn?: () => void;
    onLogIn?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
    currentTier = 'free',
    onSelectPlan,
    onBack,
    onSignIn,
    onLogIn,
}) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
    const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'checkout' | 'success' | 'error'>('idle');
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const handleSelectPlan = (tier: SubscriptionTier) => {
        if (tier === 'free') {
            onSelectPlan(tier);
            return;
        }
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
        if (planTier === 'free') return 'Get Started Free';
        return 'Start Free Trial';
    };

    const tierIcons = {
        free: '🎯',
        pro: '⚡',
        pro_plus: '🚀',
    };

    const faqs = [
        {
            question: "Can I switch plans anytime?",
            answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated difference. When you downgrade, the new rate takes effect at your next billing cycle."
        },
        {
            question: "What happens when I hit my usage limits?",
            answer: "You'll see a friendly prompt to upgrade your plan. Your existing work is never lost, and you can always upgrade instantly to continue working."
        },
        {
            question: "Is there a free trial for paid plans?",
            answer: "The Free plan lets you try all features with limited usage. This gives you a real feel for the tool before committing to a paid plan."
        },
        {
            question: "How does billing work?",
            answer: "We use PayPal for secure payments. Monthly plans are billed every 30 days, yearly plans are billed annually with 2 months free."
        },
        {
            question: "Can I cancel my subscription?",
            answer: "Absolutely. Cancel anytime with no questions asked. Your access continues until the end of your current billing period."
        },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 sm:h-18 md:h-20">
                        {/* Logo */}
                        <div
                            className="flex items-center gap-2 cursor-pointer shrink-0"
                            onClick={onBack}
                        >
                            <img src="/market-mi-logo.png" alt="Market MI" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                            <span className="font-bold text-lg sm:text-xl text-slate-800">Market MI</span>
                        </div>

                        {/* Navigation */}
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                            <button onClick={onBack} className="hover:text-brand-600 transition-colors">Home</button>
                            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
                            <span className="text-brand-600 font-semibold">Pricing</span>
                            <a href="#faq" className="hover:text-brand-600 transition-colors">FAQ</a>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {onLogIn && (
                                <button
                                    onClick={onLogIn}
                                    className="hidden sm:flex bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-medium transition-all items-center gap-2 text-sm"
                                >
                                    Log In
                                </button>
                            )}
                            {onSignIn && (
                                <button
                                    onClick={onSignIn}
                                    className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
                                >
                                    Get Started
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-b from-brand-50 via-white to-white">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <Crown size={16} />
                        Simple, Transparent Pricing
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                        Power Your Marketing with
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600"> AI</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
                        From market research to content creation, get everything you need to grow your business. Start free, upgrade when you're ready.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
                            Monthly
                        </span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className={`relative w-14 h-7 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-brand-600' : 'bg-slate-200'}`}
                        >
                            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${billingCycle === 'yearly' ? 'left-8' : 'left-1'}`} />
                        </button>
                        <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
                            Yearly
                        </span>
                        {billingCycle === 'yearly' && (
                            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                                Save 2 months! 🎉
                            </span>
                        )}
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        {PRICING_PLANS.map((plan) => {
                            const isCurrentPlan = plan.tier === currentTier;
                            const price = billingCycle === 'yearly'
                                ? Math.round(plan.yearlyPrice / 12)
                                : plan.price;
                            const showYearlySavings = billingCycle === 'yearly' && plan.price > 0;

                            return (
                                <div
                                    key={plan.tier}
                                    className={`relative rounded-3xl border-2 p-8 transition-all duration-300 ${plan.highlighted
                                            ? 'border-brand-500 bg-white shadow-2xl shadow-brand-200/50 scale-[1.02] lg:scale-105'
                                            : 'border-slate-200 bg-white hover:shadow-xl hover:border-slate-300'
                                        } ${isCurrentPlan ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}
                                >
                                    {/* Popular Badge */}
                                    {plan.highlighted && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-purple-600 text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-2 shadow-lg">
                                            <Sparkles size={14} /> Most Popular
                                        </div>
                                    )}

                                    {/* Current Plan Badge */}
                                    {isCurrentPlan && (
                                        <div className="absolute -top-4 right-4 bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">
                                            ✓ Current
                                        </div>
                                    )}

                                    {/* Plan Header */}
                                    <div className="text-center mb-8">
                                        <span className="text-5xl mb-4 block">{tierIcons[plan.tier]}</span>
                                        <h3 className="text-2xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                                        <p className="text-slate-500">{plan.description}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="text-center mb-8">
                                        <div className="flex items-baseline justify-center">
                                            <span className="text-5xl font-bold text-slate-900">${price}</span>
                                            <span className="text-slate-500 ml-2 text-lg">/month</span>
                                        </div>
                                        {showYearlySavings && (
                                            <p className="text-sm text-teal-600 font-medium mt-2">
                                                ${plan.yearlyPrice}/year • Save ${(plan.price * 12) - plan.yearlyPrice}
                                            </p>
                                        )}
                                        {plan.price === 0 && (
                                            <p className="text-sm text-slate-400 mt-2">Free forever, no credit card</p>
                                        )}
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                        onClick={() => !isCurrentPlan && handleSelectPlan(plan.tier)}
                                        disabled={isCurrentPlan}
                                        className={`w-full py-4 rounded-xl font-bold transition-all mb-8 text-base ${isCurrentPlan
                                                ? 'bg-slate-100 text-slate-500 cursor-default'
                                                : plan.highlighted
                                                    ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:shadow-lg hover:shadow-brand-300/50 transform hover:-translate-y-0.5'
                                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {getButtonText(plan.tier)}
                                    </button>

                                    {/* Features List */}
                                    <ul className="space-y-4">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check size={12} className="text-teal-600" />
                                                </div>
                                                <span className="text-slate-600 text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="py-12 bg-slate-50">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-3">
                                <Shield size={24} className="text-brand-600" />
                            </div>
                            <p className="font-semibold text-slate-800">Secure Payments</p>
                            <p className="text-xs text-slate-500 mt-1">via PayPal</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-3">
                                <Clock size={24} className="text-teal-600" />
                            </div>
                            <p className="font-semibold text-slate-800">Cancel Anytime</p>
                            <p className="text-xs text-slate-500 mt-1">No questions asked</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                                <Zap size={24} className="text-purple-600" />
                            </div>
                            <p className="font-semibold text-slate-800">Instant Access</p>
                            <p className="text-xs text-slate-500 mt-1">Start in seconds</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                                <Users size={24} className="text-amber-600" />
                            </div>
                            <p className="font-semibold text-slate-800">24/7 Support</p>
                            <p className="text-xs text-slate-500 mt-1">We're here to help</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Comparison Table */}
            <section id="features" className="py-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Compare Features</h2>
                        <p className="text-slate-600">See exactly what you get with each plan</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-5 px-6 font-semibold text-slate-700">Feature</th>
                                        <th className="text-center py-5 px-4 font-semibold text-slate-700 w-28">Free</th>
                                        <th className="text-center py-5 px-4 font-semibold text-white bg-brand-600 w-28">Pro</th>
                                        <th className="text-center py-5 px-4 font-semibold text-slate-700 w-28">Pro Plus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">Business Profiles</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.free.profiles}</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium bg-brand-50">{TIER_LIMITS.pro.profiles}</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.pro_plus.profiles}</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">AI Content Generation</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.free.contentGenerations}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium bg-brand-50">{TIER_LIMITS.pro.contentGenerations}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.pro_plus.contentGenerations}/mo</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">Market Research Reports</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.free.researchReports}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium bg-brand-50">{TIER_LIMITS.pro.researchReports}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.pro_plus.researchReports}/mo</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">Marketing Strategies</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.free.strategies}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium bg-brand-50">{TIER_LIMITS.pro.strategies}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.pro_plus.strategies}/mo</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">Lead Research</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.free.leadsResearched}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium bg-brand-50">{TIER_LIMITS.pro.leadsResearched}/mo</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.pro_plus.leadsResearched}/mo</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">Chat Messages</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.free.chatMessages}/day</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium bg-brand-50">{TIER_LIMITS.pro.chatMessages}/day</td>
                                        <td className="text-center py-4 px-4 text-sm font-medium">{TIER_LIMITS.pro_plus.chatMessages}/day</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">Auto-Pilot Mode</td>
                                        <td className="text-center py-4 px-4"><X size={18} className="mx-auto text-slate-300" /></td>
                                        <td className="text-center py-4 px-4 bg-brand-50 text-xs text-brand-600 font-semibold">Manual</td>
                                        <td className="text-center py-4 px-4 text-xs text-teal-600 font-semibold">Auto-Approve</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 text-sm text-slate-600">Google Workspace Export</td>
                                        <td className="text-center py-4 px-4"><X size={18} className="mx-auto text-slate-300" /></td>
                                        <td className="text-center py-4 px-4 bg-brand-50"><Check size={18} className="mx-auto text-teal-500" /></td>
                                        <td className="text-center py-4 px-4"><Check size={18} className="mx-auto text-teal-500" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-20 px-4 bg-slate-50">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
                        <p className="text-slate-600">Everything you need to know about our pricing</p>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-md"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <span className="font-semibold text-slate-800">{faq.question}</span>
                                    <ChevronDown
                                        size={20}
                                        className={`text-slate-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {openFaq === index && (
                                    <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 bg-gradient-to-r from-brand-600 to-purple-600">
                <div className="max-w-4xl mx-auto text-center text-white">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to Transform Your Marketing?</h2>
                    <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                        Join thousands of businesses using Market MI to create smarter, faster marketing content.
                    </p>
                    <button
                        onClick={onSignIn}
                        className="bg-white text-brand-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 inline-flex items-center gap-2"
                    >
                        Get Started Free
                        <ArrowRight size={20} />
                    </button>
                    <p className="text-white/60 text-sm mt-4">No credit card required</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 bg-slate-900 text-white">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <img src="/market-mi-logo.png" alt="Market MI" className="w-8 h-8 object-contain brightness-0 invert" />
                            <span className="font-bold text-lg">Market MI</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-400">
                            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                            <a href="#" className="hover:text-white transition-colors">Contact</a>
                        </div>
                        <p className="text-sm text-slate-500">
                            © {new Date().getFullYear()} Market MI. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>

            {/* Checkout Modal */}
            {showCheckout && selectedTier && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={handleCheckoutCancel}
                    />
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

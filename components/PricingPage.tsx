// Pricing Page - Redesigned to match home page style

import React, { useState } from 'react';
import { Check, X, Sparkles, ArrowRight, Crown, Zap, Shield, Clock, Users, ChevronDown, LogIn, UserPlus } from 'lucide-react';
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

    const handleCheckoutSuccess = () => setCheckoutStatus('success');
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
        if (selectedTier) onSelectPlan(selectedTier);
        setShowCheckout(false);
        setCheckoutStatus('idle');
    };

    const faqs = [
        { question: "Can I switch plans anytime?", answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated difference. When you downgrade, the new rate takes effect at your next billing cycle." },
        { question: "What happens when I hit my usage limits?", answer: "You'll see a friendly prompt to upgrade your plan. Your existing work is never lost, and you can always upgrade instantly to continue working." },
        { question: "Is there a free trial for paid plans?", answer: "The Free plan lets you try all features with limited usage. This gives you a real feel for the tool before committing to a paid plan." },
        { question: "How does billing work?", answer: "We use PayPal for secure payments. Monthly plans are billed every 30 days, yearly plans are billed annually with 2 months free." },
        { question: "Can I cancel my subscription?", answer: "Absolutely. Cancel anytime with no questions asked. Your access continues until the end of your current billing period." },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-x-hidden">
            {/* Navigation - Matching home page */}
            <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 sm:h-18 md:h-20">
                        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={onBack}>
                            <img src="/market-mi-logo.png" alt="Market MI" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                            <span className="font-bold text-lg sm:text-xl text-slate-800">Market MI</span>
                        </div>
                        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
                            <button onClick={onBack} className="hover:text-brand-600 transition-colors">Home</button>
                            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
                            <span className="text-brand-600 font-semibold flex items-center gap-1.5">
                                <Crown size={16} className="text-amber-500" /> Pricing
                            </span>
                            <a href="#faq" className="hover:text-brand-600 transition-colors">FAQ</a>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {onLogIn && (
                                <button onClick={onLogIn} className="hidden sm:flex bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all items-center gap-2 text-xs sm:text-sm">
                                    <LogIn size={14} className="sm:w-4 sm:h-4" /> Log In
                                </button>
                            )}
                            {onSignIn && (
                                <button onClick={onSignIn} className="bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                                    <UserPlus size={14} className="sm:w-4 sm:h-4" /> Sign In
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Matching home page style */}
            <header className="pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 lg:pt-40 lg:pb-28 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mr-20 sm:-mr-32 md:-mr-40 -mt-20 sm:-mt-32 md:-mt-40 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] bg-brand-100 rounded-full blur-3xl opacity-40 sm:opacity-50 mix-blend-multiply filter"></div>
                <div className="absolute bottom-0 left-0 -ml-20 sm:-ml-32 md:-ml-40 -mb-20 sm:-mb-32 md:-mb-40 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] h-[600px] bg-indigo-100 rounded-full blur-3xl opacity-40 sm:opacity-50 mix-blend-multiply filter"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-4 sm:mb-6">
                        <Crown size={12} className="sm:w-3.5 sm:h-3.5 fill-current" /> Simple, Transparent Pricing
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-slate-900 mb-4 sm:mb-6 md:mb-8 leading-[1.15]">
                        Choose Your<br className="hidden xs:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700"> Perfect Plan</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="max-w-xl sm:max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 md:mb-10 leading-relaxed font-light px-2">
                        Start free and scale as you grow. All plans include our core AI-powered marketing tools.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                        <span className={`text-xs sm:text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
                        <button onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')} className={`relative w-12 sm:w-14 h-6 sm:h-7 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-brand-600' : 'bg-slate-200'}`}>
                            <span className={`absolute top-0.5 sm:top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${billingCycle === 'yearly' ? 'left-6 sm:left-8' : 'left-0.5 sm:left-1'}`} />
                        </button>
                        <span className={`text-xs sm:text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>Yearly</span>
                        {billingCycle === 'yearly' && (
                            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">Save 2 months! 🎉</span>
                        )}
                    </div>
                </div>
            </header>

            {/* Pricing Cards */}
            <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        {PRICING_PLANS.map((plan) => {
                            const isCurrentPlan = plan.tier === currentTier;
                            const price = billingCycle === 'yearly' ? Math.round(plan.yearlyPrice / 12) : plan.price;
                            const showYearlySavings = billingCycle === 'yearly' && plan.price > 0;

                            return (
                                <div key={plan.tier} className={`relative rounded-2xl border-2 p-6 sm:p-8 transition-all duration-300 ${plan.highlighted ? 'border-brand-500 bg-white shadow-2xl scale-[1.02] md:scale-105' : 'border-slate-200 bg-white hover:shadow-xl hover:border-slate-300'} ${isCurrentPlan ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}>
                                    {plan.highlighted && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-xs font-bold px-4 sm:px-5 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5 shadow-lg">
                                            <Sparkles size={14} /> Most Popular
                                        </div>
                                    )}
                                    {isCurrentPlan && (
                                        <div className="absolute -top-4 right-4 bg-teal-500 text-white text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow">✓ Current</div>
                                    )}

                                    <div className="text-center mb-6 sm:mb-8">
                                        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                                        <p className="text-sm text-slate-500">{plan.description}</p>
                                    </div>

                                    <div className="text-center mb-6 sm:mb-8">
                                        <div className="flex items-baseline justify-center">
                                            <span className="text-4xl sm:text-5xl font-bold text-slate-900">${price}</span>
                                            <span className="text-slate-500 ml-2 text-base sm:text-lg">/month</span>
                                        </div>
                                        {showYearlySavings && <p className="text-xs sm:text-sm text-teal-600 font-medium mt-2">${plan.yearlyPrice}/year • Save ${(plan.price * 12) - plan.yearlyPrice}</p>}
                                        {plan.price === 0 && <p className="text-xs sm:text-sm text-slate-400 mt-2">Free forever</p>}
                                    </div>

                                    <button onClick={() => !isCurrentPlan && handleSelectPlan(plan.tier)} disabled={isCurrentPlan} className={`w-full py-3 sm:py-4 rounded-xl font-bold transition-all mb-6 sm:mb-8 text-sm sm:text-base ${isCurrentPlan ? 'bg-slate-100 text-slate-500 cursor-default' : plan.highlighted ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:shadow-lg transform hover:-translate-y-0.5' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                                        {isCurrentPlan ? 'Current Plan' : plan.tier === 'free' ? 'Get Started Free' : 'Upgrade Now'}
                                    </button>

                                    <ul className="space-y-3 sm:space-y-4">
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
            <section className="py-10 sm:py-12 md:py-16 bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
                        {[
                            { icon: Shield, color: 'brand', label: 'Secure Payments', sublabel: 'via PayPal' },
                            { icon: Clock, color: 'teal', label: 'Cancel Anytime', sublabel: 'No questions' },
                            { icon: Zap, color: 'purple', label: 'Instant Access', sublabel: 'Start in seconds' },
                            { icon: Users, color: 'amber', label: '24/7 Support', sublabel: 'Always here' },
                        ].map((badge, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-${badge.color}-100 rounded-xl flex items-center justify-center mb-3`}>
                                    <badge.icon size={24} className={`text-${badge.color}-600`} />
                                </div>
                                <p className="font-semibold text-slate-800 text-sm sm:text-base">{badge.label}</p>
                                <p className="text-xs text-slate-500 mt-1">{badge.sublabel}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feature Comparison */}
            <section id="features" className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">Compare Features</h2>
                        <p className="text-sm sm:text-base md:text-lg text-slate-600">See exactly what you get with each plan</p>
                        <p className="text-xs text-slate-400 mt-2 md:hidden">← Scroll to see all plans →</p>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-4 sm:py-5 px-4 sm:px-6 font-semibold text-slate-700 text-sm sm:text-base">Feature</th>
                                        <th className="text-center py-4 sm:py-5 px-3 sm:px-4 font-semibold text-slate-700 w-24 sm:w-28 text-sm sm:text-base">Free</th>
                                        <th className="text-center py-4 sm:py-5 px-3 sm:px-4 font-semibold text-white bg-brand-600 w-24 sm:w-28 text-sm sm:text-base">Pro</th>
                                        <th className="text-center py-4 sm:py-5 px-3 sm:px-4 font-semibold text-slate-700 w-24 sm:w-28 text-sm sm:text-base">Pro Plus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        { label: 'Business Profiles', free: TIER_LIMITS.free.profiles, pro: TIER_LIMITS.pro.profiles, proPlus: TIER_LIMITS.pro_plus.profiles },
                                        { label: 'AI Content/month', free: TIER_LIMITS.free.contentGenerations, pro: TIER_LIMITS.pro.contentGenerations, proPlus: TIER_LIMITS.pro_plus.contentGenerations },
                                        { label: 'Research Reports/month', free: TIER_LIMITS.free.researchReports, pro: TIER_LIMITS.pro.researchReports, proPlus: TIER_LIMITS.pro_plus.researchReports },
                                        { label: 'Strategies/month', free: TIER_LIMITS.free.strategies, pro: TIER_LIMITS.pro.strategies, proPlus: TIER_LIMITS.pro_plus.strategies },
                                        { label: 'Lead Research/month', free: TIER_LIMITS.free.leadsResearched, pro: TIER_LIMITS.pro.leadsResearched, proPlus: TIER_LIMITS.pro_plus.leadsResearched },
                                        { label: 'Chat Messages/day', free: TIER_LIMITS.free.chatMessages, pro: TIER_LIMITS.pro.chatMessages, proPlus: TIER_LIMITS.pro_plus.chatMessages },
                                    ].map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-slate-600">{row.label}</td>
                                            <td className="text-center py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-medium">{row.free}</td>
                                            <td className="text-center py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-medium bg-brand-50">{row.pro}</td>
                                            <td className="text-center py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-medium">{row.proPlus}</td>
                                        </tr>
                                    ))}
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-slate-600">Auto-Pilot Mode</td>
                                        <td className="text-center py-3 sm:py-4 px-3 sm:px-4"><X size={16} className="mx-auto text-slate-300" /></td>
                                        <td className="text-center py-3 sm:py-4 px-3 sm:px-4 bg-brand-50 text-xs text-brand-600 font-semibold">Manual</td>
                                        <td className="text-center py-3 sm:py-4 px-3 sm:px-4 text-xs text-teal-600 font-semibold">Auto</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-slate-600">Google Workspace</td>
                                        <td className="text-center py-3 sm:py-4 px-3 sm:px-4"><X size={16} className="mx-auto text-slate-300" /></td>
                                        <td className="text-center py-3 sm:py-4 px-3 sm:px-4 bg-brand-50"><Check size={16} className="mx-auto text-teal-500" /></td>
                                        <td className="text-center py-3 sm:py-4 px-3 sm:px-4"><Check size={16} className="mx-auto text-teal-500" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-14 sm:py-20 px-4 sm:px-6 bg-slate-50">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">Frequently Asked Questions</h2>
                        <p className="text-sm sm:text-base md:text-lg text-slate-600">Everything you need to know</p>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-md">
                                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-3">
                                    <span className="font-semibold text-slate-800 text-sm sm:text-base">{faq.question}</span>
                                    <ChevronDown size={18} className={`text-slate-400 transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100 pt-3 sm:pt-4">{faq.answer}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA - Matching home page gradient style */}
            <section className="py-14 sm:py-20 md:py-24 px-4 sm:px-6 bg-gradient-to-r from-brand-600 to-brand-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
                <div className="max-w-4xl mx-auto text-center text-white relative z-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">Ready to Transform Your Marketing?</h2>
                    <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">Join thousands of businesses using Market MI to create smarter, faster marketing content.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                        <button onClick={onSignIn} className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-brand-600 rounded-xl font-bold text-base sm:text-lg hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                            Get Started Free <ArrowRight size={18} />
                        </button>
                    </div>
                    <p className="text-white/70 text-xs sm:text-sm mt-3 sm:mt-4">No credit card required • Cancel anytime</p>
                </div>
            </section>

            {/* Footer - Matching home page */}
            <footer className="py-8 sm:py-12 px-4 sm:px-6 bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <img src="/market-mi-logo.png" alt="Market MI" className="w-6 h-6 sm:w-8 sm:h-8 object-contain brightness-0 invert" />
                            <span className="font-bold text-base sm:text-lg">Market MI</span>
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                            <a href="#" className="hover:text-white transition-colors">Contact</a>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">© {new Date().getFullYear()} Market MI</p>
                    </div>
                </div>
            </footer>

            {/* Checkout Modal */}
            {showCheckout && selectedTier && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCheckoutCancel} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <button onClick={handleCheckoutCancel} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                            <X size={20} />
                        </button>
                        {checkoutStatus === 'success' ? (
                            <PaymentSuccess tier={selectedTier} onContinue={handleContinueAfterSuccess} />
                        ) : checkoutStatus === 'error' ? (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-10 h-10 text-red-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Failed</h2>
                                <p className="text-slate-600 mb-4">{checkoutError}</p>
                                <button onClick={() => setCheckoutStatus('checkout')} className="px-6 py-2 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700">Try Again</button>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-4 text-center">Complete Your Upgrade</h2>
                                {isPayPalConfigured() ? (
                                    <PayPalCheckout tier={selectedTier} billingCycle={billingCycle} onSuccess={handleCheckoutSuccess} onError={handleCheckoutError} onCancel={handleCheckoutCancel} />
                                ) : (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                        <p className="text-amber-700 text-sm font-medium mb-2">PayPal Not Configured</p>
                                        <p className="text-amber-600 text-xs">Please add PayPal credentials to enable payments.</p>
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

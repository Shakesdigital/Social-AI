import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader, AlertCircle, Eye, EyeOff, ArrowLeft, Check, Shield, Zap, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthPageProps {
    authMode?: 'signin' | 'login' | null;
    onSuccess: () => void;
    onBack: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ authMode, onSuccess, onBack }) => {
    const [mode, setMode] = useState<'login' | 'signup'>(authMode === 'signin' ? 'signup' : 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, signup, loginWithOAuth, isSupabaseConfigured } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await signup(email, password, name);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const [isOAuthLoading, setIsOAuthLoading] = useState<'google' | 'github' | null>(null);

    const handleOAuth = async (provider: 'google' | 'github') => {
        setError(null);
        setIsOAuthLoading(provider);
        console.log(`[AuthPage] Starting OAuth with ${provider}...`);
        try {
            await loginWithOAuth(provider);
            console.log(`[AuthPage] OAuth redirect initiated for ${provider}`);
        } catch (err: any) {
            console.error(`[AuthPage] OAuth error:`, err);
            setError(err.message || 'OAuth login failed. Please try again.');
            setIsOAuthLoading(null);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError(null);
    };

    // Features list for the side panel
    const features = [
        { icon: Zap, title: 'AI-Powered Marketing', desc: 'Generate content, strategies, and campaigns in seconds' },
        { icon: BarChart3, title: 'Market Research', desc: 'Deep insights into your industry and competitors' },
        { icon: Shield, title: 'Secure & Private', desc: 'Your data is encrypted and never shared' },
    ];

    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4 overflow-auto">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Not Configured</h2>
                    <p className="text-slate-600 mb-6">
                        Supabase is not set up. Please configure your environment variables.
                    </p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-all touch-manipulation"
                    >
                        Continue Without Auth
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-y-auto">
            {/* Fixed Header for Mobile */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 touch-manipulation"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium hidden sm:inline">Back to Home</span>
                        <span className="font-medium sm:hidden">Back</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/market-mi-logo.png" alt="Market MI" className="w-8 h-8 sm:w-10 sm:h-10" />
                        <span className="font-bold text-slate-800 hidden sm:inline">Market MI</span>
                    </div>
                </div>
            </header>

            {/* Main Content - Scrollable */}
            <main className="px-4 py-6 sm:px-6 sm:py-8 lg:py-12">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

                        {/* Left Side - Benefits (Hidden on mobile, visible on lg+) */}
                        <div className="hidden lg:block lg:sticky lg:top-24">
                            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-8 text-white shadow-2xl">
                                <h2 className="text-3xl font-bold mb-4">
                                    {mode === 'login' ? 'Welcome Back!' : 'Join Market MI'}
                                </h2>
                                <p className="text-brand-100 mb-8 text-lg">
                                    {mode === 'login'
                                        ? 'Sign in to continue where you left off with your marketing campaigns.'
                                        : 'Create your free account and start generating AI-powered marketing content today.'}
                                </p>

                                <div className="space-y-6">
                                    {features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-4">
                                            <div className="p-3 bg-white/20 rounded-xl shrink-0">
                                                <feature.icon size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{feature.title}</h3>
                                                <p className="text-brand-100 text-sm">{feature.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Testimonial */}
                                <div className="mt-10 p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
                                    <p className="italic text-brand-50 mb-4">
                                        "Market MI has transformed how we approach our marketing. The AI-generated content is incredibly on-point!"
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-400 rounded-full flex items-center justify-center font-bold">
                                            SK
                                        </div>
                                        <div>
                                            <p className="font-medium">Sarah K.</p>
                                            <p className="text-sm text-brand-200">Marketing Director</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Auth Form */}
                        <div className="w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
                            {/* Mobile Header */}
                            <div className="text-center mb-6 lg:mb-8">
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                                    {mode === 'login' ? 'Sign In to Your Account' : 'Create Your Free Account'}
                                </h1>
                                <p className="text-slate-500 mt-2 text-sm sm:text-base">
                                    {mode === 'login'
                                        ? 'Welcome back! Please enter your details.'
                                        : 'Get started with AI-powered marketing in minutes.'}
                                </p>
                            </div>

                            {/* Auth Card */}
                            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                                <div className="p-5 sm:p-6 lg:p-8">
                                    {/* OAuth Buttons */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => handleOAuth('google')}
                                            disabled={isOAuthLoading !== null}
                                            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                        >
                                            {isOAuthLoading === 'google' ? (
                                                <Loader size={20} className="animate-spin" />
                                            ) : (
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            )}
                                            <span className="text-sm sm:text-base">
                                                {isOAuthLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => handleOAuth('github')}
                                            disabled={isOAuthLoading !== null}
                                            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-slate-900 border-2 border-slate-900 rounded-xl font-medium text-white hover:bg-slate-800 active:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                        >
                                            {isOAuthLoading === 'github' ? (
                                                <Loader size={20} className="animate-spin" />
                                            ) : (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                </svg>
                                            )}
                                            <span className="text-sm sm:text-base">
                                                {isOAuthLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="relative my-6">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-200"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-4 bg-white text-slate-400">or use email</span>
                                        </div>
                                    </div>

                                    {/* Email Form */}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Error Display */}
                                        {error && (
                                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-medium">Error</p>
                                                    <p className="text-red-600">{error}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Name Field (Signup only) */}
                                        {mode === 'signup' && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-base"
                                                        placeholder="John Doe"
                                                        autoComplete="name"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Email Field */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-base"
                                                    placeholder="you@example.com"
                                                    autoComplete="email"
                                                />
                                            </div>
                                        </div>

                                        {/* Password Field */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    minLength={8}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full pl-11 pr-12 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-base"
                                                    placeholder="••••••••"
                                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 touch-manipulation"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {mode === 'signup' && (
                                                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                                    <Check size={12} className="text-green-500" />
                                                    Minimum 8 characters required
                                                </p>
                                            )}
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold rounded-xl hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 touch-manipulation text-base"
                                        >
                                            {isSubmitting ? (
                                                <Loader size={20} className="animate-spin" />
                                            ) : (
                                                <>
                                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                                    <ArrowRight size={18} />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Switch Mode */}
                                    <div className="mt-6 text-center">
                                        <p className="text-slate-500">
                                            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                                            <button
                                                onClick={switchMode}
                                                className="ml-1.5 text-brand-600 font-semibold hover:underline touch-manipulation"
                                            >
                                                {mode === 'login' ? 'Sign up free' : 'Sign in'}
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Terms - Below card */}
                            <p className="text-xs text-slate-400 text-center mt-6 px-4">
                                By continuing, you agree to our{' '}
                                <a href="#" className="underline hover:text-slate-600">Terms of Service</a>
                                {' '}and{' '}
                                <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>
                            </p>

                            {/* Mobile Features (Visible only on mobile) */}
                            <div className="lg:hidden mt-8 space-y-4">
                                <h3 className="text-center text-slate-700 font-semibold">Why Market MI?</h3>
                                <div className="grid gap-4">
                                    {features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg shrink-0">
                                                <feature.icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-slate-800">{feature.title}</h4>
                                                <p className="text-sm text-slate-500">{feature.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-100 py-6 px-4 text-center text-sm text-slate-400">
                <p>© 2026 Market MI. All rights reserved.</p>
            </footer>
        </div>
    );
};

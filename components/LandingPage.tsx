import React, { useState, useEffect } from 'react';
import { ArrowRight, Zap, Globe, MessageSquare, BarChart3, Shield, Mic, Calendar, CheckCircle, Search, Lightbulb, LayoutDashboard, User, LogIn } from 'lucide-react';
import { CompanyProfile } from '../types';

interface LandingPageProps {
  onGetStarted: () => void;
  onContinueAsUser?: (profile: CompanyProfile) => void;
  onLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onContinueAsUser, onLogin }) => {
  const [existingProfile, setExistingProfile] = useState<CompanyProfile | null>(null);
  const [showLoginOption, setShowLoginOption] = useState(false);

  // Check if there's an existing profile for returning users
  useEffect(() => {
    try {
      // Check if user manually logged out - don't show "Welcome back" card
      const isLoggedOut = localStorage.getItem('socialai_logged_out') === 'true';
      if (isLoggedOut) {
        setExistingProfile(null);
        setShowLoginOption(false);
        return;
      }

      const savedProfile = localStorage.getItem('socialai_profile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile) as CompanyProfile;
        setExistingProfile(profile);
        setShowLoginOption(true);
      }
    } catch (e) {
      console.error('Failed to load existing profile:', e);
    }
  }, []);

  const handleContinueAsUser = () => {
    if (existingProfile && onContinueAsUser) {
      // Clear logged out flag and continue
      localStorage.removeItem('socialai_logged_out');
      onContinueAsUser(existingProfile);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-18 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer shrink-0">
              <img src="/market-mi-logo.png" alt="Market MI" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <span className="font-bold text-lg sm:text-xl text-slate-800">Market MI</span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-brand-600 transition-colors">How it Works</a>
              <a href="#pricing" className="hover:text-brand-600 transition-colors">Pricing</a>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sign In button for returning users */}
              {onLogin && (
                <button
                  onClick={onLogin}
                  className="hidden sm:flex bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all items-center gap-2 text-xs sm:text-sm"
                >
                  <LogIn size={14} className="sm:w-4 sm:h-4" />
                  <span>Sign In</span>
                </button>
              )}
              {/* Get Started button - goes to auth page */}
              <button
                onClick={onLogin || onGetStarted}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <span>Get Started</span>
                <ArrowRight size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 lg:pt-40 lg:pb-28 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {/* Decorative Background Elements - Smaller on mobile */}
        <div className="absolute top-0 right-0 -mr-20 sm:-mr-32 md:-mr-40 -mt-20 sm:-mt-32 md:-mt-40 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] bg-brand-100 rounded-full blur-3xl opacity-40 sm:opacity-50 mix-blend-multiply filter"></div>
        <div className="absolute bottom-0 left-0 -ml-20 sm:-ml-32 md:-ml-40 -mb-20 sm:-mb-32 md:-mb-40 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] bg-indigo-100 rounded-full blur-3xl opacity-40 sm:opacity-50 mix-blend-multiply filter"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Powered By Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-4 sm:mb-6">
            <Zap size={12} className="sm:w-3.5 sm:h-3.5 fill-current" /> Powered by <a href="https://www.shakesdigital.com" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">Shakes Digital</a>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-slate-900 mb-4 sm:mb-6 md:mb-8 leading-[1.15]">
            The Only Marketing<br className="hidden xs:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700"> Assistant You Need</span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-xl sm:max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 md:mb-10 leading-relaxed font-light px-2">
            Automate your entire marketing workflow. From market research and strategy to content creation and scheduling—Market MI does it all.
          </p>

          {/* Welcome Back Card for Returning Users */}
          {showLoginOption && existingProfile && (
            <div className="max-w-sm sm:max-w-md mx-auto mb-6 sm:mb-8 bg-white rounded-xl shadow-lg border border-brand-200 p-4 sm:p-6 text-left">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold shrink-0">
                  {existingProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-slate-500">Welcome back!</p>
                  <p className="text-base sm:text-lg font-semibold text-slate-900 truncate">{existingProfile.name}</p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{existingProfile.industry}</p>
                </div>
              </div>
              <button
                onClick={handleContinueAsUser}
                className="mt-3 sm:mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <LogIn size={16} className="sm:w-[18px] sm:h-[18px]" /> Continue to Dashboard
              </button>
              <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-center text-slate-400">
                Your data and sessions are preserved
              </p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <button
              onClick={onGetStarted}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-brand-600 text-white rounded-xl font-bold text-base sm:text-lg hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {showLoginOption ? 'Create New Profile' : 'Start Free Trial'} <ArrowRight size={18} />
            </button>
            <button className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-xl font-bold text-base sm:text-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98]">
              View Demo
            </button>
          </div>

          {/* Hero Image Mockup - Replaced with Dashboard UI */}
          <div className="mt-16 relative mx-auto max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 text-left">
            {/* Browser Bar */}
            <div className="bg-slate-900 p-2 flex items-center gap-2">
              <div className="flex gap-1.5 ml-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-md mx-auto w-1/3 text-center truncate">marketmi.app/dashboard</div>
            </div>

            {/* App Interface Mockup */}
            <div className="bg-slate-50 flex h-[600px] overflow-hidden">

              {/* Sidebar */}
              <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
                    <img src="/market-mi-logo.png" alt="Market MI" className="w-6 h-6 object-contain" /> Market MI
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-brand-50 text-brand-700">
                    <LayoutDashboard size={20} /> Dashboard
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600">
                    <Search size={20} /> Market Research
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600">
                    <Lightbulb size={20} /> Strategy (Reasoning)
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600">
                    <Calendar size={20} /> Content Calendar
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 space-y-4">
                  <div className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl shadow-lg">
                    <Mic size={20} /> Live Consultant
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 px-2 py-1 text-sm">
                    <ArrowRight size={16} className="rotate-180" /> Logout / Reset
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-8 overflow-y-auto">
                <header className="mb-10">
                  <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                  <p className="text-slate-500">Welcome back, shakes travel.</p>
                </header>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4"><Search size={24} /></div>
                    <h3 className="text-lg font-semibold mb-1">Market Research</h3>
                    <p className="text-sm text-slate-500">View latest trends and competitor analysis powered by <a href="https://www.shakesdigital.com" target="_blank" rel="noopener noreferrer" className="font-bold text-brand-600 hover:underline">Shakes Digital</a>.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4"><Lightbulb size={24} /></div>
                    <h3 className="text-lg font-semibold mb-1">Strategic Plan</h3>
                    <p className="text-sm text-slate-500">Deep-dive marketing strategy generated by reasoning models.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4"><Calendar size={24} /></div>
                    <h3 className="text-lg font-semibold mb-1">Content Calendar</h3>
                    <p className="text-sm text-slate-500">Manage posts, generate content, and schedule for platforms.</p>
                  </div>
                </div>

                {/* Banner */}
                <div className="bg-brand-900 rounded-2xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">Need real-time advice?</h2>
                    <p className="mb-6 opacity-90 max-w-lg">Talk directly to your marketing assistant powered by <a href="https://www.shakesdigital.com" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">Shakes Digital</a>.</p>
                    <div className="bg-white text-brand-900 px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2">
                      <Mic size={18} /> Start Conversation
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-800 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">Everything You Need to Grow</h2>
            <p className="text-lg text-slate-500">Our marketing assistants work 24/7 to research, plan, and execute your marketing strategy.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Search className="w-6 h-6 text-brand-600" />}
              title="Market Research"
              description="Automatically analyze industry trends, competitor activities, and audience sentiment using real-time Google Search data."
              action="See Research"
            />
            <FeatureCard
              icon={<Lightbulb className="w-6 h-6 text-brand-600" />}
              title="Strategic Planning"
              description="Our marketing assistant generates comprehensive strategies, content pillars, and KPIs tailored to your business goals."
              action="View Strategy"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-brand-600" />}
              title="Auto-Pilot Mode"
              description="Set your cadence and let Market MI automatically generate, caption, and schedule posts for all your platforms."
              action="Enable Auto-Pilot"
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6 text-brand-600" />}
              title="Smart Scheduling"
              description="A visual content calendar that optimizes posting times for maximum engagement across Instagram, LinkedIn, and more."
              action="Open Calendar"
            />
            <FeatureCard
              icon={<Mic className="w-6 h-6 text-brand-600" />}
              title="Live Consultant"
              description="Talk to your marketing assistant in real-time using voice to brainstorm ideas or get immediate advice."
              action="Talk Now"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 text-brand-600" />}
              title="Performance Analytics"
              description="Track growth and engagement with automated reporting that helps you refine your strategy over time."
              action="View Report"
            />
          </div>
        </div>
      </section>

      {/* Trust / Process */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">From Zero to Posted in Seconds</h2>
            <p className="text-slate-500">How Market MI transforms your workflow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-bold text-lg mb-2">Onboard Business</h3>
              <p className="text-slate-500 text-sm">Tell us about your brand, audience, and goals. We build your profile.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-bold text-lg mb-2">Generate Strategy</h3>
              <p className="text-slate-500 text-sm">Our assistant analyzes the market and creates a tailored content plan.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-bold text-lg mb-2">Auto-Pilot Execution</h3>
              <p className="text-slate-500 text-sm">Approve generated content batches and watch your accounts grow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Dark Navy Background */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-6">Ready to Scale Your Marketing?</h2>
          <p className="text-slate-300 text-xl mb-10 max-w-2xl mx-auto">Join thousands of businesses using Market MI to save time and grow faster.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-brand-600 text-white rounded-md font-bold text-lg shadow-xl hover:bg-brand-500 transition-all hover:-translate-y-1"
            >
              Start Free Trial
            </button>
            <div className="bg-white rounded-md flex items-center px-4 w-full sm:w-auto min-w-[300px]">
              <span className="text-slate-400 text-sm">Enter your email...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Dark Navy Background */}
      <footer className="bg-slate-900 pt-16 pb-8 border-t border-slate-800 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <img src="/market-mi-logo.png" alt="Market MI" className="w-8 h-8 object-contain" />
              <span className="font-bold text-xl text-white">Market MI</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              The intelligent marketing assistant that helps businesses research, plan, and automate their social media growth.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-brand-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Auto-Pilot</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Case Studies</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-brand-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>© 2025 Market MI. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, action: string }> = ({ icon, title, description, action }) => (
  <div className="bg-white rounded-lg p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col items-center text-center">
    <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed mb-6">{description}</p>
    <button className="mt-auto px-6 py-2 border border-brand-500 text-brand-600 font-medium rounded hover:bg-brand-50 transition-colors text-sm w-full">
      {action}
    </button>
  </div>
);
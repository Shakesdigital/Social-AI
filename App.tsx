import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Search,
  Lightbulb,
  Calendar as CalendarIcon,
  Settings,
  PlusCircle,
  Mic,
  Menu,
  X,
  Zap,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Loader,
  LogOut,
  AlertTriangle,
  Users,
  Mail,
  FileText,
  LogIn,
  BarChart3
} from 'lucide-react';
import { AppView, CompanyProfile, ProfilesStore, ResearchReport, SocialPost, AutoPilotConfig, Lead } from './types';
import { LiveAssistant } from './components/LiveAssistant';
import { ChatBot } from './components/ChatBot';
import { LandingPage } from './components/LandingPage';
import { LeadsView } from './components/LeadsView';
import { EmailView } from './components/EmailView';
import { BlogView } from './components/BlogView';
import { CalendarView } from './components/CalendarView';
import { ProfileSettings } from './components/ProfileSettings';
import { AnalyticsView } from './components/AnalyticsView';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { LLMDiagnostics } from './components/LLMDiagnostics';
import { AuthPage } from './components/AuthPage';
import { UserMenu } from './components/UserMenu';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { generateMarketResearch, generateMarketingStrategy, generateContentTopics, generatePostCaption, generatePostImage, generateBatchContent } from './services/openaiService';
import { hasFreeLLMConfigured } from './services/freeLLMService';
import { fetchProfile, saveProfile } from './services/profileService';
import { fetchAllProfileData, saveUserData, DataType } from './services/dataService';
import ReactMarkdown from 'react-markdown';
import { InlineChat } from './components/InlineChat';

// Logo Component - Uses the Market MI logo image
const MarketMILogo = ({ className, onClick }: { className?: string; onClick?: () => void }) => (
  <img
    src="/market-mi-logo.png"
    alt="Market MI Logo"
    className={`${className || ''} ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  />
);

// Reusable App Header (matches Landing Page header)
const AppHeader: React.FC<{ onLogoClick?: () => void }> = ({ onLogoClick }) => (
  <nav className="w-full bg-white/90 backdrop-blur-md border-b border-slate-100 shrink-0">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16 md:h-20">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
          <MarketMILogo className="w-10 h-10 object-contain" onClick={onLogoClick} />
          <span className="font-bold text-xl text-slate-800">Market MI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <span className="text-brand-600">Dashboard</span>
        </div>
      </div>
    </div>
  </nav>
);

// Reusable App Footer (matches Landing Page footer)
const AppFooter: React.FC = () => (
  <footer className="w-full bg-slate-900 pt-12 md:pt-16 pb-6 md:pb-8 border-t border-slate-800 text-slate-300 shrink-0">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
      <div className="col-span-2 md:col-span-1">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <MarketMILogo className="w-8 h-8 object-contain" />
          <span className="font-bold text-xl text-white">Market MI</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-400">
          The intelligent marketing assistant that helps businesses research, plan, and automate their social media growth.
        </p>
      </div>

      <div>
        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 md:mb-6">Product</h4>
        <ul className="space-y-2 md:space-y-3 text-sm">
          <li><a href="#" className="hover:text-brand-400 transition-colors">Features</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Pricing</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Auto-Pilot</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Case Studies</a></li>
        </ul>
      </div>

      <div>
        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 md:mb-6">Company</h4>
        <ul className="space-y-2 md:space-y-3 text-sm">
          <li><a href="#" className="hover:text-brand-400 transition-colors">About Us</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Careers</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Blog</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Contact</a></li>
        </ul>
      </div>

      <div>
        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 md:mb-6">Legal</h4>
        <ul className="space-y-2 md:space-y-3 text-sm">
          <li><a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Terms of Service</a></li>
          <li><a href="#" className="hover:text-brand-400 transition-colors">Cookie Policy</a></li>
        </ul>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 border-t border-slate-800 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
      <p>© 2025 Market MI. All rights reserved.</p>
      <div className="flex gap-6 mt-4 md:mt-0">
        <a href="#" className="hover:text-white transition-colors">Twitter</a>
        <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
        <a href="#" className="hover:text-white transition-colors">Instagram</a>
      </div>
    </div>
  </footer>
);


const Onboarding: React.FC<{ onComplete: (profile: CompanyProfile) => void }> = ({ onComplete }) => {
  const [formData, setFormData] = useState<CompanyProfile>({
    id: '', // Will be overwritten by createNewProfile
    name: '',
    industry: '',
    description: '',
    targetAudience: '',
    brandVoice: '',
    goals: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.description) {
      onComplete(formData);
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:py-12 md:py-16">
      {/* Centered form container with max-width */}
      <div className="mx-auto w-full max-w-2xl">
        {/* Logo and branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <img src="/market-mi-logo.png" alt="Market MI" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Welcome to Market MI
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
            Let's set up your business profile to generate tailored marketing strategies.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* Company Name & Industry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg p-3 sm:p-3.5 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Industry <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg p-3 sm:p-3.5 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  placeholder="Technology, Retail, etc."
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                What do you do? <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-slate-300 rounded-lg p-3 sm:p-3.5 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all"
                placeholder="Describe your products or services..."
              />
            </div>

            {/* Target Audience & Brand Voice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target Audience <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg p-3 sm:p-3.5 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  placeholder="Millennials, Small Business..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Brand Voice <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="brandVoice"
                  value={formData.brandVoice}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg p-3 sm:p-3.5 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  placeholder="Professional, Friendly..."
                />
              </div>
            </div>

            {/* Marketing Goals */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Marketing Goals <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="goals"
                value={formData.goals}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg p-3 sm:p-3.5 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Increase brand awareness, drive sales..."
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full bg-brand-600 text-white font-semibold py-3.5 sm:py-4 rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all text-base shadow-lg shadow-brand-600/20"
            >
              Get Started
            </button>
          </form>

          {/* Privacy note */}
          <p className="text-center text-xs text-slate-400 mt-4">
            Your data is stored locally and never shared without your permission.
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ profile: CompanyProfile, onNavigate: (view: AppView) => void }> = ({ profile, onNavigate }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Dashboard Content */}
      <div className="p-4 sm:p-6 md:p-8 flex-1">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm sm:text-base">Welcome back, {profile.name}.</p>
        </header>

        {/* Social Media Section */}
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 md:mb-4">Social Media Marketing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <div onClick={() => onNavigate(AppView.RESEARCH)} className="bg-white p-4 sm:p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3 sm:mb-4"><Search size={20} className="sm:hidden" /><Search size={24} className="hidden sm:block" /></div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">Market Research</h3>
            <p className="text-xs sm:text-sm text-slate-500">View latest trends and competitor analysis.</p>
          </div>
          <div onClick={() => onNavigate(AppView.STRATEGY)} className="bg-white p-4 sm:p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-3 sm:mb-4"><Lightbulb size={20} className="sm:hidden" /><Lightbulb size={24} className="hidden sm:block" /></div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">Strategic Plan</h3>
            <p className="text-xs sm:text-sm text-slate-500">Deep-dive marketing strategy generation.</p>
          </div>
          <div onClick={() => onNavigate(AppView.CALENDAR)} className="bg-white p-4 sm:p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-3 sm:mb-4"><CalendarIcon size={20} className="sm:hidden" /><CalendarIcon size={24} className="hidden sm:block" /></div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">Content Calendar</h3>
            <p className="text-xs sm:text-sm text-slate-500">Manage posts and schedule content.</p>
          </div>
        </div>

        {/* Digital Marketing Suite Section */}
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 md:mb-4">Digital Marketing Suite</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <div onClick={() => onNavigate(AppView.LEADS)} className="bg-white p-4 sm:p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-3 sm:mb-4"><Users size={20} className="sm:hidden" /><Users size={24} className="hidden sm:block" /></div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">Lead Research</h3>
            <p className="text-xs sm:text-sm text-slate-500">Find and research potential marketing leads.</p>
          </div>
          <div onClick={() => onNavigate(AppView.EMAIL)} className="bg-white p-4 sm:p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-3 sm:mb-4"><Mail size={20} className="sm:hidden" /><Mail size={24} className="hidden sm:block" /></div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">Email Marketing</h3>
            <p className="text-xs sm:text-sm text-slate-500">Create personalized outreach campaigns.</p>
          </div>
          <div onClick={() => onNavigate(AppView.BLOG)} className="bg-white p-4 sm:p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center mb-3 sm:mb-4"><FileText size={20} className="sm:hidden" /><FileText size={24} className="hidden sm:block" /></div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">Blog Content</h3>
            <p className="text-xs sm:text-sm text-slate-500">Generate SEO-optimized blog posts.</p>
          </div>
        </div>

        {/* Live Consultant CTA - DISABLED until better TTS solution */}
        {/* <div className="bg-brand-900 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">Need real-time advice?</h2>
            <p className="mb-4 sm:mb-6 opacity-90 max-w-lg text-xs sm:text-sm md:text-base">Talk directly to your marketing assistant powered by <a href="https://www.shakesdigital.com" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">Shakes Digital</a>.</p>
            <button onClick={() => document.getElementById('live-btn')?.click()} className="bg-white text-brand-900 px-4 sm:px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-100 active:scale-95 transition-all inline-flex items-center gap-2 text-sm sm:text-base">
              <Mic size={18} /> Start Conversation
            </button>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-800 to-transparent hidden sm:block"></div>
        </div> */}
      </div>

      {/* Footer */}
      <AppFooter />
    </div>
  );
};

const ResearchView: React.FC<{
  profile: CompanyProfile,
  savedState?: { report: ResearchReport | null },
  onStateChange?: (state: { report: ResearchReport | null }) => void
}> = ({ profile, savedState, onStateChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const report = savedState?.report || null;

  const setReport = (newReport: ResearchReport | null) => {
    if (onStateChange) {
      onStateChange({ report: newReport });
    }
  };

  const runResearch = async (isRetry = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateMarketResearch(profile);
      setReport({ rawContent: result.text, sources: result.sources, lastUpdated: new Date().toISOString() });
    } catch (e: any) {
      console.error('[ResearchView] Failed:', e);

      // Check if all providers failed - show friendly message and auto-retry
      if (!isRetry && (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError')) {
        setError('Taking a quick breather — trying again...');
        setTimeout(() => runResearch(true), 3000);
        return;
      }

      setError(isRetry
        ? 'Our AI is taking a short break. Please try again in a minute! 🙏'
        : 'Something went wrong. Please try again.');
      setLoading(false);
    } finally {
      if (!error?.includes('breather')) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!report) runResearch();
  }, []);

  if (loading) return <div className="p-4 sm:p-8 flex items-center justify-center h-full"><div className="text-brand-600 font-semibold animate-pulse text-sm sm:text-base">Analyzing the Market......</div></div>;
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Market Research</h1>
        <button onClick={() => runResearch()} className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
          <Search size={16} /> Regenerate
        </button>
      </div>
      {error && (
        <div className={`mb-4 p-3 sm:p-4 rounded-lg text-sm ${error.includes('breather') ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
          {error.includes('breather') && <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></span>}
          {error}
        </div>
      )}
      {report && (
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          <div className="flex-1">
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm prose prose-slate prose-sm sm:prose max-w-none">
              <ReactMarkdown>{report.rawContent}</ReactMarkdown>
            </div>
            {/* Inline Chat for follow-up questions */}
            <InlineChat
              context={report.rawContent}
              contextType="research"
              placeholder="Ask about this research..."
            />
          </div>
          {report.sources.length > 0 && (
            <div className="w-full lg:w-72 xl:w-80 space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-slate-700 text-sm sm:text-base">Sources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
                {report.sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="block p-3 sm:p-4 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-colors active:scale-[0.98]">
                    <div className="text-xs sm:text-sm font-medium text-brand-600 mb-1 truncate">{s.title}</div>
                    <div className="text-xs text-slate-400 truncate">{s.uri}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
    {icon} {label}
  </button>
);

const StrategyWrapper: React.FC<{
  profile: CompanyProfile,
  researchText: string,
  savedState?: { strategy: string },
  onStateChange?: (state: { strategy: string }) => void
}> = ({ profile, researchText, savedState, onStateChange }) => {
  const [strategy, setStrategyLocal] = useState<string>(savedState?.strategy || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStrategy = (newStrategy: string) => {
    setStrategyLocal(newStrategy);
    if (onStateChange) {
      onStateChange({ strategy: newStrategy });
    }
  };

  const fetchStrategy = async (isRetry = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateMarketingStrategy(profile, researchText || "No prior research.");
      setStrategy(res);
    } catch (e: any) {
      console.error('[StrategyWrapper] Failed:', e);

      // Check if all providers failed - show friendly message and auto-retry
      if (!isRetry && (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError')) {
        setError('Taking a quick breather — trying again...');
        setTimeout(() => fetchStrategy(true), 3000);
        return;
      }

      setError(isRetry
        ? 'Our AI is taking a short break. Please try again in a minute! 🙏'
        : 'Something went wrong. Please try again.');
      setLoading(false);
    } finally {
      if (!error?.includes('breather')) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Only fetch if we don't have a saved strategy
    if (savedState?.strategy) return;
    fetchStrategy();
  }, []);

  if (loading) return <div className="flex flex-col items-center justify-center h-96 text-center p-4"><p className="animate-pulse text-sm sm:text-base">Generating strategy...</p></div>;
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Marketing Strategy</h1>
        <button onClick={() => fetchStrategy()} className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
          <Lightbulb size={16} /> Regenerate
        </button>
      </div>
      {error && (
        <div className={`mb-4 p-3 rounded-lg text-xs sm:text-sm ${error.includes('breather') ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
          {error.includes('breather') && <span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></span>}
          {error}
        </div>
      )}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm prose prose-slate prose-sm sm:prose max-w-none"><ReactMarkdown>{strategy}</ReactMarkdown></div>
      {/* Inline Chat for follow-up questions */}
      {strategy && (
        <InlineChat
          context={strategy}
          contextType="strategy"
          placeholder="Ask about this strategy..."
        />
      )}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  // Auth state from Supabase
  const { user, isAuthenticated, logout: authLogout, isLoading: authLoading } = useAuth();

  // Multi-profile state management
  const [allProfiles, setAllProfiles] = useState<CompanyProfile[]>(() => {
    try {
      // Try to load profiles store first
      const saved = localStorage.getItem('socialai_profiles');
      if (saved) {
        const store: ProfilesStore = JSON.parse(saved);
        return store.profiles || [];
      }
      // Migrate from old single profile format
      const oldProfile = localStorage.getItem('socialai_profile');
      if (oldProfile) {
        const parsed = JSON.parse(oldProfile);
        // Add ID if missing (migration)
        const migratedProfile = {
          ...parsed,
          id: parsed.id || 'profile_' + Date.now(),
          createdAt: parsed.createdAt || new Date().toISOString()
        };
        return [migratedProfile];
      }
      return [];
    } catch (e) {
      console.error("Failed to load profiles", e);
      return [];
    }
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('socialai_profiles');
      if (saved) {
        const store: ProfilesStore = JSON.parse(saved);
        return store.activeProfileId;
      }
      // Check for old format
      const oldProfile = localStorage.getItem('socialai_profile');
      if (oldProfile) {
        const parsed = JSON.parse(oldProfile);
        return parsed.id || 'profile_' + Date.now();
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  // Derived state: current active profile
  const profile = allProfiles.find(p => p.id === activeProfileId) || null;

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    const store: ProfilesStore = {
      profiles: allProfiles,
      activeProfileId
    };
    localStorage.setItem('socialai_profiles', JSON.stringify(store));
    // Keep old format updated for backward compatibility
    if (profile) {
      localStorage.setItem('socialai_profile', JSON.stringify(profile));
    }
  }, [allProfiles, activeProfileId, profile]);

  // Profile management functions
  const updateProfile = (updatedProfile: CompanyProfile) => {
    setAllProfiles(prev => prev.map(p =>
      p.id === updatedProfile.id ? updatedProfile : p
    ));
  };

  const switchProfile = async (profileId: string) => {
    setActiveProfileId(profileId);

    // Clear component states first
    setCalendarState(null);
    setLeadsState(null);
    setEmailState(null);
    setBlogState(null);
    setResearchState(null);
    setStrategyState(null);

    // Load data for this profile from cloud if authenticated
    if (isAuthenticated && user) {
      console.log(`[Profile] Loading data for profile ${profileId} from cloud...`);
      const profileData = await fetchAllProfileData(user.id, profileId);

      if (profileData.calendar) setCalendarState(profileData.calendar);
      if (profileData.leads) setLeadsState(profileData.leads);
      if (profileData.email) setEmailState(profileData.email);
      if (profileData.blog) setBlogState(profileData.blog);
      if (profileData.research) setResearchState(profileData.research);
      if (profileData.strategy) setStrategyState(profileData.strategy);

      console.log(`[Profile] Data loaded for profile ${profileId}`);
    } else {
      // Try to load from localStorage as fallback (per-profile keys)
      try {
        const calendarData = localStorage.getItem(`socialai_calendar_${profileId}`);
        const leadsData = localStorage.getItem(`socialai_leads_${profileId}`);
        const emailData = localStorage.getItem(`socialai_email_${profileId}`);
        const blogData = localStorage.getItem(`socialai_blog_${profileId}`);
        const researchData = localStorage.getItem(`socialai_research_${profileId}`);
        const strategyData = localStorage.getItem(`socialai_strategy_${profileId}`);

        if (calendarData) setCalendarState(JSON.parse(calendarData));
        if (leadsData) setLeadsState(JSON.parse(leadsData));
        if (emailData) setEmailState(JSON.parse(emailData));
        if (blogData) setBlogState(JSON.parse(blogData));
        if (researchData) setResearchState(JSON.parse(researchData));
        if (strategyData) setStrategyState(JSON.parse(strategyData));
      } catch (e) {
        console.error('[Profile] Error loading local data:', e);
      }
    }
  };

  const createNewProfile = (newProfile: CompanyProfile) => {
    const profileWithId = {
      ...newProfile,
      id: 'profile_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setAllProfiles(prev => [...prev, profileWithId]);
    setActiveProfileId(profileWithId.id);

    // Clear ALL component states so new profile starts with completely empty dashboard
    setCalendarState(null);
    setLeadsState(null);
    setEmailState(null);
    setBlogState(null);
    setResearchState(null);
    setStrategyState(null);
    setLeadsForEmail([]); // Clear leads selected for email campaign

    console.log(`[Profile] Created new profile ${profileWithId.id} with empty dashboard`);

    return profileWithId;
  };

  const deleteProfile = (profileId: string) => {
    setAllProfiles(prev => prev.filter(p => p.id !== profileId));
    // If deleting active profile, switch to first remaining one
    if (profileId === activeProfileId) {
      const remaining = allProfiles.filter(p => p.id !== profileId);
      setActiveProfileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Clear all profiles and reset state (used on logout or user switch)
  const clearAllProfiles = () => {
    setAllProfiles([]);
    setActiveProfileId(null);
    setCalendarState(null);
    setLeadsState(null);
    setEmailState(null);
    setBlogState(null);
    setResearchState(null);
    setStrategyState(null);
    // Clear all localStorage items for this app
    localStorage.removeItem('socialai_profiles');
    localStorage.removeItem('socialai_profile');
    localStorage.removeItem('socialai_calendar_state');
    localStorage.removeItem('socialai_research_state');
    localStorage.removeItem('socialai_strategy_state');
    localStorage.removeItem('socialai_leads_state');
    localStorage.removeItem('socialai_email_state');
    localStorage.removeItem('socialai_blog_state');
  };


  const [view, setView] = useState<AppView>(() => {
    try {
      // Check if this is an OAuth callback - if so, we need to handle auth
      const isOAuthCallback = window.location.hash.includes('access_token');
      if (isOAuthCallback) {
        // Start in AUTH view so handleAuthChange will be triggered
        return AppView.AUTH;
      }

      // Check if user has a profile and is not logged out
      const hasProfile = !!localStorage.getItem('socialai_profile');
      const isLoggedOut = localStorage.getItem('socialai_logged_out') === 'true';

      // If logged out or no profile, go to landing
      if (isLoggedOut || !hasProfile) {
        return AppView.LANDING;
      }

      return AppView.DASHBOARD;
    } catch (e) { return AppView.LANDING; }
  });

  const [hasApiKey, setHasApiKey] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    // Check if any LLM provider is configured
    const hasLLM = hasFreeLLMConfigured();
    if (!hasLLM) setHasApiKey(false);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+D to open diagnostics
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDiagnostics(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [leadsForEmail, setLeadsForEmail] = useState<Lead[]>([]);

  // Track if we've already handled an OAuth callback this session
  const [oauthHandled, setOauthHandled] = useState(false);

  // Track auth mode: 'signin' for NEW users (go to onboarding), 'login' for EXISTING users (go to dashboard)
  // Persist to localStorage so it survives OAuth redirect
  const [authMode, setAuthMode] = useState<'signin' | 'login' | null>(() => {
    try {
      const saved = localStorage.getItem('socialai_auth_mode');
      return saved as 'signin' | 'login' | null;
    } catch { return null; }
  });

  // Save authMode to localStorage when it changes
  useEffect(() => {
    if (authMode) {
      localStorage.setItem('socialai_auth_mode', authMode);
    } else {
      localStorage.removeItem('socialai_auth_mode');
    }
  }, [authMode]);

  // Handle auth state changes (including OAuth callback)
  useEffect(() => {
    console.log('[Auth Effect] Running...', {
      authLoading,
      isAuthenticated,
      hasUser: !!user,
      view,
      oauthHandled,
      authMode,
      profilesCount: allProfiles.length
    });

    if (authLoading) {
      console.log('[Auth Effect] Still loading, skipping...');
      return;
    }

    // Check if this is an OAuth callback (URL contains access_token or type=recovery hash)
    const hash = window.location.hash;
    const isOAuthCallback = hash.includes('access_token') || hash.includes('type=');

    // Also detect OAuth from URL search params (some browsers handle it differently)
    const searchParams = new URLSearchParams(window.location.search);
    const hasAuthCode = searchParams.has('code') || searchParams.has('access_token');

    // Determine if we should handle this auth state change
    const shouldHandle = view === AppView.AUTH || ((isOAuthCallback || hasAuthCode) && !oauthHandled);

    console.log('[Auth Effect] Should handle?', shouldHandle, {
      view,
      isOAuthCallback,
      hasAuthCode,
      oauthHandled,
      hash: hash.substring(0, 50)
    });

    if (!isAuthenticated || !user) {
      console.log('[Auth Effect] Not authenticated, skipping navigation');
      // Clean up URL if it has auth params but no user
      if (isOAuthCallback || hasAuthCode) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }

    if (!shouldHandle) {
      console.log('[Auth Effect] shouldHandle is false, skipping navigation');
      return;
    }

    const handleAuthChange = async () => {
      console.log('[Auth] Starting handleAuthChange...');
      console.log('[Auth] Browser:', navigator.userAgent);

      // User is authenticated
      localStorage.removeItem('socialai_logged_out');

      // Check if this is the same user or a different user
      const storedUserId = localStorage.getItem('socialai_user_id');
      const isDifferentUser = storedUserId && storedUserId !== user.id;
      const isFirstTimeUser = !storedUserId;

      console.log('[Auth] User authenticated:', user.id);
      console.log('[Auth] Stored user ID:', storedUserId);
      console.log('[Auth] Is different user:', isDifferentUser);
      console.log('[Auth] Is first time user:', isFirstTimeUser);
      console.log('[Auth] Local profiles count:', allProfiles.length);

      // === STEP 1: Fetch cloud profile FIRST (before clearing anything) ===
      console.log('[Auth] Fetching profile from Supabase for user:', user.id);
      let cloudProfile = null;
      let cloudFetchFailed = false;

      try {
        // Add timeout for privacy browsers that might block Supabase
        const profilePromise = fetchProfile(user.id);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );

        cloudProfile = await Promise.race([profilePromise, timeoutPromise]) as any;
        console.log('[Auth] Cloud profile fetched:', cloudProfile ? 'Found' : 'Not found');
      } catch (e: any) {
        console.warn('[Auth] Error fetching profile (might be blocked by browser):', e.message);
        cloudFetchFailed = true;
      }

      // === STEP 2: Handle user switching ===
      // Only clear local profiles if switching to a different user AND we got their cloud data
      let currentLocalProfiles = allProfiles;

      if (isDifferentUser) {
        console.log('[Auth] Different user detected');

        if (cloudProfile) {
          // We have the new user's cloud profile - safe to clear old data
          console.log('[Auth] New user has cloud profile - clearing old local data');
          clearAllProfiles();
          currentLocalProfiles = [];
        } else if (!cloudFetchFailed) {
          // Cloud fetch succeeded but no profile = truly new user - clear old data
          console.log('[Auth] New user has no cloud profile - clearing old local data');
          clearAllProfiles();
          currentLocalProfiles = [];
        } else {
          // Cloud fetch failed - keep local profiles as fallback but warn
          console.warn('[Auth] Cloud fetch failed - keeping local profiles as fallback');
        }

        setOauthHandled(false);
      }

      // Save current user ID
      localStorage.setItem('socialai_user_id', user.id);

      // === STEP 3: Determine if user is existing or new ===
      const hasCloudProfile = !!cloudProfile;
      const hasLocalProfiles = currentLocalProfiles.length > 0;
      const isExistingUser = hasCloudProfile || hasLocalProfiles;

      console.log('[Auth] Profile check:', { hasCloudProfile, hasLocalProfiles, isExistingUser, cloudFetchFailed });

      // === STEP 4: Route based on user status ===
      if (isExistingUser) {
        // EXISTING USER: Has profile somewhere -> Dashboard
        console.log('[Auth] Existing user detected - routing to dashboard');

        let targetProfileId: string;

        if (cloudProfile) {
          // Use cloud profile - SET it as the only profile for this user
          const cloudProfileId = cloudProfile.id || 'profile_' + Date.now();

          // Check if we already have this profile (avoid duplicates)
          const existingProfiles = allProfiles.filter(
            p => p.id === cloudProfileId || (p.name === cloudProfile.name && p.industry === cloudProfile.industry)
          );

          if (existingProfiles.length === 0) {
            // Profile doesn't exist locally - add it
            const newProfile = {
              ...cloudProfile,
              id: cloudProfileId,
              createdAt: cloudProfile.createdAt || new Date().toISOString()
            };

            // If we cleared profiles (different user), start fresh with just this profile
            if (isDifferentUser) {
              setAllProfiles([newProfile]);
            } else {
              // Same user, add to existing profiles
              setAllProfiles(prev => [...prev, newProfile]);
            }
            console.log('[Auth] Added cloud profile with ID:', cloudProfileId);
          } else if (isDifferentUser) {
            // Different user but profile exists - set ONLY this profile (clear others)
            setAllProfiles([existingProfiles[0]]);
            console.log('[Auth] Reset to single cloud profile for different user');
          }

          setActiveProfileId(cloudProfileId);
          targetProfileId = cloudProfileId;
        } else {
          // Use first local profile (fallback for blocked Supabase)
          targetProfileId = activeProfileId && currentLocalProfiles.find(p => p.id === activeProfileId)
            ? activeProfileId
            : currentLocalProfiles[0].id;
          setActiveProfileId(targetProfileId);
          console.log('[Auth] Using local profile (cloud fetch failed/blocked):', targetProfileId);
        }

        // Fetch data for this profile
        if (!cloudFetchFailed) {
          console.log('[Auth] Fetching cloud data for profile:', targetProfileId);
          try {
            const cloudData = await fetchAllProfileData(user.id, targetProfileId);
            const loadedTypes = Object.keys(cloudData).filter(k => cloudData[k as DataType] !== null);
            console.log('[Auth] Cloud data loaded:', loadedTypes);

            if (cloudData.calendar) {
              setCalendarState(cloudData.calendar);
              localStorage.setItem(`socialai_calendar_${targetProfileId}`, JSON.stringify(cloudData.calendar));
            }
            if (cloudData.leads) {
              setLeadsState(cloudData.leads);
              localStorage.setItem(`socialai_leads_${targetProfileId}`, JSON.stringify(cloudData.leads));
            }
            if (cloudData.email) {
              setEmailState(cloudData.email);
              localStorage.setItem(`socialai_email_${targetProfileId}`, JSON.stringify(cloudData.email));
            }
            if (cloudData.blog) {
              setBlogState(cloudData.blog);
              localStorage.setItem(`socialai_blog_${targetProfileId}`, JSON.stringify(cloudData.blog));
            }
            if (cloudData.research) {
              setResearchState(cloudData.research);
              localStorage.setItem(`socialai_research_${targetProfileId}`, JSON.stringify(cloudData.research));
            }
            if (cloudData.strategy) {
              setStrategyState(cloudData.strategy);
              localStorage.setItem(`socialai_strategy_${targetProfileId}`, JSON.stringify(cloudData.strategy));
            }
          } catch (e) {
            console.error('[Auth] Error fetching cloud data:', e);
          }
        } else {
          console.log('[Auth] Skipping cloud data fetch (Supabase blocked)');
        }

        console.log('[Auth] Navigating to DASHBOARD');
        setView(AppView.DASHBOARD);
      } else {
        // NEW USER: No profile anywhere -> Onboarding
        console.log('[Auth] New user detected (no profiles) - routing to onboarding');
        setView(AppView.ONBOARDING);
      }

      // Clear auth mode after handling
      console.log('[Auth] Clearing auth mode');
      setAuthMode(null);

      // Clear the URL hash/params after OAuth callback
      if (isOAuthCallback || hasAuthCode) {
        setOauthHandled(true);
        window.history.replaceState(null, '', window.location.pathname);
        console.log('[Auth] Cleared OAuth URL parameters');
      }
    };

    // Run the handler
    handleAuthChange();
  }, [authLoading, isAuthenticated, user, view, oauthHandled, authMode, allProfiles.length]);

  // Sync state: Only redirect to landing if user is NOT authenticated AND has no profile
  // Authenticated users without profiles should stay on onboarding, not get redirected to landing
  useEffect(() => {
    // Don't redirect if:
    // 1. User has a profile (can access any view)
    // 2. User is on landing, onboarding, or auth pages (allowed without profile)
    // 3. User is authenticated (they may be going through onboarding flow)
    if (!profile && !isAuthenticated && view !== AppView.LANDING && view !== AppView.ONBOARDING && view !== AppView.AUTH) {
      setView(AppView.LANDING);
    }
  }, [profile, view, isAuthenticated]);

  const handleOnboardingComplete = async (p: CompanyProfile) => {
    // Add to multi-profile system
    const newProfile = createNewProfile(p);

    // Save to legacy local storage for backward compatibility
    localStorage.setItem('socialai_profile', JSON.stringify(newProfile));
    localStorage.removeItem('socialai_logged_out'); // Clear logged out flag

    // Mark this user as having completed onboarding
    if (user) {
      localStorage.setItem('socialai_user_id', user.id);
      localStorage.setItem(`socialai_onboarded_${user.id}`, 'true');

      console.log('[Onboarding] Saving profile to Supabase...');
      await saveProfile(user.id, newProfile);
    }

    setView(AppView.DASHBOARD);
  };

  const handleLogout = async () => {
    // Log out from Supabase
    await authLogout();

    // Set a flag indicating the user is logged out
    // We preserve user ID so if same user comes back, we know it's them
    localStorage.setItem('socialai_logged_out', 'true');

    // Reset OAuth handled so next user can sign in with OAuth
    setOauthHandled(false);

    // Clear active profile but preserve profiles for returning user
    setActiveProfileId(null);

    // Reset component states
    setCalendarState(null);
    setLeadsState(null);
    setEmailState(null);
    setBlogState(null);
    setResearchState(null);
    setStrategyState(null);

    setView(AppView.LANDING);
  };

  // ========================================
  // LIFTED STATE FOR COMPONENT PERSISTENCE
  // ========================================

  // Component states - these will be loaded per-profile
  const [calendarState, setCalendarState] = useState<any>(null);
  const [blogState, setBlogState] = useState<any>(null);
  const [leadsState, setLeadsState] = useState<any>(null);
  const [emailState, setEmailState] = useState<any>(null);
  const [researchState, setResearchState] = useState<any>(null);
  const [strategyState, setStrategyState] = useState<any>(null);

  // Profile loading state - prevents components from rendering before data is loaded
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Load per-profile data when activeProfileId changes
  useEffect(() => {
    if (!activeProfileId) return;

    console.log(`[State] Loading data for profile: ${activeProfileId}`);
    setIsProfileLoading(true);

    // Load from per-profile localStorage keys SYNCHRONOUSLY
    try {
      const calendarData = localStorage.getItem(`socialai_calendar_${activeProfileId}`);
      const blogData = localStorage.getItem(`socialai_blog_${activeProfileId}`);
      const leadsData = localStorage.getItem(`socialai_leads_${activeProfileId}`);
      const emailData = localStorage.getItem(`socialai_email_${activeProfileId}`);
      const researchData = localStorage.getItem(`socialai_research_${activeProfileId}`);
      const strategyData = localStorage.getItem(`socialai_strategy_${activeProfileId}`);

      // Set all states in one batch
      setCalendarState(calendarData ? JSON.parse(calendarData) : null);
      setBlogState(blogData ? JSON.parse(blogData) : null);
      setLeadsState(leadsData ? JSON.parse(leadsData) : null);
      setEmailState(emailData ? JSON.parse(emailData) : null);
      setResearchState(researchData ? JSON.parse(researchData) : null);
      setStrategyState(strategyData ? JSON.parse(strategyData) : null);

      console.log(`[State] Loaded local data for profile: ${activeProfileId}`);
    } catch (e) {
      console.error('[State] Error loading local data:', e);
    }

    // Mark loading complete after a brief delay to ensure state updates have propagated
    setTimeout(() => setIsProfileLoading(false), 100);

    // Also try to load from cloud if authenticated (async, updates will merge)
    if (isAuthenticated && user) {
      fetchAllProfileData(user.id, activeProfileId).then(cloudData => {
        if (cloudData.calendar) setCalendarState(cloudData.calendar);
        if (cloudData.blog) setBlogState(cloudData.blog);
        if (cloudData.leads) setLeadsState(cloudData.leads);
        if (cloudData.email) setEmailState(cloudData.email);
        if (cloudData.research) setResearchState(cloudData.research);
        if (cloudData.strategy) setStrategyState(cloudData.strategy);
        console.log(`[State] Loaded cloud data for profile: ${activeProfileId}`);
      });
    }
  }, [activeProfileId]); // Only run when profile changes

  // Save states to localStorage and cloud when they change (per-profile)
  useEffect(() => {
    if (calendarState && activeProfileId) {
      // Save to per-profile localStorage key
      localStorage.setItem(`socialai_calendar_${activeProfileId}`, JSON.stringify(calendarState));
      // Sync to cloud if authenticated
      if (isAuthenticated && user) {
        saveUserData(user.id, activeProfileId, 'calendar', calendarState);
      }
    }
  }, [calendarState, isAuthenticated, user, activeProfileId]);

  useEffect(() => {
    if (blogState && activeProfileId) {
      localStorage.setItem(`socialai_blog_${activeProfileId}`, JSON.stringify(blogState));
      if (isAuthenticated && user) {
        saveUserData(user.id, activeProfileId, 'blog', blogState);
      }
    }
  }, [blogState, isAuthenticated, user, activeProfileId]);

  useEffect(() => {
    if (leadsState && activeProfileId) {
      localStorage.setItem(`socialai_leads_${activeProfileId}`, JSON.stringify(leadsState));
      if (isAuthenticated && user) {
        saveUserData(user.id, activeProfileId, 'leads', leadsState);
      }
    }
  }, [leadsState, isAuthenticated, user, activeProfileId]);

  useEffect(() => {
    if (emailState && activeProfileId) {
      localStorage.setItem(`socialai_email_${activeProfileId}`, JSON.stringify(emailState));
      if (isAuthenticated && user) {
        saveUserData(user.id, activeProfileId, 'email', emailState);
      }
    }
  }, [emailState, isAuthenticated, user, activeProfileId]);

  useEffect(() => {
    if (researchState && activeProfileId) {
      localStorage.setItem(`socialai_research_${activeProfileId}`, JSON.stringify(researchState));
      if (isAuthenticated && user) {
        saveUserData(user.id, activeProfileId, 'research', researchState);
      }
    }
  }, [researchState, isAuthenticated, user, activeProfileId]);

  useEffect(() => {
    if (strategyState && activeProfileId) {
      localStorage.setItem(`socialai_strategy_${activeProfileId}`, JSON.stringify(strategyState));
      if (isAuthenticated && user) {
        saveUserData(user.id, activeProfileId, 'strategy', strategyState);
      }
    }
  }, [strategyState, isAuthenticated, user, activeProfileId]);

  const renderContent = () => {
    if (view === AppView.LANDING) {
      return (
        <LandingPage
          onSignIn={() => {
            // Both Sign In and Log In lead to auth page
            // After auth, the system will auto-detect:
            // - Has profile → Dashboard
            // - No profile → Onboarding

            if (isAuthenticated && user) {
              // Already authenticated - check if has profile
              console.log('[Landing] Already authenticated, checking profile...');
              localStorage.removeItem('socialai_logged_out');

              if (profile || allProfiles.length > 0) {
                // Has profile → Dashboard
                if (!activeProfileId && allProfiles.length > 0) {
                  setActiveProfileId(allProfiles[0].id);
                }
                setView(AppView.DASHBOARD);
              } else {
                // No profile → Onboarding
                setView(AppView.ONBOARDING);
              }
            } else {
              // Need to authenticate first
              setView(AppView.AUTH);
            }
          }}
          onLogIn={() => {
            // Same logic as onSignIn - auto-detect user type

            if (isAuthenticated && user) {
              console.log('[Landing] Already authenticated, checking profile...');
              localStorage.removeItem('socialai_logged_out');

              if (profile || allProfiles.length > 0) {
                if (!activeProfileId && allProfiles.length > 0) {
                  setActiveProfileId(allProfiles[0].id);
                }
                setView(AppView.DASHBOARD);
              } else {
                setView(AppView.ONBOARDING);
              }
            } else {
              setView(AppView.AUTH);
            }
          }}
          onContinueAsUser={(p) => {
            // Find this profile in allProfiles or add it
            const existingProfile = allProfiles.find(
              prof => prof.name === p.name && prof.industry === p.industry
            );
            if (existingProfile) {
              setActiveProfileId(existingProfile.id);
            } else {
              createNewProfile(p);
            }
            localStorage.removeItem('socialai_logged_out');
            setView(AppView.DASHBOARD);
          }}
        />
      );
    }
    if (!profile && view !== AppView.ONBOARDING && view !== AppView.AUTH) return null;
    switch (view) {
      case AppView.AUTH:
        return (
          <AuthPage
            authMode={authMode}
            onSuccess={() => {
              // After login, the useEffect will handle navigation based on profile existence
              // This is called for email/password login (not OAuth)
              // The auth state change will trigger handleAuthChange
              console.log('[AuthPage] Login success, waiting for auth state to update...');
            }}
            onBack={() => {
              setAuthMode(null);
              setView(AppView.LANDING);
            }}
          />
        );
      case AppView.ONBOARDING:
        return (
          <div className="h-screen flex flex-col bg-slate-50 overflow-y-auto">
            <AppHeader onLogoClick={() => setView(AppView.LANDING)} />
            <main className="flex-1">
              <Onboarding onComplete={handleOnboardingComplete} />
            </main>
            <AppFooter />
          </div>
        );
      // Show loading screen while profile data is being loaded
      case AppView.DASHBOARD:
      case AppView.RESEARCH:
      case AppView.STRATEGY:
      case AppView.CALENDAR:
      case AppView.LEADS:
      case AppView.EMAIL:
      case AppView.BLOG:
      case AppView.ANALYTICS:
      case AppView.SETTINGS:
        if (isProfileLoading) {
          return (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Loading profile data...</p>
              </div>
            </div>
          );
        }
        // Render the actual component based on view
        switch (view) {
          case AppView.DASHBOARD: return <Dashboard key={activeProfileId} profile={profile!} onNavigate={setView} />;
          case AppView.RESEARCH: return <ResearchView key={activeProfileId} profile={profile!} savedState={researchState} onStateChange={setResearchState} />;
          case AppView.STRATEGY: return <div key={activeProfileId} className="p-8 h-full overflow-y-auto"><h1 className="text-2xl font-bold mb-4">Marketing Strategy</h1><StrategyWrapper profile={profile!} researchText={researchState?.report?.rawContent || ''} savedState={strategyState} onStateChange={setStrategyState} /></div>;
          case AppView.CALENDAR: return <CalendarView key={activeProfileId} profile={profile!} savedState={calendarState} onStateChange={setCalendarState} />;
          case AppView.LEADS: return <LeadsView key={activeProfileId} profile={profile!} savedState={leadsState} onStateChange={setLeadsState} onAddToEmailCampaign={(leads) => { setLeadsForEmail(leads); setView(AppView.EMAIL); }} />;
          case AppView.EMAIL: return <EmailView key={activeProfileId} profile={profile!} leads={leadsForEmail} savedState={emailState} onStateChange={setEmailState} />;
          case AppView.BLOG: return <BlogView key={activeProfileId} profile={profile!} savedState={blogState} onStateChange={setBlogState} />;
          case AppView.ANALYTICS: return <AnalyticsView key={activeProfileId} profile={profile!} />;
          case AppView.SETTINGS: return <ProfileSettings key={activeProfileId} profile={profile!} onSave={(updatedProfile) => updateProfile(updatedProfile)} onBack={() => setView(AppView.DASHBOARD)} />;
          default: return <div>Not Implemented</div>;
        }
      default: return <div>Not Implemented</div>;
    }
  };

  const showSidebar = view !== AppView.LANDING && view !== AppView.ONBOARDING && view !== AppView.AUTH;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when view changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [view]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* API Key Warning Banner */}
      {!hasApiKey && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
          <AlertTriangle size={12} />
          <span className="hidden sm:inline">WARNING: No LLM API Key configured. Please add VITE_GROQ_API_KEY to your Netlify Environment Variables.</span>
          <span className="sm:hidden">No API Key configured</span>
        </div>
      )}

      {/* Mobile Header - Only shown on mobile when sidebar should be visible */}
      {showSidebar && (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-lg">
            <MarketMILogo className="w-7 h-7 object-contain" onClick={() => setView(AppView.LANDING)} /> <span>Market MI</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      )}

      {/* Mobile Overlay */}
      {showSidebar && mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, slide-out drawer when menu is open */}
      {showSidebar && (
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-72 lg:w-64 bg-white border-r border-slate-200 
          flex flex-col shrink-0
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-xl cursor-pointer" onClick={() => setView(AppView.LANDING)}>
                <MarketMILogo className="w-8 h-8 object-contain" onClick={() => setView(AppView.LANDING)} /> <span>Market MI</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1 rounded hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>


          {/* Profile Switcher */}
          <div className="px-4 pt-4 pb-2">
            <ProfileSwitcher
              profiles={allProfiles}
              activeProfile={profile}
              onSwitchProfile={switchProfile}
              onCreateNew={() => setView(AppView.ONBOARDING)}
              onDeleteProfile={deleteProfile}
            />
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavButton active={view === AppView.DASHBOARD} onClick={() => setView(AppView.DASHBOARD)} icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <div className="pt-2 pb-1"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Social Media</span></div>
            <NavButton active={view === AppView.RESEARCH} onClick={() => setView(AppView.RESEARCH)} icon={<Search size={20} />} label="Market Research" />
            <NavButton active={view === AppView.STRATEGY} onClick={() => setView(AppView.STRATEGY)} icon={<Lightbulb size={20} />} label="Strategy" />
            <NavButton active={view === AppView.CALENDAR} onClick={() => setView(AppView.CALENDAR)} icon={<CalendarIcon size={20} />} label="Content Calendar" />
            <div className="pt-4 pb-1"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Marketing Suite</span></div>
            <NavButton active={view === AppView.LEADS} onClick={() => setView(AppView.LEADS)} icon={<Users size={20} />} label="Lead Research" />
            <NavButton active={view === AppView.EMAIL} onClick={() => setView(AppView.EMAIL)} icon={<Mail size={20} />} label="Email Marketing" />
            <NavButton active={view === AppView.BLOG} onClick={() => setView(AppView.BLOG)} icon={<FileText size={20} />} label="Blog Content" />
            <NavButton active={view === AppView.ANALYTICS} onClick={() => setView(AppView.ANALYTICS)} icon={<BarChart3 size={20} />} label="Analytics" />
            <div className="pt-4 pb-1"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</span></div>
            <NavButton active={view === AppView.SETTINGS} onClick={() => setView(AppView.SETTINGS)} icon={<Settings size={20} />} label="Profile Settings" />
          </nav>
          <div className="p-4 border-t border-slate-100 space-y-3">
            {/* Live Consultant button - DISABLED until better TTS solution */}
            {/* <button id="live-btn" onClick={() => setIsLiveOpen(true)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm">
              <Mic size={18} className="animate-pulse" /> Live Consultant
            </button> */}
            <button onClick={() => setShowDiagnostics(true)} className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-800 px-2 py-2 text-sm rounded-lg hover:bg-slate-50">
              <Settings size={16} /> LLM Diagnostics
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-800 px-2 py-2 text-sm rounded-lg hover:bg-slate-50">
              <LogOut size={16} /> Logout / Reset
            </button>
          </div>
        </aside>
      )
      }

      {/* Main Content Area */}
      <main className={`
        flex-1 relative
        ${view === AppView.LANDING || view === AppView.ONBOARDING || view === AppView.AUTH ? 'min-h-full overflow-y-auto' : 'overflow-y-auto lg:overflow-hidden'} 
        ${!hasApiKey ? 'mt-6' : ''}
        ${showSidebar ? 'pt-14 lg:pt-0' : ''}
      `}>
        {renderContent()}
      </main>

      {/* Modals and Overlays */}
      <LiveAssistant isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />
      {view !== AppView.LANDING && view !== AppView.ONBOARDING && view !== AppView.AUTH && <ChatBot />}
      {showDiagnostics && <LLMDiagnostics onClose={() => setShowDiagnostics(false)} />}
    </div >
  );
}
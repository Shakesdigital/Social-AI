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
  Shield,
  Globe,
  ArrowRight,
  TrendingUp,
  Target,
  Sparkles
} from 'lucide-react';
import { AppView, CompanyProfile, ResearchReport, SocialPost, AutoPilotConfig, Lead } from './types';
import { LiveAssistant } from './components/LiveAssistant';
import { ChatBot } from './components/ChatBot';
import { LandingPage } from './components/LandingPage';
import { LeadsView } from './components/LeadsView';
import { EmailView } from './components/EmailView';
import { BlogView } from './components/BlogView';
import { CalendarView } from './components/CalendarView';
import { LLMDiagnostics } from './components/LLMDiagnostics';
import { generateMarketResearch, generateMarketingStrategy, generateContentTopics, generatePostCaption, generatePostImage, generateBatchContent } from './services/openaiService';
import { hasFreeLLMConfigured } from './services/freeLLMService';
import ReactMarkdown from 'react-markdown';

// Custom Shakes Logo (Small version for Sidebar)
const ShakesLogoSmall = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" className="text-brand-600" />
    <rect x="28" y="35" width="44" height="30" rx="3" stroke="currentColor" strokeWidth="4" className="text-slate-800" fill="transparent" />
    <line x1="28" y1="45" x2="72" y2="45" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
    <path d="M46 52 L56 57 L46 62 V52 Z" fill="currentColor" className="text-slate-800" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

// Branded Header for consistent look across the app
const BrandedHeader: React.FC<{
  profile?: CompanyProfile | null;
  onLogout?: () => void;
  onNavigateHome?: () => void;
  showLogin?: boolean;
}> = ({ profile, onLogout, onNavigateHome, showLogin }) => (
  <nav className="fixed top-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-md border-b border-slate-100 h-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
      <div className="flex justify-between items-center h-full">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
          <ShakesLogoSmall className="w-10 h-10" />
          <span className="font-bold text-xl text-slate-800">SocialAI</span>
        </div>

        <div className="flex items-center gap-4">
          {profile ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{profile.name}</p>
                <p className="text-xs text-slate-500 leading-tight">{profile.industry}</p>
              </div>
              <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold border border-brand-200">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="text-sm font-medium text-brand-600 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">
              Assistant Onboarding
            </div>
          )}
        </div>
      </div>
    </div>
  </nav>
);

// Branded Footer for consistent look across the app
const BrandedFooter: React.FC = () => (
  <footer className="bg-slate-900 pt-16 pb-8 border-t border-slate-800 text-slate-300 w-full mt-auto">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center gap-2 mb-6">
          <span className="p-1 bg-brand-600 text-white rounded font-bold text-sm">AI</span>
          <span className="font-bold text-xl text-white">SocialAI</span>
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
      <p>© 2025 SocialAI Inc. All rights reserved.</p>
      <div className="flex gap-6 mt-4 md:mt-0">
        <a href="#" className="hover:text-white transition-colors">Twitter</a>
        <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
        <a href="#" className="hover:text-white transition-colors">Instagram</a>
      </div>
    </div>
  </footer>
);


const Onboarding: React.FC<{ onComplete: (profile: CompanyProfile) => void; onBack?: () => void }> = ({ onComplete, onBack }) => {
  const [formData, setFormData] = useState<CompanyProfile>({
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
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-50 via-white to-brand-50 flex items-center justify-center px-4 py-16">
      {/* Background Decorations */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-30 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-30 -z-10"></div>

      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 border border-brand-200 text-brand-700 text-sm font-semibold mb-6">
            <Zap size={16} className="fill-current" /> Quick Setup • 2 Minutes
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Let's Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700">Profile</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            Tell us about your business and we'll create a personalized marketing strategy.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1.5 bg-slate-100">
            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 w-full rounded-r-full"></div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
            {/* Section 1: Basic Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">1</span>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all"
                    placeholder="e.g. Acme Inc."
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Industry</label>
                  <input
                    required
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all"
                    placeholder="e.g. Technology, Retail"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: About Business */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">2</span>
                About Your Business
              </h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">What do you do?</label>
                <textarea
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all min-h-[120px] resize-none"
                  placeholder="Describe your products, services, and what makes you unique..."
                />
              </div>
            </div>

            {/* Section 3: Marketing Details */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">3</span>
                Marketing Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Target Audience</label>
                  <input
                    required
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleChange}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all"
                    placeholder="e.g. Small business owners"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Brand Voice</label>
                  <input
                    required
                    name="brandVoice"
                    value={formData.brandVoice}
                    onChange={handleChange}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all"
                    placeholder="e.g. Professional, Friendly"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Marketing Goals</label>
                <input
                  required
                  name="goals"
                  value={formData.goals}
                  onChange={handleChange}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all"
                  placeholder="e.g. Increase brand awareness, drive sales"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold py-4 px-6 rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3 text-lg"
            >
              Launch My Assistant
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Shield size={16} className="text-green-500" /> Secure</span>
            <span className="flex items-center gap-1.5"><Zap size={16} className="text-brand-500" /> AI-Powered</span>
            <span className="flex items-center gap-1.5"><Globe size={16} className="text-blue-500" /> Free to Start</span>
          </div>
        </div>
      </div>
    </div>
  );
};


const Dashboard: React.FC<{ profile: CompanyProfile, onNavigate: (view: AppView) => void }> = ({ profile, onNavigate }) => {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Welcome Section */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-700 text-white px-8 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl font-bold border border-white/30">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Welcome back</p>
              <h1 className="text-3xl font-bold">{profile.name}</h1>
            </div>
          </div>
          <p className="text-white/80 text-lg max-w-xl">
            Your AI-powered marketing command center. Let's grow your business today.
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute right-40 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-8 mb-10 relative z-20">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">AI Ready</p>
                <p className="text-xs text-slate-500">Gemini Powered</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{profile.industry}</p>
                <p className="text-xs text-slate-500">Industry Focus</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 truncate max-w-[100px]">{profile.targetAudience.split(',')[0]}</p>
                <p className="text-xs text-slate-500">Target Audience</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 truncate max-w-[100px]">{profile.brandVoice.split(',')[0]}</p>
                <p className="text-xs text-slate-500">Brand Voice</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Social Media Marketing</h2>
              <p className="text-sm text-slate-500">Research, strategize, and schedule your content</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div onClick={() => onNavigate(AppView.RESEARCH)} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                <Search size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Market Research</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Discover trends, analyze competitors, and find opportunities.</p>
              <div className="mt-4 flex items-center text-blue-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Explore <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
            <div onClick={() => onNavigate(AppView.STRATEGY)} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-purple-200 hover:-translate-y-1 transition-all cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-purple-200">
                <Lightbulb size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Strategic Plan</h3>
              <p className="text-sm text-slate-500 leading-relaxed">AI-generated marketing strategies tailored to your brand.</p>
              <div className="mt-4 flex items-center text-purple-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Create <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
            <div onClick={() => onNavigate(AppView.CALENDAR)} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-green-200 hover:-translate-y-1 transition-all cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-green-200">
                <CalendarIcon size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Content Calendar</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Schedule posts and manage your content workflow.</p>
              <div className="mt-4 flex items-center text-green-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Schedule <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Digital Marketing Suite Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center text-white">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Digital Marketing Suite</h2>
              <p className="text-sm text-slate-500">Lead generation, outreach, and content creation</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div onClick={() => onNavigate(AppView.LEADS)} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-orange-200 hover:-translate-y-1 transition-all cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-orange-200">
                <Users size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Lead Research</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Find and research potential customers and partners.</p>
              <div className="mt-4 flex items-center text-orange-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Find Leads <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
            <div onClick={() => onNavigate(AppView.EMAIL)} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
                <Mail size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Email Marketing</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Create personalized outreach and nurture campaigns.</p>
              <div className="mt-4 flex items-center text-indigo-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Compose <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
            <div onClick={() => onNavigate(AppView.BLOG)} className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-pink-200 hover:-translate-y-1 transition-all cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-pink-200">
                <FileText size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Blog Content</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Generate SEO-optimized articles and blog posts.</p>
              <div className="mt-4 flex items-center text-pink-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Write <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Consultant CTA */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')]"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Mic size={28} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Live AI Consultant</h2>
                <p className="text-white/70 max-w-md">Talk directly to your AI marketing expert using voice. Get instant advice and brainstorm ideas.</p>
              </div>
            </div>
            <button
              onClick={() => document.getElementById('live-btn')?.click()}
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-4 rounded-xl font-bold hover:from-red-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 whitespace-nowrap"
            >
              <Mic size={20} /> Start Conversation
            </button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-gradient-to-br from-red-500/20 to-pink-600/20 rounded-full blur-3xl"></div>
        </div>
      </div>
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

  if (loading) return <div className="p-8 flex items-center justify-center h-full"><div className="text-brand-600 font-semibold animate-pulse">Analysing market with AI...</div></div>;
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Market Research</h1>
        <button onClick={() => runResearch()} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm">Regenerate</button>
      </div>
      {error && (
        <div className={`mb-4 p-4 rounded-lg ${error.includes('breather') ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
          {error.includes('breather') && <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></span>}
          {error}
        </div>
      )}
      {report && (
        <div className="flex gap-8">
          <div className="flex-1 bg-white p-8 rounded-xl shadow-sm prose prose-slate max-w-none">
            <ReactMarkdown>{report.rawContent}</ReactMarkdown>
          </div>
          {report.sources.length > 0 && (
            <div className="w-80 space-y-4">
              <h3 className="font-semibold text-slate-700">Sources</h3>
              {report.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-colors">
                  <div className="text-sm font-medium text-brand-600 mb-1 truncate">{s.title}</div>
                  <div className="text-xs text-slate-400 truncate">{s.uri}</div>
                </a>
              ))}
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

  if (loading) return <div className="flex flex-col items-center justify-center h-96 text-center"><p className="animate-pulse">Generating strategy...</p></div>;
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        {error && (
          <div className={`flex-1 mr-4 p-3 rounded-lg text-sm ${error.includes('breather') ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {error.includes('breather') && <span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></span>}
            {error}
          </div>
        )}
        <button onClick={() => fetchStrategy()} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm">Regenerate Strategy</button>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-sm prose prose-slate max-w-none"><ReactMarkdown>{strategy}</ReactMarkdown></div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [profile, setProfile] = useState<CompanyProfile | null>(() => {
    try {
      const saved = localStorage.getItem('socialai_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse profile", e);
      return null;
    }
  });

  const [view, setView] = useState<AppView>(() => {
    try {
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

  // Sync state: If profile is null, force view to Landing or Onboarding
  useEffect(() => {
    if (!profile && view !== AppView.LANDING && view !== AppView.ONBOARDING) {
      setView(AppView.LANDING);
    }
  }, [profile, view]);

  const handleOnboardingComplete = (p: CompanyProfile) => {
    setProfile(p);
    localStorage.setItem('socialai_profile', JSON.stringify(p));
    localStorage.removeItem('socialai_logged_out'); // Clear logged out flag
    setView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    // Don't delete data - just log out (preserve session for returning users)
    // Set a flag indicating the user has a profile but is logged out
    localStorage.setItem('socialai_logged_out', 'true');
    setProfile(null);
    setView(AppView.LANDING);
  };

  // ========================================
  // LIFTED STATE FOR COMPONENT PERSISTENCE
  // ========================================

  // Calendar state
  const [calendarState, setCalendarState] = useState(() => {
    try {
      const saved = localStorage.getItem('socialai_calendar_state');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Blog state
  const [blogState, setBlogState] = useState(() => {
    try {
      const saved = localStorage.getItem('socialai_blog_state');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Leads state
  const [leadsState, setLeadsState] = useState(() => {
    try {
      const saved = localStorage.getItem('socialai_leads_state');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Email state
  const [emailState, setEmailState] = useState(() => {
    try {
      const saved = localStorage.getItem('socialai_email_state');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Research state
  const [researchState, setResearchState] = useState(() => {
    try {
      const saved = localStorage.getItem('socialai_research_state');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Strategy state
  const [strategyState, setStrategyState] = useState(() => {
    try {
      const saved = localStorage.getItem('socialai_strategy_state');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Save states to localStorage when they change
  useEffect(() => {
    if (calendarState) {
      localStorage.setItem('socialai_calendar_state', JSON.stringify(calendarState));
    }
  }, [calendarState]);

  useEffect(() => {
    if (blogState) {
      localStorage.setItem('socialai_blog_state', JSON.stringify(blogState));
    }
  }, [blogState]);

  useEffect(() => {
    if (leadsState) {
      localStorage.setItem('socialai_leads_state', JSON.stringify(leadsState));
    }
  }, [leadsState]);

  useEffect(() => {
    if (emailState) {
      localStorage.setItem('socialai_email_state', JSON.stringify(emailState));
    }
  }, [emailState]);

  useEffect(() => {
    if (researchState) {
      localStorage.setItem('socialai_research_state', JSON.stringify(researchState));
    }
  }, [researchState]);

  useEffect(() => {
    if (strategyState) {
      localStorage.setItem('socialai_strategy_state', JSON.stringify(strategyState));
    }
  }, [strategyState]);

  const renderContent = () => {
    if (view === AppView.LANDING) {
      return (
        <LandingPage
          onGetStarted={() => setView(AppView.ONBOARDING)}
          onContinueAsUser={(p) => {
            setProfile(p);
            localStorage.removeItem('socialai_logged_out');
            setView(AppView.DASHBOARD);
          }}
        />
      );
    }
    if (!profile && view !== AppView.ONBOARDING) return null;
    switch (view) {
      case AppView.ONBOARDING: return <Onboarding onComplete={handleOnboardingComplete} onBack={() => setView(AppView.LANDING)} />;
      case AppView.DASHBOARD: return <Dashboard profile={profile!} onNavigate={setView} />;
      case AppView.RESEARCH: return <ResearchView profile={profile!} savedState={researchState} onStateChange={setResearchState} />;
      case AppView.STRATEGY: return <div className="p-8 h-full overflow-y-auto"><h1 className="text-2xl font-bold mb-4">Marketing Strategy</h1><StrategyWrapper profile={profile!} researchText={researchState?.report?.rawContent || ''} savedState={strategyState} onStateChange={setStrategyState} /></div>;
      case AppView.CALENDAR: return <CalendarView profile={profile!} savedState={calendarState} onStateChange={setCalendarState} />;
      case AppView.LEADS: return <LeadsView profile={profile!} savedState={leadsState} onStateChange={setLeadsState} onAddToEmailCampaign={(leads) => { setLeadsForEmail(leads); setView(AppView.EMAIL); }} />;
      case AppView.EMAIL: return <EmailView profile={profile!} leads={leadsForEmail} savedState={emailState} onStateChange={setEmailState} />;
      case AppView.BLOG: return <BlogView profile={profile!} savedState={blogState} onStateChange={setBlogState} />;
      default: return <div>Not Implemented</div>;
    }
  };

  const showSidebar = view !== AppView.LANDING && view !== AppView.ONBOARDING;

  // Final Layout with Global Branded Header and Footer
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      {/* API Key Warning Banner */}
      {!hasApiKey && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
          <AlertTriangle size={12} />
          WARNING: No LLM API Key configured. Please add VITE_GROQ_API_KEY to your Netlify Environment Variables.
        </div>
      )}

      {/* Branded Header (Visible everywhere except Landing Page which has its own) */}
      {view !== AppView.LANDING && (
        <BrandedHeader
          profile={profile}
          onLogout={handleLogout}
          onNavigateHome={() => setView(AppView.LANDING)}
        />
      )}

      {/* Main Body with Sidebar if applicable */}
      <div className={`flex flex-1 ${view !== AppView.LANDING ? 'pt-20' : ''}`}>
        {showSidebar && (
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 fixed top-20 bottom-0 z-40">
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
            </nav>
            <div className="p-4 border-t border-slate-100 space-y-2">
              <button id="live-btn" onClick={() => setIsLiveOpen(true)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all"><Mic size={20} className="animate-pulse" /> Live Consultant</button>
              <button onClick={() => setShowDiagnostics(true)} className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-800 px-2 py-1 text-sm"><Settings size={16} /> Diagnostics</button>
            </div>
          </aside>
        )}

        <main className={`flex-1 flex flex-col ${showSidebar ? 'ml-64' : ''}`}>
          <div className="flex-1">
            {renderContent()}
          </div>

          {/* Branded Footer (Visible everywhere except Landing Page which has its own) */}
          {view !== AppView.LANDING && <BrandedFooter />}
        </main>
      </div>

      <LiveAssistant isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />
      {view !== AppView.LANDING && view !== AppView.ONBOARDING && <ChatBot />}
      {showDiagnostics && <LLMDiagnostics onClose={() => setShowDiagnostics(false)} />}
    </div>
  );
}

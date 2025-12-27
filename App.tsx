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
  FileText
} from 'lucide-react';
import { AppView, CompanyProfile, ResearchReport, SocialPost, AutoPilotConfig, Lead } from './types';
import { LiveAssistant } from './components/LiveAssistant';
import { ChatBot } from './components/ChatBot';
import { LandingPage } from './components/LandingPage';
import { LeadsView } from './components/LeadsView';
import { EmailView } from './components/EmailView';
import { BlogView } from './components/BlogView';
import { CalendarView } from './components/CalendarView';
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

const Onboarding: React.FC<{ onComplete: (profile: CompanyProfile) => void }> = ({ onComplete }) => {
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
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to SocialAI</h1>
        <p className="text-slate-500 mb-8">Let's set up your business profile to generate tailored strategies.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input required name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Acme Inc." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
              <input required name="industry" value={formData.industry} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Technology, Retail, etc." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">What do you do?</label>
            <textarea required name="description" value={formData.description} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 h-24 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Describe your products or services..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
              <input required name="targetAudience" value={formData.targetAudience} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Millennials, Small Business Owners..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand Voice</label>
              <input required name="brandVoice" value={formData.brandVoice} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Professional, Witty, Friendly..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Marketing Goals</label>
            <input required name="goals" value={formData.goals} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Increase brand awareness, drive sales..." />
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition-colors">
            Initialize Assistant
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ profile: CompanyProfile, onNavigate: (view: AppView) => void }> = ({ profile, onNavigate }) => {
  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back, {profile.name}.</p>
      </header>

      {/* Social Media Section */}
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Social Media Marketing</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div onClick={() => onNavigate(AppView.RESEARCH)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4"><Search size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Market Research</h3>
          <p className="text-sm text-slate-500">View latest trends and competitor analysis.</p>
        </div>
        <div onClick={() => onNavigate(AppView.STRATEGY)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4"><Lightbulb size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Strategic Plan</h3>
          <p className="text-sm text-slate-500">Deep-dive marketing strategy generation.</p>
        </div>
        <div onClick={() => onNavigate(AppView.CALENDAR)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4"><CalendarIcon size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Content Calendar</h3>
          <p className="text-sm text-slate-500">Manage posts and schedule content.</p>
        </div>
      </div>

      {/* Digital Marketing Suite Section */}
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Digital Marketing Suite</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div onClick={() => onNavigate(AppView.LEADS)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4"><Users size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Lead Research</h3>
          <p className="text-sm text-slate-500">Find and research potential marketing leads.</p>
        </div>
        <div onClick={() => onNavigate(AppView.EMAIL)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4"><Mail size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Email Marketing</h3>
          <p className="text-sm text-slate-500">Create personalized outreach campaigns.</p>
        </div>
        <div onClick={() => onNavigate(AppView.BLOG)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center mb-4"><FileText size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Blog Content</h3>
          <p className="text-sm text-slate-500">Generate SEO-optimized blog posts.</p>
        </div>
      </div>

      <div className="bg-brand-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Need real-time advice?</h2>
          <p className="mb-6 opacity-90 max-w-lg">Talk directly to your AI marketing consultant using Gemini Live Native Audio.</p>
          <button onClick={() => document.getElementById('live-btn')?.click()} className="bg-white text-brand-900 px-6 py-2 rounded-lg font-semibold hover:bg-slate-100 inline-flex items-center gap-2">
            <Mic size={18} /> Start Conversation
          </button>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-800 to-transparent"></div>
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
  const report = savedState?.report || null;

  const setReport = (newReport: ResearchReport | null) => {
    if (onStateChange) {
      onStateChange({ report: newReport });
    }
  };

  const runResearch = async () => {
    setLoading(true);
    try {
      const result = await generateMarketResearch(profile);
      setReport({ rawContent: result.text, sources: result.sources, lastUpdated: new Date().toISOString() });
    } catch (e: any) {
      alert(`Research Failed: ${e.message}. Ensure VITE_API_KEY is set in Netlify.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!report) runResearch();
  }, []);

  if (loading) return <div className="p-8 flex items-center justify-center h-full"><div className="text-brand-600 font-semibold animate-pulse">Analysing market with Google Search...</div></div>;
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Market Research</h1>
        <button onClick={runResearch} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm">Regenerate</button>
      </div>
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

  const setStrategy = (newStrategy: string) => {
    setStrategyLocal(newStrategy);
    if (onStateChange) {
      onStateChange({ strategy: newStrategy });
    }
  };

  useEffect(() => {
    // Only fetch if we don't have a saved strategy
    if (savedState?.strategy) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const res = await generateMarketingStrategy(profile, researchText || "No prior research.");
        setStrategy(res);
      } catch (e: any) {
        setStrategy(`Failed to generate strategy: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await generateMarketingStrategy(profile, researchText || "No prior research.");
      setStrategy(res);
    } catch (e: any) {
      setStrategy(`Failed to generate strategy: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center h-96 text-center"><p>Thinking deeply...</p></div>;
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={handleRegenerate} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm">Regenerate Strategy</button>
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
      // Critical Fix: Only go to Dashboard if profile actually exists
      const hasProfile = !!localStorage.getItem('socialai_profile');
      return hasProfile ? AppView.DASHBOARD : AppView.LANDING;
    } catch (e) { return AppView.LANDING; }
  });

  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    // Check if any LLM provider is configured
    const hasLLM = hasFreeLLMConfigured();
    if (!hasLLM) setHasApiKey(false);
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
    setView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    localStorage.removeItem('socialai_profile');
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
    if (view === AppView.LANDING) return <LandingPage onGetStarted={() => setView(AppView.ONBOARDING)} />;
    if (!profile && view !== AppView.ONBOARDING) return null;
    switch (view) {
      case AppView.ONBOARDING: return <Onboarding onComplete={handleOnboardingComplete} />;
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

  return (
    <div className="flex h-screen bg-slate-50">
      {/* API Key Warning Banner */}
      {!hasApiKey && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
          <AlertTriangle size={12} />
          WARNING: No LLM API Key configured. Please add VITE_GROQ_API_KEY to your Netlify Environment Variables.
        </div>
      )}

      {showSidebar && (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
              <ShakesLogoSmall className="w-8 h-8" /> <span>SocialAI</span>
            </div>
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
          </nav>
          <div className="p-4 border-t border-slate-100 space-y-4">
            <button id="live-btn" onClick={() => setIsLiveOpen(true)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all"><Mic size={20} className="animate-pulse" /> Live Consultant</button>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-800 px-2 py-1 text-sm"><LogOut size={16} /> Logout / Reset</button>
          </div>
        </aside>
      )}
      <main className={`flex-1 overflow-hidden relative ${view === AppView.LANDING ? 'h-full overflow-y-auto' : ''} ${!hasApiKey ? 'mt-6' : ''}`}>{renderContent()}</main>
      <LiveAssistant isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />
      {view !== AppView.LANDING && view !== AppView.ONBOARDING && <ChatBot />}
    </div>
  );
}
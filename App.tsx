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
  AlertTriangle
} from 'lucide-react';
import { AppView, CompanyProfile, ResearchReport, SocialPost, AutoPilotConfig } from './types';
import { LiveAssistant } from './components/LiveAssistant';
import { ChatBot } from './components/ChatBot';
import { LandingPage } from './components/LandingPage';
import { generateMarketResearch, generateMarketingStrategy, generateContentTopics, generatePostCaption, generatePostImage, generateBatchContent } from './services/openaiService';
import ReactMarkdown from 'react-markdown';

// Custom Shakes Logo (Small version for Sidebar)
const ShakesLogoSmall = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" className="text-brand-600" />
    <rect x="28" y="35" width="44" height="30" rx="3" stroke="currentColor" strokeWidth="4" className="text-slate-800" fill="transparent"/>
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
    <div className="p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back, {profile.name}.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div onClick={() => onNavigate(AppView.RESEARCH)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4"><Search size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Market Research</h3>
          <p className="text-sm text-slate-500">View latest trends and competitor analysis powered by Google Search.</p>
        </div>
        <div onClick={() => onNavigate(AppView.STRATEGY)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4"><Lightbulb size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Strategic Plan</h3>
          <p className="text-sm text-slate-500">Deep-dive marketing strategy generated by reasoning models.</p>
        </div>
        <div onClick={() => onNavigate(AppView.CALENDAR)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4"><CalendarIcon size={24} /></div>
          <h3 className="text-lg font-semibold mb-1">Content Calendar</h3>
          <p className="text-sm text-slate-500">Manage posts, generate content, and schedule for platforms.</p>
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

const ResearchView: React.FC<{ profile: CompanyProfile, report: ResearchReport | null, setReport: any }> = ({ profile, report, setReport }) => {
  const [loading, setLoading] = useState(false);
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

const CalendarView: React.FC<{ profile: CompanyProfile }> = ({ profile }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showAutoPilotSettings, setShowAutoPilotSettings] = useState(false);
  const [autoPilotConfig, setAutoPilotConfig] = useState<AutoPilotConfig>({
      enabled: false,
      cadence: 'Weekly',
      postingFrequency: { Instagram: 2, LinkedIn: 2, Twitter: 0, Facebook: 1 },
      autoApprove: false
  });
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [pendingPosts, setPendingPosts] = useState<SocialPost[]>([]);
  const [showReviewDashboard, setShowReviewDashboard] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creatorState, setCreatorState] = useState({
      platform: 'Instagram',
      caption: '',
      loadingCaption: false,
      imagePrompt: '',
      imageSize: '1K' as '1K'|'2K'|'4K',
      generatedImage: '',
      loadingImage: false
  });

  const generateTopics = async () => {
    setGeneratingTopics(true);
    try {
        const newTopics = await generateContentTopics(profile);
        setTopics(newTopics);
    } catch(e: any) { alert(`Failed: ${e.message}`); }
    setGeneratingTopics(false);
  };
  const openCreator = (topic: string) => {
    setSelectedTopic(topic);
    setCreatorState({ ...creatorState, caption: '', generatedImage: '', imagePrompt: `High quality professional photo for ${topic}` });
    setIsCreatorOpen(true);
    handleGenCaption(topic);
  };
  const handleGenCaption = async (topic: string) => {
      setCreatorState(prev => ({ ...prev, loadingCaption: true }));
      const cap = await generatePostCaption(profile, topic, creatorState.platform);
      setCreatorState(prev => ({ ...prev, caption: cap, loadingCaption: false }));
  };
  const handleGenImage = async () => {
      if (!creatorState.imagePrompt) return;
      setCreatorState(prev => ({ ...prev, loadingImage: true }));
      try {
          const img = await generatePostImage(creatorState.imagePrompt, { size: creatorState.imageSize, aspectRatio: '1:1' });
          setCreatorState(prev => ({ ...prev, generatedImage: img }));
      } catch (e) {
          alert("Image generation failed");
      } finally {
          setCreatorState(prev => ({ ...prev, loadingImage: false }));
      }
  };
  const savePost = () => {
      const newPost: SocialPost = {
          id: Date.now().toString(),
          date: new Date(),
          platform: creatorState.platform as any,
          topic: selectedTopic || 'Custom',
          caption: creatorState.caption,
          imageUrl: creatorState.generatedImage,
          status: 'Scheduled'
      };
      setPosts([...posts, newPost]);
      setIsCreatorOpen(false);
  };
  const handleRunAutoPilot = async () => {
      setShowAutoPilotSettings(false);
      setIsAutoGenerating(true);
      try {
          const generatedPosts = await generateBatchContent(profile, autoPilotConfig);
          if (autoPilotConfig.autoApprove) {
              setPosts(prev => [...prev, ...generatedPosts.map(p => ({ ...p, status: 'Scheduled' } as SocialPost))]);
          } else {
              setPendingPosts(generatedPosts);
              setShowReviewDashboard(true);
          }
      } catch (e: any) {
          alert(`Auto-Pilot failed: ${e.message}`);
      } finally {
          setIsAutoGenerating(false);
          setAutoPilotConfig(prev => ({ ...prev, enabled: true }));
      }
  };
  const handleApproveAll = () => {
      setPosts(prev => [...prev, ...pendingPosts.map(p => ({ ...p, status: 'Scheduled' } as SocialPost))]);
      setPendingPosts([]);
      setShowReviewDashboard(false);
  };
  const handleRejectAll = () => {
      setPendingPosts([]);
      setShowReviewDashboard(false);
  };
  const handleApproveSingle = (id: string) => {
      const post = pendingPosts.find(p => p.id === id);
      if (post) {
          setPosts(prev => [...prev, { ...post, status: 'Scheduled' }]);
          setPendingPosts(prev => prev.filter(p => p.id !== id));
      }
      if (pendingPosts.length <= 1) setShowReviewDashboard(false);
  };
  const handleRejectSingle = (id: string) => {
      setPendingPosts(prev => prev.filter(p => p.id !== id));
      if (pendingPosts.length <= 1) setShowReviewDashboard(false);
  };
  const handleGeneratePendingImage = async (id: string, prompt: string) => {
      try {
        const img = await generatePostImage(prompt, { size: '1K', aspectRatio: '1:1' });
        setPendingPosts(prev => prev.map(p => p.id === id ? { ...p, imageUrl: img } : p));
      } catch(e) { alert("Failed to generate image"); }
  };

  return (
    <div className="p-8 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Content Calendar</h1>
        <div className="flex gap-2">
            <button onClick={() => setShowAutoPilotSettings(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${autoPilotConfig.enabled ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                <Zap size={18} className={autoPilotConfig.enabled ? 'fill-current' : ''} />
                {autoPilotConfig.enabled ? 'Auto-Pilot Active' : 'Enable Auto-Pilot'}
            </button>
            <button onClick={generateTopics} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"><PlusCircle size={18} /> {generatingTopics ? 'Thinking...' : 'Generate Ideas'}</button>
        </div>
      </div>
      <div className="flex gap-8 h-full overflow-hidden">
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pb-20">
            <h3 className="font-semibold text-slate-700">Topic Ideas</h3>
            {topics.length === 0 && <div className="text-slate-400 italic text-sm">No topics yet. Click generate.</div>}
            {topics.map((t, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group">
                    <span className="text-sm text-slate-800">{t}</span>
                    <button onClick={() => openCreator(t)} className="text-brand-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Create</button>
                </div>
            ))}
        </div>
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6 overflow-y-auto relative">
            {pendingPosts.length > 0 && !showReviewDashboard && (
                 <div className="mb-4 bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex justify-between items-center">
                     <span className="text-indigo-800 font-medium">{pendingPosts.length} posts pending approval.</span>
                     <button onClick={() => setShowReviewDashboard(true)} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded">Review Now</button>
                 </div>
            )}
            <h3 className="font-semibold text-slate-700 mb-4">Upcoming Posts</h3>
            <div className="space-y-4">
                {posts.length === 0 && <div className="text-slate-400 text-center mt-10">No scheduled posts.</div>}
                {posts.map(post => (
                    <div key={post.id} className="flex gap-4 p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                        {post.imageUrl ? <img src={post.imageUrl} alt="Post" className="w-24 h-24 object-cover rounded-md bg-slate-100" /> : <div className="w-24 h-24 bg-slate-100 rounded-md flex items-center justify-center text-slate-300"><ImageIcon size={24}/></div>}
                        <div className="flex-1">
                            <div className="flex justify-between mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' : post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>{post.platform}</span>
                                <span className="text-xs text-slate-400">{post.date instanceof Date ? post.date.toLocaleDateString() : new Date(post.date).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-medium text-slate-800 mb-1">{post.topic}</h4>
                            <p className="text-sm text-slate-500 line-clamp-2">{post.caption}</p>
                        </div>
                        <div className="flex items-center px-4"><span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Scheduled</span></div>
                    </div>
                ))}
            </div>
        </div>
      </div>
      {isAutoGenerating && (
         <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
             <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <h2 className="text-2xl font-bold text-slate-800">Auto-Pilot Running...</h2>
         </div>
      )}
      {showAutoPilotSettings && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
                 <button onClick={() => setShowAutoPilotSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                 <div className="space-y-6">
                     <h2 className="text-2xl font-bold">Auto-Pilot Settings</h2>
                     <button onClick={handleRunAutoPilot} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold">Run Now</button>
                 </div>
             </div>
          </div>
      )}
      {showReviewDashboard && (
          <div className="absolute inset-0 bg-slate-50 z-40 p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-50 py-4 z-10 border-b border-slate-200">
                      <h1 className="text-2xl font-bold text-indigo-900">Review Auto-Generated Content</h1>
                      <div className="flex gap-3">
                          <button onClick={handleRejectAll} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg">Reject All</button>
                          <button onClick={handleApproveAll} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Approve All</button>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                      {pendingPosts.map(post => (
                          <div key={post.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                  <span className="text-xs px-2 py-1 rounded-full font-bold bg-slate-200">{post.platform}</span>
                                  <div className="flex gap-2">
                                      <button onClick={() => handleRejectSingle(post.id)} className="p-1.5 text-slate-400 hover:text-red-500"><XCircle size={18}/></button>
                                      <button onClick={() => handleApproveSingle(post.id)} className="p-1.5 text-slate-400 hover:text-green-500"><CheckCircle size={18}/></button>
                                  </div>
                              </div>
                              <div className="p-5 flex gap-5">
                                  <div className="w-32 flex-shrink-0 flex flex-col gap-2">
                                      <div className="w-32 h-32 bg-slate-100 rounded-lg overflow-hidden relative">
                                          {post.imageUrl ? <img src={post.imageUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs text-slate-400">No Visual</div>}
                                      </div>
                                      {!post.imageUrl && post.imagePrompt && <button onClick={() => handleGeneratePendingImage(post.id, post.imagePrompt!)} className="w-full py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded">Generate Art</button>}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                      <p className="text-sm font-medium text-slate-800">{post.topic}</p>
                                      <textarea defaultValue={post.caption} className="w-full mt-1 p-2 text-sm text-slate-600 border border-slate-200 rounded-md h-24 bg-transparent"/>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      {isCreatorOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl flex gap-8">
                  <div className="flex-1 space-y-6">
                      <h2 className="text-xl font-bold">Create Post</h2>
                      <button onClick={savePost} className="px-6 py-2 bg-brand-600 text-white rounded-lg">Schedule</button>
                      <button onClick={() => setIsCreatorOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                  </div>
              </div>
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

const StrategyWrapper: React.FC<{ profile: CompanyProfile, researchText: string }> = ({ profile, researchText }) => {
    const [strategy, setStrategy] = useState<string>('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
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
    if (loading) return <div className="flex flex-col items-center justify-center h-96 text-center"><p>Thinking deeply...</p></div>;
    return <div className="bg-white p-8 rounded-xl shadow-sm prose prose-slate max-w-none"><ReactMarkdown>{strategy}</ReactMarkdown></div>;
};

// --- Main App Component ---

export default function App() {
  const [profile, setProfile] = useState<CompanyProfile | null>(() => {
    try {
        const saved = localStorage.getItem('socialai_profile');
        return saved ? JSON.parse(saved) : null;
    } catch(e) {
        console.error("Failed to parse profile", e);
        return null;
    }
  });
  
  const [view, setView] = useState<AppView>(() => {
     try {
         // Critical Fix: Only go to Dashboard if profile actually exists
         const hasProfile = !!localStorage.getItem('socialai_profile');
         return hasProfile ? AppView.DASHBOARD : AppView.LANDING;
     } catch(e) { return AppView.LANDING; }
  });

  const [hasApiKey, setHasApiKey] = useState(true);
  
  useEffect(() => {
      // Check for API key on mount to warn user
      const key = import.meta.env.VITE_OPENAI_API_KEY;
      if (!key) setHasApiKey(false);
  }, []);
  
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

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

  const renderContent = () => {
    if (view === AppView.LANDING) return <LandingPage onGetStarted={() => setView(AppView.ONBOARDING)} />;
    if (!profile && view !== AppView.ONBOARDING) return null; // Should be handled by useEffect, but safe guard
    switch (view) {
      case AppView.ONBOARDING: return <Onboarding onComplete={handleOnboardingComplete} />;
      case AppView.DASHBOARD: return <Dashboard profile={profile!} onNavigate={setView} />;
      case AppView.RESEARCH: return <ResearchView profile={profile!} report={report} setReport={setReport} />;
      case AppView.STRATEGY: return <div className="p-8 h-full overflow-y-auto"><h1 className="text-2xl font-bold mb-4">Marketing Strategy</h1><StrategyWrapper profile={profile!} researchText={report?.rawContent || ''} /></div>;
      case AppView.CALENDAR: return <CalendarView profile={profile!} />;
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
              WARNING: OpenAI API Key is missing. Please add VITE_OPENAI_API_KEY to your Netlify Environment Variables.
          </div>
      )}

      {showSidebar && (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
               <ShakesLogoSmall className="w-8 h-8"/> <span>SocialAI</span>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavButton active={view === AppView.DASHBOARD} onClick={() => setView(AppView.DASHBOARD)} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
            <NavButton active={view === AppView.RESEARCH} onClick={() => setView(AppView.RESEARCH)} icon={<Search size={20}/>} label="Market Research" />
            <NavButton active={view === AppView.STRATEGY} onClick={() => setView(AppView.STRATEGY)} icon={<Lightbulb size={20}/>} label="Strategy (Reasoning)" />
            <NavButton active={view === AppView.CALENDAR} onClick={() => setView(AppView.CALENDAR)} icon={<CalendarIcon size={20}/>} label="Content Calendar" />
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
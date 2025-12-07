
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
  LogOut
} from 'lucide-react';
import { AppView, CompanyProfile, ResearchReport, SocialPost, AutoPilotConfig } from './types';
import { LiveAssistant } from './components/LiveAssistant';
import { ChatBot } from './components/ChatBot';
import { LandingPage } from './components/LandingPage';
import { generateMarketResearch, generateMarketingStrategy, generateContentTopics, generatePostCaption, generatePostImage, generateBatchContent } from './services/geminiService';
import ReactMarkdown from 'react-markdown';

// --- Subcomponents for Views ---

// 1. Onboarding View
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
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to SocialAI</h1>
        <p className="text-slate-500 mb-8">Let's set up your business profile to generate tailored strategies.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
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

          <div className="grid grid-cols-2 gap-6">
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

// 2. Dashboard View
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

// 3. Research View
const ResearchView: React.FC<{ profile: CompanyProfile, report: ResearchReport | null, setReport: any }> = ({ profile, report, setReport }) => {
  const [loading, setLoading] = useState(false);

  const runResearch = async () => {
    setLoading(true);
    try {
      const result = await generateMarketResearch(profile);
      setReport({ rawContent: result.text, sources: result.sources, lastUpdated: new Date().toISOString() });
    } catch (e) {
      alert("Failed to generate research.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!report) runResearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

// 4. Calendar & Post Creation
const CalendarView: React.FC<{ profile: CompanyProfile }> = ({ profile }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Auto-Pilot State
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

  // Post Creator State
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
    const newTopics = await generateContentTopics(profile);
    setTopics(newTopics);
    setGeneratingTopics(false);
  };

  const openCreator = (topic: string) => {
    setSelectedTopic(topic);
    setCreatorState({ ...creatorState, caption: '', generatedImage: '', imagePrompt: `High quality professional photo for ${topic}` });
    setIsCreatorOpen(true);
    // Auto generate caption
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

  // --- Auto-Pilot Handlers ---
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
      } catch (e) {
          alert("Auto-Pilot generation failed. Try fewer posts.");
      } finally {
          setIsAutoGenerating(false);
          // Ensure enabled is on
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
      // Find post and update loading state (simulated by forcing update)
      // Real app would have per-card loading state.
      // For demo, we block ui slightly
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
            <button 
                onClick={() => setShowAutoPilotSettings(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${autoPilotConfig.enabled ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
                <Zap size={18} className={autoPilotConfig.enabled ? 'fill-current' : ''} />
                {autoPilotConfig.enabled ? 'Auto-Pilot Active' : 'Enable Auto-Pilot'}
            </button>
            <button onClick={generateTopics} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
                <PlusCircle size={18} /> {generatingTopics ? 'Thinking...' : 'Generate Ideas'}
            </button>
        </div>
      </div>

      <div className="flex gap-8 h-full overflow-hidden">
        {/* Ideas Column */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pb-20">
            <h3 className="font-semibold text-slate-700">Topic Ideas (Flash Lite)</h3>
            {topics.length === 0 && <div className="text-slate-400 italic text-sm">No topics yet. Click generate.</div>}
            {topics.map((t, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group">
                    <span className="text-sm text-slate-800">{t}</span>
                    <button onClick={() => openCreator(t)} className="text-brand-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Create</button>
                </div>
            ))}
        </div>

        {/* Calendar Grid */}
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
                        {post.imageUrl ? (
                            <img src={post.imageUrl} alt="Post" className="w-24 h-24 object-cover rounded-md bg-slate-100" />
                        ) : (
                            <div className="w-24 h-24 bg-slate-100 rounded-md flex items-center justify-center text-slate-300"><ImageIcon size={24}/></div>
                        )}
                        <div className="flex-1">
                            <div className="flex justify-between mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' : post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>{post.platform}</span>
                                <span className="text-xs text-slate-400">{post.date.toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-medium text-slate-800 mb-1">{post.topic}</h4>
                            <p className="text-sm text-slate-500 line-clamp-2">{post.caption}</p>
                        </div>
                        <div className="flex items-center px-4">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Scheduled</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Auto-Pilot Loading Overlay */}
      {isAutoGenerating && (
         <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
             <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <h2 className="text-2xl font-bold text-slate-800">Auto-Pilot Running...</h2>
             <p className="text-slate-500 mt-2">Generating topics, writing captions, and planning visuals.</p>
         </div>
      )}

      {/* Auto-Pilot Settings Modal */}
      {showAutoPilotSettings && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="text-indigo-600" /> Auto-Pilot Settings</h2>
                     <button onClick={() => setShowAutoPilotSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                 </div>
                 
                 <div className="space-y-6">
                     <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                         <div>
                             <h3 className="font-medium">Enable Auto-Pilot</h3>
                             <p className="text-sm text-slate-500">Automatically generate posts periodically.</p>
                         </div>
                         <div 
                            onClick={() => setAutoPilotConfig({...autoPilotConfig, enabled: !autoPilotConfig.enabled})}
                            className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${autoPilotConfig.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                         >
                             <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${autoPilotConfig.enabled ? 'translate-x-6' : ''}`}></div>
                         </div>
                     </div>

                     <div>
                         <label className="block text-sm font-medium mb-2">Cadence</label>
                         <div className="flex gap-4">
                             {['Weekly', 'Monthly'].map(c => (
                                 <button 
                                    key={c}
                                    onClick={() => setAutoPilotConfig({...autoPilotConfig, cadence: c as any})}
                                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${autoPilotConfig.cadence === c ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                 >
                                     {c}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div>
                         <label className="block text-sm font-medium mb-3">Posts per {autoPilotConfig.cadence.toLowerCase()}</label>
                         <div className="space-y-3">
                             {Object.keys(autoPilotConfig.postingFrequency).map(platform => (
                                 <div key={platform} className="flex items-center gap-4">
                                     <span className="w-24 text-sm text-slate-600">{platform}</span>
                                     <input 
                                        type="range" min="0" max="10" 
                                        value={(autoPilotConfig.postingFrequency as any)[platform]}
                                        onChange={(e) => setAutoPilotConfig({
                                            ...autoPilotConfig, 
                                            postingFrequency: {
                                                ...autoPilotConfig.postingFrequency,
                                                [platform]: parseInt(e.target.value)
                                            }
                                        })}
                                        className="flex-1 accent-indigo-600"
                                     />
                                     <span className="w-6 text-center text-sm font-bold">{(autoPilotConfig.postingFrequency as any)[platform]}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                     
                     <div className="flex items-center gap-2 mt-4">
                         <input 
                            type="checkbox" 
                            id="autoApprove"
                            checked={autoPilotConfig.autoApprove}
                            onChange={(e) => setAutoPilotConfig({...autoPilotConfig, autoApprove: e.target.checked})}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                         />
                         <label htmlFor="autoApprove" className="text-sm text-slate-700">Auto-approve generated posts (Skip review)</label>
                     </div>

                     <button 
                        onClick={handleRunAutoPilot}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all mt-4"
                     >
                         Save & Run Now
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* Review Dashboard Overlay */}
      {showReviewDashboard && (
          <div className="absolute inset-0 bg-slate-50 z-40 p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-50 py-4 z-10 border-b border-slate-200">
                      <div>
                          <h1 className="text-2xl font-bold text-indigo-900">Review Auto-Generated Content</h1>
                          <p className="text-slate-500">{pendingPosts.length} posts waiting for your approval</p>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={handleRejectAll} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">Reject All</button>
                          <button onClick={handleApproveAll} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md font-medium">Approve All</button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                      {pendingPosts.map(post => (
                          <div key={post.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                  <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' : post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>{post.platform}</span>
                                      <span className="text-xs text-slate-500">{post.date.toDateString()}</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => handleRejectSingle(post.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><XCircle size={18}/></button>
                                      <button onClick={() => handleApproveSingle(post.id)} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded"><CheckCircle size={18}/></button>
                                  </div>
                              </div>
                              
                              <div className="p-5 flex gap-5">
                                  {/* Image Section */}
                                  <div className="w-32 flex-shrink-0 flex flex-col gap-2">
                                      <div className="w-32 h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group-hover:border-indigo-100 transition-colors">
                                          {post.imageUrl ? (
                                              <img src={post.imageUrl} alt="Generated" className="w-full h-full object-cover" />
                                          ) : (
                                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-2">
                                                  <ImageIcon size={20} className="mb-1" />
                                                  <span>{post.imagePrompt ? "Prompt Ready" : "No Visual"}</span>
                                              </div>
                                          )}
                                      </div>
                                      {!post.imageUrl && post.imagePrompt && (
                                          <button 
                                            onClick={() => handleGeneratePendingImage(post.id, post.imagePrompt!)}
                                            className="w-full py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded hover:bg-indigo-100"
                                          >
                                              Generate Art
                                          </button>
                                      )}
                                  </div>

                                  {/* Content Section */}
                                  <div className="flex-1 space-y-3">
                                      <div>
                                          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Topic</span>
                                          <p className="text-sm font-medium text-slate-800">{post.topic}</p>
                                      </div>
                                      <div>
                                          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Caption</span>
                                          <textarea 
                                            defaultValue={post.caption}
                                            className="w-full mt-1 p-2 text-sm text-slate-600 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-100 outline-none resize-none h-24 bg-transparent"
                                          />
                                      </div>
                                      {post.imagePrompt && (
                                          <div className="pt-2 border-t border-slate-100">
                                              <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Visual Prompt</span>
                                              <p className="text-xs text-slate-500 italic truncate">{post.imagePrompt}</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Post Creator Modal (Keep existing logic) */}
      {isCreatorOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl flex gap-8">
                  {/* Left: Text */}
                  <div className="flex-1 space-y-6">
                      <h2 className="text-xl font-bold">Create Post</h2>
                      <div>
                          <label className="block text-sm font-medium mb-1">Platform</label>
                          <select 
                            value={creatorState.platform} 
                            onChange={(e) => setCreatorState({...creatorState, platform: e.target.value})}
                            className="w-full border p-2 rounded-lg"
                          >
                              <option>Instagram</option>
                              <option>LinkedIn</option>
                              <option>Twitter</option>
                              <option>Facebook</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Caption (Gemini 3 Pro)</label>
                          <textarea 
                            value={creatorState.caption}
                            onChange={(e) => setCreatorState({...creatorState, caption: e.target.value})}
                            className="w-full border p-2 rounded-lg h-40 text-sm"
                            disabled={creatorState.loadingCaption}
                          />
                          {creatorState.loadingCaption && <div className="text-xs text-brand-600 animate-pulse mt-1">Writing caption...</div>}
                          <button onClick={() => selectedTopic && handleGenCaption(selectedTopic)} className="text-xs text-brand-600 font-medium mt-1">Regenerate</button>
                      </div>
                  </div>

                  {/* Right: Image */}
                  <div className="flex-1 space-y-6 border-l pl-8">
                       <div>
                          <label className="block text-sm font-medium mb-1">Image Prompt</label>
                          <textarea 
                            value={creatorState.imagePrompt}
                            onChange={(e) => setCreatorState({...creatorState, imagePrompt: e.target.value})}
                            className="w-full border p-2 rounded-lg h-20 text-sm"
                          />
                       </div>
                       <div className="flex items-center gap-4">
                           <select 
                                value={creatorState.imageSize}
                                onChange={(e) => setCreatorState({...creatorState, imageSize: e.target.value as any})}
                                className="border p-2 rounded-lg text-sm"
                            >
                               <option value="1K">1K</option>
                               <option value="2K">2K</option>
                               <option value="4K">4K</option>
                           </select>
                           <button 
                                onClick={handleGenImage}
                                disabled={creatorState.loadingImage}
                                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
                           >
                               {creatorState.loadingImage ? 'Generating...' : 'Generate Image'}
                           </button>
                       </div>

                       <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                           {creatorState.generatedImage ? (
                               <img src={creatorState.generatedImage} alt="Generated" className="w-full h-full object-contain" />
                           ) : (
                               <div className="text-slate-400 text-sm">Preview Area</div>
                           )}
                       </div>

                       <div className="flex justify-end gap-3 pt-4">
                           <button onClick={() => setIsCreatorOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                           <button onClick={savePost} className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Schedule Post</button>
                       </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};


// --- Main App Component ---

export default function App() {
  const [profile, setProfile] = useState<CompanyProfile | null>(() => {
    const saved = localStorage.getItem('socialai_profile');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [view, setView] = useState<AppView>(() => {
     return localStorage.getItem('socialai_profile') ? AppView.DASHBOARD : AppView.LANDING;
  });
  
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

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
    // Landing page is public
    if (view === AppView.LANDING) {
        return <LandingPage onGetStarted={() => setView(AppView.ONBOARDING)} />;
    }

    // Require profile for app views
    if (!profile && view !== AppView.ONBOARDING) return null;

    switch (view) {
      case AppView.ONBOARDING:
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case AppView.DASHBOARD:
        return <Dashboard profile={profile!} onNavigate={setView} />;
      case AppView.RESEARCH:
        return <ResearchView profile={profile!} report={report} setReport={setReport} />;
      case AppView.STRATEGY:
        // Re-using a simple markdown view for strategy for brevity, but logic is in geminiService
        return (
            <div className="p-8 h-full overflow-y-auto">
                <h1 className="text-2xl font-bold mb-4">Marketing Strategy</h1>
                <StrategyWrapper profile={profile!} researchText={report?.rawContent || ''} />
            </div>
        );
      case AppView.CALENDAR:
        return <CalendarView profile={profile!} />;
      default:
        return <div>Not Implemented</div>;
    }
  };

  // Determine if we should show the sidebar
  const showSidebar = view !== AppView.LANDING && view !== AppView.ONBOARDING;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
               <span className="p-1 bg-brand-600 text-white rounded">AI</span> SocialAI
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavButton active={view === AppView.DASHBOARD} onClick={() => setView(AppView.DASHBOARD)} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
            <NavButton active={view === AppView.RESEARCH} onClick={() => setView(AppView.RESEARCH)} icon={<Search size={20}/>} label="Market Research" />
            <NavButton active={view === AppView.STRATEGY} onClick={() => setView(AppView.STRATEGY)} icon={<Lightbulb size={20}/>} label="Strategy (Reasoning)" />
            <NavButton active={view === AppView.CALENDAR} onClick={() => setView(AppView.CALENDAR)} icon={<CalendarIcon size={20}/>} label="Content Calendar" />
          </nav>
          
          <div className="p-4 border-t border-slate-100 space-y-4">
             <button 
                id="live-btn"
                onClick={() => setIsLiveOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
             >
                <Mic size={20} className="animate-pulse" /> Live Consultant
             </button>
             
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-800 px-2 py-1 text-sm"
             >
                <LogOut size={16} /> Logout / Reset
             </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden relative ${view === AppView.LANDING ? 'h-full overflow-y-auto' : ''}`}>
        {renderContent()}
      </main>

      {/* Overlays */}
      <LiveAssistant isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />
      
      {/* Chatbot - only show on dashboard/app views */}
      {view !== AppView.LANDING && view !== AppView.ONBOARDING && <ChatBot />}
    </div>
  );
}

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

// Helper for Strategy Loading
const StrategyWrapper: React.FC<{ profile: CompanyProfile, researchText: string }> = ({ profile, researchText }) => {
    const [strategy, setStrategy] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                // If no research, generate it on fly or just pass empty
                const res = await generateMarketingStrategy(profile, researchText || "No prior research.");
                setStrategy(res);
            } catch (e) {
                setStrategy("Failed to generate strategy.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium text-slate-700">Thinking deeply...</p>
            <p className="text-sm text-slate-500">Gemini 3 Pro is analyzing your goals (Budget: 32k tokens)</p>
        </div>
    );

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm prose prose-slate max-w-none">
            <ReactMarkdown>{strategy}</ReactMarkdown>
        </div>
    );
};

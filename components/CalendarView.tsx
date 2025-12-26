import React, { useState } from 'react';
import {
    Zap,
    PlusCircle,
    ImageIcon,
    X,
    XCircle,
    CheckCircle,
    Image as LucideImage,
    Sparkles
} from 'lucide-react';
import { CompanyProfile, SocialPost, AutoPilotConfig } from '../types';
import {
    generateContentTopics,
    generatePostCaption,
    generatePostImage,
    generateBatchContent
} from '../services/openaiService';

interface CalendarViewProps {
    profile: CompanyProfile;
}

// Social platforms configuration
const SOCIAL_PLATFORMS = [
    { id: 'Instagram', name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '📸' },
    { id: 'Facebook', name: 'Facebook', color: 'bg-blue-600', icon: '👤' },
    { id: 'LinkedIn', name: 'LinkedIn', color: 'bg-blue-700', icon: '💼' },
    { id: 'Twitter', name: 'X (Twitter)', color: 'bg-slate-900', icon: '𝕏' },
    { id: 'TikTok', name: 'TikTok', color: 'bg-black', icon: '🎵' },
    { id: 'YouTube', name: 'YouTube', color: 'bg-red-600', icon: '▶️' },
    { id: 'Pinterest', name: 'Pinterest', color: 'bg-red-500', icon: '📌' },
    { id: 'Threads', name: 'Threads', color: 'bg-slate-800', icon: '🧵' },
];

interface ConnectedAccount {
    platform: string;
    connected: boolean;
    username?: string;
    lastSync?: Date;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ profile }) => {
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [topics, setTopics] = useState<string[]>([]);
    const [generatingTopics, setGeneratingTopics] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [showAutoPilotSettings, setShowAutoPilotSettings] = useState(false);
    const [showConnectAccounts, setShowConnectAccounts] = useState(false);

    // Enhanced auto-pilot config with all platforms
    const [autoPilotConfig, setAutoPilotConfig] = useState<AutoPilotConfig>({
        enabled: false,
        cadence: 'Weekly',
        postingFrequency: {
            Instagram: 3,
            Facebook: 2,
            LinkedIn: 2,
            Twitter: 5,
            TikTok: 2,
            YouTube: 1,
            Pinterest: 3,
            Threads: 2
        },
        autoApprove: false
    });

    // Connected social accounts
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(() => {
        const saved = localStorage.getItem('connected_accounts');
        if (saved) return JSON.parse(saved);
        return SOCIAL_PLATFORMS.map(p => ({ platform: p.id, connected: false }));
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
        imageSize: '1K' as '1K' | '2K' | '4K',
        generatedImage: '',
        loadingImage: false
    });

    const generateTopics = async () => {
        setGeneratingTopics(true);
        try {
            const newTopics = await generateContentTopics(profile);
            // Append new topics to existing ones (avoid duplicates)
            setTopics(prev => {
                const combined = [...newTopics, ...prev];
                return [...new Set(combined)]; // Remove duplicates
            });
        } catch (e: any) { alert(`Failed: ${e.message}`); }
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

    // Connect/Disconnect social account (simulated - real implementation needs OAuth)
    const handleConnectAccount = (platform: string) => {
        // In a real app, this would redirect to OAuth flow for the platform
        const updated = connectedAccounts.map(acc =>
            acc.platform === platform
                ? { ...acc, connected: true, username: `@${profile.name.toLowerCase().replace(/\s/g, '')}`, lastSync: new Date() }
                : acc
        );
        setConnectedAccounts(updated);
        localStorage.setItem('connected_accounts', JSON.stringify(updated));
    };

    const handleDisconnectAccount = (platform: string) => {
        const updated = connectedAccounts.map(acc =>
            acc.platform === platform
                ? { ...acc, connected: false, username: undefined, lastSync: undefined }
                : acc
        );
        setConnectedAccounts(updated);
        localStorage.setItem('connected_accounts', JSON.stringify(updated));
    };

    const updateFrequency = (platform: string, value: number) => {
        setAutoPilotConfig(prev => ({
            ...prev,
            postingFrequency: { ...prev.postingFrequency, [platform]: Math.max(0, value) }
        }));
    };

    const getConnectedCount = () => connectedAccounts.filter(a => a.connected).length;

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
        } catch (e) { alert("Failed to generate image"); }
    };

    return (
        <div className="p-8 h-full flex flex-col relative">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold font-display text-slate-900">Content Calendar</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAutoPilotSettings(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${autoPilotConfig.enabled ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <Zap size={18} className={autoPilotConfig.enabled ? 'fill-current' : ''} />
                        {autoPilotConfig.enabled ? 'Auto-Pilot Active' : 'Enable Auto-Pilot'}
                    </button>
                    <button
                        onClick={generateTopics}
                        className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    >
                        <PlusCircle size={18} /> {generatingTopics ? 'Thinking...' : 'Generate Ideas'}
                    </button>
                </div>
            </div>

            <div className="flex gap-8 h-full overflow-hidden">
                {/* Left Column - Topics */}
                <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pb-20 scrollbar-hide">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        Topic Ideas
                        <span className="text-xs font-normal bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {topics.length}
                        </span>
                    </h3>
                    {topics.length === 0 && (
                        <div className="bg-white/50 border border-dashed border-slate-200 p-8 rounded-xl text-center">
                            <p className="text-slate-400 italic text-sm">No topics yet. Click generate ideas to get started.</p>
                        </div>
                    )}
                    {topics.map((t, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-brand-300 transition-all hover:shadow-md cursor-default">
                            <span className="text-sm text-slate-800 font-medium">{t}</span>
                            <button
                                onClick={() => openCreator(t)}
                                className="bg-brand-50 text-brand-600 px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-600 hover:text-white"
                            >
                                Create
                            </button>
                        </div>
                    ))}

                    {/* Generate More Ideas Button */}
                    {topics.length > 0 && (
                        <div className="mt-2 pt-4 border-t border-slate-100">
                            <button
                                onClick={generateTopics}
                                disabled={generatingTopics}
                                className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold rounded-xl hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all hover:scale-[1.02]"
                            >
                                {generatingTopics ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle size={18} />
                                        Generate More Ideas
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-2">
                                New ideas will be added to this list
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Column - Schedule */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-semibold text-slate-800">Upcoming Posts</h3>
                        {pendingPosts.length > 0 && !showReviewDashboard && (
                            <button
                                onClick={() => setShowReviewDashboard(true)}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse"
                            >
                                <Sparkles size={12} /> {pendingPosts.length} Pending Review
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {posts.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <LucideImage size={48} className="mb-4 text-slate-200" />
                                <p className="text-center italic">No scheduled posts yet.<br />Generate content with Auto-Pilot or create manually.</p>
                            </div>
                        )}
                        {posts.map(post => (
                            <div key={post.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group">
                                <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative border border-slate-200">
                                    {post.imageUrl ? (
                                        <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <LucideImage size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-2">
                                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' :
                                                post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-200 text-slate-700'
                                                }`}>
                                                {post.platform}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium">
                                            {post.date instanceof Date ? post.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(post.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-900 mb-1 text-sm">{post.topic}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{post.caption}</p>
                                </div>
                                <div className="flex items-center px-4">
                                    <span className="text-[10px] uppercase font-bold px-2 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-100">
                                        Scheduled
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overlays & Modals */}
            {isAutoGenerating && (
                <div className="fixed inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Zap className="text-indigo-600 animate-pulse" size={32} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mt-6 font-display">Crafting your content...</h2>
                    <p className="text-slate-500 mt-2">Our AI is researching and writing platform-specific posts.</p>
                </div>
            )}

            {showAutoPilotSettings && (
                <div className="fixed inset-0 bg-slate-900/60 z-[90] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden my-8">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        <button onClick={() => setShowAutoPilotSettings(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all z-10">
                            <X size={20} />
                        </button>

                        <div className="p-8 space-y-6">
                            {/* Header */}
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Auto-Pilot Mode</h2>
                                    <p className="text-sm text-slate-500">Configure AI-powered content scheduling across all your channels.</p>
                                </div>
                            </div>

                            {/* Connected Accounts Status */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Connected Accounts</p>
                                        <p className="text-xs text-slate-500">{getConnectedCount()} of {SOCIAL_PLATFORMS.length} platforms connected</p>
                                    </div>
                                    <button
                                        onClick={() => setShowConnectAccounts(true)}
                                        className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-200"
                                    >
                                        Manage Connections
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {connectedAccounts.filter(a => a.connected).map(acc => {
                                        const platform = SOCIAL_PLATFORMS.find(p => p.id === acc.platform);
                                        return (
                                            <span key={acc.platform} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                <span>{platform?.icon}</span> {platform?.name}
                                            </span>
                                        );
                                    })}
                                    {getConnectedCount() === 0 && (
                                        <span className="text-xs text-slate-400 italic">No accounts connected yet</span>
                                    )}
                                </div>
                            </div>

                            {/* Cadence Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Posting Cadence</label>
                                <div className="flex gap-2">
                                    {['Daily', 'Weekly', 'Monthly'].map(cad => (
                                        <button
                                            key={cad}
                                            onClick={() => setAutoPilotConfig({ ...autoPilotConfig, cadence: cad as any })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${autoPilotConfig.cadence === cad
                                                    ? 'bg-indigo-600 text-white shadow-lg'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {cad}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Platform Frequency Grid */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Posts per {autoPilotConfig.cadence === 'Daily' ? 'Day' : autoPilotConfig.cadence === 'Weekly' ? 'Week' : 'Month'}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {SOCIAL_PLATFORMS.map(platform => {
                                        const isConnected = connectedAccounts.find(a => a.platform === platform.id)?.connected;
                                        const freq = autoPilotConfig.postingFrequency[platform.id] || 0;
                                        return (
                                            <div key={platform.id} className={`flex items-center justify-between p-3 rounded-xl border ${isConnected ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{platform.icon}</span>
                                                    <span className="text-sm font-medium text-slate-700">{platform.name}</span>
                                                    {!isConnected && <span className="text-[10px] text-slate-400">(not connected)</span>}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => updateFrequency(platform.id, freq - 1)}
                                                        className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-lg font-bold"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-slate-800">{freq}</span>
                                                    <button
                                                        onClick={() => updateFrequency(platform.id, freq + 1)}
                                                        className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-lg font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Auto-Approve Toggle */}
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={autoPilotConfig.autoApprove}
                                    onChange={(e) => setAutoPilotConfig({ ...autoPilotConfig, autoApprove: e.target.checked })}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Auto-Approve & Publish</p>
                                    <p className="text-xs text-slate-500">Posts will be scheduled and published automatically without review.</p>
                                </div>
                            </div>

                            {/* Warning about connections */}
                            {getConnectedCount() === 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                    <span className="text-amber-500 text-lg">⚠️</span>
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800">Connect your accounts first</p>
                                        <p className="text-xs text-amber-700">To auto-post to social media, connect at least one account above.</p>
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleRunAutoPilot}
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap size={20} /> Generate Content Calendar
                            </button>

                            <p className="text-center text-xs text-slate-400">
                                {Object.values(autoPilotConfig.postingFrequency).reduce((a, b) => a + b, 0)} total posts will be generated per {autoPilotConfig.cadence.toLowerCase()}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Connect Accounts Modal */}
            {showConnectAccounts && (
                <div className="fixed inset-0 bg-slate-900/60 z-[95] flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Connect Social Accounts</h2>
                                <p className="text-sm text-slate-500">Link your accounts to enable auto-posting</p>
                            </div>
                            <button onClick={() => setShowConnectAccounts(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                            {SOCIAL_PLATFORMS.map(platform => {
                                const account = connectedAccounts.find(a => a.platform === platform.id);
                                const isConnected = account?.connected;
                                return (
                                    <div key={platform.id} className={`flex items-center justify-between p-4 rounded-xl border ${isConnected ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'} transition-all`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl ${platform.color} text-white flex items-center justify-center text-lg`}>
                                                {platform.icon}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{platform.name}</p>
                                                {isConnected && account?.username && (
                                                    <p className="text-xs text-green-600">{account.username}</p>
                                                )}
                                            </div>
                                        </div>
                                        {isConnected ? (
                                            <button
                                                onClick={() => handleDisconnectAccount(platform.id)}
                                                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
                                            >
                                                Disconnect
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleConnectAccount(platform.id)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <p className="text-xs text-slate-500 text-center">
                                🔒 We use secure OAuth to connect. We never store your passwords.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showReviewDashboard && (
                <div className="absolute inset-0 bg-slate-50 z-[80] p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-50/90 backdrop-blur-sm py-4 z-10 border-b border-slate-200">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Review Batch</h1>
                                <p className="text-sm text-slate-500">{pendingPosts.length} posts generated by AI</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleRejectAll} className="px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all">Reject All</button>
                                <button onClick={handleApproveAll} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Approve All</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            {pendingPosts.map(post => (
                                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider">
                                        <span className={`px-2 py-0.5 rounded-full ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' :
                                            post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-200 text-slate-700'
                                            }`}>{post.platform}</span>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => handleRejectSingle(post.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><XCircle size={18} /></button>
                                            <button onClick={() => handleApproveSingle(post.id)} className="p-1.5 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-all"><CheckCircle size={18} /></button>
                                        </div>
                                    </div>
                                    <div className="p-5 flex gap-5">
                                        <div className="w-32 flex-shrink-0 flex flex-col gap-3 text-center">
                                            <div className="w-32 h-32 bg-slate-50 rounded-xl overflow-hidden relative border border-slate-100 group-hover:border-indigo-100">
                                                {post.imageUrl ? (
                                                    <img src={post.imageUrl} className="w-full h-full object-cover" alt="Review" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                                        <LucideImage size={24} className="mb-2 opacity-20" />
                                                        No Image
                                                    </div>
                                                )}
                                            </div>
                                            {!post.imageUrl && (
                                                <button
                                                    onClick={() => handleGeneratePendingImage(post.id, post.imagePrompt!)}
                                                    className="w-full py-2 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-100 transition-all border border-indigo-100"
                                                >
                                                    Generate AI Art
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Topic</p>
                                            <p className="text-sm font-semibold text-slate-800 -mt-1">{post.topic}</p>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caption</label>
                                                <textarea
                                                    defaultValue={post.caption}
                                                    className="w-full p-3 text-sm text-slate-600 border border-slate-100 rounded-xl h-24 bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none scrollbar-hide"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Creator Modal */}
            {isCreatorOpen && (
                <div className="fixed inset-0 bg-slate-900/40 z-[110] flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-100 text-brand-600 p-2 rounded-xl">
                                    <PlusCircle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Create New Post</h2>
                                    <p className="text-xs text-slate-500">Customize your content for {creatorState.platform}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCreatorOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Platform</label>
                                        <div className="flex gap-2">
                                            {['Instagram', 'LinkedIn', 'Twitter', 'Facebook'].map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setCreatorState({ ...creatorState, platform: p })}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${creatorState.platform === p ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Caption Content</label>
                                            <button
                                                onClick={() => handleGenCaption(selectedTopic || 'Marketing')}
                                                className="text-[10px] font-bold text-brand-600 flex items-center gap-1 hover:underline"
                                            >
                                                <RefreshCw size={10} className={creatorState.loadingCaption ? 'animate-spin' : ''} />
                                                Regenerate
                                            </button>
                                        </div>
                                        <textarea
                                            value={creatorState.caption}
                                            onChange={(e) => setCreatorState({ ...creatorState, caption: e.target.value })}
                                            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Your post content here..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Image Prompt</label>
                                        <textarea
                                            value={creatorState.imagePrompt}
                                            onChange={(e) => setCreatorState({ ...creatorState, imagePrompt: e.target.value })}
                                            className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Describe the image you want AI to generate..."
                                        />
                                    </div>

                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-56 flex items-center justify-center relative overflow-hidden">
                                        {creatorState.generatedImage ? (
                                            <img src={creatorState.generatedImage} className="w-full h-full object-cover" alt="Preview" />
                                        ) : (
                                            <div className="text-center">
                                                <LucideImage size={48} className="mx-auto mb-2 text-slate-200" />
                                                <p className="text-xs text-slate-400 font-medium">No image generated yet</p>
                                            </div>
                                        )}
                                        {creatorState.loadingImage && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                                                <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleGenImage}
                                        disabled={creatorState.loadingImage}
                                        className="w-full py-4 bg-brand-50 text-brand-700 rounded-2xl font-bold text-sm border-2 border-brand-100 hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <LucideImage size={18} /> {creatorState.generatedImage ? 'Regenerate Image' : 'Generate with AI'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                            <button onClick={() => setIsCreatorOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50">Cancel</button>
                            <button onClick={savePost} className="flex-[2] py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all">Schedule Post</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RefreshCw = ({ className, size }: { className?: string, size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
    </svg>
);

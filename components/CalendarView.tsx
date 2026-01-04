import React, { useState, useEffect, useRef } from 'react';
import {
    Zap,
    PlusCircle,
    ImageIcon,
    X,
    XCircle,
    CheckCircle,
    Image as LucideImage,
    Sparkles,
    Upload,
    ArrowLeft,
    Clock,
    Timer,
    Pencil,
    Trash2,
    Save
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
    savedState?: any;
    onStateChange?: (state: any) => void;
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

export const CalendarView: React.FC<CalendarViewProps> = ({ profile, savedState, onStateChange }) => {
    // Initialize from savedState prop (passed from App)
    const [posts, setPosts] = useState<SocialPost[]>(savedState?.posts || []);
    const [topics, setTopics] = useState<string[]>(savedState?.topics || []);
    const [generatingTopics, setGeneratingTopics] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [showAutoPilotSettings, setShowAutoPilotSettings] = useState(false);
    const [showConnectAccounts, setShowConnectAccounts] = useState(false);

    // Enhanced auto-pilot config with all platforms
    const [autoPilotConfig, setAutoPilotConfig] = useState<AutoPilotConfig>(savedState?.autoPilotConfig || {
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
        autoApprove: false,
        isScheduled: false,
        nextGenerationTime: undefined,
        intervalHours: 24 // Default: generate new content every 24 hours
    });

    // Timer countdown state
    const [timeUntilNext, setTimeUntilNext] = useState<string>('');

    // Update countdown timer
    useEffect(() => {
        if (!autoPilotConfig.isScheduled || !autoPilotConfig.nextGenerationTime) {
            setTimeUntilNext('');
            return;
        }

        const updateCountdown = () => {
            const now = new Date().getTime();
            const target = new Date(autoPilotConfig.nextGenerationTime!).getTime();
            const diff = target - now;

            if (diff <= 0) {
                // Time to generate!
                console.log('[AutoPilot] Scheduled generation triggered');
                handleRunAutoPilot();
                // Schedule next generation
                const nextTime = new Date(Date.now() + (autoPilotConfig.intervalHours || 24) * 60 * 60 * 1000);
                setAutoPilotConfig(prev => ({
                    ...prev,
                    nextGenerationTime: nextTime.toISOString()
                }));
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeUntilNext(`${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setTimeUntilNext(`${minutes}m ${seconds}s`);
            } else {
                setTimeUntilNext(`${seconds}s`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [autoPilotConfig.isScheduled, autoPilotConfig.nextGenerationTime, autoPilotConfig.intervalHours]);

    // Connected social accounts
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(() => {
        if (savedState?.connectedAccounts) return savedState.connectedAccounts;
        const saved = localStorage.getItem('connected_accounts');
        if (saved) return JSON.parse(saved);
        return SOCIAL_PLATFORMS.map(p => ({ platform: p.id, connected: false }));
    });

    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [pendingPosts, setPendingPosts] = useState<SocialPost[]>(savedState?.pendingPosts || []);
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

    // Edit post state
    const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
    const [editFormData, setEditFormData] = useState<{
        topic: string;
        caption: string;
        platform: string;
        date: string;
        time: string;
        imageUrl: string;
    }>({
        topic: '',
        caption: '',
        platform: 'Instagram',
        date: '',
        time: '',
        imageUrl: ''
    });
    const editImageInputRef = useRef<HTMLInputElement>(null);

    // Open edit modal for a post
    const handleEditPost = (post: SocialPost) => {
        const postDate = post.date instanceof Date ? post.date : new Date(post.date);
        setEditingPost(post);
        setEditFormData({
            topic: post.topic,
            caption: post.caption,
            platform: post.platform,
            date: postDate.toISOString().split('T')[0],
            time: postDate.toTimeString().slice(0, 5),
            imageUrl: post.imageUrl || ''
        });
    };

    // Save edited post
    const handleSaveEditedPost = () => {
        if (!editingPost) return;

        const updatedDate = new Date(`${editFormData.date}T${editFormData.time}`);
        const updatedPost: SocialPost = {
            ...editingPost,
            topic: editFormData.topic,
            caption: editFormData.caption,
            platform: editFormData.platform,
            date: updatedDate,
            imageUrl: editFormData.imageUrl
        };

        setPosts(prev => prev.map(p => p.id === editingPost.id ? updatedPost : p));
        setEditingPost(null);
    };

    // Delete a post
    const handleDeletePost = (postId: string) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    // Handle image upload for edit
    const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setEditFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    // Notify parent of state changes for persistence
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                posts,
                topics,
                pendingPosts,
                autoPilotConfig,
                connectedAccounts
            });
        }
    }, [posts, topics, pendingPosts, autoPilotConfig, connectedAccounts]);

    const [topicError, setTopicError] = useState<string | null>(null);

    const generateTopics = async (isRetry = false) => {
        setGeneratingTopics(true);
        setTopicError(null);
        try {
            const newTopics = await generateContentTopics(profile);
            if (newTopics.length > 0) {
                setTopics(prev => {
                    const combined = [...newTopics, ...prev];
                    return [...new Set(combined)];
                });
            } else if (!isRetry) {
                // Empty results, try once more
                setTopicError('Taking a quick breather — trying again...');
                setTimeout(() => generateTopics(true), 3000);
                return;
            }
        } catch (e: any) {
            console.error('[CalendarView] Topic generation failed:', e);

            if (!isRetry && (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError')) {
                setTopicError('Taking a quick breather — trying again...');
                setTimeout(() => generateTopics(true), 3000);
                return;
            }

            setTopicError(isRetry
                ? 'Our assistant is taking a short break. Please try again in a minute! 🙏'
                : 'Something went wrong. Please try again.');
        }
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

    const [autoPilotError, setAutoPilotError] = useState<string | null>(null);

    const handleRunAutoPilot = async (isRetry = false) => {
        setShowAutoPilotSettings(false);
        setIsAutoGenerating(true);
        setAutoPilotError(null);
        try {
            const generatedPosts = await generateBatchContent(profile, autoPilotConfig);
            if (generatedPosts.length > 0) {
                if (autoPilotConfig.autoApprove) {
                    setPosts(prev => [...prev, ...generatedPosts.map(p => ({ ...p, status: 'Scheduled' } as SocialPost))]);
                } else {
                    setPendingPosts(prev => [...prev, ...generatedPosts]);
                    setShowReviewDashboard(true);
                }
            } else if (!isRetry) {
                // Empty results, try once more
                setAutoPilotError('Taking a quick breather — trying again...');
                setTimeout(() => handleRunAutoPilot(true), 3000);
                return;
            } else {
                setAutoPilotError('Content generation returned no results. Please try again.');
            }
        } catch (e: any) {
            console.error('[CalendarView] Auto-pilot failed:', e);

            if (!isRetry && (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError')) {
                setAutoPilotError('Taking a quick breather — trying again...');
                setTimeout(() => handleRunAutoPilot(true), 3000);
                return;
            }

            setAutoPilotError(isRetry
                ? 'Our assistant is taking a short break. Please try again in a minute! 🙏'
                : 'Something went wrong. Please try again.');
        } finally {
            if (!autoPilotError?.includes('breather')) {
                setIsAutoGenerating(false);
                setAutoPilotConfig(prev => ({ ...prev, enabled: true }));
            }
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

    // State to track which posts are regenerating captions
    const [regeneratingCaptions, setRegeneratingCaptions] = useState<Set<string>>(new Set());

    // Regenerate caption for a specific pending post
    const handleRegenerateCaption = async (id: string) => {
        const post = pendingPosts.find(p => p.id === id);
        if (!post) return;

        setRegeneratingCaptions(prev => new Set(prev).add(id));
        try {
            const newCaption = await generatePostCaption(profile, post.topic, post.platform);
            setPendingPosts(prev => prev.map(p => p.id === id ? { ...p, caption: newCaption } : p));
        } catch (e) {
            console.error("Failed to regenerate caption:", e);
            alert("Failed to regenerate caption. Please try again.");
        } finally {
            setRegeneratingCaptions(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col relative">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900">Content Calendar</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAutoPilotSettings(true)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg transition-all text-xs sm:text-sm active:scale-95 ${autoPilotConfig.enabled ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <Zap size={16} className={autoPilotConfig.enabled ? 'fill-current' : ''} />
                        <span className="hidden sm:inline">{autoPilotConfig.enabled ? 'Auto-Pilot Active' : 'Enable Auto-Pilot'}</span>
                        <span className="sm:hidden">{autoPilotConfig.enabled ? 'Active' : 'Auto'}</span>
                    </button>
                    <button
                        onClick={() => generateTopics()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-600 text-white px-3 sm:px-4 py-2.5 rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-xs sm:text-sm active:scale-95"
                    >
                        <PlusCircle size={16} />
                        <span className="hidden sm:inline">{generatingTopics ? 'Thinking...' : 'Generate Ideas'}</span>
                        <span className="sm:hidden">{generatingTopics ? '...' : 'Ideas'}</span>
                    </button>
                </div>
            </div>

            {/* Error displays */}
            {(topicError || autoPilotError) && (
                <div className={`mb-4 p-3 rounded-lg text-xs sm:text-sm flex items-center gap-2 ${(topicError || autoPilotError)?.includes('breather')
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
                    }`}>
                    {(topicError || autoPilotError)?.includes('breather') && (
                        <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                    )}
                    {topicError || autoPilotError}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 flex-1 overflow-hidden">
                {/* Left Column - Topics */}
                <div className="w-full lg:w-1/3 flex flex-col gap-3 sm:gap-4 overflow-y-auto pb-6 lg:pb-20 max-h-64 lg:max-h-full scrollbar-hide">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                        Topic Ideas
                        <span className="text-xs font-normal bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {topics.length}
                        </span>
                    </h3>
                    {topics.length === 0 && (
                        <div className="bg-white/50 border border-dashed border-slate-200 p-6 sm:p-8 rounded-xl text-center">
                            <p className="text-slate-400 italic text-xs sm:text-sm">No topics yet. Click generate ideas to get started.</p>
                        </div>
                    )}
                    {topics.map((t, i) => (
                        <div key={i} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center gap-3 hover:border-brand-300 transition-all active:scale-[0.98]">
                            <span className="text-xs sm:text-sm text-slate-800 font-medium">{t}</span>
                            <button
                                onClick={() => openCreator(t)}
                                className="bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-brand-600 hover:text-white active:scale-95 whitespace-nowrap"
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
                                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold rounded-xl hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all active:scale-95 text-sm"
                            >
                                {generatingTopics ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle size={16} />
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
                            <div key={post.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group relative">
                                {/* Action buttons - show on hover */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditPost(post)}
                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm"
                                        title="Edit post"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-300 transition-all shadow-sm"
                                        title="Delete post"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                {/* Date column */}
                                <div className="w-16 flex-shrink-0 text-center">
                                    <div className="bg-brand-50 rounded-xl p-2 border border-brand-100">
                                        <p className="text-[10px] font-bold text-brand-600 uppercase">
                                            {post.date instanceof Date
                                                ? post.date.toLocaleDateString('en-US', { weekday: 'short' })
                                                : new Date(post.date).toLocaleDateString('en-US', { weekday: 'short' })
                                            }
                                        </p>
                                        <p className="text-xl font-bold text-brand-700">
                                            {post.date instanceof Date
                                                ? post.date.getDate()
                                                : new Date(post.date).getDate()
                                            }
                                        </p>
                                        <p className="text-[10px] text-brand-600">
                                            {post.date instanceof Date
                                                ? post.date.toLocaleDateString('en-US', { month: 'short' })
                                                : new Date(post.date).toLocaleDateString('en-US', { month: 'short' })
                                            }
                                        </p>
                                        <p className="text-[9px] font-medium text-slate-500 mt-1">
                                            {post.date instanceof Date
                                                ? post.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                                : new Date(post.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                            }
                                        </p>
                                    </div>
                                </div>
                                {/* Image */}
                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative border border-slate-200">
                                    {post.imageUrl ? (
                                        <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <LucideImage size={24} />
                                        </div>
                                    )}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0 pr-16">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' :
                                            post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' :
                                                post.platform === 'Facebook' ? 'bg-blue-100 text-blue-600' :
                                                    post.platform === 'TikTok' ? 'bg-slate-900 text-white' :
                                                        post.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                                                            post.platform === 'Pinterest' ? 'bg-red-50 text-red-600' :
                                                                post.platform === 'Threads' ? 'bg-slate-100 text-slate-700' :
                                                                    'bg-slate-200 text-slate-700'
                                            }`}>
                                            {post.platform}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100">
                                            Scheduled
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-900 mb-1 text-sm truncate">{post.topic}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{post.caption}</p>
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
                    <p className="text-slate-500 mt-2">Our assistant is researching and writing platform-specific posts.</p>
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
                            {/* Header with Back Button */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowAutoPilotSettings(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-600"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">Auto-Pilot Mode</h2>
                                        <p className="text-sm text-slate-500">Configure assistant-powered content scheduling.</p>
                                    </div>
                                </div>
                                {autoPilotConfig.isScheduled && timeUntilNext && (
                                    <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-xl flex items-center gap-2">
                                        <Timer size={16} className="text-green-600" />
                                        <span className="text-sm font-semibold text-green-700">Next: {timeUntilNext}</span>
                                    </div>
                                )}
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

                            {/* Scheduled Generation Settings */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-lg">
                                            <Clock size={20} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Scheduled Auto-Generation</p>
                                            <p className="text-xs text-slate-500">Automatically generate new content at set intervals</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoPilotConfig.isScheduled}
                                            onChange={(e) => {
                                                const isScheduled = e.target.checked;
                                                if (isScheduled) {
                                                    // Set next generation time
                                                    const nextTime = new Date(Date.now() + (autoPilotConfig.intervalHours || 24) * 60 * 60 * 1000);
                                                    setAutoPilotConfig({
                                                        ...autoPilotConfig,
                                                        isScheduled: true,
                                                        nextGenerationTime: nextTime.toISOString()
                                                    });
                                                } else {
                                                    setAutoPilotConfig({
                                                        ...autoPilotConfig,
                                                        isScheduled: false,
                                                        nextGenerationTime: undefined
                                                    });
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {autoPilotConfig.isScheduled && (
                                    <div className="pl-11 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm font-medium text-slate-700">Generate every:</label>
                                            <select
                                                value={autoPilotConfig.intervalHours || 24}
                                                onChange={(e) => {
                                                    const hours = parseInt(e.target.value);
                                                    const nextTime = new Date(Date.now() + hours * 60 * 60 * 1000);
                                                    setAutoPilotConfig({
                                                        ...autoPilotConfig,
                                                        intervalHours: hours,
                                                        nextGenerationTime: nextTime.toISOString()
                                                    });
                                                }}
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value={1}>1 hour</option>
                                                <option value={6}>6 hours</option>
                                                <option value={12}>12 hours</option>
                                                <option value={24}>24 hours (Daily)</option>
                                                <option value={72}>3 days</option>
                                                <option value={168}>Weekly</option>
                                            </select>
                                        </div>
                                        {timeUntilNext && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Timer size={14} className="text-green-600" />
                                                <span className="text-slate-600">Next generation in:</span>
                                                <span className="font-bold text-green-600">{timeUntilNext}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowReviewDashboard(false)}
                                    className="p-2 hover:bg-slate-200 rounded-lg transition-all text-slate-400 hover:text-slate-600"
                                    title="Back to Calendar"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">Review Batch</h1>
                                    <p className="text-sm text-slate-500">{pendingPosts.length} posts generated by assistant</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowReviewDashboard(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center gap-2">
                                    <ArrowLeft size={16} /> Back to Calendar
                                </button>
                                <button onClick={handleRejectAll} className="px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all">Reject All</button>
                                <button onClick={handleApproveAll} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Approve All</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            {pendingPosts.map(post => (
                                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' :
                                                post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' :
                                                    post.platform === 'Facebook' ? 'bg-blue-100 text-blue-600' :
                                                        post.platform === 'TikTok' ? 'bg-slate-900 text-white' :
                                                            post.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-200 text-slate-700'
                                                }`}>{post.platform}</span>
                                            <div className="flex items-center gap-1 text-xs text-slate-600 bg-brand-50 px-2 py-1 rounded-lg">
                                                <span className="font-bold">
                                                    {post.date instanceof Date
                                                        ? post.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                                        : new Date(post.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                                    }
                                                </span>
                                                <span className="text-slate-400">•</span>
                                                <span>
                                                    {post.date instanceof Date
                                                        ? post.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                                        : new Date(post.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                                    }
                                                </span>
                                            </div>
                                        </div>
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
                                                    Generate Art
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Topic</p>
                                            <p className="text-sm font-semibold text-slate-800 -mt-1">{post.topic}</p>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caption</label>
                                                    <button
                                                        onClick={() => handleRegenerateCaption(post.id)}
                                                        disabled={regeneratingCaptions.has(post.id)}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Regenerate caption with AI"
                                                    >
                                                        {regeneratingCaptions.has(post.id) ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                                <span>Regenerating...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RefreshCw size={12} />
                                                                <span>Regenerate</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={post.caption}
                                                    onChange={(e) => setPendingPosts(prev => prev.map(p => p.id === post.id ? { ...p, caption: e.target.value } : p))}
                                                    className="w-full p-3 text-sm text-slate-600 border border-slate-100 rounded-xl h-32 bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none scrollbar-hide resize-none"
                                                    placeholder="Caption will appear here..."
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
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Image Prompt (for AI generation)</label>
                                        <textarea
                                            value={creatorState.imagePrompt}
                                            onChange={(e) => setCreatorState({ ...creatorState, imagePrompt: e.target.value })}
                                            className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Describe the image you want to generate..."
                                        />
                                    </div>

                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-56 flex items-center justify-center relative overflow-hidden">
                                        {creatorState.generatedImage ? (
                                            <>
                                                <img src={creatorState.generatedImage} className="w-full h-full object-cover" alt="Preview" />
                                                <button
                                                    onClick={() => setCreatorState({ ...creatorState, generatedImage: '' })}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-all"
                                                    title="Remove image"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <LucideImage size={48} className="mx-auto mb-2 text-slate-200" />
                                                <p className="text-xs text-slate-400 font-medium">No image yet</p>
                                                <p className="text-[10px] text-slate-300 mt-1">Generate with AI or upload your own</p>
                                            </div>
                                        )}
                                        {creatorState.loadingImage && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                                                <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Image action buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleGenImage}
                                            disabled={creatorState.loadingImage}
                                            className="flex-1 py-3 bg-brand-50 text-brand-700 rounded-xl font-bold text-sm border-2 border-brand-100 hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <LucideImage size={16} /> {creatorState.loadingImage ? 'Generating...' : 'Generate with AI'}
                                        </button>
                                        <label className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm border-2 border-slate-200 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer">
                                            <Upload size={16} /> Upload Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setCreatorState(prev => ({ ...prev, generatedImage: reader.result as string }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
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

            {/* Edit Post Modal */}
            {editingPost && (
                <div className="fixed inset-0 bg-slate-900/40 z-[110] flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-100 text-brand-600 p-2 rounded-xl">
                                    <Pencil size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Edit Scheduled Post</h2>
                                    <p className="text-xs text-slate-500">Make changes to your post</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingPost(null)}
                                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Platform */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Platform</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Instagram', 'LinkedIn', 'Twitter', 'Facebook', 'TikTok', 'YouTube', 'Pinterest', 'Threads'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setEditFormData(prev => ({ ...prev, platform: p }))}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${editFormData.platform === p
                                                ? 'bg-slate-900 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Topic */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Topic / Title</label>
                                <input
                                    type="text"
                                    value={editFormData.topic}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, topic: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Post topic or title..."
                                />
                            </div>

                            {/* Caption */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Caption / Content</label>
                                <textarea
                                    value={editFormData.caption}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, caption: e.target.value }))}
                                    className="w-full h-32 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="Write your post content..."
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Date</label>
                                    <input
                                        type="date"
                                        value={editFormData.date}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Time</label>
                                    <input
                                        type="time"
                                        value={editFormData.time}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Image */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Image</label>
                                <div className="flex gap-4">
                                    {/* Image Preview */}
                                    <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center relative">
                                        {editFormData.imageUrl ? (
                                            <>
                                                <img src={editFormData.imageUrl} alt="Post" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setEditFormData(prev => ({ ...prev, imageUrl: '' }))}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideImage size={32} className="text-slate-300" />
                                        )}
                                    </div>
                                    {/* Upload Button */}
                                    <div className="flex-1 flex flex-col justify-center">
                                        <input
                                            type="file"
                                            ref={editImageInputRef}
                                            accept="image/*"
                                            onChange={handleEditImageUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => editImageInputRef.current?.click()}
                                            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <Upload size={16} />
                                            Upload Image
                                        </button>
                                        <p className="text-xs text-slate-400 mt-2 text-center">PNG, JPG up to 5MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setEditingPost(null)}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEditedPost}
                                className="flex-[2] py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Save Changes
                            </button>
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

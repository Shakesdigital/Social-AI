import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Loader, Plus, Calendar, ExternalLink, Copy, BarChart3, Sparkles, Edit3, Trash2, Check, X } from 'lucide-react';
import { CompanyProfile, BlogPost, TrendingTopic } from '../types';
import { researchTrendingTopics, generateBlogPost, publishToWordPress } from '../services/blogService';
import { useFreeLLM } from '../hooks/useFreeLLM';
import ReactMarkdown from 'react-markdown';
import { InlineChat } from './InlineChat';

interface BlogViewProps {
    profile: CompanyProfile;
    onAddToCalendar?: (post: BlogPost) => void;
    savedState?: any;
    onStateChange?: (state: any) => void;
}

export const BlogView: React.FC<BlogViewProps> = ({ profile, onAddToCalendar, savedState, onStateChange }) => {
    const { quotaWarning, isConfigured } = useFreeLLM();

    // Initialize from savedState prop (passed from App)
    const [topics, setTopics] = useState<TrendingTopic[]>(savedState?.topics || []);
    const [posts, setPosts] = useState<BlogPost[]>(savedState?.posts || []);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(savedState?.selectedPost || null);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);
    const [isLoadingPost, setIsLoadingPost] = useState(false);
    const [nicheInput, setNicheInput] = useState(savedState?.nicheInput || profile.industry);
    const [targetWordCount, setTargetWordCount] = useState<number>(savedState?.targetWordCount || 1350);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Selection state for multi-select delete pattern
    const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
    const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

    // Notify parent of state changes for persistence
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                topics,
                posts,
                selectedPost,
                nicheInput,
                targetWordCount
            });
        }
    }, [topics, posts, selectedPost, nicheInput, targetWordCount]);

    const handleResearchTopics = async () => {
        setIsLoadingTopics(true);
        setError(null);
        try {
            console.log('[BlogView] Starting research for:', nicheInput);
            const newTopics = await researchTrendingTopics(nicheInput, profile, 5);
            console.log('[BlogView] Received topics:', newTopics?.length || 0);

            if (!newTopics || newTopics.length === 0) {
                setError('No topics found. Please try again or use a different niche.');
                return;
            }

            // Append new topics, avoiding duplicates
            setTopics(prev => {
                const existingIds = new Set(prev.map(t => t.topic.toLowerCase()));
                const uniqueNew = newTopics.filter(t => !existingIds.has(t.topic.toLowerCase()));
                return [...uniqueNew, ...prev];
            });
        } catch (e: any) {
            console.error('[BlogView] Failed to research topics:', e);

            // Check if all providers failed - show friendly message and auto-retry
            if (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError') {
                setError('Taking a quick breather — trying again...');

                // Auto-retry after 3 seconds
                setTimeout(async () => {
                    try {
                        const retryTopics = await researchTrendingTopics(nicheInput, profile, 5);
                        if (retryTopics && retryTopics.length > 0) {
                            setTopics(prev => {
                                const existingIds = new Set(prev.map(t => t.topic.toLowerCase()));
                                const uniqueNew = retryTopics.filter(t => !existingIds.has(t.topic.toLowerCase()));
                                return [...uniqueNew, ...prev];
                            });
                            setError(null);
                        } else {
                            setError('Still having trouble. Please try again in a moment.');
                        }
                    } catch (retryError) {
                        console.error('[BlogView] Retry also failed:', retryError);
                        setError('Our assistant is taking a short break. Please try again in a minute! 🙏');
                    }
                    setIsLoadingTopics(false);
                }, 3000);
                return; // Don't set isLoadingTopics to false yet
            }

            // Generic error message for other errors
            setError('Something went wrong. Please try again.');
        } finally {
            if (!error?.includes('breather')) {
                setIsLoadingTopics(false);
            }
        }
    };

    const handleGeneratePost = async (topic: TrendingTopic) => {
        setIsLoadingPost(true);
        setError(null);
        try {
            console.log('[BlogView] Starting blog generation for:', topic.topic, 'Target words:', targetWordCount);
            // Generate a research-backed, factually accurate blog post
            const post = await generateBlogPost(topic, profile, targetWordCount);

            // Validate the content was actually generated
            if (!post.content || post.content === 'Failed to generate content.' || post.wordCount < 100) {
                throw new Error('Blog content generation incomplete');
            }

            console.log('[BlogView] Successfully generated blog:', post.title, 'Words:', post.wordCount);
            setPosts(prev => [post, ...prev]);
            setSelectedPost(post);
        } catch (e: any) {
            console.error('[BlogView] Failed to generate post:', e);

            // Check if all providers failed - auto-retry
            if (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError') {
                setError('Taking a quick breather — trying again...');

                // Auto-retry after 3 seconds
                setTimeout(async () => {
                    try {
                        const retryPost = await generateBlogPost(topic, profile, targetWordCount);
                        if (retryPost.content && retryPost.wordCount > 100) {
                            setPosts(prev => [retryPost, ...prev]);
                            setSelectedPost(retryPost);
                            setError(null);
                        } else {
                            setError('Blog generation incomplete. Please try again.');
                        }
                    } catch (retryError) {
                        console.error('[BlogView] Retry failed:', retryError);
                        setError('Our assistant is taking a short break. Please try again in a minute! 🙏');
                    }
                    setIsLoadingPost(false);
                }, 3000);
                return; // Don't setIsLoadingPost(false) yet
            }

            // More specific error message
            if (e.message?.includes('incomplete')) {
                setError('Blog generation was cut short. Please try again for a complete article.');
            } else {
                setError('Failed to generate blog post. Please try again.');
            }
        } finally {
            if (!error?.includes('breather')) {
                setIsLoadingPost(false);
            }
        }
    };

    const handlePublish = async (post: BlogPost) => {
        const result = await publishToWordPress(post);
        if (result.success) {
            setPosts(prev => prev.map(p =>
                p.id === post.id ? { ...p, status: 'Published', wordpressPostId: result.postUrl } : p
            ));
            if (selectedPost?.id === post.id) {
                setSelectedPost(prev => prev ? { ...prev, status: 'Published' } : null);
            }
        }
    };

    const handleSchedule = (post: BlogPost) => {
        const scheduled = { ...post, status: 'Scheduled' as const, scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
        setPosts(prev => prev.map(p => p.id === post.id ? scheduled : p));
        if (onAddToCalendar) onAddToCalendar(scheduled);
    };

    // Edit handlers
    const handleStartEdit = () => {
        if (selectedPost) {
            setEditedContent(selectedPost.content);
            setIsEditing(true);
        }
    };

    const handleSaveEdit = () => {
        if (selectedPost && editedContent) {
            const wordCount = editedContent.split(/\s+/).filter(w => w.length > 0).length;
            const updatedPost = {
                ...selectedPost,
                content: editedContent,
                wordCount,
                status: 'Draft' as const
            };
            setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
            setSelectedPost(updatedPost);
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedContent('');
    };

    // Delete handler
    const handleDeletePost = (postId: string) => {
        if (window.confirm('Are you sure you want to delete this blog post?')) {
            setPosts(prev => prev.filter(p => p.id !== postId));
            setSelectedPosts(prev => {
                const next = new Set(prev);
                next.delete(postId);
                return next;
            });
            if (selectedPost?.id === postId) {
                setSelectedPost(null);
            }
        }
    };

    // Topic selection handlers
    const handleSelectTopic = (topicId: string) => {
        setSelectedTopics(prev => {
            const next = new Set(prev);
            if (next.has(topicId)) next.delete(topicId);
            else next.add(topicId);
            return next;
        });
    };

    const handleSelectAllTopics = () => {
        if (selectedTopics.size === topics.length) {
            setSelectedTopics(new Set());
        } else {
            setSelectedTopics(new Set(topics.map(t => t.id)));
        }
    };

    const handleDeleteTopic = (topicId: string) => {
        setTopics(prev => prev.filter(t => t.id !== topicId));
        setSelectedTopics(prev => {
            const next = new Set(prev);
            next.delete(topicId);
            return next;
        });
    };

    const handleDeleteSelectedTopics = () => {
        if (selectedTopics.size === 0) return;
        if (window.confirm(`Delete ${selectedTopics.size} selected topic(s)?`)) {
            setTopics(prev => prev.filter(t => !selectedTopics.has(t.id)));
            setSelectedTopics(new Set());
        }
    };

    const handleClearAllTopics = () => {
        if (topics.length === 0) return;
        if (window.confirm('Delete all trending topics? This cannot be undone.')) {
            setTopics([]);
            setSelectedTopics(new Set());
        }
    };

    // Post selection handlers
    const handleSelectPost = (postId: string) => {
        setSelectedPosts(prev => {
            const next = new Set(prev);
            if (next.has(postId)) next.delete(postId);
            else next.add(postId);
            return next;
        });
    };

    const handleSelectAllPosts = () => {
        if (selectedPosts.size === posts.length) {
            setSelectedPosts(new Set());
        } else {
            setSelectedPosts(new Set(posts.map(p => p.id)));
        }
    };

    const handleDeleteSelectedPosts = () => {
        if (selectedPosts.size === 0) return;
        if (window.confirm(`Delete ${selectedPosts.size} selected post(s)?`)) {
            setPosts(prev => prev.filter(p => !selectedPosts.has(p.id)));
            if (selectedPost && selectedPosts.has(selectedPost.id)) {
                setSelectedPost(null);
            }
            setSelectedPosts(new Set());
        }
    };

    const handleClearAllPosts = () => {
        if (posts.length === 0) return;
        if (window.confirm('Delete all generated posts? This cannot be undone.')) {
            setPosts([]);
            setSelectedPosts(new Set());
            setSelectedPost(null);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Blog Content</h1>
                    <p className="text-slate-500 text-xs sm:text-sm">Research trends and generate SEO-optimized blog posts</p>
                </div>
            </div>

            {quotaWarning && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs sm:text-sm">
                    {quotaWarning}
                </div>
            )}

            {!isConfigured && (
                <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs sm:text-sm text-red-700">Please configure a free LLM API key to use blog generation features.</p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Left Panel - Topics & Research */}
                <div className="w-full lg:w-96 shrink-0 space-y-4 sm:space-y-6">
                    {/* Topic Research */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <TrendingUp size={18} />
                            Trending Topics
                        </h3>

                        <div className="space-y-3 mb-4">
                            <input
                                type="text"
                                value={nicheInput}
                                onChange={e => { setNicheInput(e.target.value); setError(null); }}
                                className="w-full border border-slate-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Enter your niche (e.g., Digital Marketing, AI, Fitness)..."
                            />

                            {/* Word Count Selector */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-600 whitespace-nowrap">Word Count:</label>
                                <select
                                    value={targetWordCount}
                                    onChange={e => setTargetWordCount(Number(e.target.value))}
                                    className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                >
                                    <option value={800}>800 words (Short)</option>
                                    <option value={1000}>1,000 words (Medium)</option>
                                    <option value={1350}>1,350 words (Standard)</option>
                                    <option value={1500}>1,500 words (Long)</option>
                                    <option value={2000}>2,000 words (In-depth)</option>
                                    <option value={2500}>2,500 words (Comprehensive)</option>
                                </select>
                            </div>

                            <button
                                onClick={handleResearchTopics}
                                disabled={isLoadingTopics || !isConfigured || !nicheInput.trim()}
                                className="w-full py-2.5 sm:py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"
                            >
                                {isLoadingTopics ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        <span className="hidden sm:inline">Researching... (10-20 seconds)</span>
                                        <span className="sm:hidden">Researching...</span>
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp size={16} />
                                        Research Trends
                                    </>
                                )}
                            </button>

                            {/* Error/Status Display */}
                            {error && (
                                <div className={`p-3 rounded-lg text-sm ${error.includes('breather') || error.includes('trying again')
                                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                    : 'bg-red-50 border border-red-200 text-red-700'
                                    }`}>
                                    <p className="font-medium flex items-center gap-2">
                                        {error.includes('breather') || error.includes('trying again') ? (
                                            <><Loader size={14} className="animate-spin" /> {error}</>
                                        ) : (
                                            <>⚠️ {error}</>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Topics Actions Bar */}
                        {topics.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 mb-3">
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedTopics.size === topics.length && topics.length > 0}
                                        onChange={handleSelectAllTopics}
                                        className="rounded border-slate-300"
                                    />
                                    Select All ({selectedTopics.size})
                                </label>
                                <div className="flex gap-1">
                                    {selectedTopics.size > 0 && (
                                        <button
                                            onClick={handleDeleteSelectedTopics}
                                            className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1 text-xs active:scale-95 transition-all"
                                        >
                                            <Trash2 size={12} />
                                            Delete ({selectedTopics.size})
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClearAllTopics}
                                        className="px-2 py-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 text-xs transition-all"
                                        title="Clear all topics"
                                    >
                                        <Trash2 size={12} />
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {topics.map(topic => (
                                <div
                                    key={topic.id}
                                    className={`p-3 border rounded-lg transition-colors ${selectedTopics.has(topic.id)
                                        ? 'border-brand-400 ring-2 ring-brand-100 bg-brand-50/30'
                                        : 'border-slate-200 hover:border-brand-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedTopics.has(topic.id)}
                                                onChange={() => handleSelectTopic(topic.id)}
                                                className="rounded border-slate-300"
                                            />
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(topic.trendScore)}`}>
                                                {topic.trendScore}%
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-500">{topic.category}</span>
                                            <button
                                                onClick={() => handleDeleteTopic(topic.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete topic"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 mb-2">{topic.topic}</p>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {topic.relatedKeywords.slice(0, 3).map(kw => (
                                            <span key={kw} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => handleGeneratePost(topic)}
                                        disabled={isLoadingPost}
                                        className="w-full py-1.5 text-sm text-brand-600 border border-brand-200 rounded hover:bg-brand-50 flex items-center justify-center gap-1"
                                    >
                                        <Sparkles size={14} />
                                        Generate Post
                                    </button>
                                </div>
                            ))}
                            {topics.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    Click "Research Trends" to find topics
                                </p>
                            )}
                        </div>

                        {/* Generate More Trends Button */}
                        {topics.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <button
                                    onClick={handleResearchTopics}
                                    disabled={isLoadingTopics || !isConfigured}
                                    className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold rounded-lg hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all hover:scale-[1.02]"
                                >
                                    {isLoadingTopics ? (
                                        <>
                                            <Loader size={16} className="animate-spin" />
                                            Finding more...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Generate More Trends
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs text-slate-400 mt-2">
                                    {topics.length} topics found • New trends will be added
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Posts List */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText size={18} />
                            Generated Posts ({posts.length})
                        </h3>

                        {/* Posts Actions Bar */}
                        {posts.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 mb-3">
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedPosts.size === posts.length && posts.length > 0}
                                        onChange={handleSelectAllPosts}
                                        className="rounded border-slate-300"
                                    />
                                    Select All ({selectedPosts.size})
                                </label>
                                <div className="flex gap-1">
                                    {selectedPosts.size > 0 && (
                                        <button
                                            onClick={handleDeleteSelectedPosts}
                                            className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1 text-xs active:scale-95 transition-all"
                                        >
                                            <Trash2 size={12} />
                                            Delete ({selectedPosts.size})
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClearAllPosts}
                                        className="px-2 py-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 text-xs transition-all"
                                        title="Clear all posts"
                                    >
                                        <Trash2 size={12} />
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {posts.map(post => (
                                <div
                                    key={post.id}
                                    className={`p-3 rounded-lg transition-colors ${selectedPosts.has(post.id)
                                            ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-100 border'
                                            : selectedPost?.id === post.id
                                                ? 'bg-brand-50 border-brand-300 border'
                                                : 'border border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedPosts.has(post.id)}
                                            onChange={() => handleSelectPost(post.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-slate-300 mt-0.5 shrink-0"
                                        />
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => setSelectedPost(post)}
                                        >
                                            <p className="text-sm font-medium text-slate-800 line-clamp-2">{post.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${post.status === 'Published' ? 'bg-green-100 text-green-700' :
                                                    post.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {post.status}
                                                </span>
                                                <span className="text-xs text-slate-500">{post.wordCount} words</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePost(post.id);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                                            title="Delete post"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {posts.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No posts yet. Generate from a trending topic.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Post Preview/Editor */}
                <div className="flex-1">
                    {isLoadingPost ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Loader size={48} className="mx-auto mb-4 text-brand-500 animate-spin" />
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Generating Blog Post...</h3>
                            <p className="text-slate-500 text-sm">This may take a minute for longer posts.</p>
                        </div>
                    ) : selectedPost ? (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {/* Post Header */}
                            <div className="p-5 border-b border-slate-100 bg-slate-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-slate-900">{selectedPost.title}</h2>
                                        {selectedPost.excerpt && (
                                            <p className="text-sm text-slate-500 mt-1">{selectedPost.excerpt}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedPost.seoScore && (
                                            <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${getScoreColor(selectedPost.seoScore)}`}>
                                                <BarChart3 size={12} />
                                                SEO: {selectedPost.seoScore}%
                                            </span>
                                        )}
                                        {selectedPost.wordCount && (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                {selectedPost.wordCount} words
                                            </span>
                                        )}
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                            {Math.ceil((selectedPost.wordCount || selectedPost.content.split(/\s+/).length) / 200)} min read
                                        </span>
                                        {/* Edit and Delete buttons */}
                                        <button
                                            onClick={handleStartEdit}
                                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                                            title="Edit post"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePost(selectedPost.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete post"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {selectedPost.seoKeywords.map(kw => (
                                        <span key={kw} className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs rounded-full">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Post Content - Full Height with Edit Mode */}
                            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-600">Editing Mode</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                                                >
                                                    <Check size={14} /> Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 flex items-center gap-1"
                                                >
                                                    <X size={14} /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={editedContent}
                                            onChange={e => setEditedContent(e.target.value)}
                                            className="w-full h-96 p-4 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none resize-y"
                                            placeholder="Edit your blog content (Markdown supported)..."
                                        />
                                        <p className="text-xs text-slate-500">
                                            Word count: {editedContent.split(/\s+/).filter(w => w.length > 0).length} words
                                        </p>
                                    </div>
                                ) : (
                                    <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-800 prose-blockquote:border-brand-500 prose-blockquote:bg-brand-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
                                        <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {/* Inline Chat for follow-up questions about the blog */}
                            {!isEditing && (
                                <div className="p-4 border-t border-slate-100">
                                    <InlineChat
                                        context={`Title: ${selectedPost.title}\n\nContent: ${selectedPost.content}\n\nKeywords: ${selectedPost.seoKeywords.join(', ')}`}
                                        contextType="blog"
                                        placeholder="Ask about this blog post..."
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                                <button
                                    onClick={() => navigator.clipboard.writeText(selectedPost.content)}
                                    className="flex-1 py-2.5 border border-slate-300 rounded-lg hover:bg-white flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <Copy size={16} /> Copy Content
                                </button>
                                <button
                                    onClick={() => navigator.clipboard.writeText(`# ${selectedPost.title}\n\n${selectedPost.content}`)}
                                    className="flex-1 py-2.5 border border-slate-300 rounded-lg hover:bg-white flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <FileText size={16} /> Copy with Title
                                </button>
                                <button
                                    onClick={() => handleSchedule(selectedPost)}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <Calendar size={16} /> Schedule
                                </button>
                                <button
                                    onClick={() => handlePublish(selectedPost)}
                                    className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <ExternalLink size={16} /> Publish
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Post Selected</h3>
                            <p className="text-slate-500 text-sm">Research trending topics and generate a blog post to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

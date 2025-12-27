import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Loader, Plus, Calendar, ExternalLink, Copy, BarChart3, Sparkles } from 'lucide-react';
import { CompanyProfile, BlogPost, TrendingTopic } from '../types';
import { researchTrendingTopics, generateBlogPost, publishToWordPress } from '../services/blogService';
import { useFreeLLM } from '../hooks/useFreeLLM';
import ReactMarkdown from 'react-markdown';

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
    const [error, setError] = useState<string | null>(null);

    // Notify parent of state changes for persistence
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                topics,
                posts,
                selectedPost,
                nicheInput
            });
        }
    }, [topics, posts, selectedPost, nicheInput]);

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
            setError(`Failed to research topics: ${e.message || 'Unknown error'}`);
        } finally {
            setIsLoadingTopics(false);
        }
    };

    const handleGeneratePost = async (topic: TrendingTopic) => {
        setIsLoadingPost(true);
        try {
            // Generate a full comprehensive blog post (1500+ words)
            const post = await generateBlogPost(topic, profile, 1500);
            setPosts(prev => [post, ...prev]);
            setSelectedPost(post);
        } catch (e) {
            console.error('Failed to generate post:', e);
        } finally {
            setIsLoadingPost(false);
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

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Blog Content</h1>
                    <p className="text-slate-500 text-sm">Research trends and generate SEO-optimized blog posts</p>
                </div>
            </div>

            {quotaWarning && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    {quotaWarning}
                </div>
            )}

            {!isConfigured && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700">Please configure a free LLM API key to use blog generation features.</p>
                </div>
            )}

            <div className="flex gap-6">
                {/* Left Panel - Topics & Research */}
                <div className="w-96 shrink-0 space-y-6">
                    {/* Topic Research */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <TrendingUp size={18} />
                            Trending Topics
                        </h3>

                        <div className="space-y-3 mb-4">
                            <input
                                type="text"
                                value={nicheInput}
                                onChange={e => { setNicheInput(e.target.value); setError(null); }}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Enter your niche (e.g., Digital Marketing, AI, Fitness)..."
                            />
                            <button
                                onClick={handleResearchTopics}
                                disabled={isLoadingTopics || !isConfigured || !nicheInput.trim()}
                                className="w-full py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoadingTopics ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        Researching... (this may take 10-20 seconds)
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp size={16} />
                                        Research Trends
                                    </>
                                )}
                            </button>

                            {/* Error Display */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    <p className="font-medium">⚠️ {error}</p>
                                    <p className="text-xs mt-1 text-red-600">Check browser console (F12) for more details.</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {topics.map(topic => (
                                <div key={topic.id} className="p-3 border border-slate-200 rounded-lg hover:border-brand-300 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(topic.trendScore)}`}>
                                            {topic.trendScore}%
                                        </span>
                                        <span className="text-xs text-slate-500">{topic.category}</span>
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
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {posts.map(post => (
                                <button
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedPost?.id === post.id
                                        ? 'bg-brand-50 border-brand-300 border'
                                        : 'border border-slate-200 hover:border-slate-300'
                                        }`}
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
                                </button>
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

                            {/* Post Content - Full Height */}
                            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                                <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-800 prose-blockquote:border-brand-500 prose-blockquote:bg-brand-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
                                    <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                                </div>
                            </div>

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

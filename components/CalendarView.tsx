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
    Save,
    Send,
    ExternalLink,
    AlertCircle,
    Link2
} from 'lucide-react';
import { CompanyProfile, SocialPost, AutoPilotConfig } from '../types';
import {
    generateContentTopics,
    generatePostCaption,
    generatePostImage,
    generateBatchContent
} from '../services/openaiService';
import {
    publishToSocialMedia,
    isPlatformConfigured,
    isPublishingConfigured,
    getConfiguredPlatforms,
    SOCIAL_PLATFORMS_CONFIG,
    PublishResult
} from '../services/socialPublishService';
import SocialConnectionModal from './SocialConnectionModal';

interface CalendarViewProps {
    profile: CompanyProfile;
    savedState?: any;
    onStateChange?: (state: any) => void;
}

// Social Media Brand Icons (SVG Components)
const InstagramIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
);

const FacebookIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);

const LinkedInIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
);

const TwitterXIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const TikTokIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
);

const YouTubeIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

const PinterestIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
);

const ThreadsIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.1-1.147 3.434-1.174.93-.018 1.79.084 2.583.303-.048-.715-.244-1.254-.594-1.628-.41-.436-1.044-.664-1.886-.679-1.637.006-2.376.79-2.671 1.263l-1.705-1.187c.297-.473.812-1.074 1.64-1.53.974-.535 2.145-.82 3.49-.85 1.565.037 2.774.483 3.594 1.325.753.773 1.17 1.825 1.236 3.128.016.009.031.017.046.027.992.57 1.765 1.327 2.3 2.253.732 1.27.942 2.76.609 4.31-.405 1.89-1.455 3.555-3.035 4.815-1.71 1.365-3.932 2.09-6.612 2.16z" />
        <path d="M11.935 12.12c-1.094.02-1.94.332-2.445.902-.397.45-.584.996-.558 1.624.048.89.526 1.55 1.356 1.87.453.175.954.263 1.488.263.113 0 .227-.004.342-.013.929-.05 1.675-.36 2.178-.905.576-.623.78-1.476.68-2.495a8.2 8.2 0 0 0-.008-.085c-.659-.16-1.4-.157-2.028-.167-.336-.006-.68-.001-1.005.006z" />
    </svg>
);

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

// Social platforms configuration with proper brand icons
const SOCIAL_PLATFORMS = [
    { id: 'Instagram', name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: InstagramIcon },
    { id: 'Facebook', name: 'Facebook', color: 'bg-blue-600', icon: FacebookIcon },
    { id: 'LinkedIn', name: 'LinkedIn', color: 'bg-blue-700', icon: LinkedInIcon },
    { id: 'Twitter', name: 'X (Twitter)', color: 'bg-slate-900', icon: TwitterXIcon },
    { id: 'TikTok', name: 'TikTok', color: 'bg-black', icon: TikTokIcon },
    { id: 'YouTube', name: 'YouTube', color: 'bg-red-600', icon: YouTubeIcon },
    { id: 'Pinterest', name: 'Pinterest', color: 'bg-red-500', icon: PinterestIcon },
    { id: 'Threads', name: 'Threads', color: 'bg-slate-800', icon: ThreadsIcon },
    { id: 'WhatsApp', name: 'WhatsApp', color: 'bg-green-500', icon: WhatsAppIcon },
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
            Threads: 2,
            WhatsApp: 2
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
        setSelectedPosts(prev => {
            const next = new Set(prev);
            next.delete(postId);
            return next;
        });
    };

    // Delete a topic
    const handleDeleteTopic = (topicIndex: number) => {
        setTopics(prev => prev.filter((_, index) => index !== topicIndex));
        setSelectedTopics(prev => {
            const next = new Set(prev);
            next.delete(topicIndex);
            return next;
        });
    };

    // Selection state for topics and posts
    const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
    const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

    // Topic selection handlers
    const handleSelectTopic = (index: number) => {
        setSelectedTopics(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleSelectAllTopics = () => {
        if (selectedTopics.size === topics.length) {
            setSelectedTopics(new Set());
        } else {
            setSelectedTopics(new Set(topics.map((_, i) => i)));
        }
    };

    const handleDeleteSelectedTopics = () => {
        if (selectedTopics.size === 0) return;
        const confirm = window.confirm(`Delete ${selectedTopics.size} selected topic(s)?`);
        if (confirm) {
            setTopics(prev => prev.filter((_, index) => !selectedTopics.has(index)));
            setSelectedTopics(new Set());
        }
    };

    const handleClearAllTopics = () => {
        const confirm = window.confirm('Delete all topic ideas? This cannot be undone.');
        if (confirm) {
            setTopics([]);
            setSelectedTopics(new Set());
        }
    };

    // Post selection handlers
    const handleSelectPost = (id: string) => {
        setSelectedPosts(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
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
        const confirm = window.confirm(`Delete ${selectedPosts.size} selected post(s)?`);
        if (confirm) {
            setPosts(prev => prev.filter(p => !selectedPosts.has(p.id)));
            setSelectedPosts(new Set());
        }
    };

    const handleClearAllPosts = () => {
        const confirm = window.confirm('Delete all scheduled posts? This cannot be undone.');
        if (confirm) {
            setPosts([]);
            setSelectedPosts(new Set());
        }
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

    // State to track publishing posts
    const [publishingPosts, setPublishingPosts] = useState<Set<string>>(new Set());

    // Publish a post to its social media platform
    const handlePublishPost = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) {
            console.error('[Publish] Post not found:', postId);
            return;
        }

        // Check if platform is configured
        if (!isPlatformConfigured(post.platform.toLowerCase())) {
            alert(`${post.platform} publishing is not configured. Please add your API credentials in the environment variables.`);
            return;
        }

        // Mark as publishing
        setPublishingPosts(prev => new Set(prev).add(postId));
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, status: 'Publishing' as const } : p
        ));

        try {
            console.log(`[Publish] Publishing to ${post.platform}...`);

            const result = await publishToSocialMedia(post.platform.toLowerCase(), {
                caption: post.caption,
                imageUrl: post.imageUrl,
                platform: post.platform,
            });

            if (result.success) {
                console.log(`[Publish] Success! Post ID: ${result.postId}`);
                setPosts(prev => prev.map(p =>
                    p.id === postId ? {
                        ...p,
                        status: 'Published' as const,
                        publishedAt: new Date(),
                        externalPostId: result.postId,
                        externalPostUrl: result.postUrl,
                        publishError: undefined,
                    } : p
                ));
                alert(`✅ Successfully published to ${post.platform}!`);
            } else {
                console.error(`[Publish] Failed:`, result.error);
                setPosts(prev => prev.map(p =>
                    p.id === postId ? {
                        ...p,
                        status: 'Failed' as const,
                        publishError: result.error,
                    } : p
                ));
                alert(`❌ Failed to publish to ${post.platform}: ${result.error}`);
            }
        } catch (error: any) {
            console.error(`[Publish] Error:`, error);
            setPosts(prev => prev.map(p =>
                p.id === postId ? {
                    ...p,
                    status: 'Failed' as const,
                    publishError: error.message || 'Unknown error',
                } : p
            ));
            alert(`❌ Error publishing to ${post.platform}: ${error.message}`);
        } finally {
            setPublishingPosts(prev => {
                const next = new Set(prev);
                next.delete(postId);
                return next;
            });
        }
    };

    // Check if publishing is available
    const publishingAvailable = isPublishingConfigured();
    const configuredPlatformsList = getConfiguredPlatforms();

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col relative">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900">Content Calendar</h1>
                <div className="flex gap-2 flex-wrap">
                    {/* Connect Accounts Button */}
                    <button
                        onClick={() => setShowConnectAccounts(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg transition-all text-xs sm:text-sm active:scale-95 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-indigo-300"
                    >
                        <Link2 size={16} />
                        <span className="hidden sm:inline">Connect Accounts</span>
                        <span className="sm:hidden">Connect</span>
                    </button>
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

                    {/* Topic Actions Bar */}
                    {topics.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-200">
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
                                </button>
                            </div>
                        </div>
                    )}

                    {topics.length === 0 && (
                        <div className="bg-white/50 border border-dashed border-slate-200 p-6 sm:p-8 rounded-xl text-center">
                            <p className="text-slate-400 italic text-xs sm:text-sm">No topics yet. Click generate ideas to get started.</p>
                        </div>
                    )}
                    {topics.map((t, i) => (
                        <div
                            key={i}
                            className={`bg-white p-3 sm:p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all active:scale-[0.98] ${selectedTopics.has(i) ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-300'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedTopics.has(i)}
                                onChange={() => handleSelectTopic(i)}
                                className="rounded border-slate-300 shrink-0"
                            />
                            <span className="text-xs sm:text-sm text-slate-800 font-medium flex-1">{t}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDeleteTopic(i)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Delete topic"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button
                                    onClick={() => openCreator(t)}
                                    className="bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-brand-600 hover:text-white active:scale-95 whitespace-nowrap"
                                >
                                    Create
                                </button>
                            </div>
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
                    <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex justify-between items-center mb-3">
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

                        {/* Post Actions Bar */}
                        {posts.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedPosts.size === posts.length && posts.length > 0}
                                        onChange={handleSelectAllPosts}
                                        className="rounded border-slate-300"
                                    />
                                    Select All ({selectedPosts.size} selected)
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
                                        <span className="hidden sm:inline">Clear All</span>
                                    </button>
                                </div>
                            </div>
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
                            <div
                                key={post.id}
                                className={`flex gap-4 p-4 border rounded-xl transition-all group relative ${selectedPosts.has(post.id) ? 'border-brand-400 ring-2 ring-brand-100 bg-brand-50/30' : 'border-slate-100 hover:bg-slate-50'
                                    }`}
                            >
                                {/* Checkbox */}
                                <div className="flex items-start pt-1 shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedPosts.has(post.id)}
                                        onChange={() => handleSelectPost(post.id)}
                                        className="rounded border-slate-300"
                                    />
                                </div>
                                {/* Action buttons - always visible */}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                        onClick={() => handleEditPost(post)}
                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm"
                                        title="Edit post"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-300 transition-all shadow-sm"
                                        title="Delete post"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {(post.status === 'Scheduled' || post.status === 'Failed') && isPlatformConfigured(post.platform.toLowerCase()) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePublishPost(post.id);
                                            }}
                                            disabled={publishingPosts.has(post.id)}
                                            className={`p-1.5 rounded-lg transition-all ${publishingPosts.has(post.id)
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                                }`}
                                            title="Publish Now"
                                        >
                                            {publishingPosts.has(post.id) ? (
                                                <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                                            ) : (
                                                <Send size={14} />
                                            )}
                                        </button>
                                    )}
                                    {!isPlatformConfigured(post.platform.toLowerCase()) && post.status !== 'Published' && (
                                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                            Not configured
                                        </span>
                                    )}
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
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' :
                                            post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-700' :
                                                post.platform === 'Facebook' ? 'bg-blue-100 text-blue-600' :
                                                    post.platform === 'TikTok' ? 'bg-slate-900 text-white' :
                                                        post.platform === 'YouTube' ? 'bg-red-100 text-red-700' :
                                                            post.platform === 'Pinterest' ? 'bg-red-50 text-red-600' :
                                                                post.platform === 'Threads' ? 'bg-slate-100 text-slate-700' :
                                                                    post.platform === 'WhatsApp' ? 'bg-green-100 text-green-700' :
                                                                        'bg-slate-200 text-slate-700'
                                            }`}>
                                            {post.platform}
                                        </span>
                                        {/* Dynamic Status Badge */}
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${post.status === 'Published' ? 'bg-green-50 text-green-700 border-green-100' :
                                            post.status === 'Publishing' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                post.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-teal-50 text-teal-700 border-teal-100'
                                            }`}>
                                            {post.status === 'Publishing' ? '⏳ Publishing...' :
                                                post.status === 'Published' ? '✓ Published' :
                                                    post.status === 'Failed' ? '✗ Failed' :
                                                        'Scheduled'}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-900 mb-1 text-sm truncate">{post.topic}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{post.caption}</p>
                                    {/* Show error message if failed */}
                                    {post.status === 'Failed' && post.publishError && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {post.publishError}
                                        </p>
                                    )}
                                    {/* Show link if published */}
                                    {post.status === 'Published' && post.externalPostUrl && (
                                        <a
                                            href={post.externalPostUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 flex items-center gap-1"
                                        >
                                            <ExternalLink size={12} />
                                            View on {post.platform}
                                        </a>
                                    )}
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
                                                {platform?.icon && <platform.icon size={14} />} {platform?.name}
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
                                                    <span className="text-lg"><platform.icon size={18} /></span>
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
                                            <button
                                                onClick={() => handleRejectSingle(post.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete post"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button onClick={() => handleRejectSingle(post.id)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Reject post"><XCircle size={18} /></button>
                                            <button onClick={() => handleApproveSingle(post.id)} className="p-1.5 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-all" title="Approve post"><CheckCircle size={18} /></button>
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
                                        <div className="flex flex-wrap gap-2">
                                            {SOCIAL_PLATFORMS.map(platform => (
                                                <button
                                                    key={platform.id}
                                                    onClick={() => setCreatorState({ ...creatorState, platform: platform.id })}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${creatorState.platform === platform.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    <platform.icon size={14} />
                                                    {platform.name}
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

            {/* Social Connection Modal */}
            <SocialConnectionModal
                isOpen={showConnectAccounts}
                onClose={() => setShowConnectAccounts(false)}
                userId={undefined} // Pass user ID from auth context when available
                profileId={profile?.id}
            />
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

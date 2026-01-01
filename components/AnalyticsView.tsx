import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    Users,
    Eye,
    MousePointerClick,
    Globe,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    ArrowUp,
    ArrowDown,
    RefreshCw,
    Calendar,
    Target
} from 'lucide-react';
import { AnalyticsData, SocialPlatform, CompanyProfile } from '../types';
import { getSocialConnections, getPublishingStatus } from '../services/socialPublishingService';

interface AnalyticsViewProps {
    profile: CompanyProfile;
}

// Platform icons mapping
const platformIcons: Record<SocialPlatform, React.ReactNode> = {
    instagram: <Instagram size={18} />,
    facebook: <Facebook size={18} />,
    twitter: <Twitter size={18} />,
    linkedin: <Linkedin size={18} />,
    youtube: <Youtube size={18} />,
    tiktok: <span className="text-sm font-bold">TT</span>,
    pinterest: <span className="text-sm font-bold">P</span>,
    threads: <span className="text-sm font-bold">@</span>,
};

// Platform colors
const platformColors: Record<SocialPlatform, string> = {
    instagram: 'from-pink-500 to-purple-600',
    facebook: 'from-blue-600 to-blue-700',
    twitter: 'from-sky-400 to-sky-600',
    linkedin: 'from-blue-700 to-blue-800',
    youtube: 'from-red-500 to-red-700',
    tiktok: 'from-gray-900 to-gray-800',
    pinterest: 'from-red-600 to-red-700',
    threads: 'from-gray-800 to-gray-900',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ profile }) => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
    const [isLoading, setIsLoading] = useState(false);
    const connections = getSocialConnections();
    const publishingStatus = getPublishingStatus();

    // Mock analytics data (in production, fetch from APIs)
    const mockAnalytics: AnalyticsData = {
        period: 'week',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        website: profile.website ? {
            visitors: 2847,
            pageViews: 8234,
            bounceRate: 42.3,
            avgSessionDuration: 185, // seconds
            topPages: [
                { page: '/home', views: 3421 },
                { page: '/products', views: 2156 },
                { page: '/about', views: 891 },
                { page: '/contact', views: 654 },
            ],
        } : undefined,
        social: connections.filter(c => c.isConnected).map(c => ({
            platform: c.platform,
            followers: c.followerCount || 0,
            followersGrowth: Math.floor(Math.random() * 200) - 50,
            impressions: Math.floor(Math.random() * 50000) + 5000,
            engagement: Math.floor(Math.random() * 5000) + 500,
            engagementRate: Math.random() * 8 + 1,
            posts: Math.floor(Math.random() * 10) + 1,
            topPosts: [],
        })),
        leads: {
            generated: 47,
            converted: 12,
            conversionRate: 25.5,
        },
    };

    const StatCard = ({
        title,
        value,
        change,
        icon,
        color = 'brand'
    }: {
        title: string;
        value: string | number;
        change?: number;
        icon: React.ReactNode;
        color?: string;
    }) => (
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg bg-${color}-100`}>
                    {icon}
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(change)}%
                    </div>
                )}
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500 mt-1">{title}</div>
        </div>
    );

    const SocialCard = ({
        platform,
        data
    }: {
        platform: SocialPlatform;
        data: NonNullable<AnalyticsData['social']>[0];
    }) => (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platformColors[platform]} flex items-center justify-center text-white`}>
                    {platformIcons[platform]}
                </div>
                <div>
                    <div className="font-semibold text-slate-800 capitalize">{platform}</div>
                    <div className="text-xs text-slate-500">
                        {data.followers.toLocaleString()} followers
                        <span className={`ml-2 ${data.followersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.followersGrowth >= 0 ? '+' : ''}{data.followersGrowth}
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                    <div className="text-lg font-bold text-slate-800">{(data.impressions / 1000).toFixed(1)}K</div>
                    <div className="text-xs text-slate-500">Impressions</div>
                </div>
                <div>
                    <div className="text-lg font-bold text-slate-800">{data.engagement.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Engagement</div>
                </div>
                <div>
                    <div className="text-lg font-bold text-slate-800">{data.engagementRate.toFixed(1)}%</div>
                    <div className="text-xs text-slate-500">Eng. Rate</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="text-brand-600" size={24} />
                        Analytics Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Track your marketing performance across all channels</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period selector */}
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {(['day', 'week', 'month'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${period === p
                                        ? 'bg-white text-brand-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsLoading(true)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Website Visitors"
                    value={mockAnalytics.website?.visitors.toLocaleString() || '—'}
                    change={12.5}
                    icon={<Globe size={20} className="text-brand-600" />}
                />
                <StatCard
                    title="Total Followers"
                    value={connections.reduce((sum, c) => sum + (c.followerCount || 0), 0).toLocaleString()}
                    change={8.3}
                    icon={<Users size={20} className="text-purple-600" />}
                />
                <StatCard
                    title="Total Impressions"
                    value={`${((mockAnalytics.social?.reduce((sum, s) => sum + s.impressions, 0) || 0) / 1000).toFixed(1)}K`}
                    change={23.1}
                    icon={<Eye size={20} className="text-blue-600" />}
                />
                <StatCard
                    title="Leads Generated"
                    value={mockAnalytics.leads?.generated || 0}
                    change={mockAnalytics.leads?.conversionRate}
                    icon={<Target size={20} className="text-green-600" />}
                />
            </div>

            {/* Website Analytics (if connected) */}
            {profile.website && mockAnalytics.website && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Globe size={20} className="text-brand-600" />
                        Website Performance
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-2xl font-bold text-slate-800">{mockAnalytics.website.visitors.toLocaleString()}</div>
                            <div className="text-sm text-slate-500">Visitors</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-2xl font-bold text-slate-800">{mockAnalytics.website.pageViews.toLocaleString()}</div>
                            <div className="text-sm text-slate-500">Page Views</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-2xl font-bold text-slate-800">{mockAnalytics.website.bounceRate}%</div>
                            <div className="text-sm text-slate-500">Bounce Rate</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-2xl font-bold text-slate-800">{Math.floor(mockAnalytics.website.avgSessionDuration / 60)}:{(mockAnalytics.website.avgSessionDuration % 60).toString().padStart(2, '0')}</div>
                            <div className="text-sm text-slate-500">Avg. Session</div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                        📊 Connect Google Analytics to see real data. <a href="#" className="text-brand-600 hover:underline">Learn how →</a>
                    </p>
                </div>
            )}

            {/* Social Media Analytics */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-brand-600" />
                    Social Media Performance
                </h2>

                {connections.filter(c => c.isConnected).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mockAnalytics.social?.map(data => (
                            <SocialCard key={data.platform} platform={data.platform} data={data} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={32} className="text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-700 mb-2">No Social Accounts Connected</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Connect your social media accounts to see performance analytics.
                        </p>
                        <button
                            onClick={() => window.location.hash = '#/settings'}
                            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                        >
                            Connect Accounts
                        </button>
                    </div>
                )}
            </div>

            {/* Lead Conversion */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MousePointerClick size={20} className="text-brand-600" />
                    Lead Conversion
                </h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">{mockAnalytics.leads?.generated}</div>
                        <div className="text-sm text-slate-600">Generated</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">{mockAnalytics.leads?.converted}</div>
                        <div className="text-sm text-slate-600">Converted</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">{mockAnalytics.leads?.conversionRate}%</div>
                        <div className="text-sm text-slate-600">Conversion Rate</div>
                    </div>
                </div>
            </div>

            {/* Publishing Status */}
            <div className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl border border-brand-100 p-5">
                <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Calendar size={20} className="text-brand-600" />
                    Auto-Publishing Status
                </h2>
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${publishingStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="text-sm text-slate-700">
                            {publishingStatus.isRunning ? 'Auto-publisher active' : 'Auto-publisher inactive'}
                        </span>
                    </div>
                    <div className="text-sm text-slate-600">
                        <strong>{publishingStatus.pendingPosts}</strong> posts scheduled
                    </div>
                    <div className="text-sm text-slate-600">
                        <strong>{publishingStatus.connectedPlatforms.length}</strong> platforms connected
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;

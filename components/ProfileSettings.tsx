import React, { useState, useEffect } from 'react';
import { User, Building2, Target, MessageSquare, Goal, Save, CheckCircle, ArrowLeft, Sparkles, RefreshCw, Globe, Link, Instagram, Facebook, Twitter, Linkedin, Youtube, Unlink, Cloud } from 'lucide-react';
import { CompanyProfile, SocialPlatform } from '../types';
import { getSocialConnections, isConnected, simulateConnect, disconnectPlatform } from '../services/socialPublishingService';
import { GoogleWorkspaceIntegration } from './GoogleWorkspaceIntegration';

interface ProfileSettingsProps {
    profile: CompanyProfile;
    onSave: (profile: CompanyProfile) => void;
    onBack: () => void;
    onCloudDiagnostics?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onSave, onBack, onCloudDiagnostics }) => {
    const [formData, setFormData] = useState<CompanyProfile>(profile);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Track changes
    useEffect(() => {
        const changed = JSON.stringify(formData) !== JSON.stringify(profile);
        setHasChanges(changed);
    }, [formData, profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle nested social media fields
    const handleSocialChange = (platform: string, value: string) => {
        setFormData({
            ...formData,
            socialMedia: {
                ...formData.socialMedia,
                [platform]: value
            }
        });
    };

    // Social Connections State
    const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Load initial connections
        const initialConnections: Record<string, boolean> = {};
        const storedConnections = getSocialConnections();
        storedConnections.forEach(c => {
            if (c.isConnected) initialConnections[c.platform] = true;
        });
        setConnectedPlatforms(initialConnections);
    }, []);

    const handleConnect = (platform: SocialPlatform) => {
        // In a real app, this would trigger OAuth flow
        // For demo, we simulate a successful connection
        simulateConnect(platform);
        setConnectedPlatforms(prev => ({ ...prev, [platform]: true }));
    };

    const handleDisconnect = (platform: SocialPlatform) => {
        disconnectPlatform(platform);
        setConnectedPlatforms(prev => ({ ...prev, [platform]: false }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.description) return;

        setIsSaving(true);

        // Simulate a brief save delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        onSave(formData);
        setIsSaving(false);
        setShowSuccess(true);
        setHasChanges(false);

        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleReset = () => {
        setFormData(profile);
        setHasChanges(false);
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <User className="text-brand-600" size={24} />
                            Profile Settings
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm">Update your business profile for better assistant-powered marketing</p>
                    </div>
                </div>
                {showSuccess && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm animate-fade-in">
                        <CheckCircle size={16} />
                        Profile saved successfully!
                    </div>
                )}
            </div>

            {/* Profile Form */}
            <div className="max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Business Identity Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Building2 size={20} className="text-brand-600" />
                            Business Identity
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                    placeholder="Your Company Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Industry <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                    placeholder="e.g., Technology, Retail, Healthcare"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Business Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full border border-slate-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all"
                                placeholder="Describe what your business does, your products or services..."
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                This helps our assistant generate more relevant marketing content for your business.
                            </p>
                        </div>
                    </div>

                    {/* Website & Social Media Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Globe size={20} className="text-brand-600" />
                            Website & Social Media
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Connect your website and social profiles to enable analytics tracking and auto-publishing.
                        </p>

                        {/* Website */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Business Website
                            </label>
                            <input
                                name="website"
                                value={formData.website || ''}
                                onChange={handleChange}
                                className="w-full border border-slate-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder="https://www.yourcompany.com"
                            />
                        </div>

                        {/* Social Media Connections */}
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Connect Your Accounts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Instagram */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border ${connectedPlatforms.instagram ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                        <Instagram size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">Instagram</div>
                                        <div className="text-xs text-slate-500">
                                            {connectedPlatforms.instagram ? '✓ Connected' : 'Not connected'}
                                        </div>
                                    </div>
                                </div>
                                {connectedPlatforms.instagram ? (
                                    <button onClick={() => handleDisconnect('instagram')} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button onClick={() => handleConnect('instagram')} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                        Connect
                                    </button>
                                )}
                            </div>

                            {/* Facebook */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border ${connectedPlatforms.facebook ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                                        <Facebook size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">Facebook</div>
                                        <div className="text-xs text-slate-500">
                                            {connectedPlatforms.facebook ? '✓ Connected' : 'Not connected'}
                                        </div>
                                    </div>
                                </div>
                                {connectedPlatforms.facebook ? (
                                    <button onClick={() => handleDisconnect('facebook')} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button onClick={() => handleConnect('facebook')} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                        Connect
                                    </button>
                                )}
                            </div>

                            {/* Twitter/X */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border ${connectedPlatforms.twitter ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                                        <Twitter size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">Twitter / X</div>
                                        <div className="text-xs text-slate-500">
                                            {connectedPlatforms.twitter ? '✓ Connected' : 'Not connected'}
                                        </div>
                                    </div>
                                </div>
                                {connectedPlatforms.twitter ? (
                                    <button onClick={() => handleDisconnect('twitter')} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button onClick={() => handleConnect('twitter')} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                        Connect
                                    </button>
                                )}
                            </div>

                            {/* LinkedIn */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border ${connectedPlatforms.linkedin ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center">
                                        <Linkedin size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">LinkedIn</div>
                                        <div className="text-xs text-slate-500">
                                            {connectedPlatforms.linkedin ? '✓ Connected' : 'Not connected'}
                                        </div>
                                    </div>
                                </div>
                                {connectedPlatforms.linkedin ? (
                                    <button onClick={() => handleDisconnect('linkedin')} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button onClick={() => handleConnect('linkedin')} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                        Connect
                                    </button>
                                )}
                            </div>

                            {/* TikTok */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border ${connectedPlatforms.tiktok ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">TT</span>
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">TikTok</div>
                                        <div className="text-xs text-slate-500">
                                            {connectedPlatforms.tiktok ? '✓ Connected' : 'Not connected'}
                                        </div>
                                    </div>
                                </div>
                                {connectedPlatforms.tiktok ? (
                                    <button onClick={() => handleDisconnect('tiktok')} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button onClick={() => handleConnect('tiktok')} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                        Connect
                                    </button>
                                )}
                            </div>

                            {/* YouTube */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border ${connectedPlatforms.youtube ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
                                        <Youtube size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">YouTube</div>
                                        <div className="text-xs text-slate-500">
                                            {connectedPlatforms.youtube ? '✓ Connected' : 'Not connected'}
                                        </div>
                                    </div>
                                </div>
                                {connectedPlatforms.youtube ? (
                                    <button onClick={() => handleDisconnect('youtube')} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button onClick={() => handleConnect('youtube')} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                        Connect
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-800">
                                ⚠️ <strong>Demo Mode:</strong> Click "Connect" to simulate a connection. In production, this would launch the official OAuth flow for each platform.
                            </p>
                        </div>
                    </div>

                    {/* Google Workspace Integration */}
                    <GoogleWorkspaceIntegration />

                    {/* Target Audience Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Target size={20} className="text-brand-600" />
                            Target Audience
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Who are your ideal customers?
                            </label>
                            <textarea
                                name="targetAudience"
                                value={formData.targetAudience}
                                onChange={handleChange}
                                rows={2}
                                className="w-full border border-slate-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all"
                                placeholder="e.g., Small business owners aged 25-45, tech-savvy professionals, health-conscious millennials..."
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Be specific about demographics, interests, and behaviors for better targeting.
                            </p>
                        </div>
                    </div>

                    {/* Brand Voice Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className="text-brand-600" />
                            Brand Voice & Personality
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                How should your brand communicate?
                            </label>
                            <input
                                name="brandVoice"
                                value={formData.brandVoice}
                                onChange={handleChange}
                                className="w-full border border-slate-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder="e.g., Professional yet approachable, Friendly and casual, Bold and innovative..."
                            />
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-xs text-slate-500">Quick picks:</span>
                                {['Professional', 'Friendly', 'Bold', 'Casual', 'Authoritative', 'Playful'].map(voice => (
                                    <button
                                        key={voice}
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            brandVoice: prev.brandVoice ? `${prev.brandVoice}, ${voice}` : voice
                                        }))}
                                        className="px-2 py-1 text-xs bg-slate-100 hover:bg-brand-100 text-slate-600 hover:text-brand-700 rounded transition-colors"
                                    >
                                        + {voice}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Marketing Goals Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Goal size={20} className="text-brand-600" />
                            Marketing Goals
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                What do you want to achieve with your marketing?
                            </label>
                            <textarea
                                name="goals"
                                value={formData.goals}
                                onChange={handleChange}
                                rows={3}
                                className="w-full border border-slate-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all"
                                placeholder="e.g., Increase brand awareness, Generate more leads, Drive website traffic, Boost social media engagement, Launch new product..."
                            />
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-xs text-slate-500">Common goals:</span>
                                {['Brand awareness', 'Lead generation', 'Sales growth', 'Customer retention', 'Thought leadership'].map(goal => (
                                    <button
                                        key={goal}
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            goals: prev.goals ? `${prev.goals}, ${goal}` : goal
                                        }))}
                                        className="px-2 py-1 text-xs bg-slate-100 hover:bg-brand-100 text-slate-600 hover:text-brand-700 rounded transition-colors"
                                    >
                                        + {goal}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Agent Tips Card */}
                    <div className="bg-gradient-to-r from-brand-50 to-indigo-50 rounded-xl border border-brand-100 p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-brand-100 rounded-lg">
                                <Sparkles size={20} className="text-brand-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-1">Pro Tip: Better Profile = Better Results</h3>
                                <p className="text-sm text-slate-600">
                                    The more detailed your profile, the better our marketing assistant can tailor strategies,
                                    content ideas, and outreach campaigns specifically for your business. Take time to
                                    fill in all fields for optimal results.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cloud Storage Diagnostics */}
                    {onCloudDiagnostics && (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Cloud size={20} className="text-slate-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 mb-1">Cloud Storage Status</h3>
                                    <p className="text-sm text-slate-600 mb-3">
                                        Check if your data is being saved to the cloud. Use this tool to diagnose any sync issues.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={onCloudDiagnostics}
                                        className="bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-300 transition-all text-sm flex items-center gap-2"
                                    >
                                        <Cloud size={16} />
                                        Run Cloud Diagnostics
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSaving || !hasChanges}
                            className="flex-1 sm:flex-none bg-brand-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                        {hasChanges && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="sm:flex-none bg-slate-100 text-slate-700 font-medium py-3 px-6 rounded-lg hover:bg-slate-200 transition-all"
                            >
                                Discard Changes
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

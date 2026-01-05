import React, { useState, useEffect } from 'react';
import { X, Link2, Unlink, CheckCircle, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { initiateOAuth, getConnectedAccounts, disconnectAccount } from '../services/socialOAuthService';
import { SOCIAL_PLATFORMS_CONFIG, isPlatformConfigured } from '../services/socialPublishService';

interface SocialConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
    profileId?: string;
}

interface ConnectedAccount {
    id: string;
    platform: string;
    platform_username?: string;
    connected_at: string;
    is_active: boolean;
}

const PLATFORMS = [
    { id: 'facebook', name: 'Facebook', icon: '👤', color: 'bg-blue-600', textColor: 'text-white' },
    { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-gradient-to-r from-purple-500 to-pink-500', textColor: 'text-white' },
    { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'bg-slate-900', textColor: 'text-white' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700', textColor: 'text-white' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-slate-800', textColor: 'text-white' },
    { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'bg-red-600', textColor: 'text-white' },
];

export default function SocialConnectionModal({
    isOpen,
    onClose,
    userId,
    profileId
}: SocialConnectionModalProps) {
    const [connections, setConnections] = useState<ConnectedAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId && profileId) {
            loadConnections();
        }
    }, [isOpen, userId, profileId]);

    const loadConnections = async () => {
        if (!userId || !profileId) return;
        setLoading(true);
        try {
            const accounts = await getConnectedAccounts(userId, profileId);
            setConnections(accounts);
        } catch (error) {
            console.error('Failed to load connections:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform: string) => {
        setConnecting(platform);
        try {
            initiateOAuth(platform);
        } catch (error) {
            console.error('Failed to initiate OAuth:', error);
            setConnecting(null);
        }
    };

    const handleDisconnect = async (connectionId: string, platform: string) => {
        setDisconnecting(platform);
        try {
            const success = await disconnectAccount(connectionId);
            if (success) {
                setConnections(prev => prev.filter(c => c.id !== connectionId));
            }
        } catch (error) {
            console.error('Failed to disconnect:', error);
        } finally {
            setDisconnecting(null);
        }
    };

    const isConnected = (platform: string) => {
        return connections.some(c => c.platform.toLowerCase() === platform.toLowerCase() && c.is_active);
    };

    const getConnection = (platform: string) => {
        return connections.find(c => c.platform.toLowerCase() === platform.toLowerCase() && c.is_active);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Link2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Connect Social Accounts</h2>
                            <p className="text-white/80 text-sm">Link your accounts to enable auto-publishing</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        PLATFORMS.map(platform => {
                            const connected = isConnected(platform.id);
                            const connection = getConnection(platform.id);
                            const isConfigured = isPlatformConfigured(platform.id);
                            const isConnecting = connecting === platform.id;
                            const isDisconnecting = disconnecting === platform.id;

                            return (
                                <div
                                    key={platform.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${connected
                                            ? 'border-green-200 bg-green-50'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-lg`}>
                                            {platform.icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{platform.name}</p>
                                            {connected && connection?.platform_username ? (
                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                    <CheckCircle size={12} />
                                                    Connected as {connection.platform_username}
                                                </p>
                                            ) : isConfigured ? (
                                                <p className="text-xs text-slate-500">Ready to connect</p>
                                            ) : (
                                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    API not configured
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        {connected ? (
                                            <button
                                                onClick={() => connection && handleDisconnect(connection.id, platform.id)}
                                                disabled={isDisconnecting}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-all disabled:opacity-50"
                                            >
                                                {isDisconnecting ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Unlink size={16} />
                                                )}
                                                Disconnect
                                            </button>
                                        ) : isConfigured ? (
                                            <button
                                                onClick={() => handleConnect(platform.id)}
                                                disabled={isConnecting}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
                                            >
                                                {isConnecting ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Link2 size={16} />
                                                )}
                                                Connect
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 px-3 py-1.5 bg-slate-100 rounded-lg">
                                                Not available
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                        <ExternalLink size={14} className="flex-shrink-0 mt-0.5" />
                        <p>
                            Connecting your accounts allows Social AI to publish content directly to your profiles.
                            You can disconnect at any time.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

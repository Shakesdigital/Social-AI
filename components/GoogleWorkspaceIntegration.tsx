import React, { useState, useEffect } from 'react';
import {
    Cloud,
    Calendar,
    FileSpreadsheet,
    FileText,
    Mail,
    HardDrive,
    Link2,
    Unlink,
    Check,
    AlertCircle,
    Loader,
    ExternalLink,
    Download
} from 'lucide-react';
import {
    isGoogleConfigured,
    isGoogleConnected,
    connectGoogleWorkspace,
    disconnectGoogleWorkspace,
    exportScheduleToCalendar,
    exportLeadsToSheets,
    exportToGoogleDoc,
} from '../services/googleWorkspaceService';

interface GoogleWorkspaceIntegrationProps {
    // Data to export
    scheduledPosts?: Array<{
        title: string;
        content: string;
        scheduledDate: string;
        platform?: string;
    }>;
    leads?: Array<{
        name: string;
        email?: string;
        phone?: string;
        website?: string;
        notes?: string;
    }>;
    researchContent?: { title: string; content: string };
    strategyContent?: { title: string; content: string };
}

export const GoogleWorkspaceIntegration: React.FC<GoogleWorkspaceIntegrationProps> = ({
    scheduledPosts = [],
    leads = [],
    researchContent,
    strategyContent,
}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState<string | null>(null);

    useEffect(() => {
        setIsConnected(isGoogleConnected());
    }, []);

    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            await connectGoogleWorkspace();
            setIsConnected(true);
            setSuccessMessage('Connected to Google Workspace!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        disconnectGoogleWorkspace();
        setIsConnected(false);
        setSuccessMessage('Disconnected from Google Workspace');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleExportToCalendar = async () => {
        if (!scheduledPosts.length) {
            setError('No scheduled posts to export');
            return;
        }

        setIsExporting('calendar');
        setError(null);

        try {
            const result = await exportScheduleToCalendar(scheduledPosts);
            setSuccessMessage(`Exported ${result.success} events to Google Calendar!`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportLeads = async () => {
        if (!leads.length) {
            setError('No leads to export');
            return;
        }

        setIsExporting('sheets');
        setError(null);

        try {
            const result = await exportLeadsToSheets(leads);
            setSuccessMessage('Leads exported to Google Sheets!');
            window.open(result.spreadsheetUrl, '_blank');
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportResearch = async () => {
        if (!researchContent) {
            setError('No research content to export');
            return;
        }

        setIsExporting('research');
        setError(null);

        try {
            const result = await exportToGoogleDoc(
                researchContent.title,
                researchContent.content
            );
            setSuccessMessage('Research exported to Google Docs!');
            window.open(result.webViewLink, '_blank');
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportStrategy = async () => {
        if (!strategyContent) {
            setError('No strategy content to export');
            return;
        }

        setIsExporting('strategy');
        setError(null);

        try {
            const result = await exportToGoogleDoc(
                strategyContent.title,
                strategyContent.content
            );
            setSuccessMessage('Strategy exported to Google Docs!');
            window.open(result.webViewLink, '_blank');
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsExporting(null);
        }
    };

    if (!isGoogleConfigured()) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="font-medium text-amber-800">Google Workspace Not Configured</p>
                        <p className="text-sm text-amber-700 mt-1">
                            To enable Google integration, set <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in your environment.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Cloud size={24} />
                        <div>
                            <h3 className="font-bold">Google Workspace</h3>
                            <p className="text-sm text-blue-100">
                                {isConnected ? 'Connected' : 'Connect to sync your work'}
                            </p>
                        </div>
                    </div>

                    {isConnected ? (
                        <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                        >
                            <Unlink size={16} />
                            Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                            {isConnecting ? (
                                <Loader size={16} className="animate-spin" />
                            ) : (
                                <Link2 size={16} />
                            )}
                            {isConnecting ? 'Connecting...' : 'Connect'}
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="p-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="p-3 bg-green-50 border-b border-green-100 flex items-center gap-2 text-green-700 text-sm">
                    <Check size={16} />
                    {successMessage}
                </div>
            )}

            {/* Export Options */}
            {isConnected && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Export to Calendar */}
                    <button
                        onClick={handleExportToCalendar}
                        disabled={isExporting !== null || !scheduledPosts.length}
                        className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-200 transition-colors">
                            {isExporting === 'calendar' ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <Calendar size={20} />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">Google Calendar</p>
                            <p className="text-xs text-slate-500">
                                Export {scheduledPosts.length} scheduled posts
                            </p>
                        </div>
                        <ExternalLink size={14} className="ml-auto text-slate-400" />
                    </button>

                    {/* Export Leads to Sheets */}
                    <button
                        onClick={handleExportLeads}
                        disabled={isExporting !== null || !leads.length}
                        className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-green-300 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-200 transition-colors">
                            {isExporting === 'sheets' ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <FileSpreadsheet size={20} />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">Google Sheets</p>
                            <p className="text-xs text-slate-500">
                                Export {leads.length} leads
                            </p>
                        </div>
                        <ExternalLink size={14} className="ml-auto text-slate-400" />
                    </button>

                    {/* Export Research to Docs */}
                    <button
                        onClick={handleExportResearch}
                        disabled={isExporting !== null || !researchContent}
                        className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200 transition-colors">
                            {isExporting === 'research' ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <FileText size={20} />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">Research → Docs</p>
                            <p className="text-xs text-slate-500">
                                {researchContent ? 'Export research report' : 'No research yet'}
                            </p>
                        </div>
                        <ExternalLink size={14} className="ml-auto text-slate-400" />
                    </button>

                    {/* Export Strategy to Docs */}
                    <button
                        onClick={handleExportStrategy}
                        disabled={isExporting !== null || !strategyContent}
                        className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-purple-300 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200 transition-colors">
                            {isExporting === 'strategy' ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <FileText size={20} />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">Strategy → Docs</p>
                            <p className="text-xs text-slate-500">
                                {strategyContent ? 'Export marketing strategy' : 'No strategy yet'}
                            </p>
                        </div>
                        <ExternalLink size={14} className="ml-auto text-slate-400" />
                    </button>
                </div>
            )}

            {/* Not Connected State */}
            {!isConnected && (
                <div className="p-6 text-center">
                    <div className="flex justify-center gap-4 mb-4 text-slate-300">
                        <Calendar size={32} />
                        <FileSpreadsheet size={32} />
                        <FileText size={32} />
                        <HardDrive size={32} />
                        <Mail size={32} />
                    </div>
                    <p className="text-slate-600 mb-2">
                        Connect to export your work directly to Google Workspace
                    </p>
                    <p className="text-sm text-slate-400">
                        Calendar events • Leads spreadsheets • Documents • Drive storage
                    </p>
                </div>
            )}
        </div>
    );
};

export default GoogleWorkspaceIntegration;

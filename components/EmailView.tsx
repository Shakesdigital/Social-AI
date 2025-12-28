import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, Copy, RefreshCw, Loader, Eye, Users, ChevronRight, X, Sparkles } from 'lucide-react';
import { CompanyProfile, Lead, EmailCampaign, EmailTemplate } from '../types';
import { generateLeadEmail, generateEmailVariant, generateDripSequence, createCampaign, previewEmail } from '../services/emailService';
import { useFreeLLM } from '../hooks/useFreeLLM';

interface EmailViewProps {
    profile: CompanyProfile;
    leads: Lead[];
    savedState?: any;
    onStateChange?: (state: any) => void;
}

export const EmailView: React.FC<EmailViewProps> = ({ profile, leads, savedState, onStateChange }) => {
    const { quotaWarning, isConfigured } = useFreeLLM();

    // Initialize from savedState prop (passed from App)
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>(savedState?.campaigns || []);
    const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(savedState?.selectedCampaign || null);
    const [isLoading, setIsLoading] = useState(false);
    const [showNewCampaign, setShowNewCampaign] = useState(false);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [previewLead, setPreviewLead] = useState<Lead | null>(null);
    const [previewEmail_, setPreviewEmail_] = useState<{ subject: string; body: string } | null>(null);

    // Notify parent of state changes for persistence
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                campaigns,
                selectedCampaign,
                draftEmail: null
            });
        }
    }, [campaigns, selectedCampaign]);

    const handleCreateCampaign = () => {
        if (!newCampaignName.trim() || selectedLeadIds.length === 0) return;

        const campaign = createCampaign(newCampaignName, selectedLeadIds);
        setCampaigns(prev => [campaign, ...prev]);
        setSelectedCampaign(campaign);
        setShowNewCampaign(false);
        setNewCampaignName('');
        setSelectedLeadIds([]);
    };

    const [emailError, setEmailError] = useState<string | null>(null);

    const handleGenerateEmail = async (isRetry = false) => {
        if (!selectedCampaign || selectedCampaign.leadIds.length === 0) return;

        setIsLoading(true);
        setEmailError(null);
        try {
            const firstLeadId = selectedCampaign.leadIds[0];
            const lead = leads.find(l => l.id === firstLeadId);
            if (!lead) return;

            const email = await generateLeadEmail(lead, profile, 'collaboration partnership');

            setCampaigns(prev => prev.map(c =>
                c.id === selectedCampaign.id
                    ? { ...c, emails: [...c.emails, email], updatedAt: new Date() }
                    : c
            ));
            setSelectedCampaign(prev => prev ? { ...prev, emails: [...prev.emails, email] } : null);
        } catch (e: any) {
            console.error('[EmailView] Failed to generate email:', e);

            if (!isRetry && (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError')) {
                setEmailError('Taking a quick breather — trying again...');
                setTimeout(() => handleGenerateEmail(true), 3000);
                return;
            }

            setEmailError(isRetry
                ? 'Our assistant is taking a short break. Please try again in a minute! 🙏'
                : 'Something went wrong. Please try again.');
        } finally {
            if (!emailError?.includes('breather')) {
                setIsLoading(false);
            }
        }
    };

    const handleGenerateVariant = async (original: EmailTemplate, isRetry = false) => {
        setIsLoading(true);
        setEmailError(null);
        try {
            const variant = await generateEmailVariant(original, profile);

            setCampaigns(prev => prev.map(c =>
                c.id === selectedCampaign?.id
                    ? { ...c, emails: [...c.emails, variant], updatedAt: new Date() }
                    : c
            ));
            setSelectedCampaign(prev => prev ? { ...prev, emails: [...prev.emails, variant] } : null);
        } catch (e: any) {
            console.error('[EmailView] Failed to generate variant:', e);

            if (!isRetry && (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError')) {
                setEmailError('Taking a quick breather — trying again...');
                setTimeout(() => handleGenerateVariant(original, true), 3000);
                return;
            }

            setEmailError(isRetry
                ? 'Our assistant is taking a short break. Please try again in a minute! 🙏'
                : 'Something went wrong. Please try again.');
        } finally {
            if (!emailError?.includes('breather')) {
                setIsLoading(false);
            }
        }
    };

    const handleGenerateDrip = async (isRetry = false) => {
        if (!selectedCampaign || selectedCampaign.leadIds.length === 0) return;

        setIsLoading(true);
        setEmailError(null);
        try {
            const firstLeadId = selectedCampaign.leadIds[0];
            const lead = leads.find(l => l.id === firstLeadId);
            if (!lead) return;

            const sequence = await generateDripSequence(lead, profile, 3);

            setCampaigns(prev => prev.map(c =>
                c.id === selectedCampaign.id
                    ? { ...c, emails: [...c.emails, ...sequence], updatedAt: new Date() }
                    : c
            ));
            setSelectedCampaign(prev => prev ? { ...prev, emails: [...prev.emails, ...sequence] } : null);
        } catch (e: any) {
            console.error('[EmailView] Failed to generate drip sequence:', e);

            if (!isRetry && (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError')) {
                setEmailError('Taking a quick breather — trying again...');
                setTimeout(() => handleGenerateDrip(true), 3000);
                return;
            }

            setEmailError(isRetry
                ? 'Our assistant is taking a short break. Please try again in a minute! 🙏'
                : 'Something went wrong. Please try again.');
        } finally {
            if (!emailError?.includes('breather')) {
                setIsLoading(false);
            }
        }
    };

    const handlePreview = (email: EmailTemplate, lead: Lead) => {
        const preview = previewEmail(email, lead, profile);
        setPreviewEmail_(preview);
        setPreviewLead(lead);
    };

    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        );
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Email Marketing</h1>
                    <p className="text-slate-500 text-xs sm:text-sm">Create and manage outreach campaigns</p>
                </div>
                <button
                    onClick={() => setShowNewCampaign(true)}
                    className="px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"
                >
                    <Plus size={18} />
                    New Campaign
                </button>
            </div>

            {quotaWarning && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs sm:text-sm">
                    {quotaWarning}
                </div>
            )}

            {emailError && (
                <div className={`mb-4 p-3 rounded-lg text-xs sm:text-sm flex items-center gap-2 ${emailError.includes('breather')
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
                    }`}>
                    {emailError.includes('breather') && (
                        <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                    )}
                    {emailError}
                </div>
            )}

            {!isConfigured && (
                <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs sm:text-sm text-red-700">Please configure a free LLM API key to use email generation features.</p>
                </div>
            )}

            {leads.length === 0 && (
                <div className="mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-xs sm:text-sm text-blue-700">Generate some leads first in the Leads tab to create email campaigns.</p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Campaigns List */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Campaigns</h3>
                        </div>
                        {campaigns.length === 0 ? (
                            <div className="p-4 sm:p-6 text-center text-slate-500 text-xs sm:text-sm">
                                No campaigns yet. Create one to get started.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-48 lg:max-h-none overflow-y-auto">
                                {campaigns.map(campaign => (
                                    <button
                                        key={campaign.id}
                                        onClick={() => setSelectedCampaign(campaign)}
                                        className={`w-full p-3 sm:p-4 text-left hover:bg-slate-50 transition-colors active:bg-slate-100 ${selectedCampaign?.id === campaign.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-medium text-slate-900 text-sm truncate">{campaign.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {campaign.leadIds.length} leads • {campaign.emails.length} emails
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${campaign.status === 'Active' ? 'bg-green-100 text-green-700' :
                                                campaign.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                {campaign.status}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Campaign Detail */}
                <div className="flex-1 min-w-0">
                    {selectedCampaign ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4 sm:mb-6">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">{selectedCampaign.name}</h2>
                                    <p className="text-xs sm:text-sm text-slate-500">{selectedCampaign.leadIds.length} leads targeted</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleGenerateEmail}
                                        disabled={isLoading}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 transition-all"
                                    >
                                        {isLoading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        <span className="hidden sm:inline">Generate Email</span>
                                        <span className="sm:hidden">Email</span>
                                    </button>
                                    <button
                                        onClick={handleGenerateDrip}
                                        disabled={isLoading}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 transition-all"
                                    >
                                        <span className="hidden sm:inline">Drip Sequence</span>
                                        <span className="sm:hidden">Drip</span>
                                    </button>
                                </div>
                            </div>

                            {selectedCampaign.emails.length === 0 ? (
                                <div className="text-center py-8 sm:py-12 text-slate-500">
                                    <Mail size={40} className="mx-auto mb-4 text-slate-300 sm:hidden" />
                                    <Mail size={48} className="mx-auto mb-4 text-slate-300 hidden sm:block" />
                                    <p className="text-sm">No emails yet. Click "Generate Email" to create one.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 sm:space-y-4">
                                    {selectedCampaign.emails.map((email, index) => (
                                        <div key={email.id} className="border border-slate-200 rounded-lg p-3 sm:p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">
                                                        {email.variant === 'A' ? 'Variant A' : 'Variant B'}
                                                    </span>
                                                    {email.delayDays !== undefined && (
                                                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                                            Day {email.delayDays}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const lead = leads.find(l => l.id === selectedCampaign.leadIds[0]);
                                                            if (lead) handlePreview(email, lead);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded active:scale-95 transition-all"
                                                        title="Preview"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleGenerateVariant(email)}
                                                        disabled={isLoading}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded active:scale-95 transition-all"
                                                        title="Generate A/B Variant"
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded active:scale-95 transition-all"
                                                        title="Copy"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className="font-medium text-slate-900 mb-2 text-sm sm:text-base">{email.subject}</h4>
                                            <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">{email.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
                            <Mail size={40} className="mx-auto mb-4 text-slate-300 sm:hidden" />
                            <Mail size={48} className="mx-auto mb-4 text-slate-300 hidden sm:block" />
                            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">Select a Campaign</h3>
                            <p className="text-slate-500 text-xs sm:text-sm">Choose a campaign from the list or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Campaign Modal */}
            {showNewCampaign && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">New Campaign</h2>
                            <button onClick={() => setShowNewCampaign(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    value={newCampaignName}
                                    onChange={e => setNewCampaignName(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Q1 Outreach Campaign"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Select Leads ({selectedLeadIds.length} selected)</label>
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y">
                                    {leads.map(lead => (
                                        <label key={lead.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeadIds.includes(lead.id)}
                                                onChange={() => toggleLeadSelection(lead.id)}
                                                className="rounded border-slate-300"
                                            />
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">{lead.companyName}</p>
                                                <p className="text-xs text-slate-500">{lead.contactEmail || 'No email'}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {leads.length === 0 && (
                                        <p className="p-4 text-sm text-slate-500 text-center">No leads available. Generate leads first.</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateCampaign}
                                disabled={!newCampaignName.trim() || selectedLeadIds.length === 0}
                                className="w-full py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50"
                            >
                                Create Campaign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewEmail_ && previewLead && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Email Preview</h2>
                            <button onClick={() => { setPreviewEmail_(null); setPreviewLead(null); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 mb-4">
                            <p className="text-sm text-slate-500">To: {previewLead.contactEmail || 'contact@company.com'}</p>
                            <p className="font-semibold text-slate-900">Subject: {previewEmail_.subject}</p>
                        </div>

                        <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-white p-4 rounded-lg border">
                                {previewEmail_.body}
                            </pre>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => navigator.clipboard.writeText(`Subject: ${previewEmail_.subject}\n\n${previewEmail_.body}`)}
                                className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                            >
                                <Copy size={16} /> Copy
                            </button>
                            <button className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center justify-center gap-2">
                                <Send size={16} /> Send (Mock)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

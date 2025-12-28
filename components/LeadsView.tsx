import React, { useState, useEffect } from 'react';
import { Search, Download, Users, Building, MapPin, Loader, AlertTriangle, Plus, Mail, ExternalLink } from 'lucide-react';
import { CompanyProfile, Lead, LeadSearchCriteria } from '../types';
import { generateLeads, downloadCSV, getGDPRDisclaimer } from '../services/leadService';
import { useFreeLLM } from '../hooks/useFreeLLM';

interface LeadsViewProps {
    profile: CompanyProfile;
    onAddToEmailCampaign?: (leads: Lead[]) => void;
    savedState?: any;
    onStateChange?: (state: any) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({ profile, onAddToEmailCampaign, savedState, onStateChange }) => {
    const { quotaWarning, isConfigured } = useFreeLLM();

    // Initialize from savedState prop (passed from App)
    const [leads, setLeads] = useState<Lead[]>(savedState?.leads || []);
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(
        new Set(savedState?.selectedLeads || [])
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGDPR, setShowGDPR] = useState(false);

    const [criteria, setCriteria] = useState<LeadSearchCriteria>(savedState?.criteria || {
        industry: profile.industry,
        location: '',
        companySize: '10-50',
        keywords: []
    });
    const [keywordInput, setKeywordInput] = useState('');

    // Notify parent of state changes for persistence
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                leads,
                selectedLeads: Array.from(selectedLeads),
                criteria
            });
        }
    }, [leads, selectedLeads, criteria]);

    const handleGenerateLeads = async () => {
        if (!criteria.industry || !criteria.location) {
            setError('Please fill in industry and location');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newLeads = await generateLeads(criteria, profile, 10);
            setLeads(prev => [...newLeads, ...prev]);
        } catch (e: any) {
            console.error('[LeadsView] Failed to generate leads:', e);

            // Check if all providers failed - show friendly message and auto-retry
            if (e.message?.includes('All LLM providers failed') || e.name === 'AllProvidersFailedError') {
                setError('Taking a quick breather — trying again...');

                // Auto-retry after 3 seconds
                setTimeout(async () => {
                    try {
                        const retryLeads = await generateLeads(criteria, profile, 10);
                        if (retryLeads && retryLeads.length > 0) {
                            setLeads(prev => [...retryLeads, ...prev]);
                            setError(null);
                        } else {
                            setError('Still having trouble. Please try again in a moment.');
                        }
                    } catch (retryError) {
                        console.error('[LeadsView] Retry also failed:', retryError);
                        setError('Our assistant is taking a short break. Please try again in a minute! 🙏');
                    }
                    setIsLoading(false);
                }, 3000);
                return; // Don't set isLoading to false yet
            }

            setError('Something went wrong. Please try again.');
        } finally {
            if (!error?.includes('breather')) {
                setIsLoading(false);
            }
        }
    };

    const handleAddKeyword = () => {
        if (keywordInput.trim() && !criteria.keywords.includes(keywordInput.trim())) {
            setCriteria(prev => ({ ...prev, keywords: [...prev.keywords, keywordInput.trim()] }));
            setKeywordInput('');
        }
    };

    const handleRemoveKeyword = (kw: string) => {
        setCriteria(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }));
    };

    const handleSelectLead = (id: string) => {
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedLeads.size === leads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id)));
        }
    };

    const handleExportCSV = () => {
        const toExport = selectedLeads.size > 0
            ? leads.filter(l => selectedLeads.has(l.id))
            : leads;
        downloadCSV(toExport, `leads-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleAddToEmail = () => {
        if (onAddToEmailCampaign && selectedLeads.size > 0) {
            const selected = leads.filter(l => selectedLeads.has(l.id));
            onAddToEmailCampaign(selected);
        }
    };

    const getPotentialColor = (potential: string) => {
        switch (potential) {
            case 'High': return 'bg-green-100 text-green-700';
            case 'Medium': return 'bg-yellow-100 text-yellow-700';
            case 'Low': return 'bg-slate-100 text-slate-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Lead Research</h1>
                    <p className="text-slate-500 text-xs sm:text-sm">Find potential collaboration partners and marketing leads</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowGDPR(!showGDPR)}
                        className="px-3 py-2 text-xs sm:text-sm text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <AlertTriangle size={14} />
                        <span className="hidden sm:inline">GDPR Info</span>
                    </button>
                    {leads.length > 0 && (
                        <button
                            onClick={handleExportCSV}
                            className="px-3 sm:px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-xs sm:text-sm active:scale-95 transition-all"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quota Warning */}
            {quotaWarning && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs sm:text-sm">
                    {quotaWarning}
                </div>
            )}

            {/* GDPR Notice */}
            {showGDPR && (
                <div className="mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Privacy & Compliance</h3>
                    <pre className="text-xs sm:text-sm text-blue-800 whitespace-pre-wrap">{getGDPRDisclaimer()}</pre>
                </div>
            )}

            {/* Not Configured Warning */}
            {!isConfigured && (
                <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h3 className="font-semibold text-red-900 mb-1 text-sm">API Keys Required</h3>
                    <p className="text-xs sm:text-sm text-red-700">
                        Please add at least one free LLM API key (Groq, OpenRouter, or HuggingFace) to your .env.local file.
                    </p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
                {/* Search Criteria Panel */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 lg:sticky lg:top-0">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <Search size={18} />
                            Search Criteria
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">Target Industry</label>
                                <input
                                    type="text"
                                    value={criteria.industry}
                                    onChange={e => setCriteria({ ...criteria, industry: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Technology, Healthcare..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">Location</label>
                                <input
                                    type="text"
                                    value={criteria.location}
                                    onChange={e => setCriteria({ ...criteria, location: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="San Francisco, USA"
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">Company Size</label>
                                <select
                                    value={criteria.companySize}
                                    onChange={e => setCriteria({ ...criteria, companySize: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    <option value="1-10">1-10 employees</option>
                                    <option value="10-50">10-50 employees</option>
                                    <option value="50-200">50-200 employees</option>
                                    <option value="200-500">200-500 employees</option>
                                    <option value="500+">500+ employees</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">Keywords</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={keywordInput}
                                        onChange={e => setKeywordInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                                        className="flex-1 border border-slate-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="Add keyword..."
                                    />
                                    <button onClick={handleAddKeyword} className="p-2.5 sm:p-3 bg-slate-100 rounded-lg hover:bg-slate-200 active:scale-95 transition-all">
                                        <Plus size={18} />
                                    </button>
                                </div>
                                {criteria.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {criteria.keywords.map(kw => (
                                            <span
                                                key={kw}
                                                onClick={() => handleRemoveKeyword(kw)}
                                                className="px-2 py-1 bg-brand-100 text-brand-700 text-xs rounded-full cursor-pointer hover:bg-brand-200 active:scale-95 transition-all"
                                            >
                                                {kw} ×
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className={`p-3 text-xs sm:text-sm rounded-lg flex items-center gap-2 ${error.includes('breather') || error.includes('trying again')
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                                    }`}>
                                    {error.includes('breather') || error.includes('trying again') ? (
                                        <><Loader size={14} className="animate-spin" /> {error}</>
                                    ) : (
                                        <>{error}</>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleGenerateLeads}
                                disabled={isLoading || !isConfigured}
                                className="w-full py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader size={18} className="animate-spin" />
                                        Researching...
                                    </>
                                ) : (
                                    <>
                                        <Search size={18} />
                                        Generate Leads
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Leads List */}
                <div className="flex-1 min-w-0">
                    {leads.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={28} className="text-slate-400 sm:hidden" />
                                <Users size={32} className="text-slate-400 hidden sm:block" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">No leads yet</h3>
                            <p className="text-slate-500 text-xs sm:text-sm">Enter your criteria and click Generate Leads to find potential partners.</p>
                        </div>
                    ) : (
                        <>
                            {/* Actions Bar */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                                <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedLeads.size === leads.length && leads.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-slate-300"
                                    />
                                    Select All ({selectedLeads.size} selected)
                                </label>
                                {selectedLeads.size > 0 && onAddToEmailCampaign && (
                                    <button
                                        onClick={handleAddToEmail}
                                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 transition-all"
                                    >
                                        <Mail size={16} />
                                        Add to Email Campaign
                                    </button>
                                )}
                            </div>

                            {/* Lead Cards */}
                            <div className="space-y-3 sm:space-y-4">
                                {leads.map(lead => (
                                    <div
                                        key={lead.id}
                                        className={`bg-white rounded-xl border p-4 sm:p-5 transition-all ${selectedLeads.has(lead.id) ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex gap-3 sm:gap-4">
                                            <label className="flex items-start pt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.has(lead.id)}
                                                    onChange={() => handleSelectLead(lead.id)}
                                                    className="rounded border-slate-300"
                                                />
                                            </label>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base truncate">
                                                            <Building size={16} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{lead.companyName}</span>
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 mt-1">
                                                            <span>{lead.industry}</span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} />
                                                                {lead.location}
                                                            </span>
                                                            <span className="hidden sm:inline">{lead.size}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPotentialColor(lead.outreachPotential)}`}>
                                                        {lead.outreachPotential}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-slate-600 mb-3 line-clamp-2">{lead.summary}</p>
                                                <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
                                                    {lead.contactName && (
                                                        <span className="text-slate-600">
                                                            <strong>Contact:</strong> {lead.contactName}
                                                        </span>
                                                    )}
                                                    {lead.contactEmail && (
                                                        <a href={`mailto:${lead.contactEmail}`} className="text-brand-600 hover:underline truncate max-w-[200px]">
                                                            {lead.contactEmail}
                                                        </a>
                                                    )}
                                                    {lead.website && (
                                                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline flex items-center gap-1">
                                                            Website <ExternalLink size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Generate More Leads Button */}
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={handleGenerateLeads}
                                    disabled={isLoading || !isConfigured}
                                    className="px-5 sm:px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold rounded-xl hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-brand-600/25 transition-all active:scale-95 text-sm"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader size={18} className="animate-spin" />
                                            Finding more leads...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            Generate More Leads
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-center text-xs text-slate-500 mt-2">
                                Current leads: {leads.length} • New leads will be added to this list
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

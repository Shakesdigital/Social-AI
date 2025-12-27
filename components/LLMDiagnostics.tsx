/**
 * LLM Configuration Diagnostics
 * 
 * This component can be used to check the LLM configuration status on the live site.
 * It's useful for debugging API key issues and provider availability.
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import {
    hasFreeLLMConfigured,
    getQuotaStatus,
    getProviderHealthStatus,
    getAvailableProvidersList,
    callLLM
} from '../services/freeLLMService';
import {
    API_KEYS,
    PROVIDER_PRIORITY,
    MODELS,
    getConfiguredProviders
} from '../services/llmProviderConfig';
import { LLMProvider } from '../types';

export const LLMDiagnostics: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const [showKeys, setShowKeys] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        provider?: LLMProvider;
        error?: string;
        time?: number;
    } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const configuredProviders = getConfiguredProviders();
    const availableProviders = getAvailableProvidersList();
    const quotaStatus = getQuotaStatus();
    const healthStatus = getProviderHealthStatus();
    const hasConfig = hasFreeLLMConfigured();

    const runTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        const start = Date.now();

        try {
            const response = await callLLM("Say 'Hello! LLM is working.' in exactly those words.", {
                type: 'fast',
                systemPrompt: 'You are a helpful assistant. Respond exactly as requested.',
                temperature: 0.1,
                maxTokens: 50
            });

            setTestResult({
                success: true,
                provider: response.provider,
                time: Date.now() - start
            });
        } catch (e: any) {
            setTestResult({
                success: false,
                error: e.message || 'Unknown error',
                time: Date.now() - start
            });
        } finally {
            setIsTesting(false);
        }
    };

    const getKeyPreview = (key: string | undefined) => {
        if (!key) return 'NOT SET';
        if (key.includes('your-')) return 'PLACEHOLDER (not configured)';
        if (!showKeys) return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
        return key;
    };

    const getProviderStatus = (provider: LLMProvider) => {
        const key = API_KEYS[provider];
        const configured = configuredProviders.includes(provider);
        const available = availableProviders.includes(provider);
        const health = healthStatus[provider];

        if (!key || key.includes('your-')) return { status: 'missing', color: 'text-red-500', bg: 'bg-red-50' };
        if (!configured) return { status: 'invalid', color: 'text-red-500', bg: 'bg-red-50' };
        if (!health?.isHealthy) return { status: 'unhealthy', color: 'text-orange-500', bg: 'bg-orange-50' };
        if (!available) return { status: 'cooldown', color: 'text-yellow-500', bg: 'bg-yellow-50' };
        return { status: 'ready', color: 'text-green-500', bg: 'bg-green-50' };
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900">LLM Configuration Diagnostics</h2>
                        {onClose && (
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Check your LLM provider configuration and test connectivity
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Overall Status */}
                    <div className={`p-4 rounded-lg ${hasConfig ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center gap-3">
                            {hasConfig ? (
                                <CheckCircle className="text-green-500" size={24} />
                            ) : (
                                <XCircle className="text-red-500" size={24} />
                            )}
                            <div>
                                <p className={`font-semibold ${hasConfig ? 'text-green-800' : 'text-red-800'}`}>
                                    {hasConfig
                                        ? `${configuredProviders.length} Provider(s) Configured`
                                        : 'No Providers Configured'}
                                </p>
                                <p className="text-sm text-slate-600">
                                    {hasConfig
                                        ? `Active: ${configuredProviders.join(', ')}`
                                        : 'Add API keys in Netlify Environment Variables'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Provider Details */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-slate-700">Provider Status</h3>
                            <button
                                onClick={() => setShowKeys(!showKeys)}
                                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                            >
                                {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                                {showKeys ? 'Hide Keys' : 'Show Keys'}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {PROVIDER_PRIORITY.map(provider => {
                                const { status, color, bg } = getProviderStatus(provider);
                                const quota = quotaStatus[provider];
                                const model = MODELS[provider];

                                return (
                                    <div key={provider} className={`p-3 rounded-lg ${bg}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium capitalize">{provider}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${color} bg-white`}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 font-mono">
                                                    {getKeyPreview(API_KEYS[provider])}
                                                </p>
                                            </div>
                                            <div className="text-right text-xs text-slate-500">
                                                <p>Model: {model.fast}</p>
                                                <p>{quota.remaining}/{quota.limit} remaining</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Test Connection */}
                    <div>
                        <h3 className="font-semibold text-slate-700 mb-3">Test Connection</h3>
                        <button
                            onClick={runTest}
                            disabled={isTesting || !hasConfig}
                            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isTesting ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} />
                                    Run Test
                                </>
                            )}
                        </button>

                        {testResult && (
                            <div className={`mt-3 p-3 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                <div className="flex items-center gap-2">
                                    {testResult.success ? (
                                        <CheckCircle className="text-green-500" size={18} />
                                    ) : (
                                        <XCircle className="text-red-500" size={18} />
                                    )}
                                    <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                                        {testResult.success
                                            ? `Success! Used ${testResult.provider} (${testResult.time}ms)`
                                            : `Failed: ${testResult.error}`}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Required Environment Variables */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-slate-700 mb-2">Required Environment Variables</h3>
                        <p className="text-sm text-slate-600 mb-2">
                            Add these to your Netlify site settings → Environment Variables:
                        </p>
                        <ul className="text-sm font-mono space-y-1">
                            <li className="flex justify-between">
                                <span>VITE_GROQ_API_KEY</span>
                                <span className={API_KEYS.groq && !API_KEYS.groq.includes('your-') ? 'text-green-600' : 'text-red-600'}>
                                    {API_KEYS.groq && !API_KEYS.groq.includes('your-') ? '✓ Set' : '✗ Missing'}
                                </span>
                            </li>
                            <li className="flex justify-between">
                                <span>VITE_OPENROUTER_API_KEY</span>
                                <span className={API_KEYS.openrouter && !API_KEYS.openrouter.includes('your-') ? 'text-green-600' : 'text-red-600'}>
                                    {API_KEYS.openrouter && !API_KEYS.openrouter.includes('your-') ? '✓ Set' : '✗ Missing'}
                                </span>
                            </li>
                            <li className="flex justify-between">
                                <span>VITE_HUGGINGFACE_API_KEY</span>
                                <span className={API_KEYS.huggingface && !API_KEYS.huggingface.includes('your-') ? 'text-green-600' : 'text-red-600'}>
                                    {API_KEYS.huggingface && !API_KEYS.huggingface.includes('your-') ? '✓ Set' : '✗ Missing'}
                                </span>
                            </li>
                        </ul>
                        <p className="text-xs text-slate-500 mt-3">
                            ⚠️ After adding/changing variables, you must <strong>redeploy</strong> for them to take effect.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LLMDiagnostics;

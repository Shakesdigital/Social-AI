import { useState, useCallback, useEffect } from 'react';
import { LLMProvider, LLMQuotaStatus, LLMResponse } from '../types';
import { callLLM, getQuotaStatus, getQuotaWarning, hasFreeLLMConfigured, LLMOptions } from '../services/freeLLMService';

interface UseFreeLLMReturn {
    generate: (prompt: string, options?: LLMOptions) => Promise<LLMResponse>;
    isLoading: boolean;
    error: string | null;
    lastProvider: LLMProvider | null;
    quotaStatus: Record<LLMProvider, LLMQuotaStatus> | null;
    quotaWarning: string | null;
    isConfigured: boolean;
    refreshQuota: () => void;
}

export function useFreeLLM(): UseFreeLLMReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastProvider, setLastProvider] = useState<LLMProvider | null>(null);
    const [quotaStatus, setQuotaStatus] = useState<Record<LLMProvider, LLMQuotaStatus> | null>(null);
    const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
    const [isConfigured] = useState(() => hasFreeLLMConfigured());

    const refreshQuota = useCallback(() => {
        setQuotaStatus(getQuotaStatus());
        setQuotaWarning(getQuotaWarning());
    }, []);

    useEffect(() => {
        refreshQuota();
    }, [refreshQuota]);

    const generate = useCallback(async (prompt: string, options?: LLMOptions): Promise<LLMResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await callLLM(prompt, options);
            setLastProvider(response.provider);
            refreshQuota();
            return response;
        } catch (e: any) {
            const errorMsg = e.message || 'LLM generation failed';
            setError(errorMsg);
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, [refreshQuota]);

    return {
        generate,
        isLoading,
        error,
        lastProvider,
        quotaStatus,
        quotaWarning,
        isConfigured,
        refreshQuota
    };
}

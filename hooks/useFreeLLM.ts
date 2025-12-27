import { useState, useCallback, useEffect } from 'react';
import { LLMProvider, LLMQuotaStatus } from '../types';
import {
    callLLM,
    getQuotaStatus,
    getQuotaWarning,
    hasFreeLLMConfigured,
    LLMOptions,
    getProviderHealthStatus,
    getAvailableProvidersList,
    AllProvidersFailedError
} from '../services/freeLLMService';
import { LLMResponse } from '../types';
import { ProviderHealth } from '../services/llmProviderConfig';

interface UseFreeLLMReturn {
    generate: (prompt: string, options?: LLMOptions) => Promise<LLMResponse>;
    isLoading: boolean;
    error: string | null;
    lastProvider: LLMProvider | null;
    quotaStatus: Record<LLMProvider, LLMQuotaStatus> | null;
    quotaWarning: string | null;
    isConfigured: boolean;
    refreshQuota: () => void;
    // New: Health tracking
    providerHealth: Record<LLMProvider, ProviderHealth> | null;
    availableProviders: LLMProvider[];
    isRetrying: boolean;
}

export function useFreeLLM(): UseFreeLLMReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastProvider, setLastProvider] = useState<LLMProvider | null>(null);
    const [quotaStatus, setQuotaStatus] = useState<Record<LLMProvider, LLMQuotaStatus> | null>(null);
    const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
    const [providerHealth, setProviderHealth] = useState<Record<LLMProvider, ProviderHealth> | null>(null);
    const [availableProviders, setAvailableProviders] = useState<LLMProvider[]>([]);
    const [isConfigured] = useState(() => hasFreeLLMConfigured());

    const refreshQuota = useCallback(() => {
        setQuotaStatus(getQuotaStatus());
        setQuotaWarning(getQuotaWarning());
        setProviderHealth(getProviderHealthStatus());
        setAvailableProviders(getAvailableProvidersList());
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
            // Check if all providers failed
            if (e instanceof AllProvidersFailedError) {
                setError(e.friendlyMessage);
                setIsRetrying(true);

                // Auto-retry after delay
                await new Promise(resolve => setTimeout(resolve, 3000));
                setIsRetrying(false);

                // Try one more time
                try {
                    const retryResponse = await callLLM(prompt, options);
                    setLastProvider(retryResponse.provider);
                    setError(null);
                    refreshQuota();
                    return retryResponse;
                } catch (retryError: any) {
                    const finalError = retryError.friendlyMessage ||
                        "I'm having trouble connecting. Please try again shortly.";
                    setError(finalError);
                    throw new Error(finalError);
                }
            }

            const errorMsg = e.message || 'LLM generation failed';
            setError(errorMsg);
            throw e;
        } finally {
            setIsLoading(false);
            refreshQuota(); // Always update status after call
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
        refreshQuota,
        // New exports
        providerHealth,
        availableProviders,
        isRetrying,
    };
}

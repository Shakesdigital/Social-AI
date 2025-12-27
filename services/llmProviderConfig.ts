/**
 * LLM Provider Configuration
 * 
 * Centralized configuration for all LLM providers with fallback order,
 * model mappings, rate limit detection, and retry policies.
 */

import { LLMProvider } from '../types';

// ============================================
// API KEYS FROM ENVIRONMENT
// ============================================
export const API_KEYS = {
    groq: import.meta.env.VITE_GROQ_API_KEY || '',
    openrouter: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    huggingface: import.meta.env.VITE_HUGGINGFACE_API_KEY || '',
    openai: import.meta.env.VITE_OPENAI_API_KEY || '',
} as const;

// ============================================
// PROVIDER PRIORITY ORDER (Configurable)
// ============================================
// This determines the fallback order. Modify this array to change priority.
export const PROVIDER_PRIORITY: LLMProvider[] = [
    'groq',        // Primary: Fastest, best quality, 14,400 req/day
    'openrouter',  // First fallback: Access to multiple free models
    'huggingface', // Second fallback: Open source models
];

// ============================================
// QUOTA LIMITS PER PROVIDER (Daily)
// ============================================
export const QUOTA_LIMITS: Record<LLMProvider, number> = {
    groq: 14400,       // 14,400 requests/day (10 req/min)
    openrouter: 200,   // Free tier varies, conservative estimate
    huggingface: 1000, // Free tier, varies by model
    openai: 0,         // Not free, excluded from fallback
};

// ============================================
// MODEL CONFIGURATIONS
// ============================================
export interface ModelConfig {
    fast: string;           // Quick responses, lower latency
    reasoning: string;      // Complex tasks, better quality
    maxTokens: number;
    supportsSystemPrompt: boolean;
}

export const MODELS: Record<LLMProvider, ModelConfig> = {
    groq: {
        fast: 'llama-3.3-70b-versatile',
        reasoning: 'llama-3.3-70b-versatile',
        maxTokens: 4096,
        supportsSystemPrompt: true,
    },
    openrouter: {
        // Using best available free models on OpenRouter
        fast: 'meta-llama/llama-3.2-3b-instruct:free',
        reasoning: 'deepseek/deepseek-r1-distill-llama-70b:free',
        maxTokens: 4096,
        supportsSystemPrompt: true,
    },
    huggingface: {
        fast: 'HuggingFaceH4/zephyr-7b-beta',
        reasoning: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        maxTokens: 2048,
        supportsSystemPrompt: false, // Requires custom formatting
    },
    openai: {
        fast: 'gpt-4o-mini',
        reasoning: 'gpt-4o',
        maxTokens: 4096,
        supportsSystemPrompt: true,
    },
};

// ============================================
// API ENDPOINTS
// ============================================
export const API_ENDPOINTS = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    huggingface: (model: string) => `https://api-inference.huggingface.co/models/${model}`,
    openai: 'https://api.openai.com/v1/chat/completions',
} as const;

// ============================================
// RATE LIMIT & ERROR DETECTION
// ============================================
export interface ErrorPattern {
    codes: number[];           // HTTP status codes that indicate this error type
    messages: RegExp[];        // Message patterns to detect in error responses
    isRetryable: boolean;      // Should we retry on this provider?
    shouldFallback: boolean;   // Should we switch to next provider?
    cooldownMs?: number;       // How long to wait before retrying this provider
}

export const ERROR_PATTERNS: Record<string, ErrorPattern> = {
    rateLimited: {
        codes: [429],
        messages: [/rate.?limit/i, /too.?many.?requests/i, /quota.?exceeded/i, /requests.?per/i],
        isRetryable: false,
        shouldFallback: true,
        cooldownMs: 60000, // 1 minute cooldown
    },
    serverError: {
        codes: [500, 502, 503, 504],
        messages: [/internal.?server/i, /bad.?gateway/i, /service.?unavailable/i, /gateway.?timeout/i],
        isRetryable: true,
        shouldFallback: true,
        cooldownMs: 5000,
    },
    quotaExhausted: {
        codes: [402, 403],
        messages: [/quota/i, /billing/i, /payment/i, /credits/i, /insufficient/i],
        isRetryable: false,
        shouldFallback: true,
        cooldownMs: 3600000, // 1 hour cooldown
    },
    modelOverloaded: {
        codes: [503],
        messages: [/overloaded/i, /capacity/i, /currently.?loading/i, /model.?is.?loading/i],
        isRetryable: true,
        shouldFallback: true,
        cooldownMs: 10000,
    },
    unauthorized: {
        codes: [401],
        messages: [/unauthorized/i, /invalid.?api/i, /authentication/i],
        isRetryable: false,
        shouldFallback: true, // Try next provider with valid key
        cooldownMs: 0,
    },
    timeout: {
        codes: [],
        messages: [/timeout/i, /timed.?out/i, /network/i, /fetch.?failed/i],
        isRetryable: true,
        shouldFallback: true,
        cooldownMs: 2000,
    },
};

// ============================================
// RETRY CONFIGURATION
// ============================================
export const RETRY_CONFIG = {
    maxRetriesPerProvider: 2,      // Max retries on same provider
    maxTotalRetries: 5,            // Max total retries across all providers
    baseDelayMs: 500,              // Initial delay before retry
    maxDelayMs: 5000,              // Maximum delay between retries
    backoffMultiplier: 1.5,        // Exponential backoff multiplier
    jitterMs: 200,                 // Random jitter to prevent thundering herd
};

// ============================================
// PROVIDER HEALTH TRACKING
// ============================================
export interface ProviderHealth {
    provider: LLMProvider;
    isHealthy: boolean;
    lastError?: string;
    lastErrorTime?: number;
    cooldownUntil?: number;
    consecutiveFailures: number;
    successRate: number; // 0-1
}

// Local storage key for health tracking
export const HEALTH_STORAGE_KEY = 'socialai_llm_health';
export const QUOTA_STORAGE_KEY = 'socialai_llm_quota';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a provider has a valid API key configured
 */
export function hasValidApiKey(provider: LLMProvider): boolean {
    const key = API_KEYS[provider];
    return typeof key === 'string' && key.length > 10 && !key.includes('your-');
}

/**
 * Get the list of configured providers (have valid API keys)
 */
export function getConfiguredProviders(): LLMProvider[] {
    return PROVIDER_PRIORITY.filter(hasValidApiKey);
}

/**
 * Detect error type from response or error object
 */
export function detectErrorType(error: any, statusCode?: number): string | null {
    const errorMessage = error?.message || error?.error?.message || String(error);

    for (const [errorType, pattern] of Object.entries(ERROR_PATTERNS)) {
        // Check status code
        if (statusCode && pattern.codes.includes(statusCode)) {
            return errorType;
        }
        // Check message patterns
        for (const regex of pattern.messages) {
            if (regex.test(errorMessage)) {
                return errorType;
            }
        }
    }

    return null;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number): number {
    const { baseDelayMs, maxDelayMs, backoffMultiplier, jitterMs } = RETRY_CONFIG;
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
    const capped = Math.min(exponentialDelay, maxDelayMs);
    const jitter = Math.random() * jitterMs * 2 - jitterMs;
    return Math.max(0, capped + jitter);
}

/**
 * Sleep utility for async delays
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

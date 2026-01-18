/**
 * Free LLM Service with Automatic Provider Fallback
 * 
 * This service provides seamless, uninterrupted LLM access by automatically
 * falling back to alternative providers when the primary provider fails.
 * 
 * Features:
 * - Automatic fallback chain: Groq → OpenRouter → HuggingFace
 * - Silent switching (no user-visible errors during fallback)
 * - Smart error detection (rate limits, quota exhaustion, server errors)
 * - Health tracking with cooldown periods for failed providers
 * - Console logging for monitoring (never exposed to users)
 * - Retry logic with exponential backoff
 * - Graceful degradation with friendly messages when all providers fail
 */

import { LLMProvider, LLMQuotaStatus, LLMResponse } from '../types';
import {
    API_KEYS,
    PROVIDER_PRIORITY,
    QUOTA_LIMITS,
    MODELS,
    API_ENDPOINTS,
    ERROR_PATTERNS,
    RETRY_CONFIG,
    QUOTA_STORAGE_KEY,
    HEALTH_STORAGE_KEY,
    ProviderHealth,
    hasValidApiKey,
    getConfiguredProviders,
    detectErrorType,
    calculateRetryDelay,
    sleep,
} from './llmProviderConfig';

// ============================================
// STARTUP LOGGING - Shows configured providers
// ============================================
const configuredProviders = getConfiguredProviders();
console.log('[LLM Service] Initialized with providers:', configuredProviders.length > 0
    ? configuredProviders.join(', ')
    : 'NONE - Please check your environment variables!');

if (configuredProviders.length === 0) {
    console.warn('[LLM Service] ⚠️ No LLM providers configured!');
    console.warn('[LLM Service] Required env vars: VITE_GROQ_API_KEY, VITE_OPENROUTER_API_KEY, or VITE_HUGGINGFACE_API_KEY');
    console.warn('[LLM Service] API Keys detected:', {
        groq: API_KEYS.groq ? `${API_KEYS.groq.substring(0, 8)}...` : 'NOT SET',
        openrouter: API_KEYS.openrouter ? `${API_KEYS.openrouter.substring(0, 8)}...` : 'NOT SET',
        huggingface: API_KEYS.huggingface ? `${API_KEYS.huggingface.substring(0, 8)}...` : 'NOT SET',
    });
}

// ============================================
// TYPES
// ============================================

export interface LLMOptions {
    type?: 'fast' | 'reasoning';
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

interface StoredQuota {
    date: string;
    usage: Record<LLMProvider, number>;
}

interface ProviderCallResult {
    success: boolean;
    text?: string;
    error?: Error;
    statusCode?: number;
    shouldFallback?: boolean;
    cooldownMs?: number;
}

// ============================================
// QUOTA MANAGEMENT
// ============================================

function getStoredQuota(): StoredQuota {
    try {
        const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.date === new Date().toDateString()) return parsed;
        }
    } catch (e) {
        console.warn('[LLM Quota] Parse error:', e);
    }
    const newQuota: StoredQuota = {
        date: new Date().toDateString(),
        usage: { groq: 0, openrouter: 0, huggingface: 0, openai: 0 }
    };
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(newQuota));
    return newQuota;
}

function incrementQuota(provider: LLMProvider): void {
    const quota = getStoredQuota();
    quota.usage[provider] = (quota.usage[provider] || 0) + 1;
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
}

export function getQuotaStatus(): Record<LLMProvider, LLMQuotaStatus> {
    const quota = getStoredQuota();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return (['groq', 'openrouter', 'huggingface', 'openai'] as LLMProvider[]).reduce((acc, provider) => {
        const used = quota.usage[provider] || 0;
        acc[provider] = {
            provider,
            used,
            limit: QUOTA_LIMITS[provider],
            remaining: Math.max(0, QUOTA_LIMITS[provider] - used),
            resetTime: tomorrow
        };
        return acc;
    }, {} as Record<LLMProvider, LLMQuotaStatus>);
}

export function getQuotaWarning(): string | null {
    const status = getQuotaStatus();
    for (const provider of ['groq', 'openrouter', 'huggingface'] as LLMProvider[]) {
        const pct = status[provider].limit > 0
            ? (status[provider].used / status[provider].limit) * 100
            : 0;
        if (pct >= 90) {
            return `Warning: ${provider.toUpperCase()} at ${pct.toFixed(0)}% quota`;
        }
    }
    return null;
}

// ============================================
// PROVIDER HEALTH TRACKING
// ============================================

function getProviderHealth(): Record<LLMProvider, ProviderHealth> {
    try {
        const stored = localStorage.getItem(HEALTH_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[LLM Health] Parse error:', e);
    }

    return PROVIDER_PRIORITY.reduce((acc, provider) => {
        acc[provider] = {
            provider,
            isHealthy: true,
            consecutiveFailures: 0,
            successRate: 1,
        };
        return acc;
    }, {} as Record<LLMProvider, ProviderHealth>);
}

function updateProviderHealth(
    provider: LLMProvider,
    success: boolean,
    error?: string,
    cooldownMs?: number
): void {
    const health = getProviderHealth();
    const now = Date.now();

    if (!health[provider]) {
        health[provider] = {
            provider,
            isHealthy: true,
            consecutiveFailures: 0,
            successRate: 1,
        };
    }

    if (success) {
        health[provider].isHealthy = true;
        health[provider].consecutiveFailures = 0;
        health[provider].lastError = undefined;
        health[provider].lastErrorTime = undefined;
        // Improve success rate
        health[provider].successRate = Math.min(1, health[provider].successRate + 0.1);
    } else {
        health[provider].consecutiveFailures++;
        health[provider].lastError = error;
        health[provider].lastErrorTime = now;
        // Decrease success rate
        health[provider].successRate = Math.max(0, health[provider].successRate - 0.2);

        // Mark unhealthy if too many consecutive failures
        if (health[provider].consecutiveFailures >= 3) {
            health[provider].isHealthy = false;
        }

        // Set cooldown if specified
        if (cooldownMs && cooldownMs > 0) {
            health[provider].cooldownUntil = now + cooldownMs;
            console.log(`[LLM Fallback] ${provider} in cooldown for ${cooldownMs / 1000}s`);
        }
    }

    localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(health));
}

function isProviderInCooldown(provider: LLMProvider): boolean {
    const health = getProviderHealth();
    if (!health[provider]?.cooldownUntil) return false;
    return Date.now() < health[provider].cooldownUntil;
}

// ============================================
// PROVIDER AVAILABILITY
// ============================================

function isProviderAvailable(provider: LLMProvider): boolean {
    // Check API key
    if (!hasValidApiKey(provider)) {
        return false;
    }

    // Check quota
    const quota = getQuotaStatus()[provider];
    if (quota.remaining <= 0) {
        return false;
    }

    // Check cooldown
    if (isProviderInCooldown(provider)) {
        return false;
    }

    return true;
}

function getAvailableProviders(): LLMProvider[] {
    return PROVIDER_PRIORITY.filter(isProviderAvailable);
}

export function hasFreeLLMConfigured(): boolean {
    return getConfiguredProviders().length > 0;
}

// ============================================
// PROVIDER-SPECIFIC API CALLS
// ============================================

async function callGroq(prompt: string, opts: LLMOptions): Promise<ProviderCallResult> {
    const model = opts.type === 'reasoning' ? MODELS.groq.reasoning : MODELS.groq.fast;

    try {
        const res = await fetch(API_ENDPOINTS.groq, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEYS.groq}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [
                    ...(opts.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ],
                temperature: opts.temperature ?? 0.7,
                max_tokens: opts.maxTokens ?? MODELS.groq.maxTokens
            })
        });

        if (!res.ok) {
            const errorBody = await res.text();
            const errorType = detectErrorType({ message: errorBody }, res.status);
            const pattern = errorType ? ERROR_PATTERNS[errorType] : null;

            return {
                success: false,
                error: new Error(`Groq API error ${res.status}: ${errorBody}`),
                statusCode: res.status,
                shouldFallback: pattern?.shouldFallback ?? true,
                cooldownMs: pattern?.cooldownMs,
            };
        }

        const data = await res.json();
        return {
            success: true,
            text: data.choices[0]?.message?.content || '',
        };
    } catch (e: any) {
        const errorType = detectErrorType(e);
        const pattern = errorType ? ERROR_PATTERNS[errorType] : null;

        return {
            success: false,
            error: e,
            shouldFallback: pattern?.shouldFallback ?? true,
            cooldownMs: pattern?.cooldownMs,
        };
    }
}

async function callOpenRouter(prompt: string, opts: LLMOptions): Promise<ProviderCallResult> {
    const model = opts.type === 'reasoning' ? MODELS.openrouter.reasoning : MODELS.openrouter.fast;

    try {
        const res = await fetch(API_ENDPOINTS.openrouter, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEYS.openrouter}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://marketmi.shakesdigital.com',
                'X-Title': 'Market MI Marketing Assistant'
            },
            body: JSON.stringify({
                model,
                messages: [
                    ...(opts.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ],
                temperature: opts.temperature ?? 0.7,
                max_tokens: opts.maxTokens ?? MODELS.openrouter.maxTokens
            })
        });

        if (!res.ok) {
            const errorBody = await res.text();
            const errorType = detectErrorType({ message: errorBody }, res.status);
            const pattern = errorType ? ERROR_PATTERNS[errorType] : null;

            return {
                success: false,
                error: new Error(`OpenRouter API error ${res.status}: ${errorBody}`),
                statusCode: res.status,
                shouldFallback: pattern?.shouldFallback ?? true,
                cooldownMs: pattern?.cooldownMs,
            };
        }

        const data = await res.json();
        return {
            success: true,
            text: data.choices[0]?.message?.content || '',
        };
    } catch (e: any) {
        const errorType = detectErrorType(e);
        const pattern = errorType ? ERROR_PATTERNS[errorType] : null;

        return {
            success: false,
            error: e,
            shouldFallback: pattern?.shouldFallback ?? true,
            cooldownMs: pattern?.cooldownMs,
        };
    }
}

async function callHuggingFace(prompt: string, opts: LLMOptions): Promise<ProviderCallResult> {
    const model = opts.type === 'reasoning' ? MODELS.huggingface.reasoning : MODELS.huggingface.fast;

    // HuggingFace doesn't support system prompts natively, so we format it manually
    const systemPart = opts.systemPrompt ? `System: ${opts.systemPrompt}\n\n` : '';
    const formatted = `${systemPart}User: ${prompt}\n\nAssistant:`;

    try {
        const res = await fetch(API_ENDPOINTS.huggingface(model), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEYS.huggingface}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: formatted,
                parameters: {
                    temperature: opts.temperature ?? 0.7,
                    max_new_tokens: opts.maxTokens ?? MODELS.huggingface.maxTokens,
                    return_full_text: false
                }
            })
        });

        if (!res.ok) {
            const errorBody = await res.text();
            const errorType = detectErrorType({ message: errorBody }, res.status);
            const pattern = errorType ? ERROR_PATTERNS[errorType] : null;

            return {
                success: false,
                error: new Error(`HuggingFace API error ${res.status}: ${errorBody}`),
                statusCode: res.status,
                shouldFallback: pattern?.shouldFallback ?? true,
                cooldownMs: pattern?.cooldownMs,
            };
        }

        const data = await res.json();
        const text = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';

        return {
            success: true,
            text: text.trim(),
        };
    } catch (e: any) {
        const errorType = detectErrorType(e);
        const pattern = errorType ? ERROR_PATTERNS[errorType] : null;

        return {
            success: false,
            error: e,
            shouldFallback: pattern?.shouldFallback ?? true,
            cooldownMs: pattern?.cooldownMs,
        };
    }
}

// Provider call dispatcher
async function callProvider(
    provider: LLMProvider,
    prompt: string,
    opts: LLMOptions
): Promise<ProviderCallResult> {
    switch (provider) {
        case 'groq':
            return callGroq(prompt, opts);
        case 'openrouter':
            return callOpenRouter(prompt, opts);
        case 'huggingface':
            return callHuggingFace(prompt, opts);
        default:
            return {
                success: false,
                error: new Error(`Unknown provider: ${provider}`),
                shouldFallback: true,
            };
    }
}

// ============================================
// MAIN LLM CALL WITH AUTOMATIC FALLBACK
// ============================================

/**
 * Call LLM with automatic provider fallback
 * 
 * This function transparently handles provider failures by automatically
 * switching to the next available provider. The switch is silent and
 * invisible to the end user.
 * 
 * @param prompt - The user prompt
 * @param options - LLM options (type, systemPrompt, temperature, maxTokens)
 * @returns LLMResponse with text and provider used
 * @throws Error only when ALL providers have failed
 */
export async function callLLM(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const availableProviders = getAvailableProviders();
    const errors: Array<{ provider: LLMProvider; error: string }> = [];
    let totalAttempts = 0;

    // Try each available provider in priority order
    for (const provider of availableProviders) {
        if (totalAttempts >= RETRY_CONFIG.maxTotalRetries) {
            console.warn('[LLM Fallback] Max total retries reached');
            break;
        }

        let retries = 0;

        // Retry loop for current provider
        while (retries < RETRY_CONFIG.maxRetriesPerProvider) {
            totalAttempts++;

            console.log(`[LLM] Attempting ${provider} (attempt ${retries + 1}/${RETRY_CONFIG.maxRetriesPerProvider})`);

            const result = await callProvider(provider, prompt, options);

            if (result.success && result.text) {
                // Success! Update health tracking and quota
                updateProviderHealth(provider, true);
                incrementQuota(provider);

                // Log the successful provider (for admin monitoring)
                if (errors.length > 0) {
                    console.log(`[LLM Fallback] Successfully switched to ${provider} after ${errors.length} failed attempts`);
                } else {
                    console.log(`[LLM] Success with primary provider: ${provider}`);
                }

                return {
                    text: result.text,
                    provider,
                };
            }

            // Handle failure
            const errorMsg = result.error?.message || 'Unknown error';
            errors.push({ provider, error: errorMsg });

            // Update health tracking
            updateProviderHealth(provider, false, errorMsg, result.cooldownMs);

            // Log the switch (admin monitoring only, never shown to users)
            console.warn(
                `[LLM Fallback] ${provider} failed (${result.statusCode || 'network'}): ${errorMsg.substring(0, 100)}`
            );

            // Should we retry on this provider or move to next?
            if (!result.shouldFallback) {
                // Error type doesn't warrant fallback, maybe wait and retry
                const delay = calculateRetryDelay(retries);
                console.log(`[LLM Fallback] Retrying ${provider} in ${delay}ms...`);
                await sleep(delay);
                retries++;
            } else {
                // Move to next provider immediately
                console.log(`[LLM Fallback] Switching from ${provider} to next provider due to: ${detectErrorType(result.error, result.statusCode) || 'error'}`);
                break;
            }
        }
    }

    // ============================================
    // ALL PROVIDERS FAILED - GRACEFUL DEGRADATION
    // ============================================

    // Log detailed failure info for debugging
    console.error('[LLM Fallback] All providers failed:', errors);

    // Final retry attempt after a short delay
    console.log('[LLM Fallback] Waiting before final retry attempt...');
    await sleep(2000);

    // One more attempt on the healthiest available provider
    const lastChanceProvider = availableProviders[0];
    if (lastChanceProvider) {
        console.log(`[LLM Fallback] Final attempt with ${lastChanceProvider}...`);
        const finalResult = await callProvider(lastChanceProvider, prompt, options);

        if (finalResult.success && finalResult.text) {
            updateProviderHealth(lastChanceProvider, true);
            incrementQuota(lastChanceProvider);
            console.log(`[LLM Fallback] Final retry successful with ${lastChanceProvider}`);
            return {
                text: finalResult.text,
                provider: lastChanceProvider,
            };
        }
    }

    // Throw a user-friendly error that will be caught by the UI
    throw new AllProvidersFailedError(errors);
}

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

export class AllProvidersFailedError extends Error {
    public readonly errors: Array<{ provider: LLMProvider; error: string }>;
    public readonly friendlyMessage: string;

    constructor(errors: Array<{ provider: LLMProvider; error: string }>) {
        super('All LLM providers failed');
        this.name = 'AllProvidersFailedError';
        this.errors = errors;
        this.friendlyMessage = "Taking a quick breather — trying again...";
    }
}

// ============================================
// JSON PARSING UTILITY
// ============================================

/**
 * Parse JSON from LLM response with multiple fallback patterns
 * Uses bracket matching for reliable extraction of nested JSON
 */
export function parseJSONFromLLM<T>(text: string): T | null {
    if (!text || typeof text !== 'string') {
        console.warn('[parseJSON] No text provided');
        return null;
    }

    console.log('[parseJSON] Attempting to parse response of length:', text.length);

    // Helper function to extract complete JSON using bracket matching
    function extractCompleteJSON(str: string, startChar: '{' | '['): string | null {
        const endChar = startChar === '{' ? '}' : ']';
        const startIndex = str.indexOf(startChar);
        if (startIndex === -1) return null;

        let depth = 0;
        let inString = false;
        let escape = false;

        for (let i = startIndex; i < str.length; i++) {
            const char = str[i];

            if (escape) {
                escape = false;
                continue;
            }

            if (char === '\\' && inString) {
                escape = true;
                continue;
            }

            if (char === '"' && !escape) {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === startChar) depth++;
                else if (char === endChar) {
                    depth--;
                    if (depth === 0) {
                        return str.substring(startIndex, i + 1);
                    }
                }
            }
        }
        return null;
    }

    // Try extracting from markdown code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        const codeContent = codeBlockMatch[1].trim();
        try {
            const parsed = JSON.parse(codeContent);
            console.log('[parseJSON] Parsed from code block successfully');
            return parsed;
        } catch (e) {
            console.log('[parseJSON] Code block parse failed, trying extraction...');
        }
    }

    // Try to extract complete JSON object starting with {
    const objectJSON = extractCompleteJSON(text, '{');
    if (objectJSON) {
        try {
            const parsed = JSON.parse(objectJSON);
            console.log('[parseJSON] Parsed complete object successfully, keys:', Object.keys(parsed));
            return parsed;
        } catch (e) {
            console.log('[parseJSON] Object extraction failed:', (e as Error).message);
        }
    }

    // Try to extract complete JSON array starting with [
    const arrayJSON = extractCompleteJSON(text, '[');
    if (arrayJSON) {
        try {
            const parsed = JSON.parse(arrayJSON);
            console.log('[parseJSON] Parsed complete array successfully, length:', Array.isArray(parsed) ? parsed.length : 'N/A');
            return parsed;
        } catch (e) {
            console.log('[parseJSON] Array extraction failed:', (e as Error).message);
        }
    }

    // Clean up common issues and try direct parse
    let cleanText = text
        .replace(/^[\s\S]*?(\{|\[)/m, '$1')  // Remove text before first { or [
        .replace(/(\}|\])[\s\S]*$/m, '$1');   // Remove text after last } or ]

    try {
        const parsed = JSON.parse(cleanText);
        console.log('[parseJSON] Parsed cleaned text successfully');
        return parsed;
    } catch (e) {
        // Continue
    }

    // Last resort: try parsing the whole original text
    try {
        const parsed = JSON.parse(text);
        console.log('[parseJSON] Parsed whole text successfully');
        return parsed;
    } catch (e) {
        console.warn('[parseJSON] All extraction methods failed. First 500 chars of text:', text.substring(0, 500));
        console.warn('[parseJSON] Last 200 chars of text:', text.substring(text.length - 200));
        return null;
    }
}

// ============================================
// ADMIN/DEBUG UTILITIES
// ============================================

/**
 * Get current provider health status (for admin dashboard)
 */
export function getProviderHealthStatus(): Record<LLMProvider, ProviderHealth> {
    return getProviderHealth();
}

/**
 * Force reset health status for a provider (admin action)
 */
export function resetProviderHealth(provider: LLMProvider): void {
    const health = getProviderHealth();
    health[provider] = {
        provider,
        isHealthy: true,
        consecutiveFailures: 0,
        successRate: 1,
    };
    localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(health));
    console.log(`[LLM Admin] Reset health for ${provider}`);
}

/**
 * Get list of currently available providers (for debugging)
 */
export function getAvailableProvidersList(): LLMProvider[] {
    return getAvailableProviders();
}

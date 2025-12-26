import { LLMProvider, LLMQuotaStatus, LLMResponse } from '../types';

// Configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';

const QUOTA_LIMITS: Record<LLMProvider, number> = {
    groq: 14400, openrouter: 200, huggingface: 1000, openai: 0
};

const MODELS = {
    groq: { fast: 'llama-3.3-70b-versatile', reasoning: 'llama-3.3-70b-versatile' },
    openrouter: { fast: 'meta-llama/llama-3.2-3b-instruct:free', reasoning: 'meta-llama/llama-3.1-8b-instruct:free' },
    huggingface: { fast: 'HuggingFaceH4/zephyr-7b-beta', reasoning: 'mistralai/Mixtral-8x7B-Instruct-v0.1' }
};

const QUOTA_STORAGE_KEY = 'socialai_llm_quota';

interface StoredQuota { date: string; usage: Record<LLMProvider, number>; }

function getStoredQuota(): StoredQuota {
    try {
        const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.date === new Date().toDateString()) return parsed;
        }
    } catch (e) { console.warn('Quota parse error:', e); }
    const newQuota: StoredQuota = { date: new Date().toDateString(), usage: { groq: 0, openrouter: 0, huggingface: 0, openai: 0 } };
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
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
    return (['groq', 'openrouter', 'huggingface', 'openai'] as LLMProvider[]).reduce((acc, provider) => {
        const used = quota.usage[provider] || 0;
        acc[provider] = { provider, used, limit: QUOTA_LIMITS[provider], remaining: Math.max(0, QUOTA_LIMITS[provider] - used), resetTime: tomorrow };
        return acc;
    }, {} as Record<LLMProvider, LLMQuotaStatus>);
}

export function getQuotaWarning(): string | null {
    const status = getQuotaStatus();
    for (const provider of ['groq', 'openrouter', 'huggingface'] as LLMProvider[]) {
        const pct = status[provider].limit > 0 ? (status[provider].used / status[provider].limit) * 100 : 0;
        if (pct >= 90) return `Warning: ${provider.toUpperCase()} at ${pct.toFixed(0)}% quota`;
    }
    return null;
}

function isProviderAvailable(p: LLMProvider): boolean {
    const q = getQuotaStatus()[p];
    if (p === 'groq') return !!GROQ_API_KEY && q.remaining > 0;
    if (p === 'openrouter') return !!OPENROUTER_API_KEY && q.remaining > 0;
    if (p === 'huggingface') return !!HUGGINGFACE_API_KEY && q.remaining > 0;
    return false;
}

function getAvailableProvider(): LLMProvider | null {
    for (const p of ['groq', 'openrouter', 'huggingface'] as LLMProvider[]) {
        if (isProviderAvailable(p)) return p;
    }
    return null;
}

export interface LLMOptions {
    type?: 'fast' | 'reasoning';
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

async function callGroq(prompt: string, opts: LLMOptions): Promise<string> {
    const model = opts.type === 'reasoning' ? MODELS.groq.reasoning : MODELS.groq.fast;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [...(opts.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []), { role: 'user', content: prompt }],
            temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens ?? 2048
        })
    });
    if (!res.ok) throw new Error(`Groq error: ${res.status}`);
    const data = await res.json();
    return data.choices[0]?.message?.content || '';
}

async function callOpenRouter(prompt: string, opts: LLMOptions): Promise<string> {
    const model = opts.type === 'reasoning' ? MODELS.openrouter.reasoning : MODELS.openrouter.fast;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
            model,
            messages: [...(opts.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []), { role: 'user', content: prompt }],
            temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens ?? 2048
        })
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    const data = await res.json();
    return data.choices[0]?.message?.content || '';
}

async function callHuggingFace(prompt: string, opts: LLMOptions): Promise<string> {
    const model = opts.type === 'reasoning' ? MODELS.huggingface.reasoning : MODELS.huggingface.fast;
    const systemPart = opts.systemPrompt ? `System: ${opts.systemPrompt}\n\n` : '';
    const formatted = `${systemPart}User: ${prompt}\n\nAssistant:`;

    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            inputs: formatted,
            parameters: { temperature: opts.temperature ?? 0.7, max_new_tokens: opts.maxTokens ?? 1024, return_full_text: false }
        })
    });
    if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
}

// Main unified LLM call with automatic fallback
export async function callLLM(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const providers: LLMProvider[] = ['groq', 'openrouter', 'huggingface'];
    const errors: string[] = [];

    for (const provider of providers) {
        if (!isProviderAvailable(provider)) {
            console.log(`[LLM] ${provider} not available, skipping`);
            continue;
        }

        try {
            console.log(`[LLM] Trying ${provider}...`);
            let text = '';

            switch (provider) {
                case 'groq': text = await callGroq(prompt, options); break;
                case 'openrouter': text = await callOpenRouter(prompt, options); break;
                case 'huggingface': text = await callHuggingFace(prompt, options); break;
            }

            incrementQuota(provider);
            console.log(`[LLM] Success with ${provider}`);
            return { text, provider };
        } catch (e: any) {
            console.warn(`[LLM] ${provider} failed:`, e.message);
            errors.push(`${provider}: ${e.message}`);
        }
    }

    throw new Error(`All LLM providers failed: ${errors.join('; ')}`);
}

// Helper to parse JSON from LLM response
export function parseJSONFromLLM<T>(text: string): T | null {
    try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            return JSON.parse(jsonStr);
        }
        return JSON.parse(text);
    } catch (e) {
        console.warn('Failed to parse JSON from LLM response:', e);
        return null;
    }
}

// Check if any free LLM provider is configured
export function hasFreeLLMConfigured(): boolean {
    return !!GROQ_API_KEY || !!OPENROUTER_API_KEY || !!HUGGINGFACE_API_KEY;
}

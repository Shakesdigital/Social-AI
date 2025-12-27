# LLM Provider Fallback System

## Overview

The SocialAI application now includes a **production-ready automatic LLM provider fallback system** that ensures seamless, uninterrupted user experience when any provider hits rate limits, quota exhaustion, or errors.

## Fallback Chain

**Priority Order:**
1. **Groq** (Primary) - Fastest, 14,400 requests/day free
2. **OpenRouter** (First Fallback) - Access to DeepSeek R1, Llama 3.1/3.2 free models
3. **HuggingFace** (Second Fallback) - Open-source models like Zephyr and Mixtral

## Key Features

### 1. ✅ Silent Provider Switching
- When Groq hits a rate limit (429), the system **immediately and silently** switches to OpenRouter
- If OpenRouter also fails, it switches to HuggingFace
- The user **never sees** any error messages or delays beyond normal response time

### 2. ✅ Smart Error Detection
Detects and handles these error types automatically:

| Error Type | HTTP Codes | Action | Cooldown |
|------------|------------|--------|----------|
| Rate Limited | 429 | Switch to next provider | 1 minute |
| Server Error | 500, 502, 503, 504 | Retry once, then switch | 5 seconds |
| Quota Exhausted | 402, 403 | Switch to next provider | 1 hour |
| Model Overloaded | 503 | Retry once, then switch | 10 seconds |
| Unauthorized | 401 | Switch to next provider | None |
| Timeout | Network errors | Retry once, then switch | 2 seconds |

### 3. ✅ Admin/Backend Logging
All fallback events are logged to the browser console for monitoring:
```
[LLM Fallback] Switched from groq to openrouter due to rate limit
[LLM Fallback] groq failed (429): Rate limit exceeded
[LLM] Success with openrouter
```
**These logs are NEVER exposed to end users.**

### 4. ✅ Health Tracking with Cooldowns
- Failed providers are put in a "cooldown" period based on error type
- Health tracking persists in localStorage
- Providers automatically recover after cooldown expires

### 5. ✅ Graceful Degradation
When ALL providers fail:
1. Shows friendly message: *"Taking a quick breather — trying again..."*
2. Waits 3 seconds
3. Automatically retries
4. If still failing: *"I'm having a bit of trouble connecting right now. Please try again in a moment! 🙏"*

### 6. ✅ Retry Logic with Backoff
- Up to 2 retries per provider
- Up to 5 total retries across all providers
- Exponential backoff with jitter to prevent thundering herd

## Files Changed

| File | Description |
|------|-------------|
| `services/llmProviderConfig.ts` | **NEW** - Centralized configuration for providers, models, error patterns |
| `services/freeLLMService.ts` | **REWRITTEN** - Robust fallback system with health tracking |
| `hooks/useFreeLLM.ts` | **UPDATED** - Exposes health status and available providers |
| `components/ChatBot.tsx` | **UPDATED** - Graceful error handling with friendly messages |
| `components/LiveAssistant.tsx` | **UPDATED** - Same graceful handling for voice assistant |
| `.env.example` | **UPDATED** - Comprehensive documentation of fallback behavior |

## Configuration

### Environment Variables

```env
# Primary provider (fastest)
VITE_GROQ_API_KEY=your-groq-api-key

# First fallback
VITE_OPENROUTER_API_KEY=your-openrouter-api-key

# Second fallback  
VITE_HUGGINGFACE_API_KEY=your-huggingface-api-key
```

### Changing Provider Priority

Edit `services/llmProviderConfig.ts`:

```typescript
// Change fallback order by reordering this array:
export const PROVIDER_PRIORITY: LLMProvider[] = [
    'groq',        // Primary
    'openrouter',  // First fallback
    'huggingface', // Second fallback
];
```

### Model Selection

Each provider has "fast" and "reasoning" model variants:

```typescript
export const MODELS = {
    groq: {
        fast: 'llama-3.3-70b-versatile',
        reasoning: 'llama-3.3-70b-versatile',
    },
    openrouter: {
        fast: 'meta-llama/llama-3.2-3b-instruct:free',
        reasoning: 'deepseek/deepseek-r1-distill-llama-70b:free',
    },
    huggingface: {
        fast: 'HuggingFaceH4/zephyr-7b-beta',
        reasoning: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    },
};
```

## Usage Example

The fallback is completely automatic. Just call `callLLM()` as usual:

```typescript
import { callLLM } from './services/freeLLMService';

const response = await callLLM("Write a marketing tagline", {
    type: 'fast',
    temperature: 0.7
});

console.log(response.text);     // The generated response
console.log(response.provider); // Which provider was used (e.g., 'groq' or 'openrouter')
```

## Debugging & Monitoring

### View Provider Health

```typescript
import { getProviderHealthStatus, getAvailableProvidersList } from './services/freeLLMService';

// Get health status of all providers
const health = getProviderHealthStatus();
console.log(health);

// Get list of currently available (healthy + has API key + has quota) providers
const available = getAvailableProvidersList();
console.log(available); // e.g., ['groq', 'openrouter']
```

### Reset Provider Health

```typescript
import { resetProviderHealth } from './services/freeLLMService';

// Force reset a provider that's in cooldown
resetProviderHealth('groq');
```

## No New Dependencies

This implementation uses only built-in browser APIs and the existing project structure. No new npm packages are required.

## Best Practices for Production

1. **Configure all three providers** for maximum reliability
2. **Monitor console logs** during development to see fallback behavior
3. **Check quota status** in the app to avoid unexpected exhaustion
4. **Use the `getProviderHealthStatus()`** function in an admin dashboard to monitor provider health

---

*Implementation completed: December 27, 2025*

// Groq TTS Service - Unified Voice for Desktop and Mobile
// Primary: Groq Orpheus TTS API
// Fallback: Browser Web Speech API (only on rate limit)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const GROQ_MAX_CHARS = 180;

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'groq' | 'browser' | 'none';

const GROQ_VOICES = {
    male: 'austin',
    female: 'hannah'
};

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

// Track rate limiting only (not other errors)
let groqRateLimited = false;
let rateLimitTime: number = 0;
const RATE_LIMIT_RECOVERY = 60000;

export const isGroqTTSConfigured = (): boolean => {
    const configured = !!GROQ_API_KEY && GROQ_API_KEY.length > 10;
    console.log('[TTS] Groq configured:', configured);
    return configured;
};

export const getTTSStatus = () => ({
    groq: { provider: 'groq' as TTSProvider, isConfigured: isGroqTTSConfigured() },
    browser: { provider: 'browser' as TTSProvider, isConfigured: true }
});

export const getBestProvider = (): TTSProvider => {
    if (isGroqTTSConfigured() && !groqRateLimited) return 'groq';
    return 'browser';
};

// Smart text chunking
const chunkText = (text: string, maxLength: number = GROQ_MAX_CHARS): string[] => {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let current = '';

    for (const sentence of sentences) {
        if (sentence.length > maxLength) {
            if (current) { chunks.push(current.trim()); current = ''; }
            // Split long sentence by commas or spaces
            const parts = sentence.split(/(?<=,)\s*|(?<=\s)/);
            for (const part of parts) {
                if ((current + part).length > maxLength) {
                    if (current) chunks.push(current.trim());
                    current = part;
                } else {
                    current += part;
                }
            }
        } else if ((current + ' ' + sentence).length > maxLength) {
            if (current) chunks.push(current.trim());
            current = sentence;
        } else {
            current = current ? current + ' ' + sentence : sentence;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.filter(c => c.length > 0);
};

// Fetch audio from Groq with retry
const fetchGroqAudio = async (text: string, voice: string, retries = 2): Promise<Blob | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[TTS] Groq fetch attempt ${attempt}/${retries}: "${text.slice(0, 30)}..."`);

            const response = await fetch(GROQ_TTS_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'canopylabs/orpheus-v1-english',
                    input: text,
                    voice: voice,
                    response_format: 'wav'
                })
            });

            if (response.status === 429) {
                console.warn('[TTS] Groq rate limited (429)');
                groqRateLimited = true;
                rateLimitTime = Date.now();
                return null;
            }

            if (!response.ok) {
                const err = await response.text().catch(() => '');
                console.error(`[TTS] Groq API error ${response.status}:`, err);
                if (attempt < retries) continue;
                return null;
            }

            const blob = await response.blob();
            console.log('[TTS] Groq audio received:', blob.size, 'bytes');
            return blob;

        } catch (error: any) {
            console.error(`[TTS] Groq fetch error (attempt ${attempt}):`, error.message);
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 500)); // Wait before retry
                continue;
            }
            return null;
        }
    }
    return null;
};

// Play audio blob (mobile-compatible with multiple fallbacks)
const playAudioBlob = (blob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        let hasPlayed = false;
        let hasResolved = false;

        const cleanup = () => {
            if (!hasResolved) {
                hasResolved = true;
                URL.revokeObjectURL(url);
            }
        };

        audio.onended = () => {
            console.log('[TTS] Audio chunk completed');
            cleanup();
            resolve();
        };

        audio.onerror = (e) => {
            console.error('[TTS] Audio error:', e);
            cleanup();
            // Don't reject - try to continue
            resolve();
        };

        audio.oncanplaythrough = () => {
            if (!hasPlayed) {
                hasPlayed = true;
                audio.play().catch(e => {
                    console.error('[TTS] Play failed:', e);
                    cleanup();
                    resolve(); // Continue even on error
                });
            }
        };

        // Mobile: set properties and try immediate play
        audio.preload = 'auto';
        audio.autoplay = true;
        audio.muted = false;
        audio.volume = 1.0;
        audio.src = url;

        // Load and try to play
        audio.load();

        // Fallback: if canplaythrough doesn't fire, try after load
        audio.onloadeddata = () => {
            if (!hasPlayed) {
                hasPlayed = true;
                audio.play().catch(() => {
                    cleanup();
                    resolve();
                });
            }
        };

        // Ultimate fallback: resolve after timeout
        setTimeout(() => {
            if (!hasResolved) {
                console.warn('[TTS] Audio timeout - continuing');
                cleanup();
                resolve();
            }
        }, 15000); // 15 second timeout
    });
};

// Groq TTS with chunking
const speakWithGroq = async (
    text: string,
    voice: string,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    const chunks = chunkText(text);
    console.log('[TTS] Groq processing', chunks.length, 'chunks');

    let started = false;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[TTS] Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

        const blob = await fetchGroqAudio(chunk, voice);

        if (!blob) {
            console.error('[TTS] Failed to get audio for chunk', i + 1);
            // Continue trying other chunks instead of failing completely
            continue;
        }

        if (!started) {
            started = true;
            onStart?.();
        }

        try {
            await playAudioBlob(blob);
        } catch (e) {
            console.error('[TTS] Chunk playback failed:', e);
            // Continue with next chunk
        }
    }

    onEnd?.();
    return started; // Return true if at least one chunk played
};

// Browser fallback (only used when Groq is rate limited)
const speakWithBrowser = (
    text: string,
    gender: VoiceGender,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            resolve(false);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        const voice = voices.find(v => v.lang.startsWith('en') &&
            (gender === 'male' ? v.name.toLowerCase().includes('male') : true)
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (voice) utterance.voice = voice;
        utterance.rate = 1.0;
        utterance.pitch = gender === 'male' ? 0.95 : 1.0;

        utterance.onstart = () => { console.log('[TTS] Browser started'); onStart?.(); };
        utterance.onend = () => { console.log('[TTS] Browser ended'); onEnd?.(); resolve(true); };
        utterance.onerror = () => { onEnd?.(); resolve(false); };

        window.speechSynthesis.speak(utterance);
    });
};

// Main speak function
export const speak = async (
    text: string,
    gender: VoiceGender = 'male',
    callbacks?: {
        onStart?: () => void;
        onEnd?: () => void;
        onProviderChange?: (provider: TTSProvider) => void;
        onError?: (error: string, provider: TTSProvider) => void;
    }
): Promise<SpeakResult> => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('[TTS] speak():', { chars: text.length, gender, isMobile });

    // Check rate limit recovery
    if (groqRateLimited && Date.now() - rateLimitTime > RATE_LIMIT_RECOVERY) {
        console.log('[TTS] Rate limit cleared, trying Groq again');
        groqRateLimited = false;
    }

    // Always try Groq first (for both desktop and mobile)
    if (isGroqTTSConfigured() && !groqRateLimited) {
        callbacks?.onProviderChange?.('groq');
        console.log('[TTS] Using Groq TTS (unified for desktop/mobile)');

        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;
        const success = await speakWithGroq(text, voice, callbacks?.onStart, callbacks?.onEnd);

        if (success) {
            return { success: true, provider: 'groq' };
        }
        console.warn('[TTS] Groq failed, falling back to browser');
    }

    // Fallback to browser
    callbacks?.onProviderChange?.('browser');
    console.log('[TTS] Using browser speech (fallback)');

    const success = await speakWithBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd);
    return { success, provider: success ? 'browser' : 'none' };
};

export const getTTSStatusMessage = (): string => {
    if (isGroqTTSConfigured() && !groqRateLimited) return '🎙️ Groq AI';
    return '🎙️ Browser';
};

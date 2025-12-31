// Groq TTS Service - Unified Voice for Desktop and Mobile
// Uses persistent audio element to bypass mobile restrictions

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

let groqRateLimited = false;
let rateLimitTime: number = 0;
const RATE_LIMIT_RECOVERY = 60000;

// PERSISTENT AUDIO ELEMENT - keeps audio context "warm" on mobile
let persistentAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

// Initialize/unlock the persistent audio element (call on first user gesture)
export const unlockMobileAudio = (): void => {
    if (audioUnlocked && persistentAudio) return;

    console.log('[TTS] Unlocking mobile audio...');

    // Create persistent audio element
    persistentAudio = new Audio();
    persistentAudio.volume = 1.0;
    persistentAudio.muted = false;

    // Play silent audio to unlock
    const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    persistentAudio.src = silentWav;

    persistentAudio.play().then(() => {
        console.log('[TTS] Mobile audio unlocked successfully!');
        audioUnlocked = true;
    }).catch(e => {
        console.warn('[TTS] Audio unlock failed:', e);
    });
};

export const isGroqTTSConfigured = (): boolean => {
    return !!GROQ_API_KEY && GROQ_API_KEY.length > 10;
};

export const getTTSStatus = () => ({
    groq: { provider: 'groq' as TTSProvider, isConfigured: isGroqTTSConfigured() },
    browser: { provider: 'browser' as TTSProvider, isConfigured: true }
});

export const getBestProvider = (): TTSProvider => {
    if (isGroqTTSConfigured() && !groqRateLimited) return 'groq';
    return 'browser';
};

// Text chunking
const chunkText = (text: string, maxLength: number = GROQ_MAX_CHARS): string[] => {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let current = '';

    for (const sentence of sentences) {
        if (sentence.length > maxLength) {
            if (current) { chunks.push(current.trim()); current = ''; }
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

// Fetch audio from Groq
const fetchGroqAudio = async (text: string, voice: string): Promise<Blob | null> => {
    try {
        console.log(`[TTS] Groq fetch: "${text.slice(0, 30)}..."`);

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
            console.warn('[TTS] Groq rate limited');
            groqRateLimited = true;
            rateLimitTime = Date.now();
            return null;
        }

        if (!response.ok) {
            console.error('[TTS] Groq error:', response.status);
            return null;
        }

        const blob = await response.blob();
        console.log('[TTS] Groq audio:', blob.size, 'bytes');
        return blob;

    } catch (error: any) {
        console.error('[TTS] Groq fetch error:', error.message);
        return null;
    }
};

// Play audio using the persistent element (mobile-safe)
const playAudioBlob = (blob: Blob): Promise<void> => {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);

        // Use persistent audio element if available (mobile)
        const audio = persistentAudio || new Audio();

        const cleanup = () => {
            URL.revokeObjectURL(url);
            audio.onended = null;
            audio.onerror = null;
        };

        audio.onended = () => {
            console.log('[TTS] Audio chunk completed');
            cleanup();
            resolve();
        };

        audio.onerror = (e) => {
            console.error('[TTS] Audio error:', e);
            cleanup();
            resolve(); // Continue even on error
        };

        // Set new source and play
        audio.src = url;
        audio.load();

        audio.play().then(() => {
            console.log('[TTS] Audio playing...');
        }).catch(e => {
            console.error('[TTS] Play failed:', e.message);
            cleanup();
            resolve();
        });

        // Timeout fallback
        setTimeout(() => {
            if (!audio.ended && audio.currentTime === 0) {
                console.warn('[TTS] Audio timeout');
                cleanup();
                resolve();
            }
        }, 30000);
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
    console.log('[TTS] Groq:', chunks.length, 'chunks');

    let started = false;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[TTS] Chunk ${i + 1}/${chunks.length}`);

        const blob = await fetchGroqAudio(chunk, voice);
        if (!blob) {
            console.error('[TTS] Failed chunk', i + 1);
            continue;
        }

        if (!started) {
            started = true;
            onStart?.();
        }

        await playAudioBlob(blob);
    }

    onEnd?.();
    return started;
};

// Browser TTS fallback
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

        const voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (voice) utterance.voice = voice;
        utterance.rate = 1.0;
        utterance.pitch = gender === 'male' ? 0.95 : 1.0;

        utterance.onstart = () => onStart?.();
        utterance.onend = () => { onEnd?.(); resolve(true); };
        utterance.onerror = () => { onEnd?.(); resolve(false); };

        window.speechSynthesis.speak(utterance);
    });
};

// Main speak function - Groq FIRST for all devices
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
    console.log('[TTS] speak():', { chars: text.length, gender, isMobile, audioUnlocked });

    // Rate limit recovery
    if (groqRateLimited && Date.now() - rateLimitTime > RATE_LIMIT_RECOVERY) {
        groqRateLimited = false;
    }

    // ALWAYS try Groq first (desktop and mobile)
    if (isGroqTTSConfigured() && !groqRateLimited) {
        callbacks?.onProviderChange?.('groq');
        console.log('[TTS] Using Groq TTS');

        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;
        const success = await speakWithGroq(text, voice, callbacks?.onStart, callbacks?.onEnd);

        if (success) {
            return { success: true, provider: 'groq' };
        }
        console.warn('[TTS] Groq failed, trying browser');
    }

    // Fallback to browser
    callbacks?.onProviderChange?.('browser');
    console.log('[TTS] Browser fallback');

    const success = await speakWithBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd);
    return { success, provider: success ? 'browser' : 'none' };
};

export const getTTSStatusMessage = (): string => {
    if (isGroqTTSConfigured() && !groqRateLimited) return '🎙️ Groq AI';
    return '🎙️ Browser';
};

// Groq TTS Service - Desktop optimized, Mobile with special handling
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const GROQ_MAX_CHARS = 195; // Groq limit is 200, maximize to reduce API calls

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
const RATE_LIMIT_RECOVERY = 30000; // 30 seconds - Groq TTS has strict limits

// Mobile detection
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Web Audio API for mobile
let audioContext: AudioContext | null = null;
let isAudioUnlocked = false;

// Track current audio for stopping
let currentAudioElement: HTMLAudioElement | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;
let isStopped = false;

// Stop any ongoing speech
export const stopSpeaking = (): void => {
    console.log('[TTS] Stopping speech...');
    isStopped = true;

    // Stop HTML5 Audio
    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        currentAudioElement = null;
    }

    // Stop Web Audio API source
    if (currentAudioSource) {
        try {
            currentAudioSource.stop();
        } catch (e) { /* Already stopped */ }
        currentAudioSource = null;
    }

    // Stop browser TTS
    window.speechSynthesis?.cancel();
};

export const unlockMobileAudio = (): void => {
    if (!isMobile() || isAudioUnlocked) return;

    console.log('[TTS] Unlocking mobile audio...');
    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        isAudioUnlocked = true;
        console.log('[TTS] Mobile audio unlocked!');
    } catch (e) {
        console.warn('[TTS] Mobile audio unlock failed:', e);
    }
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
const fetchGroqAudio = async (text: string, voice: string): Promise<ArrayBuffer | null> => {
    try {
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
            console.warn('[TTS] Rate limited');
            groqRateLimited = true;
            rateLimitTime = Date.now();
            return null;
        }

        if (!response.ok) {
            console.error('[TTS] Groq error:', response.status);
            return null;
        }

        return await response.arrayBuffer();
    } catch (error: any) {
        console.error('[TTS] Groq fetch error:', error.message);
        return null;
    }
};

// DESKTOP: Simple HTML5 Audio playback (fast, works great)
const playAudioDesktop = (arrayBuffer: ArrayBuffer): Promise<void> => {
    return new Promise((resolve) => {
        if (isStopped) { resolve(); return; }

        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        // Track for stopping
        currentAudioElement = audio;

        audio.onended = () => {
            URL.revokeObjectURL(url);
            currentAudioElement = null;
            resolve();
        };

        audio.onerror = () => {
            URL.revokeObjectURL(url);
            currentAudioElement = null;
            resolve();
        };

        audio.play().catch(() => {
            currentAudioElement = null;
            resolve();
        });
    });
};

// MOBILE: Web Audio API playback (handles restrictions)
const playAudioMobile = async (arrayBuffer: ArrayBuffer): Promise<void> => {
    return new Promise(async (resolve) => {
        if (isStopped) { resolve(); return; }

        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            // Track for stopping
            currentAudioSource = source;

            source.onended = () => {
                currentAudioSource = null;
                resolve();
            };

            source.start(0);

        } catch (e) {
            console.error('[TTS] Mobile audio error:', e);
            // Fallback to HTML5
            await playAudioDesktop(arrayBuffer);
            resolve();
        }
    });
};

// DESKTOP: Groq TTS (with small delay to avoid rate limits)
const speakWithGroqDesktop = async (
    text: string,
    voice: string,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    const chunks = chunkText(text);
    console.log('[TTS] Desktop: Playing', chunks.length, 'chunks');

    let started = false;

    for (let i = 0; i < chunks.length; i++) {
        // Small delay between chunks to avoid rate limiting
        if (i > 0) {
            await new Promise(r => setTimeout(r, 200));
        }

        const audioData = await fetchGroqAudio(chunks[i], voice);
        if (!audioData) continue;

        if (!started) { started = true; onStart?.(); }
        await playAudioDesktop(audioData);
    }

    onEnd?.();
    return started;
};

// MOBILE: Groq TTS with delays and retries
const speakWithGroqMobile = async (
    text: string,
    voice: string,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    const chunks = chunkText(text);
    console.log('[TTS] Mobile: Processing', chunks.length, 'chunks');

    let started = false;

    for (let i = 0; i < chunks.length; i++) {
        // Delay between chunks for mobile
        if (i > 0) {
            await new Promise(r => setTimeout(r, 500));
        }

        // Retry logic
        let audioData: ArrayBuffer | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
            audioData = await fetchGroqAudio(chunks[i], voice);
            if (audioData) break;
            if (attempt < 2 && !groqRateLimited) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!audioData) continue;

        if (!started) { started = true; onStart?.(); }
        await playAudioMobile(audioData);
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
        if (!window.speechSynthesis) { resolve(false); return; }

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

// Main speak function - routes to desktop or mobile
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
    const mobile = isMobile();
    console.log('[TTS] speak():', { chars: text.length, gender, mobile });

    // Reset stop flag for new speech
    isStopped = false;

    // Rate limit recovery
    if (groqRateLimited && Date.now() - rateLimitTime > RATE_LIMIT_RECOVERY) {
        groqRateLimited = false;
    }

    // Try Groq
    if (isGroqTTSConfigured() && !groqRateLimited) {
        callbacks?.onProviderChange?.('groq');

        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;

        // Use different implementations for desktop vs mobile
        const success = mobile
            ? await speakWithGroqMobile(text, voice, callbacks?.onStart, callbacks?.onEnd)
            : await speakWithGroqDesktop(text, voice, callbacks?.onStart, callbacks?.onEnd);

        if (success) {
            return { success: true, provider: 'groq' };
        }
    }

    // Fallback to browser
    callbacks?.onProviderChange?.('browser');
    const success = await speakWithBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd);
    return { success, provider: success ? 'browser' : 'none' };
};

export const getTTSStatusMessage = (): string => {
    if (isGroqTTSConfigured() && !groqRateLimited) return '🎙️ Groq AI';
    return '🎙️ Browser';
};

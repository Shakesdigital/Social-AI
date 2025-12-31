// Groq TTS Service - Mobile-Optimized with Web Audio API
// Uses Web Audio API context to bypass mobile restrictions

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

// Web Audio API context - more reliable on mobile
let audioContext: AudioContext | null = null;
let isAudioUnlocked = false;

// Initialize Web Audio context (call on first user gesture)
export const unlockMobileAudio = (): void => {
    if (isAudioUnlocked) return;

    console.log('[TTS] Unlocking mobile audio with Web Audio API...');

    try {
        // Create or resume AudioContext
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('[TTS] AudioContext resumed');
            });
        }

        // Create and play a tiny buffer to fully unlock
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);

        isAudioUnlocked = true;
        console.log('[TTS] Web Audio unlocked!');

    } catch (e) {
        console.warn('[TTS] Web Audio unlock failed:', e);
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
    console.log('[TTS] fetchGroqAudio starting...');
    console.log('[TTS] Text:', text.slice(0, 50));
    console.log('[TTS] Voice:', voice);
    console.log('[TTS] Rate limited?', groqRateLimited);

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

        console.log('[TTS] Groq response status:', response.status);

        if (response.status === 429) {
            console.error('[TTS] RATE LIMITED!');
            groqRateLimited = true;
            rateLimitTime = Date.now();
            return null;
        }

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'unknown');
            console.error('[TTS] Groq error:', response.status, errorBody);
            return null;
        }

        const buffer = await response.arrayBuffer();
        console.log('[TTS] Got ArrayBuffer:', buffer.byteLength, 'bytes');
        return buffer;

    } catch (error: any) {
        console.error('[TTS] Groq FETCH EXCEPTION:', error.message);
        console.error('[TTS] Error details:', error);
        return null;
    }
};

// Play audio using Web Audio API (mobile-safe)
const playAudioBuffer = async (arrayBuffer: ArrayBuffer): Promise<void> => {
    return new Promise(async (resolve) => {
        try {
            // Ensure audio context is ready
            if (!audioContext) {
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Decode the audio data
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

            // Create and play source
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            source.onended = () => {
                console.log('[TTS] Audio chunk finished');
                resolve();
            };

            source.start(0);
            console.log('[TTS] Playing via Web Audio API');

        } catch (e: any) {
            console.error('[TTS] Web Audio playback error:', e.message);
            // Fallback to HTML5 Audio
            try {
                const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);

                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    resolve();
                };

                audio.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve();
                };

                await audio.play();
                console.log('[TTS] Fallback to HTML5 Audio');

            } catch (e2) {
                console.error('[TTS] HTML5 Audio fallback failed:', e2);
                resolve();
            }
        }
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
        console.log(`[TTS] Chunk ${i + 1}/${chunks.length}: "${chunk.slice(0, 25)}..."`);

        const audioData = await fetchGroqAudio(chunk, voice);
        if (!audioData) {
            console.error('[TTS] Failed to fetch chunk', i + 1);
            continue;
        }

        console.log('[TTS] Got audio:', audioData.byteLength, 'bytes');

        if (!started) {
            started = true;
            onStart?.();
        }

        await playAudioBuffer(audioData);
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
    console.log('[TTS] speak():', { chars: text.length, gender, isMobile, unlocked: isAudioUnlocked });

    // Rate limit recovery
    if (groqRateLimited && Date.now() - rateLimitTime > RATE_LIMIT_RECOVERY) {
        groqRateLimited = false;
    }

    // Try Groq first
    if (isGroqTTSConfigured() && !groqRateLimited) {
        callbacks?.onProviderChange?.('groq');

        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;
        const success = await speakWithGroq(text, voice, callbacks?.onStart, callbacks?.onEnd);

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

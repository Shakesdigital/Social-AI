// Groq TTS Service with Browser Fallback
// Primary: Groq Orpheus TTS API (Natural voices)
// Fallback: Browser Web Speech API (on rate limit or API failure)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const GROQ_MAX_CHARS = 180; // Groq limit is 200, use 180 for safety

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'groq' | 'browser' | 'none';

// Groq Orpheus voices (canopylabs/orpheus-v1-english)
const GROQ_VOICES = {
    male: 'austin',
    female: 'hannah'
};

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

// Track API availability
let groqAvailable = true;
let lastGroqError: number = 0;
const GROQ_RECOVERY_TIME = 60000;

export const isGroqTTSConfigured = (): boolean => {
    return !!GROQ_API_KEY && GROQ_API_KEY.length > 10;
};

export const getTTSStatus = () => ({
    groq: { provider: 'groq' as TTSProvider, isConfigured: isGroqTTSConfigured() },
    browser: { provider: 'browser' as TTSProvider, isConfigured: true }
});

export const getBestProvider = (): TTSProvider => {
    if (isGroqTTSConfigured() && groqAvailable) return 'groq';
    return 'browser';
};

// Split text into chunks that fit within Groq's character limit
const chunkText = (text: string, maxLength: number = GROQ_MAX_CHARS): string[] => {
    const chunks: string[] = [];

    // Split by sentences first
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
        // If single sentence is too long, split by commas or spaces
        if (sentence.length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            // Split long sentence by commas
            const parts = sentence.split(/(?<=,)\s*/);
            for (const part of parts) {
                if (part.length > maxLength) {
                    // Split by spaces as last resort
                    const words = part.split(' ');
                    let wordChunk = '';
                    for (const word of words) {
                        if ((wordChunk + ' ' + word).length > maxLength) {
                            if (wordChunk) chunks.push(wordChunk.trim());
                            wordChunk = word;
                        } else {
                            wordChunk = wordChunk ? wordChunk + ' ' + word : word;
                        }
                    }
                    if (wordChunk) chunks.push(wordChunk.trim());
                } else if ((currentChunk + part).length > maxLength) {
                    if (currentChunk) chunks.push(currentChunk.trim());
                    currentChunk = part;
                } else {
                    currentChunk += part;
                }
            }
        } else if ((currentChunk + ' ' + sentence).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 0);
};

// Fetch single audio chunk from Groq
const fetchGroqAudio = async (text: string, voice: string): Promise<Blob | null> => {
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
            console.warn('[TTS] Groq rate limited');
            groqAvailable = false;
            lastGroqError = Date.now();
            return null;
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error('[TTS] Groq error:', response.status, errorText);
            return null;
        }

        return await response.blob();
    } catch (error: any) {
        console.error('[TTS] Groq fetch error:', error.message);
        return null;
    }
};

// Play audio blob
const playAudioBlob = (blob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
        };

        audio.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };

        audio.play().catch(reject);
    });
};

// Groq TTS with chunking
const speakWithGroq = async (
    text: string,
    voice: string,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    try {
        const chunks = chunkText(text);
        console.log('[TTS] Groq: Processing', chunks.length, 'chunks');

        let started = false;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[TTS] Groq chunk ${i + 1}/${chunks.length}: "${chunk.slice(0, 30)}..." (${chunk.length} chars)`);

            const audioBlob = await fetchGroqAudio(chunk, voice);

            if (!audioBlob) {
                console.error('[TTS] Groq chunk failed');
                return false;
            }

            if (!started) {
                started = true;
                onStart?.();
            }

            await playAudioBlob(audioBlob);
        }

        onEnd?.();
        return true;

    } catch (error: any) {
        console.error('[TTS] Groq error:', error.message);
        return false;
    }
};

// Browser fallback
const speakWithBrowser = async (
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

        const preferredVoice = voices.find(v =>
            v.lang === 'en-GB' &&
            (gender === 'male' ? !v.name.toLowerCase().includes('female') : true)
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;
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
    console.log('[TTS] speak():', { chars: text.length, gender });

    // Recovery check
    if (!groqAvailable && Date.now() - lastGroqError > GROQ_RECOVERY_TIME) {
        groqAvailable = true;
    }

    // 1. Try Groq
    if (isGroqTTSConfigured() && groqAvailable) {
        callbacks?.onProviderChange?.('groq');
        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;

        if (await speakWithGroq(text, voice, callbacks?.onStart, callbacks?.onEnd)) {
            return { success: true, provider: 'groq' };
        }
        console.warn('[TTS] Groq failed, trying browser');
    }

    // 2. Browser fallback
    callbacks?.onProviderChange?.('browser');
    if (await speakWithBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd)) {
        return { success: true, provider: 'browser' };
    }

    callbacks?.onError?.('All TTS failed', 'none');
    return { success: false, provider: 'none', error: 'All TTS failed' };
};

export const getTTSStatusMessage = (): string => {
    return isGroqTTSConfigured() && groqAvailable ? '🎙️ Groq AI' : '🎙️ Browser';
};

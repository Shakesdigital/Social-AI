// Groq TTS Service with Browser Fallback
// Primary: Groq Orpheus TTS API (Natural voices)
// Fallback: Browser Web Speech API (on rate limit or API failure)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'groq' | 'browser' | 'none';

// Groq Orpheus voices (canopylabs/orpheus-v1-english)
// Available: austin, troy, hannah, etc.
const GROQ_VOICES = {
    male: 'austin',     // Natural male voice
    female: 'hannah'    // Natural female voice
};

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

// Track API availability for automatic recovery
let groqAvailable = true;
let lastGroqError: number = 0;
const GROQ_RECOVERY_TIME = 60000; // Try Groq again after 1 minute

// Check if Groq API is configured
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

// Groq TTS API call
const speakWithGroq = async (
    text: string,
    voice: string,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    try {
        console.log('[TTS] Calling Groq Orpheus API with voice:', voice);

        const response = await fetch(GROQ_TTS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'canopylabs/orpheus-v1-english',  // Correct model name
                input: text,
                voice: voice,
                response_format: 'wav'  // Default format
            })
        });

        // Handle rate limiting
        if (response.status === 429) {
            console.warn('[TTS] Groq rate limited (429)');
            groqAvailable = false;
            lastGroqError = Date.now();
            return false;
        }

        // Handle other errors
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('[TTS] Groq API error:', response.status, errorText);
            groqAvailable = false;
            lastGroqError = Date.now();
            return false;
        }

        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        console.log('[TTS] Groq audio received, size:', audioBlob.size, 'bytes');

        // Play the audio
        return new Promise((resolve) => {
            const audio = new Audio(audioUrl);

            audio.onloadeddata = () => {
                console.log('[TTS] Groq audio loaded');
            };

            audio.onplay = () => {
                console.log('[TTS] Groq audio playing');
                onStart?.();
            };

            audio.onended = () => {
                console.log('[TTS] Groq audio finished');
                URL.revokeObjectURL(audioUrl);
                onEnd?.();
                resolve(true);
            };

            audio.onerror = (e) => {
                console.error('[TTS] Groq audio playback error:', e);
                URL.revokeObjectURL(audioUrl);
                onEnd?.();
                resolve(false);
            };

            audio.play().catch(e => {
                console.error('[TTS] Groq audio play() failed:', e);
                onEnd?.();
                resolve(false);
            });
        });

    } catch (error: any) {
        console.error('[TTS] Groq fetch error:', error.message);
        groqAvailable = false;
        lastGroqError = Date.now();
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

        // Get voices
        const voices = window.speechSynthesis.getVoices();

        // Select best available voice
        const preferredVoice = voices.find(v =>
            v.lang === 'en-GB' &&
            (gender === 'male' ? !v.name.toLowerCase().includes('female') : true)
        ) || voices.find(v =>
            v.lang.startsWith('en') &&
            (gender === 'male'
                ? ['guy', 'david', 'daniel', 'alex', 'male'].some(k => v.name.toLowerCase().includes(k))
                : ['aria', 'jenny', 'samantha', 'female'].some(k => v.name.toLowerCase().includes(k)))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log('[TTS] Browser using voice:', preferredVoice.name);
        }

        // Natural settings
        utterance.rate = 1.0;
        utterance.pitch = gender === 'male' ? 0.95 : 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            console.log('[TTS] Browser speech started');
            onStart?.();
        };

        utterance.onend = () => {
            console.log('[TTS] Browser speech ended');
            onEnd?.();
            resolve(true);
        };

        utterance.onerror = (e) => {
            console.error('[TTS] Browser speech error:', e);
            onEnd?.();
            resolve(false);
        };

        window.speechSynthesis.speak(utterance);
    });
};

// Main speak function with automatic failover
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
    console.log('[TTS] speak() called:', { textLength: text.length, gender });

    // Check if Groq should be tried again after recovery period
    if (!groqAvailable && Date.now() - lastGroqError > GROQ_RECOVERY_TIME) {
        console.log('[TTS] Attempting Groq recovery...');
        groqAvailable = true;
    }

    // 1. Try Groq TTS (Primary)
    if (isGroqTTSConfigured() && groqAvailable) {
        callbacks?.onProviderChange?.('groq');
        console.log('[TTS] Using Groq Orpheus TTS API');

        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;
        const success = await speakWithGroq(text, voice, callbacks?.onStart, callbacks?.onEnd);

        if (success) {
            return { success: true, provider: 'groq' };
        }

        // Groq failed, continue to fallback
        console.warn('[TTS] Groq failed, switching to browser fallback');
    }

    // 2. Browser Fallback (Seamless)
    callbacks?.onProviderChange?.('browser');
    console.log('[TTS] Using Browser speech synthesis (fallback)');

    const browserSuccess = await speakWithBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd);

    if (browserSuccess) {
        return { success: true, provider: 'browser' };
    }

    // 3. Complete failure
    const errorMsg = 'All TTS providers failed';
    callbacks?.onError?.(errorMsg, 'none');
    return { success: false, provider: 'none', error: errorMsg };
};

export const getTTSStatusMessage = (): string => {
    if (isGroqTTSConfigured() && groqAvailable) {
        return '🎙️ Groq AI Voice';
    }
    return '🎙️ Browser Voice';
};

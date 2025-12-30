// Browser Native Text-to-Speech Service
// MALE VOICE ONLY - optimized for natural sound
// Desktop: Microsoft voices, Mobile: American accent with pitch 0.3

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'browser' | 'none';

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

export const getTTSStatus = () => ({
    browser: { provider: 'browser' as TTSProvider, isConfigured: true }
});

export const getBestProvider = (): TTSProvider => 'browser';

// Voice selection - MALE ONLY
const selectMaleVoice = (voices: SpeechSynthesisVoice[], isMobile: boolean): SpeechSynthesisVoice | null => {

    // MOBILE: American male voices
    if (isMobile) {
        const americanMale = [
            'Google US English',
            'Alex',                    // iOS excellent male
            'en-US-male',
            'English United States',
            'US English Male'
        ];

        for (const keyword of americanMale) {
            const found = voices.find(v => v.name.includes(keyword) && v.lang === 'en-US');
            if (found) {
                console.log(`[TTS] Found American male voice: ${found.name}`);
                return found;
            }
        }

        // Any en-US voice
        const usVoice = voices.find(v => v.lang === 'en-US');
        if (usVoice) {
            console.log(`[TTS] Using en-US voice: ${usVoice.name}`);
            return usVoice;
        }
    }

    // DESKTOP: Microsoft male voices
    if (!isMobile) {
        const microsoftMale = ['Microsoft Guy', 'Microsoft Ryan', 'Microsoft David'];

        for (const keyword of microsoftMale) {
            const found = voices.find(v => v.name.includes(keyword));
            if (found) {
                console.log(`[TTS] Found Microsoft male voice: ${found.name}`);
                return found;
            }
        }
    }

    // Fallback: General male voices
    const maleKeywords = ['Daniel', 'Alex', 'Google US English Male', 'David', 'Fred'];
    for (const keyword of maleKeywords) {
        const found = voices.find(v => v.name.includes(keyword) && v.lang.startsWith('en'));
        if (found) {
            console.log(`[TTS] Found male voice: ${found.name}`);
            return found;
        }
    }

    // Last resort: any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

// Main Speak Function - MALE VOICE ONLY
export const speak = async (
    text: string,
    gender: VoiceGender = 'female', // Ignored - always uses male
    callbacks?: {
        onStart?: () => void;
        onEnd?: () => void;
        onProviderChange?: (provider: TTSProvider) => void;
        onError?: (error: string, provider: TTSProvider) => void;
    }
): Promise<SpeakResult> => {
    console.log('[TTS] speak() called:', { textLength: text.length, note: 'Using MALE voice only' });
    callbacks?.onProviderChange?.('browser');

    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            const error = 'Speech synthesis not available';
            callbacks?.onError?.(error, 'none');
            resolve({ success: false, provider: 'none', error });
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        let voices = window.speechSynthesis.getVoices();

        const configureAndSpeak = () => {
            voices = window.speechSynthesis.getVoices();

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            console.log('[TTS] Device:', isMobile ? 'Mobile' : 'Desktop');
            console.log('[TTS] Voices available:', voices.length);

            // Always select MALE voice
            const selectedVoice = selectMaleVoice(voices, isMobile);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`[TTS] Selected: ${selectedVoice.name} (${selectedVoice.lang})`);
            }

            const isMicrosoftVoice = selectedVoice?.name.includes('Microsoft') || false;

            // ========================================
            // VOICE SETTINGS - MALE ONLY
            // ========================================

            if (isMobile) {
                // MOBILE: Pitch 0.3 for deep natural male voice
                utterance.rate = 0.95;   // Slightly slower for natural speech
                utterance.pitch = 0.3;   // Deep pitch as requested
            } else if (isMicrosoftVoice) {
                // DESKTOP WITH MICROSOFT: Near-natural
                utterance.rate = 1.0;
                utterance.pitch = 0.95;
            } else {
                // DESKTOP WITHOUT MICROSOFT
                utterance.rate = 1.0;
                utterance.pitch = 0.3;   // Deep pitch
            }

            utterance.volume = 1.0;

            console.log(`[TTS] Settings - Rate: ${utterance.rate}, Pitch: ${utterance.pitch}`);

            utterance.onstart = () => {
                console.log('[TTS] Speech started');
                callbacks?.onStart?.();
            };

            utterance.onend = () => {
                console.log('[TTS] Speech ended');
                callbacks?.onEnd?.();
                resolve({ success: true, provider: 'browser' });
            };

            utterance.onerror = (e) => {
                console.error('[TTS] Speech error:', e.error);
                callbacks?.onEnd?.();
                resolve({ success: false, provider: 'browser', error: e.error });
            };

            window.speechSynthesis.speak(utterance);

            // Mobile bug fix
            if (isMobile) {
                const keepAlive = setInterval(() => {
                    if (!window.speechSynthesis.speaking) {
                        clearInterval(keepAlive);
                    } else if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                }, 5000);
            }
        };

        if (voices.length > 0) {
            configureAndSpeak();
        } else {
            window.speechSynthesis.onvoiceschanged = configureAndSpeak;
            setTimeout(() => {
                voices = window.speechSynthesis.getVoices();
                configureAndSpeak();
            }, 300);
        }
    });
};

export const getTTSStatusMessage = (): string => '🎙️ Voice Assistant';

// Browser Native Text-to-Speech Service (Optimized for Natural Sound)
// Desktop: Prioritizes Microsoft Neural voices
// Mobile: American accents with human-like tuning

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

// Smart voice selection
const selectBestVoice = (voices: SpeechSynthesisVoice[], gender: VoiceGender, isMobile: boolean): SpeechSynthesisVoice | null => {

    // MOBILE: Prioritize American English voices (en-US)
    if (isMobile) {
        // American female voices
        const americanFemale = [
            'Google US English',       // Android - good quality
            'Samantha',                 // iOS - excellent
            'en-US-female',
            'English United States',
            'US English Female'
        ];
        // American male voices
        const americanMale = [
            'Google US English',       // Android
            'Alex',                    // iOS - excellent male voice
            'en-US-male',
            'English United States',
            'US English Male'
        ];

        const keywords = gender === 'female' ? americanFemale : americanMale;

        // First: Try to find exact American voice
        for (const keyword of keywords) {
            const found = voices.find(v =>
                v.name.includes(keyword) &&
                v.lang === 'en-US'
            );
            if (found) {
                console.log(`[TTS] Found American voice: ${found.name}`);
                return found;
            }
        }

        // Second: Any en-US voice
        const usVoice = voices.find(v => v.lang === 'en-US');
        if (usVoice) {
            console.log(`[TTS] Using en-US voice: ${usVoice.name}`);
            return usVoice;
        }
    }

    // DESKTOP: Prioritize Microsoft Neural voices
    if (!isMobile) {
        const microsoftFemale = ['Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira'];
        const microsoftMale = ['Microsoft Guy', 'Microsoft Ryan', 'Microsoft David'];
        const msKeywords = gender === 'female' ? microsoftFemale : microsoftMale;

        for (const keyword of msKeywords) {
            const found = voices.find(v => v.name.includes(keyword));
            if (found) {
                console.log(`[TTS] Found Microsoft voice: ${found.name}`);
                return found;
            }
        }
    }

    // Fallback: General quality voices
    const femaleKeywords = ['Samantha', 'Karen', 'Google US English Female'];
    const maleKeywords = ['Daniel', 'Alex', 'Google US English Male'];
    const keywords = gender === 'female' ? femaleKeywords : maleKeywords;

    for (const keyword of keywords) {
        const found = voices.find(v => v.name.includes(keyword) && v.lang.startsWith('en'));
        if (found) {
            console.log(`[TTS] Found quality voice: ${found.name}`);
            return found;
        }
    }

    // Last resort: any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

// Main Speak Function
export const speak = async (
    text: string,
    gender: VoiceGender = 'female',
    callbacks?: {
        onStart?: () => void;
        onEnd?: () => void;
        onProviderChange?: (provider: TTSProvider) => void;
        onError?: (error: string, provider: TTSProvider) => void;
    }
): Promise<SpeakResult> => {
    console.log('[TTS] speak() called:', { textLength: text.length, gender });
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
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            const isAndroid = /Android/i.test(navigator.userAgent);

            console.log('[TTS] Device:', isMobile ? (isIOS ? 'iOS' : 'Android') : 'Desktop');
            console.log('[TTS] Voices available:', voices.length);

            // Select best voice (American for mobile)
            const selectedVoice = selectBestVoice(voices, gender, isMobile);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`[TTS] Selected: ${selectedVoice.name} (${selectedVoice.lang})`);
            }

            const isMicrosoftVoice = selectedVoice?.name.includes('Microsoft') || false;

            // ========================================
            // VOICE SETTINGS - Tuned for natural sound
            // ========================================

            if (isMobile) {
                // MOBILE: American accent with human-like settings
                if (isIOS) {
                    // iOS has better voices, less adjustment needed
                    if (gender === 'female') {
                        utterance.rate = 0.98;
                        utterance.pitch = 1.05;
                    } else {
                        utterance.rate = 0.95;
                        utterance.pitch = 0.9;
                    }
                } else {
                    // Android: More adjustment for robotic voices
                    if (gender === 'female') {
                        utterance.rate = 0.9;    // Slower for clarity
                        utterance.pitch = 1.15;  // Higher for warmth
                    } else {
                        utterance.rate = 0.88;   // Slower male speech
                        utterance.pitch = 0.8;   // Deeper but natural
                    }
                }
            } else if (isMicrosoftVoice) {
                // DESKTOP WITH MICROSOFT: Already sounds great
                utterance.rate = 1.0;
                utterance.pitch = gender === 'female' ? 1.0 : 0.95;
            } else {
                // DESKTOP WITHOUT MICROSOFT
                utterance.rate = 1.0;
                utterance.pitch = gender === 'female' ? 1.0 : 0.3;
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

export const getTTSStatusMessage = (): string => '🎙️ Browser Voice';

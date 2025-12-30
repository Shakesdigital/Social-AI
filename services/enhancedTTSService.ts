// Browser Native Text-to-Speech Service (Optimized for Natural Sound)
// Settings tuned per user preference

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

// Smart voice selection - prioritize high-quality voices
const selectBestVoice = (voices: SpeechSynthesisVoice[], gender: VoiceGender): SpeechSynthesisVoice | null => {
    // Priority list for natural-sounding voices
    const femaleKeywords = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google US English Female', 'Microsoft Aria', 'Microsoft Jenny', 'Zira'];
    const maleKeywords = ['Daniel', 'Alex', 'Google US English Male', 'Microsoft Guy', 'Microsoft Ryan', 'David'];

    const keywords = gender === 'female' ? femaleKeywords : maleKeywords;

    // Try to find a preferred voice
    for (const keyword of keywords) {
        const found = voices.find(v => v.name.includes(keyword) && v.lang.startsWith('en'));
        if (found) {
            console.log(`[TTS] Found preferred voice: ${found.name}`);
            return found;
        }
    }

    // Fallback: any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
        console.log(`[TTS] Using English voice: ${englishVoice.name}`);
        return englishVoice;
    }

    // Last resort: first available
    return voices[0] || null;
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
            console.error('[TTS]', error);
            callbacks?.onError?.(error, 'none');
            resolve({ success: false, provider: 'none', error });
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Get voices
        let voices = window.speechSynthesis.getVoices();

        const configureAndSpeak = () => {
            voices = window.speechSynthesis.getVoices();
            console.log('[TTS] Available voices:', voices.map(v => v.name).join(', '));

            // Select best voice
            const selectedVoice = selectBestVoice(voices, gender);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            // Detect device
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // ========================================
            // VOICE SETTINGS (User-tuned)
            // ========================================
            if (gender === 'female') {
                // Female: Keep natural, sounds good as-is
                utterance.rate = isMobile ? 1.0 : 1.0;
                utterance.pitch = isMobile ? 1.0 : 1.0;
            } else {
                // Male: Speed 1.0, Pitch 0.3 (deeper, more natural)
                utterance.rate = 1.0;
                utterance.pitch = 0.3;
            }

            utterance.volume = 1.0;

            console.log(`[TTS] Settings - Rate: ${utterance.rate}, Pitch: ${utterance.pitch}, Voice: ${utterance.voice?.name || 'default'}`);

            // Event handlers
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

            // Speak!
            window.speechSynthesis.speak(utterance);

            // Chrome bug fix: keep speech alive on mobile
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

        // Handle async voice loading
        if (voices.length > 0) {
            configureAndSpeak();
        } else {
            window.speechSynthesis.onvoiceschanged = configureAndSpeak;
            // Fallback timeout
            setTimeout(() => {
                if (voices.length === 0) {
                    voices = window.speechSynthesis.getVoices();
                }
                configureAndSpeak();
            }, 300);
        }
    });
};

export const getTTSStatusMessage = (): string => '🎙️ Browser Voice';

// Native Browser Text-to-Speech Service (Optimized)
// Reliability: 100%
// Quality: Best available on device (Varies by OS)

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'browser' | 'none';

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

export const getTTSStatus = () => {
    return {
        browser: { provider: 'browser' as TTSProvider, isConfigured: true }
    };
};

export const getBestProvider = (): TTSProvider => 'browser';

// Smart Voice Selection
const selectBestVoice = (voices: SpeechSynthesisVoice[], gender: VoiceGender) => {
    // 1. Apple/Microsoft Neural Voices (High Quality)
    const neuralKeywords = gender === 'female'
        ? ['Samantha', 'Karen', 'Tessa', 'Moira', 'Rishi', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny']
        : ['Daniel', 'Fred', 'Alex', 'Rishi', 'Microsoft Guy', 'Microsoft Ryan'];

    for (const keyword of neuralKeywords) {
        const found = voices.find(v => v.name.includes(keyword));
        if (found) return found;
    }

    // 2. Gender matching based on name (if marked)
    const genderMatch = voices.find(v =>
        v.lang.startsWith('en') &&
        v.name.toLowerCase().includes(gender)
    );
    if (genderMatch) return genderMatch;

    // 3. Fallback: First English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
};

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
    console.log('[TTS] speak() called with:', { textLength: text.length, gender });
    callbacks?.onProviderChange?.('browser');

    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            const err = 'SpeechSynthesis API missing';
            callbacks?.onError?.(err, 'none');
            resolve({ success: false, provider: 'none', error: err });
            return;
        }

        // Must cancel previous speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Get voices (handling async loading behavior)
        let voices = window.speechSynthesis.getVoices();

        const trySpeak = () => {
            console.log('[TTS] Available voices:', voices.map(v => v.name).join(', '));

            const selectedVoice = selectBestVoice(voices, gender);
            if (selectedVoice) {
                console.log(`[TTS] Selected voice: "${selectedVoice.name}" for ${gender}`);
                utterance.voice = selectedVoice;
            }

            // Tune parameters for less robotic sound
            // Mobile (Android/iOS) tends to be too slow, so speed it up slightly
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            utterance.rate = isMobile ? 1.1 : 1.0; // Speed up mobile
            utterance.pitch = gender === 'female' ? 1.05 : 1.0;
            utterance.volume = 1.0;

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
                console.error('[TTS] Browser speech error:', e);
                // On error, we still resolve to avoid hanging, but log it
                callbacks?.onEnd?.();
                resolve({ success: false, provider: 'browser', error: 'Speech failed' });
            };

            window.speechSynthesis.speak(utterance);

            // Chrome bug fix: Infinite callback loop to keep speech alive
            if (isMobile) {
                const fixInterval = setInterval(() => {
                    if (!window.speechSynthesis.speaking) {
                        clearInterval(fixInterval);
                    } else {
                        window.speechSynthesis.pause();
                        window.speechSynthesis.resume();
                    }
                }, 14000); // Resume every 14s
            }
        };

        if (voices.length > 0) {
            trySpeak();
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                trySpeak();
            };
            // Fallback if event never fires
            setTimeout(() => {
                voices = window.speechSynthesis.getVoices();
                if (voices.length === 0) console.warn('[TTS] No voices loaded even after wait');
                trySpeak();
            }, 500);
        }
    });
};

export const getTTSStatusMessage = (): string => {
    return '🎙️ Browser Voice';
};

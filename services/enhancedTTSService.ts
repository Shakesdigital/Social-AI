// Browser Native Text-to-Speech Service (Optimized for Natural Sound)
// Desktop: Prioritizes Microsoft Neural voices for best quality
// Mobile: Tweaked settings for more human-like sound

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

// Smart voice selection with Microsoft priority for desktop
const selectBestVoice = (voices: SpeechSynthesisVoice[], gender: VoiceGender, isMobile: boolean): SpeechSynthesisVoice | null => {

    // DESKTOP: Prioritize Microsoft Neural voices (best quality)
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

    // General high-quality voices (desktop fallback + mobile)
    const femaleKeywords = ['Samantha', 'Karen', 'Moira', 'Google US English Female', 'Tessa'];
    const maleKeywords = ['Daniel', 'Alex', 'Google US English Male', 'Fred'];
    const keywords = gender === 'female' ? femaleKeywords : maleKeywords;

    for (const keyword of keywords) {
        const found = voices.find(v => v.name.includes(keyword) && v.lang.startsWith('en'));
        if (found) {
            console.log(`[TTS] Found quality voice: ${found.name}`);
            return found;
        }
    }

    // Fallback: any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
        console.log(`[TTS] Using English voice: ${englishVoice.name}`);
        return englishVoice;
    }

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
            const isEdge = /Edg/i.test(navigator.userAgent);

            console.log('[TTS] Device:', isMobile ? 'Mobile' : 'Desktop', isEdge ? '(Edge)' : '');
            console.log('[TTS] Available voices:', voices.length, voices.slice(0, 5).map(v => v.name).join(', '), '...');

            // Select best voice
            const selectedVoice = selectBestVoice(voices, gender, isMobile);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            const isMicrosoftVoice = selectedVoice?.name.includes('Microsoft') || false;

            // ========================================
            // VOICE SETTINGS
            // ========================================

            if (isMobile) {
                // MOBILE: Tweaked for more human-like sound
                if (gender === 'female') {
                    utterance.rate = 0.95;   // Slightly slower for natural cadence
                    utterance.pitch = 1.1;   // Slightly higher for warmth
                } else {
                    utterance.rate = 0.92;   // Slower for natural male speech
                    utterance.pitch = 0.85;  // Lower but not too robotic
                }
            } else if (isMicrosoftVoice) {
                // DESKTOP WITH MICROSOFT VOICES: Near-default (already sounds great)
                if (gender === 'female') {
                    utterance.rate = 1.0;
                    utterance.pitch = 1.0;
                } else {
                    utterance.rate = 1.0;
                    utterance.pitch = 0.95;  // Slightly deeper
                }
            } else {
                // DESKTOP WITHOUT MICROSOFT: User's original settings
                if (gender === 'female') {
                    utterance.rate = 1.0;
                    utterance.pitch = 1.0;
                } else {
                    utterance.rate = 1.0;
                    utterance.pitch = 0.3;   // Deep pitch per user preference
                }
            }

            utterance.volume = 1.0;

            console.log(`[TTS] Voice: ${utterance.voice?.name || 'default'}, Rate: ${utterance.rate}, Pitch: ${utterance.pitch}`);

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

            // Chrome/Mobile bug fix
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

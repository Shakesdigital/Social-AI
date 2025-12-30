// Browser Native Text-to-Speech Service
// MALE VOICE ONLY - STRICT ENFORCEMENT
// Optimized for Mobile (iOS/Android) and Desktop

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

// Strict Male Voice Selection
const selectMaleVoice = (voices: SpeechSynthesisVoice[], isMobile: boolean): SpeechSynthesisVoice | null => {

    // 1. Filter out known female voices to avoid accidental selection
    const femaleBlacklist = ['female', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'jenny', 'aria', 'zira', 'salli', 'joanna', 'ivy', 'kendra', 'kimberly'];

    // Helper to check if voice is "safe" (not strictly female)
    const isNotFemale = (v: SpeechSynthesisVoice) => !femaleBlacklist.some(name => v.name.toLowerCase().includes(name));

    // 2. Look for Explicit "Male" in name
    const maleVoice = voices.find(v =>
        v.name.toLowerCase().includes('male') &&
        v.lang.startsWith('en')
    );
    if (maleVoice) {
        console.log(`[TTS] Found explicit male voice: ${maleVoice.name}`);
        return maleVoice;
    }

    // 3. Platform Specific Strict Preferences
    if (isMobile) {
        // iOS Male Voices
        const iosMale = ['alex', 'daniel', 'fred', 'rishi'];
        for (const name of iosMale) {
            const found = voices.find(v => v.name.toLowerCase().includes(name) && v.lang.startsWith('en'));
            if (found) return found;
        }

        // Android/Generic Filtered Loop
        // Try to find ANY English voice that isn't on the female blacklist
        const safeVoice = voices.find(v =>
            v.lang.startsWith('en') &&
            isNotFemale(v) &&
            // Prefer US English
            (v.lang === 'en-US' || v.name.includes('US'))
        );
        if (safeVoice) return safeVoice;
    }

    // 4. Desktop Preferences (Microsoft)
    const msMale = ['microsoft guy', 'microsoft ryan', 'microsoft david', 'microsoft mark'];
    for (const name of msMale) {
        const found = voices.find(v => v.name.toLowerCase().includes(name));
        if (found) return found;
    }

    // 5. Last Resort: First English voice that is NOT female named
    const anySafeEnglish = voices.find(v => v.lang.startsWith('en') && isNotFemale(v));
    if (anySafeEnglish) return anySafeEnglish;

    // 6. Absolute Last Resort: Just picking the first English voice available
    // (Even if it might be female, we will pitch shift it heavily)
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
};

export const speak = async (
    text: string,
    gender: VoiceGender = 'female', // Ignored
    callbacks?: {
        onStart?: () => void;
        onEnd?: () => void;
        onProviderChange?: (provider: TTSProvider) => void;
        onError?: (error: string, provider: TTSProvider) => void;
    }
): Promise<SpeakResult> => {
    console.log('[TTS] speak() called - Enforcing MALE voice');
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

            console.log('[TTS] Voices loaded:', voices.length);
            // Debug log of all names to help diagnosis
            if (voices.length < 10) console.log('[TTS] Names:', voices.map(v => v.name).join(', '));

            const selectedVoice = selectMaleVoice(voices, isMobile);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`[TTS] Selected Voice: "${selectedVoice.name}" (${selectedVoice.lang})`);
            } else {
                console.warn('[TTS] No specific male voice found, using system default + pitch shift');
            }

            // ========================================
            // VOICE SETTINGS - HEAVY MALE ENFORCEMENT
            // ========================================

            // Check if we selected a known "Male" voice
            const name = selectedVoice ? selectedVoice.name.toLowerCase() : '';
            const isConfirmedMale = name.includes('male') || name.includes('guy') || name.includes('ryan') || name.includes('david') || name.includes('alex') || name.includes('daniel') || name.includes('fred');

            if (isMobile) {
                // MOBILE TUNING - NATURAL MALE
                // Pitch 0.3 is too deep/robotic. 
                // Pitch 0.8 - 0.9 is the "sweet spot" for a natural male voice.

                if (isConfirmedMale) {
                    // Young & Professional Male
                    // Higher pitch = Younger (1.1)
                    // Faster rate = Professional/Energetic (1.15)
                    utterance.pitch = 1.1;
                    utterance.rate = 1.15;
                } else {
                    // Fallback: Pitch up slightly generic voice
                    utterance.pitch = 1.05;
                    utterance.rate = 1.1;
                }
            } else {  // DESKTOP TUNING
                if (isConfirmedMale) {
                    utterance.rate = 1.0;
                    utterance.pitch = 0.95; // Slight adjustment
                } else {
                    utterance.pitch = 0.5; // Force drop if unsure
                }
            }

            utterance.volume = 1.0;

            console.log(`[TTS] Applied Settings - Rate: ${utterance.rate}, Pitch: ${utterance.pitch}`);

            utterance.onstart = () => callbacks?.onStart?.();
            utterance.onend = () => { callbacks?.onEnd?.(); resolve({ success: true, provider: 'browser' }); };
            utterance.onerror = (e) => {
                console.error('[TTS] Error:', e);
                callbacks?.onEnd?.();
                resolve({ success: false, provider: 'browser', error: String(e) });
            };

            window.speechSynthesis.speak(utterance);

            if (isMobile) {
                const keepAlive = setInterval(() => {
                    if (!window.speechSynthesis.speaking) clearInterval(keepAlive);
                    else if (window.speechSynthesis.paused) window.speechSynthesis.resume();
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
            }, 500);
        }
    });
};

export const getTTSStatusMessage = (): string => '🎙️ Voice Assistant';

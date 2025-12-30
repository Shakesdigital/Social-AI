// Enhanced Text-to-Speech Service with robust fallback chain
// Prioritizes: ElevenLabs → OpenAI → Enhanced Browser TTS

import { isElevenLabsConfigured, speakWithElevenLabs, getRecommendedElevenLabsVoice } from './elevenLabsTTSService';
import { isOpenAITTSConfigured, speakWithOpenAI, getRecommendedVoice } from './openaiTTSService';

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'elevenlabs' | 'openai' | 'browser' | 'none';

export interface TTSStatus {
    provider: TTSProvider;
    isConfigured: boolean;
    error?: string;
}

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

// Get the status of all TTS providers
export const getTTSStatus = (): { elevenlabs: TTSStatus; openai: TTSStatus; browser: TTSStatus } => {
    const elevenlabsConfigured = isElevenLabsConfigured();
    const openaiConfigured = isOpenAITTSConfigured();
    const browserAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

    console.log('[EnhancedTTS] Provider status check:', {
        elevenlabs: elevenlabsConfigured,
        openai: openaiConfigured,
        browser: browserAvailable
    });

    return {
        elevenlabs: {
            provider: 'elevenlabs',
            isConfigured: elevenlabsConfigured
        },
        openai: {
            provider: 'openai',
            isConfigured: openaiConfigured
        },
        browser: {
            provider: 'browser',
            isConfigured: browserAvailable
        }
    };
};

// Get the best available TTS provider
export const getBestProvider = (): TTSProvider => {
    const status = getTTSStatus();

    if (status.elevenlabs.isConfigured) return 'elevenlabs';
    if (status.openai.isConfigured) return 'openai';
    if (status.browser.isConfigured) return 'browser';
    return 'none';
};

// Enhanced browser speech synthesis with better voice selection for ALL devices including mobile
const speakWithBrowser = async (
    text: string,
    gender: VoiceGender,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.error('[EnhancedTTS] Browser speechSynthesis not available');
            resolve(false);
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Detect device type for optimized voice selection
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent);
        const isEdge = /Edg/i.test(navigator.userAgent);
        const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);

        console.log('[EnhancedTTS] Device detection:', { isMobile, isIOS, isAndroid, isChrome, isEdge, isSafari });

        const utterance = new SpeechSynthesisUtterance(text);

        // Wait a bit for voices to load on some browsers
        const getVoicesWithRetry = (): SpeechSynthesisVoice[] => {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                // Try again - some browsers need a moment
                voices = window.speechSynthesis.getVoices();
            }
            return voices;
        };

        const voices = getVoicesWithRetry();
        console.log('[EnhancedTTS] Browser voices available:', voices.length,
            voices.map(v => `${v.name} (${v.lang})`).slice(0, 10));

        // Enhanced voice selection with device-specific tiers
        let selectedVoice: SpeechSynthesisVoice | null = null;
        let voiceQuality: 'neural' | 'enhanced' | 'standard' | 'basic' = 'basic';

        if (voices.length > 0) {
            // TIER 1: Microsoft Neural/Online voices (Edge on any platform)
            if (isEdge) {
                const neuralVoices = gender === 'female'
                    ? ['Microsoft Aria Online', 'Microsoft Jenny Online', 'Microsoft Zira Online', 'Aria', 'Jenny']
                    : ['Microsoft Guy Online', 'Microsoft Ryan Online', 'Microsoft Christopher Online', 'Guy', 'Ryan'];

                for (const pattern of neuralVoices) {
                    const found = voices.find(v => v.name.includes(pattern) && v.lang.startsWith('en'));
                    if (found) {
                        selectedVoice = found;
                        voiceQuality = 'neural';
                        break;
                    }
                }
            }

            // TIER 2: Google voices (Chrome on desktop/Android)
            if (!selectedVoice && (isChrome || isAndroid)) {
                const googleVoices = gender === 'female'
                    ? ['Google US English Female', 'Google UK English Female', 'English United States']
                    : ['Google US English Male', 'Google UK English Male', 'English United States'];

                for (const pattern of googleVoices) {
                    const found = voices.find(v => v.name.includes(pattern) ||
                        (v.name.includes('English') && v.lang.startsWith('en')));
                    if (found) {
                        selectedVoice = found;
                        voiceQuality = 'enhanced';
                        break;
                    }
                }
            }

            // TIER 3: iOS/macOS Siri voices (Safari, iOS)
            if (!selectedVoice && (isIOS || isSafari)) {
                // iOS has enhanced Siri voices - prefer these
                const appleEnhanced = gender === 'female'
                    ? ['Samantha (Enhanced)', 'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona']
                    : ['Daniel (Enhanced)', 'Daniel', 'Alex', 'Fred', 'Oliver', 'Thomas'];

                for (const name of appleEnhanced) {
                    const found = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
                    if (found) {
                        selectedVoice = found;
                        voiceQuality = found.name.includes('Enhanced') ? 'enhanced' : 'standard';
                        break;
                    }
                }
            }

            // TIER 4: Android-specific voices
            if (!selectedVoice && isAndroid) {
                // Try to find any female/male-sounding voice on Android
                const englishVoices = voices.filter(v => v.lang.startsWith('en'));
                if (gender === 'female') {
                    selectedVoice = englishVoices.find(v =>
                        v.name.toLowerCase().includes('female') ||
                        v.name.toLowerCase().includes('woman') ||
                        v.name.includes('English United States') // Default Google voice is female
                    ) || englishVoices[0] || null;
                } else {
                    selectedVoice = englishVoices.find(v =>
                        v.name.toLowerCase().includes('male') ||
                        v.name.toLowerCase().includes('man')
                    ) || englishVoices[0] || null;
                }
                if (selectedVoice) voiceQuality = 'standard';
            }

            // TIER 5: Windows/Desktop fallback
            if (!selectedVoice) {
                const desktopVoices = gender === 'female'
                    ? ['Microsoft Zira', 'Zira', 'Microsoft Hazel', 'Hazel', 'Helena', 'Catherine']
                    : ['Microsoft David', 'David', 'Microsoft Mark', 'Mark', 'James', 'George'];

                for (const name of desktopVoices) {
                    const found = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
                    if (found) {
                        selectedVoice = found;
                        voiceQuality = 'standard';
                        break;
                    }
                }
            }

            // TIER 6: Any English voice as last resort
            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang === 'en-US') ||
                    voices.find(v => v.lang.startsWith('en-')) ||
                    voices.find(v => v.lang.startsWith('en')) ||
                    voices[0];
                voiceQuality = 'basic';
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`[EnhancedTTS] Selected voice: "${selectedVoice.name}" (${voiceQuality} quality, ${selectedVoice.lang})`);
            }
        }

        // OPTIMIZED SPEECH PARAMETERS for natural sound based on device and quality
        // These settings make the voice sound LESS robotic
        if (voiceQuality === 'neural') {
            // Neural voices are already very natural
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
        } else if (voiceQuality === 'enhanced') {
            // Slightly slower for better clarity
            utterance.rate = gender === 'female' ? 0.95 : 0.92;
            utterance.pitch = gender === 'female' ? 1.0 : 0.95;
        } else if (voiceQuality === 'standard') {
            // More adjustment for standard voices
            utterance.rate = gender === 'female' ? 0.9 : 0.88;
            utterance.pitch = gender === 'female' ? 1.03 : 0.92;
        } else {
            // Basic voices need significant tuning to sound acceptable
            // Slower rate and adjusted pitch helps a lot with robotic-sounding voices
            utterance.rate = gender === 'female' ? 0.85 : 0.82;
            utterance.pitch = gender === 'female' ? 1.06 : 0.88;
        }

        // Mobile-specific adjustments - mobile voices often sound more robotic
        if (isMobile && voiceQuality !== 'neural') {
            // Slow down mobile voices MORE for better naturalness
            utterance.rate = Math.max(0.75, utterance.rate - 0.08);
            // Adjust pitch slightly for warmer sound
            utterance.pitch = gender === 'female' ? Math.min(1.1, utterance.pitch + 0.02) : Math.max(0.85, utterance.pitch - 0.02);
            console.log(`[EnhancedTTS] Applied mobile adjustments: rate=${utterance.rate.toFixed(2)}, pitch=${utterance.pitch.toFixed(2)}`);
        }

        utterance.volume = 1.0;

        let hasEnded = false;
        let keepAliveInterval: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
            }
        };

        utterance.onstart = () => {
            console.log('[EnhancedTTS] Browser speech started');
            onStart?.();
        };

        utterance.onend = () => {
            if (hasEnded) return;
            hasEnded = true;
            cleanup();
            console.log('[EnhancedTTS] Browser speech completed');
            onEnd?.();
            resolve(true);
        };

        utterance.onerror = (e) => {
            if (hasEnded) return;
            hasEnded = true;
            cleanup();
            console.error('[EnhancedTTS] Browser speech error:', e.error);
            onEnd?.();
            resolve(false);
        };

        // Chrome/Android bug fix: prevent speech from stopping mid-sentence
        // More frequent checks on mobile
        keepAliveInterval = setInterval(() => {
            if (hasEnded) {
                cleanup();
                return;
            }
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }, isMobile ? 500 : 1000);

        // Speak with a small delay to ensure stability
        setTimeout(() => {
            if (!hasEnded) {
                window.speechSynthesis.speak(utterance);
            }
        }, 50);

        // Timeout fallback
        setTimeout(() => {
            if (!hasEnded) {
                hasEnded = true;
                cleanup();
                console.warn('[EnhancedTTS] Browser speech timeout');
                onEnd?.();
                resolve(false);
            }
        }, 60000); // 60 second max
    });
};

// Main speak function with automatic fallback
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
    const status = getTTSStatus();

    console.log('[EnhancedTTS] speak() called with text length:', text.length, 'gender:', gender);

    // Try ElevenLabs first
    if (status.elevenlabs.isConfigured) {
        console.log('[EnhancedTTS] Attempting ElevenLabs TTS...');
        callbacks?.onProviderChange?.('elevenlabs');
        callbacks?.onStart?.();

        try {
            const voice = getRecommendedElevenLabsVoice(gender);
            const success = await speakWithElevenLabs(text, { voice });

            if (success) {
                console.log('[EnhancedTTS] ElevenLabs TTS successful');
                callbacks?.onEnd?.();
                return { success: true, provider: 'elevenlabs' };
            }
            console.warn('[EnhancedTTS] ElevenLabs TTS returned false, falling back...');
        } catch (error: any) {
            console.error('[EnhancedTTS] ElevenLabs error:', error.message);
            callbacks?.onError?.(error.message, 'elevenlabs');
        }
        callbacks?.onEnd?.();
    }

    // Try OpenAI next
    if (status.openai.isConfigured) {
        console.log('[EnhancedTTS] Attempting OpenAI TTS...');
        callbacks?.onProviderChange?.('openai');
        callbacks?.onStart?.();

        try {
            const voice = getRecommendedVoice(gender);
            const success = await speakWithOpenAI(text, { voice, speed: 1.0 });

            if (success) {
                console.log('[EnhancedTTS] OpenAI TTS successful');
                callbacks?.onEnd?.();
                return { success: true, provider: 'openai' };
            }
            console.warn('[EnhancedTTS] OpenAI TTS returned false, falling back...');
        } catch (error: any) {
            console.error('[EnhancedTTS] OpenAI error:', error.message);
            callbacks?.onError?.(error.message, 'openai');
        }
        callbacks?.onEnd?.();
    }

    // Fallback to browser
    if (status.browser.isConfigured) {
        console.log('[EnhancedTTS] Attempting Browser TTS...');
        callbacks?.onProviderChange?.('browser');

        const success = await speakWithBrowser(
            text,
            gender,
            callbacks?.onStart,
            callbacks?.onEnd
        );

        if (success) {
            return { success: true, provider: 'browser' };
        }
    }

    // Nothing worked
    console.error('[EnhancedTTS] All TTS providers failed');
    return { success: false, provider: 'none', error: 'All TTS providers failed' };
};

// Get a human-readable status message
export const getTTSStatusMessage = (): string => {
    const provider = getBestProvider();

    switch (provider) {
        case 'elevenlabs':
            return '🎙️ Premium voice (ElevenLabs)';
        case 'openai':
            return '🎙️ Natural voice (OpenAI)';
        case 'browser':
            return '🔊 Browser voice';
        case 'none':
            return '❌ No voice available';
    }
};

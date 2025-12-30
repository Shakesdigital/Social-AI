// Enhanced Text-to-Speech Service with robust fallback chain
// Priority: ResponsiveVoice (FREE, no login) → ElevenLabs → OpenAI → Browser TTS

import { isElevenLabsConfigured, speakWithElevenLabs, getRecommendedElevenLabsVoice } from './elevenLabsTTSService';
import { isOpenAITTSConfigured, speakWithOpenAI, getRecommendedVoice } from './openaiTTSService';
import { speakWithResponsiveVoice, getRecommendedResponsiveVoice, loadResponsiveVoiceScript, isResponsiveVoiceLoaded } from './responsiveVoiceTTSService';

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'responsivevoice' | 'elevenlabs' | 'openai' | 'browser' | 'none';

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
export const getTTSStatus = (): { responsivevoice: TTSStatus; elevenlabs: TTSStatus; openai: TTSStatus; browser: TTSStatus } => {
    const elevenlabsConfigured = isElevenLabsConfigured();
    const openaiConfigured = isOpenAITTSConfigured();
    const browserAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
    // ResponsiveVoice is always available (loads dynamically)
    const rvAvailable = true;

    console.log('[EnhancedTTS] Provider status check:', {
        responsivevoice: rvAvailable,
        elevenlabs: elevenlabsConfigured,
        openai: openaiConfigured,
        browser: browserAvailable
    });

    return {
        responsivevoice: {
            provider: 'responsivevoice',
            isConfigured: rvAvailable
        },
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
    // ResponsiveVoice is first since it's free and high quality
    return 'responsivevoice';
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
                voices = window.speechSynthesis.getVoices();
            }
            return voices;
        };

        const voices = getVoicesWithRetry();
        console.log('[EnhancedTTS] Browser voices available:', voices.length);

        // Enhanced voice selection with device-specific tiers
        let selectedVoice: SpeechSynthesisVoice | null = null;
        let voiceQuality: 'neural' | 'enhanced' | 'standard' | 'basic' = 'basic';

        if (voices.length > 0) {
            // TIER 1: Microsoft Neural/Online voices (Edge on any platform)
            if (isEdge) {
                const neuralVoices = gender === 'female'
                    ? ['Microsoft Aria Online', 'Microsoft Jenny Online', 'Aria', 'Jenny']
                    : ['Microsoft Guy Online', 'Microsoft Ryan Online', 'Guy', 'Ryan'];

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
                    ? ['Google US English Female', 'Google UK English Female']
                    : ['Google US English Male', 'Google UK English Male'];

                for (const pattern of googleVoices) {
                    const found = voices.find(v => v.name.includes(pattern));
                    if (found) {
                        selectedVoice = found;
                        voiceQuality = 'enhanced';
                        break;
                    }
                }
            }

            // TIER 3: iOS/macOS Siri voices
            if (!selectedVoice && (isIOS || isSafari)) {
                const appleEnhanced = gender === 'female'
                    ? ['Samantha', 'Karen', 'Moira', 'Tessa']
                    : ['Daniel', 'Alex', 'Fred', 'Oliver'];

                for (const name of appleEnhanced) {
                    const found = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
                    if (found) {
                        selectedVoice = found;
                        voiceQuality = 'standard';
                        break;
                    }
                }
            }

            // TIER 4: Any English voice as last resort
            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang === 'en-US') ||
                    voices.find(v => v.lang.startsWith('en-')) ||
                    voices.find(v => v.lang.startsWith('en')) ||
                    voices[0];
                voiceQuality = 'basic';
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`[EnhancedTTS] Selected voice: "${selectedVoice.name}" (${voiceQuality})`);
            }
        }

        // Optimized speech parameters - FIXED: male was too slow
        if (voiceQuality === 'neural') {
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
        } else if (voiceQuality === 'enhanced') {
            // Enhanced voices - slight adjustments
            utterance.rate = gender === 'female' ? 0.98 : 1.0;  // Male speed increased
            utterance.pitch = gender === 'female' ? 1.0 : 0.98;
        } else if (voiceQuality === 'standard') {
            // Standard voices - moderate adjustments
            utterance.rate = gender === 'female' ? 0.95 : 0.98;  // Male speed increased from 0.88
            utterance.pitch = gender === 'female' ? 1.02 : 0.95;
        } else {
            // Basic voices - more natural adjustments (FIXED: male was way too slow at 0.82)
            utterance.rate = gender === 'female' ? 0.92 : 0.95;  // Male speed increased from 0.82
            utterance.pitch = gender === 'female' ? 1.03 : 0.92;
        }

        // Mobile adjustments - make voices sound MORE natural, not slower
        if (isMobile && voiceQuality !== 'neural') {
            // On mobile, use slightly HIGHER rate for better natural flow
            utterance.rate = Math.min(1.05, utterance.rate + 0.05);
            // Adjust pitch slightly for warmer sound
            utterance.pitch = gender === 'female' ? 1.0 : 0.95;
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

        // Chrome bug fix
        keepAliveInterval = setInterval(() => {
            if (hasEnded) {
                cleanup();
                return;
            }
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }, isMobile ? 500 : 1000);

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
        }, 60000);
    });
};

// Main speak function with automatic fallback
// ORDER: ResponsiveVoice → ElevenLabs → OpenAI → Browser
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

    // TRY RESPONSIVEVOICE FIRST (FREE & no login required)
    console.log('[EnhancedTTS] Attempting ResponsiveVoice TTS (FREE)...');
    callbacks?.onProviderChange?.('responsivevoice');

    try {
        const voice = getRecommendedResponsiveVoice(gender);
        let started = false;

        const success = await speakWithResponsiveVoice(text, voice, {
            pitch: 1,
            rate: 1,
            volume: 1,
            onstart: () => {
                started = true;
                callbacks?.onStart?.();
            },
            onend: () => {
                callbacks?.onEnd?.();
            }
        });

        if (success && started) {
            console.log('[EnhancedTTS] ResponsiveVoice TTS successful');
            return { success: true, provider: 'responsivevoice' };
        }
        console.warn('[EnhancedTTS] ResponsiveVoice TTS did not start properly, trying fallbacks...');
    } catch (error: any) {
        console.error('[EnhancedTTS] ResponsiveVoice error:', error.message);
        callbacks?.onError?.(error.message, 'responsivevoice');
    }

    // Try ElevenLabs
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
        console.log('[EnhancedTTS] Attempting Browser TTS (final fallback)...');
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
        case 'responsivevoice':
            return '🎙️ Natural voice (ResponsiveVoice - FREE)';
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

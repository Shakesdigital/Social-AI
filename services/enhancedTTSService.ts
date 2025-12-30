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

// Enhanced browser speech synthesis with better voice selection
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

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        console.log('[EnhancedTTS] Browser voices available:', voices.length);

        // Enhanced voice selection with quality tiers
        let selectedVoice: SpeechSynthesisVoice | null = null;
        let voiceQuality = 'basic';

        if (voices.length > 0) {
            // TIER 1: Premium Neural/Online voices (Microsoft Edge, Google Chrome)
            const premiumVoicePatterns = gender === 'female'
                ? ['Microsoft Aria Online', 'Microsoft Jenny Online', 'Google US English Female', 'Microsoft Zira']
                : ['Microsoft Guy Online', 'Microsoft Ryan Online', 'Google US English Male', 'Microsoft David'];

            for (const pattern of premiumVoicePatterns) {
                const found = voices.find(v => v.name.includes(pattern) && v.lang.startsWith('en'));
                if (found) {
                    selectedVoice = found;
                    voiceQuality = 'premium';
                    break;
                }
            }

            // TIER 2: Apple voices (macOS/iOS)
            if (!selectedVoice) {
                const appleVoices = gender === 'female'
                    ? ['Samantha', 'Karen', 'Moira', 'Tessa', 'Victoria']
                    : ['Daniel', 'Alex', 'Fred', 'Thomas', 'Oliver'];

                for (const name of appleVoices) {
                    const found = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
                    if (found) {
                        selectedVoice = found;
                        voiceQuality = 'standard';
                        break;
                    }
                }
            }

            // TIER 3: Any English voice
            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.startsWith('en-US')) ||
                    voices.find(v => v.lang.startsWith('en')) ||
                    voices[0];
                voiceQuality = 'basic';
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`[EnhancedTTS] Selected browser voice: ${selectedVoice.name} (${voiceQuality})`);
            }
        }

        // Optimize speech parameters based on quality
        if (voiceQuality === 'premium') {
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
        } else if (voiceQuality === 'standard') {
            utterance.rate = gender === 'female' ? 0.95 : 0.9;
            utterance.pitch = gender === 'female' ? 1.02 : 0.98;
        } else {
            utterance.rate = gender === 'female' ? 0.9 : 0.85;
            utterance.pitch = gender === 'female' ? 1.05 : 0.95;
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

        // Chrome bug fix: prevent speech from stopping
        keepAliveInterval = setInterval(() => {
            if (hasEnded) {
                cleanup();
                return;
            }
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }, 1000);

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

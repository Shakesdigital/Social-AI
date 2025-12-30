// Simplified Text-to-Speech Service - ResponsiveVoice ONLY
// Consistent, high-quality voice across ALL devices (mobile & desktop)
// https://responsivevoice.org/

import {
    speakWithResponsiveVoice,
    getRecommendedResponsiveVoice,
    loadResponsiveVoiceScript,
    isResponsiveVoiceLoaded,
    ResponsiveVoiceName
} from './responsiveVoiceTTSService';

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'responsivevoice' | 'none';

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

// Get TTS status
export const getTTSStatus = () => {
    const isLoaded = isResponsiveVoiceLoaded();
    console.log('[TTS] ResponsiveVoice status:', isLoaded ? 'ready' : 'loading...');
    return {
        responsivevoice: {
            provider: 'responsivevoice' as TTSProvider,
            isConfigured: true // Always available (loads dynamically)
        }
    };
};

// Get the provider (always ResponsiveVoice)
export const getBestProvider = (): TTSProvider => {
    return 'responsivevoice';
};

// Main speak function - ResponsiveVoice ONLY
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
    console.log('[TTS] speak() called with text length:', text.length, 'gender:', gender);

    callbacks?.onProviderChange?.('responsivevoice');

    try {
        // Ensure ResponsiveVoice is loaded
        await loadResponsiveVoiceScript();

        const voice = getRecommendedResponsiveVoice(gender);
        console.log('[TTS] Using voice:', voice);

        const success = await speakWithResponsiveVoice(text, voice, {
            pitch: 1,
            rate: 1,
            volume: 1,
            onstart: () => {
                console.log('[TTS] Speech started');
                callbacks?.onStart?.();
            },
            onend: () => {
                console.log('[TTS] Speech completed');
                callbacks?.onEnd?.();
            },
            onerror: (error) => {
                console.error('[TTS] Speech error:', error);
                callbacks?.onError?.(String(error), 'responsivevoice');
            }
        });

        if (success) {
            return { success: true, provider: 'responsivevoice' };
        } else {
            return { success: false, provider: 'responsivevoice', error: 'Speech failed' };
        }
    } catch (error: any) {
        console.error('[TTS] Error:', error.message);
        callbacks?.onError?.(error.message, 'responsivevoice');
        callbacks?.onEnd?.();
        return { success: false, provider: 'none', error: error.message };
    }
};

// Get human-readable status message
export const getTTSStatusMessage = (): string => {
    return '🎙️ ResponsiveVoice';
};

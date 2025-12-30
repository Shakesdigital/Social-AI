// Simplified Text-to-Speech Service - ResponsiveVoice with Native Fallback
// Usage: ResponsiveVoice (Primary) -> Native Browser (Backup)
// https://responsivevoice.org/

import {
    speakWithResponsiveVoice,
    getRecommendedResponsiveVoice,
    loadResponsiveVoiceScript,
    isResponsiveVoiceLoaded,
    ResponsiveVoiceName
} from './responsiveVoiceTTSService';

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'responsivevoice' | 'browser' | 'none';

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
            isConfigured: true
        }
    };
};

// Get the provider
export const getBestProvider = (): TTSProvider => {
    return 'responsivevoice';
};

// Internal function for native browser fallback
const speakWithNativeBrowser = async (
    text: string,
    gender: VoiceGender,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            resolve(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Simple voice selection for fallback
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.lang.startsWith('en') &&
            (gender === 'female' ? v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google') : v.name.includes('Male'))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        utterance.onstart = () => onStart?.();
        utterance.onend = () => {
            onEnd?.();
            resolve(true);
        };
        utterance.onerror = () => {
            onEnd?.();
            resolve(false);
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
};

// Main speak function
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

    // 1. Try ResponsiveVoice (Primary)
    try {
        callbacks?.onProviderChange?.('responsivevoice');
        await loadResponsiveVoiceScript();

        const voice = getRecommendedResponsiveVoice(gender);
        const success = await speakWithResponsiveVoice(text, voice, {
            pitch: 1, rate: 1, volume: 1,
            onstart: callbacks?.onStart,
            onend: callbacks?.onEnd,
            onerror: (err) => console.error('[TTS] ResponsiveVoice error:', err)
        });

        if (success) return { success: true, provider: 'responsivevoice' };

        console.warn('[TTS] ResponsiveVoice failed, trying native fallback...');
    } catch (error) {
        console.warn('[TTS] ResponsiveVoice error:', error);
    }

    // 2. Fallback to Native Browser (Backup)
    try {
        console.log('[TTS] Attempting native browser fallback');
        callbacks?.onProviderChange?.('browser');

        const success = await speakWithNativeBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd);

        if (success) return { success: true, provider: 'browser' };
    } catch (err) {
        console.error('[TTS] Native fallback error:', err);
    }

    // 3. Complete failure
    const errorMsg = 'All TTS providers failed';
    callbacks?.onError?.(errorMsg, 'none');
    return { success: false, provider: 'none', error: errorMsg };
};

export const getTTSStatusMessage = (): string => {
    return '🎙️ AI Voice';
};

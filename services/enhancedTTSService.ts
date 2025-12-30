// ResponsiveVoice Text-to-Speech Service (with Native Fallback)
// Primary: ResponsiveVoice (High Quality, Cross-Platform)
// Fallback: Native Browser TTS (Reliable)

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

export const getTTSStatus = () => {
    return {
        responsivevoice: { provider: 'responsivevoice' as TTSProvider, isConfigured: true }
    };
};

export const getBestProvider = (): TTSProvider => 'responsivevoice';

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
    console.log('[TTS] speak() called with:', { textLength: text.length, gender });

    // 1. Try ResponsiveVoice (Primary)
    try {
        callbacks?.onProviderChange?.('responsivevoice');
        console.log('[TTS] Attempting ResponsiveVoice...');

        // Ensure script is loaded
        await loadResponsiveVoiceScript();

        const voice = getRecommendedResponsiveVoice(gender);
        const success = await speakWithResponsiveVoice(text, voice, {
            pitch: 1, rate: 1, volume: 1,
            onstart: callbacks?.onStart,
            onend: callbacks?.onEnd,
            onerror: (err) => console.error('[TTS] ResponsiveVoice internal error:', err)
        });

        if (success) return { success: true, provider: 'responsivevoice' };

        console.warn('[TTS] ResponsiveVoice returned false, trying fallback...');

    } catch (error) {
        console.warn('[TTS] ResponsiveVoice failed (likely blocked), falling back to browser:', error);
    }

    // 2. Fallback to Native Browser
    try {
        callbacks?.onProviderChange?.('browser');
        console.log('[TTS] Attempting Native Browser Fallback...');

        await new Promise<void>((resolve) => {
            if (!window.speechSynthesis) {
                resolve();
                return;
            }
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();

            const preferredVoice = voices.find(v =>
                v.lang.startsWith('en') &&
                (gender === 'female'
                    ? ['Samantha', 'Google US English Female', 'Microsoft Aria'].some(k => v.name.includes(k))
                    : ['Daniel', 'Google US English Male', 'Microsoft Guy'].some(k => v.name.includes(k)))
            ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

            if (preferredVoice) utterance.voice = preferredVoice;
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            utterance.rate = isMobile ? 1.1 : 1.0;

            utterance.onstart = () => callbacks?.onStart?.();
            utterance.onend = () => { callbacks?.onEnd?.(); resolve(); };
            utterance.onerror = () => { callbacks?.onEnd?.(); resolve(); };

            window.speechSynthesis.speak(utterance);
        });

        return { success: true, provider: 'browser' };

    } catch (e: any) {
        const msg = e.message || 'All providers failed';
        callbacks?.onError?.(msg, 'none');
        return { success: false, provider: 'none', error: msg };
    }
};

export const getTTSStatusMessage = (): string => {
    return '🎙️ AI Voice';
};

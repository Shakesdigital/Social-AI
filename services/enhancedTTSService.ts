// Google Translate TTS Service (Unofficial)
// Falls back to Native Browser TTS
// Benefits: Consistent Google voices on all devices (Mobile/Desktop)

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'google' | 'browser' | 'none';

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

export const getTTSStatus = () => {
    return {
        google: { provider: 'google' as TTSProvider, isConfigured: true }
    };
};

export const getBestProvider = (): TTSProvider => 'google';

// Helper to split long text (Google TTS has 100 char limit usually, but we chunk it)
const chunkText = (text: string, maxLength: number = 180): string[] => {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences first
    const sentences = text.split(/([.!?]+)/);

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (currentChunk.length + sentence.length > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
};

// Play audio from URL
const playAudioUrl = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        audio.play().catch(reject);
    });
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
    console.log('[TTS] speak() called with:', { textLength: text.length });

    // 1. Try Google Translate TTS (Consistent Voice)
    try {
        callbacks?.onProviderChange?.('google');
        console.log('[TTS] Attempting Google TTS...');

        // Chunk text because GET request has length limits
        const chunks = chunkText(text);

        callbacks?.onStart?.();

        for (const chunk of chunks) {
            if (!chunk.trim()) continue;
            // Use Google Translate TTS endpoint
            // tl=en-gb (British English - usually female sounding and nice)
            // tl=en-us (US English)
            const lang = gender === 'female' ? 'en-gb' : 'en-us';
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;

            await playAudioUrl(url);
        }

        callbacks?.onEnd?.();
        return { success: true, provider: 'google' };

    } catch (error) {
        console.warn('[TTS] Google TTS failed, falling back to native browser:', error);
    }

    // 2. Fallback to Native Browser
    try {
        callbacks?.onProviderChange?.('browser');
        console.log('[TTS] Attempting Native Browser Fallback...');

        await new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();

            // Try to find a good voice
            const voice = voices.find(v =>
                v.lang.startsWith('en') &&
                (gender === 'female' ? v.name.includes('Female') || v.name.includes('Google') : v.name.includes('Male'))
            ) || voices[0];

            if (voice) utterance.voice = voice;
            utterance.rate = 1.0;

            utterance.onstart = () => callbacks?.onStart?.();
            utterance.onend = () => {
                callbacks?.onEnd?.();
                resolve();
            };
            utterance.onerror = () => {
                callbacks?.onEnd?.(); // resolving anyway to prevent stuck state
                resolve();
            };

            window.speechSynthesis.cancel();
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

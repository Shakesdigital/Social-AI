// Puter.js Text-to-Speech Service
// Free, unlimited TTS without API keys - uses User-Pays model
// Documentation: https://docs.puter.com/

export type PuterVoice =
    | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable'
    | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse';

export interface PuterTTSOptions {
    voice?: PuterVoice;
    speed?: number;  // 0.25 to 4.0
}

// Check if Puter is loaded and ready
export const isPuterLoaded = (): boolean => {
    const puter = (window as any).puter;
    const isLoaded = puter !== undefined && typeof puter.ai?.txt2speech === 'function';
    console.log('[Puter TTS] isPuterLoaded check:', isLoaded, {
        puterExists: puter !== undefined,
        aiExists: puter?.ai !== undefined,
        txt2speechExists: typeof puter?.ai?.txt2speech === 'function'
    });
    return isLoaded;
};

// Wait for Puter to be ready
export const waitForPuter = (maxWaitMs: number = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
        // Check immediately
        if (isPuterLoaded()) {
            console.log('[Puter TTS] Puter already loaded');
            resolve(true);
            return;
        }

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (isPuterLoaded()) {
                clearInterval(checkInterval);
                console.log('[Puter TTS] Puter became available');
                resolve(true);
            } else if (Date.now() - startTime > maxWaitMs) {
                clearInterval(checkInterval);
                console.warn('[Puter TTS] Timeout waiting for Puter');
                resolve(false);
            }
        }, 100);
    });
};

// Generate speech using Puter.js TTS
export const generateSpeechPuter = async (
    text: string,
    options: PuterTTSOptions = {}
): Promise<Blob | null> => {
    try {
        // Wait for Puter to be ready
        const isReady = await waitForPuter(3000);
        if (!isReady) {
            console.error('[Puter TTS] Puter.js not available after waiting');
            return null;
        }

        const puter = (window as any).puter;

        const {
            voice = 'nova',  // Default to nova (female-sounding)
            speed = 1.0
        } = options;

        console.log('[Puter TTS] Generating speech:', { textLength: text.length, voice, speed });

        // Call Puter TTS API - using the documented syntax
        const result = await puter.ai.txt2speech(text, {
            voice,
            speed
        });

        console.log('[Puter TTS] API response type:', typeof result, result);

        // Handle different response types
        if (result instanceof Blob) {
            console.log('[Puter TTS] Generated audio blob:', result.size, 'bytes');
            return result;
        }

        // If it returns an audio element or URL
        if (result && result.audio) {
            console.log('[Puter TTS] Got audio from result.audio');
            return result.audio;
        }

        // If it returns ArrayBuffer
        if (result instanceof ArrayBuffer) {
            console.log('[Puter TTS] Converting ArrayBuffer to Blob');
            return new Blob([result], { type: 'audio/mp3' });
        }

        console.error('[Puter TTS] Unexpected response type:', typeof result);
        return null;
    } catch (error: any) {
        console.error('[Puter TTS] Error generating speech:', error.message || error);
        return null;
    }
};

// Play audio blob
export const playAudioBlob = async (blob: Blob): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audio.onended = () => {
                URL.revokeObjectURL(url);
                console.log('[Puter TTS] Audio playback completed');
                resolve(true);
            };

            audio.onerror = (e) => {
                console.error('[Puter TTS] Audio playback error:', e);
                URL.revokeObjectURL(url);
                resolve(false);
            };

            audio.play().catch((err) => {
                console.error('[Puter TTS] Failed to play audio:', err);
                URL.revokeObjectURL(url);
                resolve(false);
            });
        } catch (error: any) {
            console.error('[Puter TTS] Error creating audio:', error);
            resolve(false);
        }
    });
};

// Combined: Generate and play speech
export const speakWithPuter = async (
    text: string,
    options: PuterTTSOptions = {}
): Promise<boolean> => {
    console.log('[Puter TTS] speakWithPuter called with text length:', text.length);

    try {
        const audioBlob = await generateSpeechPuter(text, options);
        if (!audioBlob) {
            console.error('[Puter TTS] No audio blob generated');
            return false;
        }

        console.log('[Puter TTS] Playing audio blob...');
        return await playAudioBlob(audioBlob);
    } catch (error: any) {
        console.error('[Puter TTS] speakWithPuter error:', error.message || error);
        return false;
    }
};

// Get recommended voice based on gender
export const getRecommendedPuterVoice = (gender: 'male' | 'female'): PuterVoice => {
    // Based on OpenAI voice characteristics
    // Female-sounding: alloy, nova, shimmer
    // Male-sounding: echo, onyx, fable
    return gender === 'female' ? 'nova' : 'onyx';
};

// Puter.js Text-to-Speech Service
// Free, unlimited TTS without API keys - uses User-Pays model
// Documentation: https://docs.puter.com/

export type PuterVoice =
    | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable'
    | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse';

export type PuterEngine = 'openai-tts-1' | 'openai-tts-1-hd' | 'aws-neural' | 'aws-standard';

export interface PuterTTSOptions {
    voice?: PuterVoice;
    engine?: PuterEngine;
    speed?: number;  // 0.25 to 4.0
}

// Check if Puter is loaded
export const isPuterLoaded = (): boolean => {
    return typeof (window as any).puter !== 'undefined' &&
        typeof (window as any).puter.ai?.txt2speech === 'function';
};

// Load Puter.js script dynamically
export const loadPuterScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        // Check if already loaded
        if (isPuterLoaded()) {
            console.log('[Puter TTS] Already loaded');
            resolve(true);
            return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector('script[src*="puter.js"]');
        if (existingScript) {
            // Wait for it to load
            existingScript.addEventListener('load', () => {
                console.log('[Puter TTS] Script loaded from existing tag');
                resolve(isPuterLoaded());
            });
            existingScript.addEventListener('error', () => {
                console.error('[Puter TTS] Failed to load existing script');
                resolve(false);
            });
            return;
        }

        // Create and load script
        const script = document.createElement('script');
        script.src = 'https://js.puter.com/v2/';
        script.async = true;

        script.onload = () => {
            console.log('[Puter TTS] Script loaded successfully');
            // Give Puter a moment to initialize
            setTimeout(() => {
                resolve(isPuterLoaded());
            }, 500);
        };

        script.onerror = () => {
            console.error('[Puter TTS] Failed to load script');
            resolve(false);
        };

        document.head.appendChild(script);
    });
};

// Generate speech using Puter.js TTS
export const generateSpeechPuter = async (
    text: string,
    options: PuterTTSOptions = {}
): Promise<Blob | null> => {
    try {
        // Ensure Puter is loaded
        const loaded = await loadPuterScript();
        if (!loaded) {
            console.error('[Puter TTS] Puter.js not available');
            return null;
        }

        const puter = (window as any).puter;

        const {
            voice = 'nova',  // Default to nova (female-sounding)
            engine = 'openai-tts-1',
            speed = 1.0
        } = options;

        console.log('[Puter TTS] Generating speech:', { textLength: text.length, voice, engine, speed });

        // Call Puter TTS API
        const audioBlob = await puter.ai.txt2speech(text, {
            voice,
            model: engine,
            speed
        });

        if (audioBlob instanceof Blob) {
            console.log('[Puter TTS] Generated audio blob:', audioBlob.size, 'bytes');
            return audioBlob;
        }

        console.error('[Puter TTS] Unexpected response type');
        return null;
    } catch (error: any) {
        console.error('[Puter TTS] Error generating speech:', error);
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
    console.log('[Puter TTS] speakWithPuter called');

    const audioBlob = await generateSpeechPuter(text, options);
    if (!audioBlob) {
        return false;
    }

    return await playAudioBlob(audioBlob);
};

// Check if Puter TTS is configured/available
export const isPuterTTSConfigured = async (): Promise<boolean> => {
    const loaded = await loadPuterScript();
    console.log('[Puter TTS] Configuration check:', loaded);
    return loaded;
};

// Get recommended voice based on gender
export const getRecommendedPuterVoice = (gender: 'male' | 'female'): PuterVoice => {
    // Based on OpenAI voice characteristics
    // Female-sounding: alloy, nova, shimmer
    // Male-sounding: echo, onyx, fable
    return gender === 'female' ? 'nova' : 'onyx';
};

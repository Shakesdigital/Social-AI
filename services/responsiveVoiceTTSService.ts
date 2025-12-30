// ResponsiveVoice.js Text-to-Speech Service
// Free TTS library with 51+ languages and 158 voices
// Works without API keys or user authentication
// https://responsivevoice.org/

export type ResponsiveVoiceName =
    | 'UK English Female' | 'UK English Male'
    | 'US English Female' | 'US English Male'
    | 'Australian Female' | 'Australian Male'
    | 'Indian English Female' | 'Indian English Male';

export interface ResponsiveVoiceOptions {
    pitch?: number;    // 0 to 2 (default 1)
    rate?: number;     // 0 to 1.5 (default 1)
    volume?: number;   // 0 to 1 (default 1)
    onstart?: () => void;
    onend?: () => void;
    onerror?: (error: any) => void;
}

// Check if ResponsiveVoice is loaded
export const isResponsiveVoiceLoaded = (): boolean => {
    const rv = (window as any).responsiveVoice;
    const isLoaded = rv !== undefined && typeof rv.speak === 'function';
    console.log('[ResponsiveVoice] isLoaded check:', isLoaded);
    return isLoaded;
};

// Load ResponsiveVoice script dynamically
export const loadResponsiveVoiceScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        // Check if already loaded
        if (isResponsiveVoiceLoaded()) {
            console.log('[ResponsiveVoice] Already loaded');
            resolve(true);
            return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector('script[src*="responsivevoice"]');
        if (existingScript) {
            console.log('[ResponsiveVoice] Script tag exists, waiting...');
            // Wait for it to initialize
            const checkInterval = setInterval(() => {
                if (isResponsiveVoiceLoaded()) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(isResponsiveVoiceLoaded());
            }, 5000);
            return;
        }

        // Create and load script
        const script = document.createElement('script');
        // Note: For production, you should get a free API key from responsivevoice.org
        // Using the non-commercial free version for now
        script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=free';
        script.async = true;

        script.onload = () => {
            console.log('[ResponsiveVoice] Script tag loaded');
            // Wait for ResponsiveVoice to initialize
            const checkInterval = setInterval(() => {
                if (isResponsiveVoiceLoaded()) {
                    clearInterval(checkInterval);
                    console.log('[ResponsiveVoice] Initialized successfully');
                    resolve(true);
                }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                const loaded = isResponsiveVoiceLoaded();
                console.log('[ResponsiveVoice] Init timeout, loaded:', loaded);
                resolve(loaded);
            }, 5000);
        };

        script.onerror = () => {
            console.error('[ResponsiveVoice] Failed to load script');
            resolve(false);
        };

        document.head.appendChild(script);
    });
};

// Speak text using ResponsiveVoice
export const speakWithResponsiveVoice = async (
    text: string,
    voiceName: ResponsiveVoiceName = 'UK English Female',
    options: ResponsiveVoiceOptions = {}
): Promise<boolean> => {
    return new Promise(async (resolve) => {
        try {
            // Ensure ResponsiveVoice is loaded
            const loaded = await loadResponsiveVoiceScript();
            if (!loaded) {
                console.error('[ResponsiveVoice] Not available');
                resolve(false);
                return;
            }

            const rv = (window as any).responsiveVoice;

            // Cancel any ongoing speech
            rv.cancel();

            console.log('[ResponsiveVoice] Speaking:', { textLength: text.length, voice: voiceName });

            const {
                pitch = 1,
                rate = 1,
                volume = 1,
                onstart,
                onend,
                onerror
            } = options;

            rv.speak(text, voiceName, {
                pitch,
                rate,
                volume,
                onstart: () => {
                    console.log('[ResponsiveVoice] Speech started');
                    onstart?.();
                },
                onend: () => {
                    console.log('[ResponsiveVoice] Speech completed');
                    onend?.();
                    resolve(true);
                },
                onerror: (error: any) => {
                    console.error('[ResponsiveVoice] Speech error:', error);
                    onerror?.(error);
                    resolve(false);
                }
            });

            // Fallback timeout (60 seconds max)
            setTimeout(() => {
                console.warn('[ResponsiveVoice] Timeout - assuming speech finished');
                resolve(true);
            }, 60000);

        } catch (error: any) {
            console.error('[ResponsiveVoice] Error:', error);
            resolve(false);
        }
    });
};

// Get recommended voice based on gender
export const getRecommendedResponsiveVoice = (gender: 'male' | 'female'): ResponsiveVoiceName => {
    // UK English voices sound the most natural
    return gender === 'female' ? 'UK English Female' : 'UK English Male';
};

// Check if ResponsiveVoice is configured/available
export const isResponsiveVoiceConfigured = async (): Promise<boolean> => {
    return await loadResponsiveVoiceScript();
};

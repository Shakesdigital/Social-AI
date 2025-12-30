// StreamElements TTS Service (Amazon Polly Voices ONLY)
// No fallback - focus on making Polly work

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'streamelements' | 'none';

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

export const getTTSStatus = () => ({
    streamelements: { provider: 'streamelements' as TTSProvider, isConfigured: true }
});

export const getBestProvider = (): TTSProvider => 'streamelements';

// Chunk text for API limits
const chunkText = (text: string, maxLength: number = 250): string[] => {
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = text.split(/([.!?]+)/);

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxLength) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks.length > 0 ? chunks : [text];
};

// Play audio from URL with detailed error logging
const playAudioUrl = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        console.log('[TTS] Loading audio from:', url.substring(0, 80) + '...');

        const audio = new Audio(url);

        const timeout = setTimeout(() => {
            console.error('[TTS] Audio load timeout after 15s');
            reject(new Error('Audio timeout'));
        }, 15000);

        audio.onloadeddata = () => {
            console.log('[TTS] Audio loaded successfully');
        };

        audio.onended = () => {
            console.log('[TTS] Audio playback finished');
            clearTimeout(timeout);
            resolve();
        };

        audio.onerror = (e) => {
            console.error('[TTS] Audio error:', e);
            clearTimeout(timeout);
            reject(new Error('Audio failed to load'));
        };

        audio.play()
            .then(() => console.log('[TTS] Audio playback started'))
            .catch(e => {
                console.error('[TTS] Audio play() failed:', e);
                clearTimeout(timeout);
                reject(e);
            });
    });
};

// Main Speak Function - StreamElements ONLY
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
    console.log('[TTS] speak() called:', { textLength: text.length, gender });
    callbacks?.onProviderChange?.('streamelements');

    try {
        // Salli = Female, Matthew = Male
        const voice = gender === 'female' ? 'Salli' : 'Matthew';
        const chunks = chunkText(text);

        console.log('[TTS] Using StreamElements with voice:', voice);
        console.log('[TTS] Text chunks:', chunks.length);

        callbacks?.onStart?.();

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[TTS] Playing chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 30)}..."`);

            const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(chunk)}`;
            await playAudioUrl(url);
        }

        console.log('[TTS] All chunks played successfully');
        callbacks?.onEnd?.();
        return { success: true, provider: 'streamelements' };

    } catch (error: any) {
        const errorMsg = error.message || 'StreamElements TTS failed';
        console.error('[TTS] FAILED:', errorMsg);
        callbacks?.onError?.(errorMsg, 'streamelements');
        callbacks?.onEnd?.();
        return { success: false, provider: 'none', error: errorMsg };
    }
};

export const getTTSStatusMessage = (): string => '🎙️ Amazon Polly';

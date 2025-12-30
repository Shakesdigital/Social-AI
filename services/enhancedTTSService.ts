// StreamElements TTS Service (Free Amazon Polly Voices)
// Reliable, high-quality AI voices that work on all devices
// Fallback: Native Browser TTS

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'streamelements' | 'browser' | 'none';

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

export const getTTSStatus = () => {
    return {
        streamelements: { provider: 'streamelements' as TTSProvider, isConfigured: true }
    };
};

export const getBestProvider = (): TTSProvider => 'streamelements';

// Chunk text for API limits
const chunkText = (text: string, maxLength: number = 250): string[] => {
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = text.split(/([.!?]+)/);

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
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

// Play audio from URL
const playAudioUrl = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);

        const timeout = setTimeout(() => {
            reject(new Error('Audio timeout'));
        }, 15000);

        audio.onended = () => { clearTimeout(timeout); resolve(); };
        audio.onerror = (e) => { clearTimeout(timeout); reject(e); };
        audio.play().catch(e => { clearTimeout(timeout); reject(e); });
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
    console.log('[TTS] speak() called:', { textLength: text.length, gender });

    // 1. Try StreamElements (Amazon Polly voices)
    try {
        callbacks?.onProviderChange?.('streamelements');
        console.log('[TTS] Using StreamElements (Amazon Polly)...');

        // Salli = Female, Matthew = Male (both are natural-sounding Polly voices)
        const voice = gender === 'female' ? 'Salli' : 'Matthew';
        const chunks = chunkText(text);

        callbacks?.onStart?.();

        for (const chunk of chunks) {
            const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(chunk)}`;
            await playAudioUrl(url);
        }

        callbacks?.onEnd?.();
        return { success: true, provider: 'streamelements' };

    } catch (error) {
        console.warn('[TTS] StreamElements failed:', error);
    }

    // 2. Fallback to Browser
    try {
        callbacks?.onProviderChange?.('browser');
        console.log('[TTS] Falling back to browser voice...');

        await new Promise<void>((resolve) => {
            if (!window.speechSynthesis) { resolve(); return; }
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();

            const voice = voices.find(v =>
                v.lang.startsWith('en') &&
                (gender === 'female'
                    ? ['Samantha', 'Google', 'Aria'].some(k => v.name.includes(k))
                    : ['Daniel', 'Google', 'Guy'].some(k => v.name.includes(k)))
            ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

            if (voice) utterance.voice = voice;
            utterance.rate = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 1.1 : 1.0;

            utterance.onstart = () => callbacks?.onStart?.();
            utterance.onend = () => { callbacks?.onEnd?.(); resolve(); };
            utterance.onerror = () => { callbacks?.onEnd?.(); resolve(); };

            window.speechSynthesis.speak(utterance);
        });

        return { success: true, provider: 'browser' };

    } catch (e: any) {
        callbacks?.onError?.(e.message || 'TTS failed', 'none');
        return { success: false, provider: 'none', error: e.message };
    }
};

export const getTTSStatusMessage = (): string => '🎙️ AI Voice';

// OpenAI Text-to-Speech Service for natural voice output

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TTSOptions {
    voice?: OpenAIVoice;
    speed?: number; // 0.25 to 4.0, default 1.0
}

// Check if OpenAI TTS is available
export const isOpenAITTSConfigured = (): boolean => {
    return !!OPENAI_API_KEY && OPENAI_API_KEY.length > 0;
};

// Generate speech using OpenAI TTS API
export const generateSpeech = async (
    text: string,
    options: TTSOptions = {}
): Promise<ArrayBuffer | null> => {
    if (!isOpenAITTSConfigured()) {
        console.log('[TTS] OpenAI API key not configured');
        return null;
    }

    const { voice = 'nova', speed = 1.0 } = options;

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,
                speed: speed,
                response_format: 'mp3',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[TTS] OpenAI API error:', error);
            return null;
        }

        return await response.arrayBuffer();
    } catch (error) {
        console.error('[TTS] Error generating speech:', error);
        return null;
    }
};

// Play audio from ArrayBuffer
export const playAudio = async (audioBuffer: ArrayBuffer): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };

            audio.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
            };

            audio.play().catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};

// Combined function: generate and play speech
export const speakWithOpenAI = async (
    text: string,
    options: TTSOptions = {}
): Promise<boolean> => {
    const audioBuffer = await generateSpeech(text, options);

    if (!audioBuffer) {
        return false;
    }

    try {
        await playAudio(audioBuffer);
        return true;
    } catch (error) {
        console.error('[TTS] Error playing audio:', error);
        return false;
    }
};

// Voice recommendations based on gender preference
export const getRecommendedVoice = (preference: 'male' | 'female'): OpenAIVoice => {
    return preference === 'female' ? 'nova' : 'onyx';
};

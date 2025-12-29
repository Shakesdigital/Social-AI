// ElevenLabs Text-to-Speech Service for natural voice output
// Free tier: 10,000 characters/month

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

// ElevenLabs voice IDs - these are their free, high-quality voices
export const ELEVENLABS_VOICES = {
    // Female voices
    rachel: '21m00Tcm4TlvDq8ikWAM',  // Rachel - warm, conversational female
    domi: 'AZnzlk1XvdvUeBnXmlld',    // Domi - strong, clear female
    bella: 'EXAVITQu4vr4xnSDxMaL',   // Bella - soft, gentle female
    elli: 'MF3mGyEYCl7XYWbV9V6O',    // Elli - young, dynamic female

    // Male voices
    adam: 'pNInz6obpgDQGcFmaJgB',    // Adam - deep, authoritative male
    josh: 'TxGEqnHWrfWFTfGW9XjX',    // Josh - young, energetic male
    arnold: 'VR6AewLTigWG4xSOukaG',  // Arnold - strong, confident male
    sam: 'yoZ06aMxZJJ28mfd3POQ',     // Sam - friendly, conversational male
} as const;

export type ElevenLabsVoice = keyof typeof ELEVENLABS_VOICES;

export interface ElevenLabsTTSOptions {
    voice?: ElevenLabsVoice;
    stability?: number;      // 0-1, lower = more expressive
    similarity_boost?: number; // 0-1, higher = closer to original
}

// Check if ElevenLabs is configured
export const isElevenLabsConfigured = (): boolean => {
    return !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 0;
};

// Generate speech using ElevenLabs API
export const generateSpeechElevenLabs = async (
    text: string,
    options: ElevenLabsTTSOptions = {}
): Promise<ArrayBuffer | null> => {
    if (!isElevenLabsConfigured()) {
        console.log('[ElevenLabs] API key not configured');
        return null;
    }

    const {
        voice = 'rachel',
        stability = 0.5,
        similarity_boost = 0.75
    } = options;

    const voiceId = ELEVENLABS_VOICES[voice];

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: stability,
                        similarity_boost: similarity_boost,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('[ElevenLabs] API error:', error);
            return null;
        }

        return await response.arrayBuffer();
    } catch (error) {
        console.error('[ElevenLabs] Error generating speech:', error);
        return null;
    }
};

// Play audio from ArrayBuffer
export const playAudioElevenLabs = async (audioBuffer: ArrayBuffer): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
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
export const speakWithElevenLabs = async (
    text: string,
    options: ElevenLabsTTSOptions = {}
): Promise<boolean> => {
    const audioBuffer = await generateSpeechElevenLabs(text, options);

    if (!audioBuffer) {
        return false;
    }

    try {
        await playAudioElevenLabs(audioBuffer);
        return true;
    } catch (error) {
        console.error('[ElevenLabs] Error playing audio:', error);
        return false;
    }
};

// Get recommended voice based on gender preference
export const getRecommendedElevenLabsVoice = (preference: 'male' | 'female'): ElevenLabsVoice => {
    return preference === 'female' ? 'rachel' : 'adam';
};

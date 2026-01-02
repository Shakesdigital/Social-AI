// Groq TTS Service - Desktop optimized, Mobile with special handling
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const GROQ_MAX_CHARS = 1000; // Large chunks for fluency

export type VoiceGender = 'female' | 'male';
export type TTSProvider = 'groq' | 'browser' | 'none';

const GROQ_VOICES = {
    male: 'austin',
    female: 'hannah'
};

export interface SpeakResult {
    success: boolean;
    provider: TTSProvider;
    error?: string;
}

let groqRateLimited = false;
let rateLimitTime: number = 0;
const RATE_LIMIT_RECOVERY = 30000; // 30 seconds

// Mobile detection
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Web Audio API
let audioContext: AudioContext | null = null;
let isAudioUnlocked = false;

// Audio State
let currentAudioElement: HTMLAudioElement | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;
let isStopped = false;

// --- Helper Functions ---

export const stopSpeaking = (): void => {
    console.log('[TTS] Stopping speech...');
    isStopped = true;

    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        currentAudioElement = null;
    }

    if (currentAudioSource) {
        try { currentAudioSource.stop(); } catch (e) { }
        currentAudioSource = null;
    }

    window.speechSynthesis?.cancel();
};

export const unlockMobileAudio = (): void => {
    if (!isMobile() || isAudioUnlocked) return;
    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        isAudioUnlocked = true;
    } catch (e) { console.warn('[TTS] Unlock failed:', e); }
};

export const isGroqTTSConfigured = (): boolean => !!GROQ_API_KEY && GROQ_API_KEY.length > 10;

export const getTTSStatus = () => ({
    groq: { provider: 'groq' as TTSProvider, isConfigured: isGroqTTSConfigured() },
    browser: { provider: 'browser' as TTSProvider, isConfigured: true }
});

export const getBestProvider = (): TTSProvider => {
    if (isGroqTTSConfigured() && !groqRateLimited) return 'groq';
    return 'browser';
};

// --- Chunking Logic ---

// Improved sentence splitter that ignores common abbreviations
const splitIntoSentences = (text: string): string[] => {
    // Look for . ! ? followed by whitespace, BUT NOT preceded by Mr|Mrs|Ms|Dr|Vs|etc
    // regex: (?<!\b(Mr|Mrs|Ms|Dr|Jr|Sr|Vs)\.)[.!?]\s+
    const sentenceRegex = /(?<!\b(?:Mr|Mrs|Ms|Dr|Jr|Sr|Vs))\s*[.!?]+\s+/g;

    // We split manually to keep the delimiters attached if possible or just careful splitting
    // Actually, simpler approach: split and rejoin if short?
    // Let's use a robust regex split.

    const tokens = text.split(sentenceRegex);
    // The split consumes the delimiter. We might want to keep it.
    // Ideally we want to match the sentence.
    // Let's use match instead.

    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];

    // Filter out obvious bad splits from regex (hard to do perfectly with simple regex)
    // The splitter used before was: text.split(/(?<=[.!?])\s+/)
    // That looked-behind for .!?

    // Let's use the look-behind but add negative look-behind for abbreviations
    // JS supports lookbehind in modern browsers.

    const smartRegex = /(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs))\s*(?<=[.!?])\s+/;

    return text.split(smartRegex).filter(s => s.trim().length > 0);
};

const chunkText = (text: string, maxLength: number = GROQ_MAX_CHARS): string[] => {
    const chunks: string[] = [];
    const sentences = splitIntoSentences(text);
    let current = '';

    for (const sentence of sentences) {
        if (sentence.length > maxLength) {
            // Force split long sentence
            if (current) { chunks.push(current.trim()); current = ''; }
            // Split by comma or space
            const parts = sentence.split(/(?<=,)\s*|(?<=\s)/);
            for (const part of parts) {
                if ((current + part).length > maxLength) {
                    if (current) chunks.push(current.trim());
                    current = part;
                } else {
                    current += part;
                }
            }
        } else if ((current + ' ' + sentence).length > maxLength) {
            if (current) chunks.push(current.trim());
            current = sentence;
        } else {
            current = current ? current + ' ' + sentence : sentence;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
};

const getSmartChunks = (text: string): string[] => {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return [text];

    const firstSentence = sentences[0];

    // Use first sentence if it's not too long
    if (firstSentence.length < 250) {
        const firstChunk = firstSentence;
        const remainingText = text.substring(firstChunk.length).trim();

        const chunks = [firstChunk];
        if (remainingText) {
            chunks.push(...chunkText(remainingText, GROQ_MAX_CHARS));
        }
        return chunks;
    }

    // Fallback if first sentence is huge
    return chunkText(text, GROQ_MAX_CHARS);
};


// --- Groq Audio Fetcher ---

const fetchGroqAudio = async (text: string, voice: string): Promise<ArrayBuffer | null> => {
    try {
        const response = await fetch(GROQ_TTS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'canopylabs/orpheus-v1-english',
                input: text,
                voice: voice,
                response_format: 'wav'
            })
        });

        if (response.status === 429) {
            groqRateLimited = true;
            rateLimitTime = Date.now();
            return null;
        }
        if (!response.ok) return null;
        return await response.arrayBuffer();
    } catch (error) { return null; }
};


// --- Playback ---

const playAudioDesktop = (arrayBuffer: ArrayBuffer): Promise<void> => {
    return new Promise((resolve) => {
        if (isStopped) { resolve(); return; }
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioElement = audio;

        audio.onended = () => {
            URL.revokeObjectURL(url);
            currentAudioElement = null;
            resolve();
        };
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            currentAudioElement = null;
            resolve();
        };
        audio.play().catch(() => {
            currentAudioElement = null;
            resolve();
        });
    });
};

const playAudioMobile = async (arrayBuffer: ArrayBuffer): Promise<void> => {
    return new Promise(async (resolve) => {
        if (isStopped) { resolve(); return; }
        try {
            if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') await audioContext.resume();

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            currentAudioSource = source;

            source.onended = () => { currentAudioSource = null; resolve(); };
            source.start(0);
        } catch (e) {
            await playAudioDesktop(arrayBuffer);
            resolve();
        }
    });
};

// --- Streaming Speaker ---

const speakWithGroq = async (
    text: string,
    voice: string,
    onStart?: () => void,
    onEnd?: () => void
): Promise<boolean> => {
    const chunks = getSmartChunks(text);
    console.log(`[TTS] Groq (${isMobile() ? 'Mobile' : 'Desktop'}): processing ${chunks.length} chunks`);

    let started = false;
    let nextAudioPromise: Promise<ArrayBuffer | null> | null = null;
    const playFn = isMobile() ? playAudioMobile : playAudioDesktop;

    for (let i = 0; i < chunks.length; i++) {
        if (isStopped) break;

        let audioData: ArrayBuffer | null = null;
        if (nextAudioPromise) {
            audioData = await nextAudioPromise;
            nextAudioPromise = null;
        } else {
            audioData = await fetchGroqAudio(chunks[i], voice);
        }

        if (i + 1 < chunks.length && !isStopped) {
            nextAudioPromise = fetchGroqAudio(chunks[i + 1], voice);
        }

        if (!audioData) continue;

        if (!started) { started = true; onStart?.(); }
        await playFn(audioData);
    }

    onEnd?.();
    return started;
};


// --- Browser Fallback ---

const speakWithBrowser = (text: string, gender: VoiceGender, onStart?: () => void, onEnd?: () => void): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) { resolve(false); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (voice) utterance.voice = voice;
        utterance.pitch = gender === 'male' ? 0.95 : 1.0;
        utterance.onstart = () => onStart?.();
        utterance.onend = () => { onEnd?.(); resolve(true); };
        utterance.onerror = () => { onEnd?.(); resolve(false); };
        window.speechSynthesis.speak(utterance);
    });
};


// --- Main Export ---

export const speak = async (
    text: string,
    gender: VoiceGender = 'male',
    callbacks?: {
        onStart?: () => void;
        onEnd?: () => void;
        onProviderChange?: (provider: TTSProvider) => void;
        onError?: (error: string, provider: TTSProvider) => void;
    }
): Promise<SpeakResult> => {
    isStopped = false;

    // Rate limit recovery
    if (groqRateLimited && Date.now() - rateLimitTime > RATE_LIMIT_RECOVERY) {
        groqRateLimited = false;
    }

    // Try Groq
    if (isGroqTTSConfigured() && !groqRateLimited) {
        callbacks?.onProviderChange?.('groq');
        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;

        const success = await speakWithGroq(text, voice, callbacks?.onStart, callbacks?.onEnd);
        if (success) {
            return { success: true, provider: 'groq' };
        }
    }

    // Fallback to browser
    callbacks?.onProviderChange?.('browser');
    const success = await speakWithBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd);
    return { success, provider: success ? 'browser' : 'none' };
};

export const getTTSStatusMessage = (): string => {
    if (isGroqTTSConfigured() && !groqRateLimited) return '🎙️ Groq AI';
    return '🎙️ Browser';
};

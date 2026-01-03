// Groq TTS Service - Desktop and Mobile optimized
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
const isMobile = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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
        try {
            currentAudioElement.pause();
            currentAudioElement.currentTime = 0;
        } catch (e) { /* ignore */ }
        currentAudioElement = null;
    }

    if (currentAudioSource) {
        try { currentAudioSource.stop(); } catch (e) { /* ignore */ }
        currentAudioSource = null;
    }

    try {
        window.speechSynthesis?.cancel();
    } catch (e) { /* ignore */ }
};

export const unlockMobileAudio = (): void => {
    console.log('[TTS] unlockMobileAudio called, isMobile:', isMobile(), 'isUnlocked:', isAudioUnlocked);

    if (isAudioUnlocked) {
        console.log('[TTS] Audio already unlocked');
        return;
    }

    try {
        // Create or resume audio context
        if (!audioContext) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioContext = new AudioContextClass();
                console.log('[TTS] Created AudioContext, state:', audioContext.state);
            }
        }

        if (audioContext) {
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('[TTS] AudioContext resumed successfully');
                }).catch(e => {
                    console.warn('[TTS] AudioContext resume failed:', e);
                });
            }

            // Play silent buffer to fully unlock
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);

            isAudioUnlocked = true;
            console.log('[TTS] Mobile audio unlocked successfully');
        }
    } catch (e) {
        console.warn('[TTS] Unlock failed:', e);
    }

    // Also try to unlock HTML5 Audio
    try {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        silentAudio.volume = 0.01;
        silentAudio.play().then(() => {
            silentAudio.pause();
            console.log('[TTS] HTML5 Audio unlocked');
        }).catch(() => { /* silent fail is ok */ });
    } catch (e) { /* ignore */ }
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

// --- Chunking Logic (Mobile-compatible, no lookbehind regex) ---

const splitIntoSentences = (text: string): string[] => {
    // Simple approach: match sentences ending with . ! ? followed by space or end
    // This works on all browsers including older mobile Safari
    const sentences: string[] = [];
    let remaining = text;

    // Common abbreviations to skip
    const abbreviations = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'vs.', 'etc.', 'e.g.', 'i.e.'];

    while (remaining.length > 0) {
        // Find the next sentence end
        let bestEnd = -1;

        for (let i = 0; i < remaining.length; i++) {
            const char = remaining[i];
            if (char === '.' || char === '!' || char === '?') {
                // Check if this is an abbreviation
                let isAbbrev = false;
                for (const abbr of abbreviations) {
                    if (i >= abbr.length - 1) {
                        const potentialAbbr = remaining.substring(i - abbr.length + 1, i + 1);
                        if (potentialAbbr.toLowerCase() === abbr.toLowerCase()) {
                            isAbbrev = true;
                            break;
                        }
                    }
                }

                // Check if followed by space or end of string
                const nextChar = remaining[i + 1];
                if (!isAbbrev && (nextChar === ' ' || nextChar === undefined || nextChar === '\n')) {
                    bestEnd = i;
                    break;
                }
            }
        }

        if (bestEnd === -1) {
            // No sentence end found, take the rest
            sentences.push(remaining.trim());
            break;
        } else {
            // Extract sentence including the punctuation
            const sentence = remaining.substring(0, bestEnd + 1).trim();
            if (sentence) sentences.push(sentence);
            remaining = remaining.substring(bestEnd + 1).trim();
        }
    }

    return sentences.filter(s => s.length > 0);
};

const chunkText = (text: string, maxLength: number = GROQ_MAX_CHARS): string[] => {
    const chunks: string[] = [];
    const sentences = splitIntoSentences(text);
    let current = '';

    for (const sentence of sentences) {
        if (sentence.length > maxLength) {
            if (current) { chunks.push(current.trim()); current = ''; }
            // Split long sentences by comma or space
            const words = sentence.split(/\s+/);
            for (const word of words) {
                if ((current + ' ' + word).length > maxLength) {
                    if (current) chunks.push(current.trim());
                    current = word;
                } else {
                    current = current ? current + ' ' + word : word;
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
    return chunks.filter(c => c.length > 0);
};

const getSmartChunks = (text: string): string[] => {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return [text];

    const firstSentence = sentences[0];

    // Use first sentence if it's not too long (for quick start)
    if (firstSentence.length < 250) {
        const chunks = [firstSentence];
        const remainingText = text.substring(firstSentence.length).trim();
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
    console.log('[TTS] Fetching audio for chunk:', text.substring(0, 50) + '...');
    try {
        const response = await fetch(GROQ_TTS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'playht-tts',
                input: text,
                voice: voice,
                response_format: 'mp3'  // MP3 has better mobile compatibility than WAV
            })
        });

        if (response.status === 429) {
            console.warn('[TTS] Rate limited by Groq');
            groqRateLimited = true;
            rateLimitTime = Date.now();
            return null;
        }
        if (!response.ok) {
            console.error('[TTS] Groq API error:', response.status, response.statusText);
            return null;
        }
        const buffer = await response.arrayBuffer();
        console.log('[TTS] Got audio buffer, size:', buffer.byteLength);
        return buffer;
    } catch (error) {
        console.error('[TTS] Fetch error:', error);
        return null;
    }
};


// --- Playback ---

const playAudio = (arrayBuffer: ArrayBuffer): Promise<void> => {
    return new Promise((resolve) => {
        if (isStopped) {
            console.log('[TTS] Playback cancelled (stopped)');
            resolve();
            return;
        }

        console.log('[TTS] Playing audio, size:', arrayBuffer.byteLength, 'isMobile:', isMobile());

        try {
            // Use HTML5 Audio for all platforms (more reliable)
            const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            // Important for mobile
            audio.preload = 'auto';
            audio.volume = 1.0;

            currentAudioElement = audio;

            const cleanup = () => {
                URL.revokeObjectURL(url);
                currentAudioElement = null;
            };

            audio.onended = () => {
                console.log('[TTS] Audio ended');
                cleanup();
                resolve();
            };

            audio.onerror = (e) => {
                console.error('[TTS] Audio error:', e);
                cleanup();
                // Try Web Audio API as fallback
                playWithWebAudio(arrayBuffer).then(resolve).catch(() => resolve());
            };

            audio.oncanplaythrough = () => {
                console.log('[TTS] Audio ready, playing...');
                audio.play().catch((err) => {
                    console.error('[TTS] Play failed:', err);
                    cleanup();
                    // Try Web Audio API as fallback
                    playWithWebAudio(arrayBuffer).then(resolve).catch(() => resolve());
                });
            };

            // Trigger load
            audio.load();

            // Timeout fallback
            setTimeout(() => {
                if (currentAudioElement === audio && audio.paused && audio.currentTime === 0) {
                    console.warn('[TTS] Audio timeout, trying Web Audio fallback');
                    cleanup();
                    playWithWebAudio(arrayBuffer).then(resolve).catch(() => resolve());
                }
            }, 5000);

        } catch (e) {
            console.error('[TTS] Playback setup error:', e);
            resolve();
        }
    });
};

const playWithWebAudio = async (arrayBuffer: ArrayBuffer): Promise<void> => {
    console.log('[TTS] Trying Web Audio API fallback');

    return new Promise(async (resolve) => {
        if (isStopped) { resolve(); return; }

        try {
            if (!audioContext) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContext = new AudioContextClass();
            }

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Clone the buffer because decodeAudioData can only be called once per buffer
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            currentAudioSource = source;

            source.onended = () => {
                console.log('[TTS] Web Audio ended');
                currentAudioSource = null;
                resolve();
            };

            source.start(0);
            console.log('[TTS] Web Audio playing');

        } catch (e) {
            console.error('[TTS] Web Audio error:', e);
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
    console.log(`[TTS] Groq: processing ${chunks.length} chunks, isMobile: ${isMobile()}`);

    let started = false;
    let nextAudioPromise: Promise<ArrayBuffer | null> | null = null;

    for (let i = 0; i < chunks.length; i++) {
        if (isStopped) {
            console.log('[TTS] Stopped, breaking out of chunk loop');
            break;
        }

        let audioData: ArrayBuffer | null = null;
        if (nextAudioPromise) {
            audioData = await nextAudioPromise;
            nextAudioPromise = null;
        } else {
            audioData = await fetchGroqAudio(chunks[i], voice);
        }

        // Pre-fetch next chunk while playing current
        if (i + 1 < chunks.length && !isStopped) {
            nextAudioPromise = fetchGroqAudio(chunks[i + 1], voice);
        }

        if (!audioData) {
            console.warn('[TTS] No audio data for chunk', i);
            continue;
        }

        if (!started) {
            started = true;
            console.log('[TTS] Starting playback');
            onStart?.();
        }

        await playAudio(audioData);
    }

    console.log('[TTS] Finished all chunks');
    onEnd?.();
    return started;
};


// --- Browser Fallback ---

const speakWithBrowser = (text: string, gender: VoiceGender, onStart?: () => void, onEnd?: () => void): Promise<boolean> => {
    console.log('[TTS] Using browser speech synthesis');

    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.warn('[TTS] Speech synthesis not available');
            resolve(false);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Get voices (may need to wait for them to load)
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            // Voices not loaded yet, wait a bit
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
            };
        }

        const voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (voice) utterance.voice = voice;
        utterance.rate = 1.0;
        utterance.pitch = gender === 'male' ? 0.95 : 1.0;

        utterance.onstart = () => {
            console.log('[TTS] Browser speech started');
            onStart?.();
        };
        utterance.onend = () => {
            console.log('[TTS] Browser speech ended');
            onEnd?.();
            resolve(true);
        };
        utterance.onerror = (e) => {
            console.error('[TTS] Browser speech error:', e);
            onEnd?.();
            resolve(false);
        };

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
    console.log('[TTS] speak() called, text length:', text.length, 'gender:', gender);

    isStopped = false;

    // Rate limit recovery
    if (groqRateLimited && Date.now() - rateLimitTime > RATE_LIMIT_RECOVERY) {
        groqRateLimited = false;
        console.log('[TTS] Rate limit recovered');
    }

    // Try Groq first
    if (isGroqTTSConfigured() && !groqRateLimited) {
        console.log('[TTS] Using Groq TTS');
        callbacks?.onProviderChange?.('groq');
        const voice = gender === 'male' ? GROQ_VOICES.male : GROQ_VOICES.female;

        const success = await speakWithGroq(text, voice, callbacks?.onStart, callbacks?.onEnd);
        if (success) {
            return { success: true, provider: 'groq' };
        }
        console.warn('[TTS] Groq failed, falling back to browser');
    }

    // Fallback to browser
    console.log('[TTS] Using browser TTS fallback');
    callbacks?.onProviderChange?.('browser');
    const success = await speakWithBrowser(text, gender, callbacks?.onStart, callbacks?.onEnd);
    return { success, provider: success ? 'browser' : 'none' };
};

export const getTTSStatusMessage = (): string => {
    if (isGroqTTSConfigured() && !groqRateLimited) return '🎙️ Groq AI';
    return '🎙️ Browser';
};

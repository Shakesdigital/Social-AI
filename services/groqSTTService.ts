// Groq Speech-to-Text Service using Whisper
// Free tier with generous limits - much better quality than browser STT

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export interface TranscriptionResult {
    text: string;
    success: boolean;
    error?: string;
}

// Check if Groq STT is configured
export const isGroqSTTConfigured = (): boolean => {
    return !!GROQ_API_KEY && GROQ_API_KEY.length > 0;
};

// Convert audio blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Transcribe audio using Groq Whisper
export const transcribeWithGroq = async (audioBlob: Blob): Promise<TranscriptionResult> => {
    if (!isGroqSTTConfigured()) {
        console.log('[Groq STT] API key not configured');
        return { text: '', success: false, error: 'Groq API key not configured' };
    }

    try {
        console.log('[Groq STT] Transcribing audio blob:', audioBlob.size, 'bytes', audioBlob.type);

        // Create form data with the audio file
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('response_format', 'json');
        formData.append('language', 'en');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: formData,
        });

        console.log('[Groq STT] Response status:', response.status);

        if (!response.ok) {
            const error = await response.text();
            console.error('[Groq STT] API error:', error);
            return { text: '', success: false, error: `API error: ${response.status}` };
        }

        const result = await response.json();
        console.log('[Groq STT] Transcription result:', result.text?.substring(0, 50) + '...');

        return {
            text: result.text || '',
            success: true
        };
    } catch (error: any) {
        console.error('[Groq STT] Error:', error);
        return { text: '', success: false, error: error.message };
    }
};

// Record audio from microphone and return blob
export const recordAudio = async (
    onDataAvailable?: (data: Blob) => void,
    maxDurationMs: number = 30000
): Promise<{ blob: Blob; stop: () => void } | null> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        // Check for supported MIME types
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

        console.log('[Groq STT] Using MIME type:', mimeType);

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                onDataAvailable?.(event.data);
            }
        };

        return new Promise((resolve) => {
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                const blob = new Blob(audioChunks, { type: mimeType });
                console.log('[Groq STT] Recording stopped, blob size:', blob.size);
                resolve({ blob, stop: () => { } });
            };

            // Auto-stop after max duration
            const timeout = setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, maxDurationMs);

            const stop = () => {
                clearTimeout(timeout);
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            };

            mediaRecorder.start(1000); // Collect data every second

            // Return immediately with the stop function
            // The promise resolves when recording stops
            resolve({
                blob: new Blob(), // Placeholder, actual blob comes from onstop
                stop
            });
        });
    } catch (error: any) {
        console.error('[Groq STT] Error accessing microphone:', error);
        return null;
    }
};

// High-level function: Record and transcribe in one call
export const recordAndTranscribe = async (
    durationMs: number = 5000,
    onProgress?: (status: string) => void
): Promise<TranscriptionResult> => {
    onProgress?.('Starting recording...');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        onProgress?.('Recording...');
        mediaRecorder.start(100);

        // Wait for specified duration
        await new Promise(resolve => setTimeout(resolve, durationMs));

        // Stop recording
        onProgress?.('Processing...');
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());

        // Wait for final data
        await new Promise(resolve => setTimeout(resolve, 200));

        const blob = new Blob(audioChunks, { type: mimeType });

        if (blob.size < 1000) {
            return { text: '', success: false, error: 'Recording too short' };
        }

        onProgress?.('Transcribing...');
        return await transcribeWithGroq(blob);
    } catch (error: any) {
        console.error('[Groq STT] recordAndTranscribe error:', error);
        return { text: '', success: false, error: error.message };
    }
};

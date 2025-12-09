import React, { useEffect, useRef, useState } from 'react';
import OpenAI from 'openai';
import { Mic, MicOff, Volume2, X } from 'lucide-react';

// Audio Utils
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface LiveAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio handling
  const nextStartTime = useRef(0);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Cleanup function
  const stopSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }
    if (inputAudioContext.current) {
      inputAudioContext.current.close();
      inputAudioContext.current = null;
    }
    if (outputAudioContext.current) {
      outputAudioContext.current.close();
      outputAudioContext.current = null;
    }
    if (sessionRef.current) {
        sessionRef.current.then(session => {
            try { session.close(); } catch(e) { console.log("Session close ignored", e); }
        });
        sessionRef.current = null;
    }

    setIsConnected(false);
    nextStartTime.current = 0;
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
  };

  useEffect(() => {
    if (isOpen && !isConnected) {
      startSession();
    } else if (!isOpen) {
      stopSession();
    }
    return () => {
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startSession = async () => {
    setError(null);
    try {
      const ai = new OpenAI({ 
        apiKey: import.meta.env.VITE_OPENAI_API_KEY || "your-api-key-here",
        dangerouslyAllowBrowser: true
      });
      
      // Initialize Audio Context for output
      outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      setIsConnected(true);
      
      // Use MediaRecorder for capturing audio chunks
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0 || isMuted) return;
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks.length = 0; // Clear chunks
        
        try {
          // Transcribe audio using OpenAI Whisper
          const transcription = await ai.audio.transcriptions.create({
            file: audioBlob as any,
            model: 'whisper-1',
          });
          
          const userText = transcription.text;
          if (!userText.trim()) {
            // Restart recording
            if (isConnected && streamRef.current) {
              mediaRecorder.start();
              setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                }
              }, 3000);
            }
            return;
          }
          
          // Get response from ChatGPT
          const chatResponse = await ai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful, energetic social media marketing consultant named SocialAI. Provide quick, spoken advice to the user about their marketing strategy. Keep answers concise and conversational.'
              },
              {
                role: 'user',
                content: userText
              }
            ],
            temperature: 0.8,
          });
          
          const responseText = chatResponse.choices[0]?.message?.content || "I'm sorry, I didn't catch that.";
          
          // Convert response to speech using OpenAI TTS
          const speechResponse = await ai.audio.speech.create({
            model: 'tts-1',
            voice: 'nova',
            input: responseText,
          });
          
          // Play the audio response
          const audioArrayBuffer = await speechResponse.arrayBuffer();
          if (outputAudioContext.current) {
            const audioBuffer = await outputAudioContext.current.decodeAudioData(audioArrayBuffer);
            const source = outputAudioContext.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.current.destination);
            source.addEventListener('ended', () => {
              // Restart recording after response finishes
              if (isConnected && streamRef.current) {
                mediaRecorder.start();
                setTimeout(() => {
                  if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                  }
                }, 3000);
              }
            });
            source.start();
          }
          
        } catch (error) {
          console.error('Processing error:', error);
          // Restart recording on error
          if (isConnected && streamRef.current) {
            mediaRecorder.start();
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }, 3000);
          }
        }
      };
      
      // Start recording in 3-second chunks
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);
      
      // Store reference for cleanup
      sessionRef.current = Promise.resolve({ 
        close: () => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      });

    } catch (err) {
      console.error(err);
      setError("Failed to initialize session. Please check microphone permissions.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24} /></button>
        <div className="mb-6 flex justify-center">
            <div className={`p-6 rounded-full transition-all duration-500 ${isConnected ? 'bg-green-100 text-green-600 animate-pulse ring-4 ring-green-50' : 'bg-slate-100 text-slate-400'}`}>
                 <Volume2 size={48} />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Live Marketing Consultant</h2>
        <p className="text-slate-500 mb-8 min-h-[1.5em]">{isConnected ? "Listening... Ask me about your strategy!" : error ? <span className="text-red-500">{error}</span> : "Connecting to voice assistant..."}</p>
        <div className="mt-6 text-xs text-slate-400">
           Powered by ChatGPT-4o + Whisper
        </div>
        <div className="flex justify-center gap-4">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-colors shadow-sm ${isMuted ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button onClick={onClose} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200">End Call</button>
        </div>
      </div>
    </div>
  );
};
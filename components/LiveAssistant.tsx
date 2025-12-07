import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
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
    // 1. Stop Microphone Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 2. Disconnect Script Processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }
    
    // 3. Close Audio Contexts
    if (inputAudioContext.current) {
      inputAudioContext.current.close();
      inputAudioContext.current = null;
    }
    if (outputAudioContext.current) {
      outputAudioContext.current.close();
      outputAudioContext.current = null;
    }

    // 4. Close Session
    if (sessionRef.current) {
        sessionRef.current.then(session => {
            try {
                session.close();
            } catch(e) {
                console.log("Session close ignored", e);
            }
        });
        sessionRef.current = null;
    }

    // 5. Reset State
    setIsConnected(false);
    nextStartTime.current = 0;
    sourcesRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      // Input: 16kHz for Gemini
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz for Gemini
      outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = outputAudioContext.current.createGain();
      outputNode.connect(outputAudioContext.current.destination);

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live Session Opened');
            setIsConnected(true);
            
            // Setup Input Stream Processing
            if (!inputAudioContext.current) return;
            const source = inputAudioContext.current.createMediaStreamSource(stream);
            // Buffer size 4096 provides a good balance of latency and stability
            const processor = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              if (sessionRef.current) {
                sessionRef.current.then(session => {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch(e) {
                      console.error("Send input error", e);
                  }
                });
              }
            };

            source.connect(processor);
            processor.connect(inputAudioContext.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContext.current) {
               const ctx = outputAudioContext.current;
               
               // Ensure playback timing is sequential
               nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
               
               const audioBuffer = await decodeAudioData(
                 decode(base64Audio),
                 ctx,
                 24000,
                 1
               );

               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode);
               source.addEventListener('ended', () => {
                 sourcesRef.current.delete(source);
               });
               
               source.start(nextStartTime.current);
               nextStartTime.current += audioBuffer.duration;
               sourcesRef.current.add(source);
            }
          },
          onclose: () => {
            console.log("Session closed from server");
            setIsConnected(false);
          },
          onerror: (e: any) => {
            console.error("Session error received:", e);
            setError("Service unavailable or connection error.");
            setIsConnected(false);
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            // Adding speechConfig is often required to prevent "Service Unavailable"
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: {
                parts: [{ text: "You are a helpful, energetic social media marketing consultant named SocialAI. Provide quick, spoken advice to the user about their marketing strategy. Keep answers concise." }]
            }
        }
      };

      sessionRef.current = ai.live.connect(config);

    } catch (err) {
      console.error(err);
      setError("Failed to initialize session.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>

        <div className="mb-6 flex justify-center">
            <div className={`p-6 rounded-full transition-all duration-500 ${isConnected ? 'bg-green-100 text-green-600 animate-pulse ring-4 ring-green-50' : 'bg-slate-100 text-slate-400'}`}>
                 <Volume2 size={48} />
            </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">Live Marketing Consultant</h2>
        <p className="text-slate-500 mb-8 min-h-[1.5em]">
          {isConnected 
            ? "Listening... Ask me about your strategy!" 
            : error ? <span className="text-red-500">{error}</span> : "Connecting to Gemini Live..."}
        </p>

        <div className="flex justify-center gap-4">
            <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-colors shadow-sm ${isMuted ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600 hover:bg-brand-200'}`}
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button 
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
            >
                End Call
            </button>
        </div>
        
        <div className="mt-6 text-xs text-slate-400">
           Powered by Gemini 2.5 Flash Native Audio
        </div>
      </div>
    </div>
  );
};
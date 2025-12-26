import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, Globe, Loader, MessageCircle, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { callLLM, hasFreeLLMConfigured } from '../services/freeLLMService';
import { searchWeb, getLatestNews, isWebResearchConfigured } from '../services/webResearchService';

interface LiveAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [textInput, setTextInput] = useState('');
  const [useTextMode, setUseTextMode] = useState(false);
  const [micStatus, setMicStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { }
      recognitionRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) { }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsConnected(false);
    setIsListening(false);
    setAudioLevel(0);
  }, []);

  const setupAudioVisualization = async (): Promise<boolean> => {
    try {
      setDebugInfo('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, avg * 2));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      setMicStatus('ok');
      setDebugInfo('Microphone connected!');
      return true;
    } catch (err: any) {
      console.error('Mic error:', err);
      setMicStatus('error');
      if (err.name === 'NotAllowedError') {
        setError('Microphone blocked. Allow permission and reload page.');
      } else {
        setError(`Mic error: ${err.message}. Use text mode instead.`);
      }
      return false;
    }
  };

  const startSession = useCallback(async () => {
    setError(null);

    if (!hasFreeLLMConfigured()) {
      setError('Configure VITE_GROQ_API_KEY in Netlify Environment Variables.');
      setUseTextMode(true);
      setIsConnected(true);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setDebugInfo('Voice not supported in this browser');
      setError('Speech recognition not supported. Use Chrome or Edge.');
      setUseTextMode(true);
      setIsConnected(true);
      return;
    }

    const micOk = await setupAudioVisualization();
    if (!micOk) {
      setUseTextMode(true);
      setIsConnected(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalText = '';
      let processTimer: ReturnType<typeof setTimeout> | null = null;

      recognition.onstart = () => {
        setIsListening(true);
        setDebugInfo('🎤 Listening... speak now!');
        finalText = '';
      };

      recognition.onspeechstart = () => {
        setDebugInfo('🗣️ Speech detected!');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
        setTranscript((finalText + interim).trim());

        if (processTimer) clearTimeout(processTimer);

        if (finalText.trim()) {
          processTimer = setTimeout(() => {
            if (finalText.trim() && !isProcessingRef.current) {
              isProcessingRef.current = true;
              try { recognition.stop(); } catch (e) { }
              handleUserInput(finalText.trim());
              finalText = '';
            }
          }, 2500);
        }
      };

      recognition.onerror = (event: any) => {
        console.log('[Voice] Error:', event.error);
        if (event.error === 'no-speech') {
          setDebugInfo('No speech heard. Try speaking louder.');
          setTimeout(() => {
            if (!isProcessingRef.current && !isMuted) {
              try { recognition.start(); } catch (e) { }
            }
          }, 1000);
        } else if (event.error !== 'aborted') {
          setDebugInfo(`Error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!isProcessingRef.current && !isMuted && isConnected) {
          setTimeout(() => {
            try {
              recognition.start();
              setDebugInfo('🎤 Listening...');
            } catch (e) { }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      setIsConnected(true);
      recognition.start();

    } catch (err: any) {
      setError(`Voice failed: ${err.message}`);
      setUseTextMode(true);
      setIsConnected(true);
    }
  }, [isMuted]);

  const handleUserInput = async (userText: string) => {
    if (!userText.trim()) return;

    setTranscript(userText);
    setIsListening(false);
    setIsThinking(true);
    setDebugInfo('🤔 Thinking...');
    setResponse('');

    try {
      let researchContext = '';
      if (/latest|current|trending|news|2024|2025/i.test(userText) && isWebResearchConfigured()) {
        setDebugInfo('🔍 Researching...');
        const topic = userText.replace(/what|how|tell|give|me|about|the|latest|current/gi, '').trim();
        if (topic) {
          try {
            const [search, news] = await Promise.all([
              searchWeb(topic, 2),
              getLatestNews(topic, 2)
            ]);
            if (search.length || news.length) {
              researchContext = `[Research]\n${news.map(n => n.title).join('\n')}\n${search.map(r => r.title).join('\n')}`;
            }
          } catch (e) { }
        }
      }

      setDebugInfo('💭 Generating response...');

      const history = conversationHistory.slice(-4).map(m =>
        `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`
      ).join('\n');

      const llmResponse = await callLLM(`${history}\n${researchContext}\nUser: ${userText}\n\nRespond in 2-3 short sentences.`, {
        type: 'fast',
        systemPrompt: 'You are a helpful marketing assistant. Keep responses brief for voice output.',
        temperature: 0.8
      });

      const reply = llmResponse.text;
      setResponse(reply);
      setConversationHistory(prev => [...prev, { role: 'user', text: userText }, { role: 'assistant', text: reply }].slice(-10));

      setIsThinking(false);
      await speakResponse(reply);

    } catch (e: any) {
      setResponse('Sorry, an error occurred.');
      setDebugInfo(`Error: ${e.message}`);
      setIsThinking(false);
      isProcessingRef.current = false;
      restartListening();
    }
  };

  const speakResponse = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        isProcessingRef.current = false;
        restartListening();
        resolve();
        return;
      }

      setIsSpeaking(true);
      setDebugInfo('🔊 Speaking...');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        setIsSpeaking(false);
        isProcessingRef.current = false;
        setDebugInfo('🎤 Ready for next question');
        restartListening();
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isProcessingRef.current = false;
        restartListening();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const restartListening = () => {
    if (recognitionRef.current && !isMuted) {
      setTimeout(() => {
        try { recognitionRef.current.start(); } catch (e) { }
      }, 500);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && !isThinking) {
      handleUserInput(textInput.trim());
      setTextInput('');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
      setIsListening(false);
    } else {
      restartListening();
    }
  };

  useEffect(() => {
    if (isOpen && !isConnected) {
      startSession();
    }
  }, [isOpen, isConnected, startSession]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 z-10">
          <X size={24} />
        </button>

        <div className="relative z-10">
          {/* Status */}
          <div className="flex justify-center gap-3 mb-3 text-xs">
            {micStatus === 'ok' && <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} /> Mic OK</span>}
            {micStatus === 'error' && <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> Mic Error</span>}
            {isWebResearchConfigured() && <span className="flex items-center gap-1 text-brand-500"><Globe size={12} /> Web</span>}
          </div>

          {/* Mic visualization */}
          <div className="mb-4 flex justify-center">
            <div className={`relative p-6 rounded-full transition-all ${isListening ? 'bg-green-100 scale-110' :
                isSpeaking ? 'bg-brand-100 animate-pulse' :
                  isThinking ? 'bg-amber-100' : 'bg-slate-100'
              }`}>
              {isListening && (
                <div className="absolute inset-0 rounded-full border-4 border-green-400 transition-transform"
                  style={{ transform: `scale(${1 + audioLevel / 150})`, opacity: audioLevel / 100 }} />
              )}
              {isThinking ? <Loader size={40} className="text-amber-600 animate-spin" /> :
                isSpeaking ? <Volume2 size={40} className="text-brand-600" /> :
                  <Mic size={40} className={isListening ? 'text-green-600' : 'text-slate-400'} />}
            </div>
          </div>

          {/* Audio level */}
          {isListening && (
            <div className="mb-3 px-6">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${audioLevel}%` }} />
              </div>
              <p className="text-center text-xs text-slate-500 mt-1">
                {audioLevel > 15 ? '🎤 Hearing you!' : '🔇 Speak louder'}
              </p>
            </div>
          )}

          {/* Title & status */}
          <h2 className="text-lg font-bold text-slate-800 text-center mb-1 flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-brand-500" /> Voice Assistant
          </h2>
          <p className="text-sm text-center text-slate-500 mb-3">
            {error ? <span className="text-red-500">{error}</span> : debugInfo}
          </p>

          {/* Transcript & response */}
          <div className="min-h-[70px] mb-4 p-3 bg-slate-50 rounded-xl border text-sm">
            {transcript && <div className="mb-2"><span className="text-xs text-slate-400">You:</span><p className="text-slate-700">{transcript}</p></div>}
            {response && <div><span className="text-xs text-brand-500 flex items-center gap-1"><MessageCircle size={10} /> AI:</span><p className="text-slate-700">{response}</p></div>}
            {!transcript && !response && <p className="text-slate-400 text-center italic">{isListening ? 'Listening...' : 'Ask anything!'}</p>}
          </div>

          {/* Text fallback */}
          {(useTextMode || error || micStatus === 'error') && (
            <div className="mb-4 flex gap-2">
              <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Type your question..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              <button onClick={handleTextSubmit} disabled={!textInput.trim() || isThinking}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {micStatus === 'ok' && (
              <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <button onClick={() => setUseTextMode(!useTextMode)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">
              {useTextMode ? '🎤 Voice' : '⌨️ Text'}
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">Close</button>
          </div>

          <p className="mt-4 text-xs text-slate-400 text-center">Works best in Chrome/Edge</p>
        </div>
      </div>
    </div>
  );
};
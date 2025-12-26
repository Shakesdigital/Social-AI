import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, Globe, Loader, MessageCircle, Send, AlertCircle, CheckCircle, Play, Square, Settings } from 'lucide-react';
import { callLLM, hasFreeLLMConfigured } from '../services/freeLLMService';
import { searchWeb, getLatestNews, isWebResearchConfigured } from '../services/webResearchService';
import { getBusinessContext, addToConversation, getRecentConversationContext, getStoredProfile } from '../services/contextMemoryService';

interface LiveAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [textInput, setTextInput] = useState('');
  const [micReady, setMicReady] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const addDiagnostic = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setDiagnostics(prev => [...prev.slice(-20), `[${time}] ${msg}`]);
    console.log('[Voice]', msg);
  };

  // Cleanup
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  // Initialize on open
  useEffect(() => {
    if (isOpen && !isConnected) {
      initialize();
    }
  }, [isOpen, isConnected]);

  // Load voices
  useEffect(() => {
    if (window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setSpeechReady(true);
          addDiagnostic(`Loaded ${voices.length} voices`);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      setTimeout(loadVoices, 500);
    } else {
      addDiagnostic('speechSynthesis not available');
    }
  }, []);

  const cleanup = useCallback(() => {
    stopRecording();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) { }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsConnected(false);
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  const initialize = async () => {
    setError(null);
    setStatus('Checking setup...');
    addDiagnostic('Starting initialization');

    if (!hasFreeLLMConfigured()) {
      setError('Add VITE_GROQ_API_KEY to Netlify environment variables');
      addDiagnostic('No LLM API key found');
      setIsConnected(true);
      return;
    }

    // Check Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addDiagnostic('SpeechRecognition not supported');
      setError('Voice not supported in this browser. Use Chrome or Edge.');
      setIsConnected(true);
      return;
    }
    addDiagnostic('SpeechRecognition available');

    // Request microphone
    try {
      setStatus('Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      addDiagnostic('Microphone access granted');

      // Setup audio visualization
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
        setAudioLevel(Math.min(100, avg * 2.5));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      setMicReady(true);
      setIsConnected(true);
      setStatus('Ready! Hold the mic button and speak.');
      addDiagnostic('Setup complete');

    } catch (err: any) {
      addDiagnostic(`Microphone error: ${err.message}`);
      setError('Microphone access denied. Allow permission and reload.');
      setIsConnected(true);
    }
  };

  const startRecording = () => {
    if (isRecording || isThinking || isSpeaking) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addDiagnostic('Cannot start: no SpeechRecognition');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let fullTranscript = '';

      recognition.onstart = () => {
        addDiagnostic('Recording started');
        setIsRecording(true);
        setTranscript('');
        setStatus('🎤 Listening... Release when done');
        fullTranscript = '';
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
        fullTranscript = final;
        setTranscript((final + interim).trim());
        addDiagnostic(`Heard: "${(final + interim).trim().slice(0, 30)}..."`);
      };

      recognition.onerror = (event: any) => {
        addDiagnostic(`Recognition error: ${event.error}`);
        if (event.error === 'network') {
          setStatus('Network issue. Try again or use text.');
        } else if (event.error === 'no-speech') {
          setStatus('No speech detected. Hold button and speak.');
        } else if (event.error !== 'aborted') {
          setStatus(`Error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        addDiagnostic('Recording ended');
        setIsRecording(false);
        if (fullTranscript.trim()) {
          handleUserInput(fullTranscript.trim());
        } else if (transcript.trim()) {
          handleUserInput(transcript.trim());
        } else {
          setStatus('No speech captured. Try again.');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      addDiagnostic(`Start error: ${err.message}`);
      setError(`Failed to start: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleUserInput = async (userText: string) => {
    if (!userText.trim()) return;

    addDiagnostic(`Processing: "${userText.slice(0, 30)}..."`);
    setTranscript(userText);
    setIsThinking(true);
    setStatus('🤔 Thinking...');
    setResponse('');

    try {
      // Web research if needed
      let researchContext = '';
      if (/latest|current|trending|news|2024|2025/i.test(userText) && isWebResearchConfigured()) {
        setStatus('🔍 Researching...');
        const topic = userText.replace(/what|how|tell|give|me|about|the|latest|current/gi, '').trim();
        if (topic) {
          try {
            const [search, news] = await Promise.all([
              searchWeb(topic, 2),
              getLatestNews(topic, 2)
            ]);
            if (search.length || news.length) {
              researchContext = `[Web Research]\n${news.map(n => n.title).join('\n')}\n${search.map(r => r.title).join('\n')}`;
            }
          } catch (e) { }
        }
      }

      setStatus('💭 Generating response...');

      const businessContext = getBusinessContext();
      const memoryContext = getRecentConversationContext();
      const profile = getStoredProfile();
      const history = conversationHistory.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');

      const llmResponse = await callLLM(`
${businessContext}
${memoryContext}
${history}
${researchContext}
User: ${userText}

Respond in 2-3 short sentences. Be helpful and specific.`, {
        type: 'fast',
        systemPrompt: `You are a helpful voice assistant${profile ? ` for ${profile.name}` : ''}. Keep responses brief (2-3 sentences) for voice output. Be specific and actionable.`,
        temperature: 0.8
      });

      const reply = llmResponse.text;
      addDiagnostic(`Got response: "${reply.slice(0, 30)}..."`);

      setResponse(reply);
      setConversationHistory(prev => [...prev, { role: 'user', text: userText }, { role: 'assistant', text: reply }].slice(-10));
      addToConversation('user', userText);
      addToConversation('assistant', reply);

      setIsThinking(false);

      // Speak response
      await speak(reply);

    } catch (e: any) {
      addDiagnostic(`Error: ${e.message}`);
      setResponse('Sorry, an error occurred.');
      setStatus('Error. Try again.');
      setIsThinking(false);
    }
  };

  const speak = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        addDiagnostic('No speechSynthesis');
        setStatus('Speech not available. See response above.');
        resolve();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      setIsSpeaking(true);
      setStatus('🔊 Speaking...');
      addDiagnostic('Starting speech...');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Get voice
      const voices = window.speechSynthesis.getVoices();
      addDiagnostic(`Available voices: ${voices.length}`);

      if (voices.length > 0) {
        // Prefer natural English voices
        const preferred = voices.find(v =>
          v.name.includes('Google') ||
          v.name.includes('Microsoft') ||
          v.name.includes('Samantha')
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferred) {
          utterance.voice = preferred;
          addDiagnostic(`Using voice: ${preferred.name}`);
        }
      }

      utterance.onstart = () => {
        addDiagnostic('Speech started');
      };

      utterance.onend = () => {
        addDiagnostic('Speech completed');
        setIsSpeaking(false);
        setStatus('✨ Ready! Hold mic to speak.');
        resolve();
      };

      utterance.onerror = (e) => {
        addDiagnostic(`Speech error: ${e.error}`);
        setIsSpeaking(false);
        setStatus('Speech failed. See response above.');
        resolve();
      };

      // Small delay helps on some browsers
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);

          // Chrome workaround: keep speech alive
          const keepAlive = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              clearInterval(keepAlive);
            } else {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            }
          }, 5000);

        } catch (err: any) {
          addDiagnostic(`Speak error: ${err.message}`);
          setIsSpeaking(false);
          resolve();
        }
      }, 50);
    });
  };

  const testSpeech = () => {
    speak("Hello! I'm your voice assistant. If you can hear me, the speech is working correctly.");
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && !isThinking) {
      handleUserInput(textInput.trim());
      setTextInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <span className="font-bold">Voice Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="p-1.5 hover:bg-white/20 rounded">
              <Settings size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Status indicators */}
          <div className="flex justify-center gap-3 mb-4 text-xs">
            <span className={`flex items-center gap-1 ${micReady ? 'text-green-600' : 'text-slate-400'}`}>
              {micReady ? <CheckCircle size={12} /> : <AlertCircle size={12} />} Mic
            </span>
            <span className={`flex items-center gap-1 ${speechReady ? 'text-green-600' : 'text-slate-400'}`}>
              {speechReady ? <CheckCircle size={12} /> : <AlertCircle size={12} />} Speech
            </span>
            {isWebResearchConfigured() && (
              <span className="flex items-center gap-1 text-brand-500"><Globe size={12} /> Web</span>
            )}
          </div>

          {/* Main button */}
          <div className="flex justify-center mb-4">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={!micReady || isThinking || isSpeaking}
              className={`relative w-32 h-32 rounded-full transition-all transform ${isRecording
                  ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
                  : isSpeaking
                    ? 'bg-blue-500 animate-pulse'
                    : isThinking
                      ? 'bg-amber-500'
                      : micReady
                        ? 'bg-brand-600 hover:bg-brand-700 hover:scale-105'
                        : 'bg-slate-300'
                } text-white disabled:opacity-50`}
            >
              {/* Audio level ring */}
              {isRecording && (
                <div
                  className="absolute inset-0 rounded-full border-4 border-white transition-transform"
                  style={{ transform: `scale(${1 + audioLevel / 100})`, opacity: 0.5 }}
                />
              )}

              {isThinking ? (
                <Loader size={48} className="mx-auto animate-spin" />
              ) : isSpeaking ? (
                <Volume2 size={48} className="mx-auto" />
              ) : isRecording ? (
                <Square size={48} className="mx-auto" />
              ) : (
                <Mic size={48} className="mx-auto" />
              )}
            </button>
          </div>

          {/* Instructions */}
          <p className="text-center text-sm font-medium text-slate-700 mb-2">
            {isRecording ? '🎤 Recording... Release to send' :
              isSpeaking ? '🔊 Speaking...' :
                isThinking ? '🤔 Thinking...' :
                  'Hold the button and speak'}
          </p>

          {/* Audio level bar */}
          {isRecording && (
            <div className="mb-4 px-4">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all" style={{ width: `${audioLevel}%` }} />
              </div>
              <p className="text-center text-xs text-slate-500 mt-1">
                {audioLevel > 20 ? '✓ Hearing you!' : 'Speak louder...'}
              </p>
            </div>
          )}

          {/* Status */}
          <p className="text-center text-sm text-slate-500 mb-4">
            {error ? <span className="text-red-500">{error}</span> : status}
          </p>

          {/* Conversation */}
          <div className="min-h-[80px] max-h-[120px] overflow-y-auto mb-4 p-3 bg-slate-50 rounded-xl border text-sm">
            {transcript && (
              <div className="mb-2">
                <span className="text-xs text-slate-400">You:</span>
                <p className="text-slate-700">{transcript}</p>
              </div>
            )}
            {response && (
              <div>
                <span className="text-xs text-brand-500 flex items-center gap-1">
                  <MessageCircle size={10} /> AI:
                </span>
                <p className="text-slate-700">{response}</p>
              </div>
            )}
            {!transcript && !response && (
              <p className="text-slate-400 text-center italic">
                Hold the mic button and speak, or type below
              </p>
            )}
          </div>

          {/* Text input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Or type here..."
              disabled={isThinking}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-slate-100"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isThinking}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50 hover:bg-brand-700"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Test & Help buttons */}
          <div className="flex justify-center gap-2 mb-2">
            <button
              onClick={testSpeech}
              disabled={!speechReady || isSpeaking}
              className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
            >
              <Play size={12} className="inline mr-1" /> Test Speaker
            </button>
          </div>

          {/* Diagnostics panel */}
          {showDiagnostics && (
            <div className="mt-4 p-3 bg-slate-100 rounded-lg text-xs max-h-[150px] overflow-y-auto">
              <p className="font-bold mb-2">Diagnostics:</p>
              {diagnostics.length === 0 ? (
                <p className="text-slate-500">No logs yet</p>
              ) : (
                diagnostics.map((d, i) => (
                  <p key={i} className="text-slate-600 font-mono">{d}</p>
                ))
              )}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-3">
            Best in Chrome/Edge • Push-to-talk style
          </p>
        </div>
      </div>
    </div>
  );
};
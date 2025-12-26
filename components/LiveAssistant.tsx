import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, Globe, Loader, MessageCircle, StopCircle } from 'lucide-react';
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

  // Use refs to track current state for callbacks (avoids stale closures)
  const isConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const isThinkingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const shouldRestartRef = useRef(true);
  const recognitionRef = useRef<any>(null);

  // Keep refs in sync with state
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
    return () => stopSession();
  }, [isOpen]);

  const stopSession = useCallback(() => {
    shouldRestartRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) { }
      recognitionRef.current = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsConnected(false);
    setIsListening(false);
    setIsThinking(false);
    setIsSpeaking(false);
    setTranscript('');
    setResponse('');
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && isConnectedRef.current && !isMutedRef.current && !isThinkingRef.current && !isSpeakingRef.current) {
      try {
        recognitionRef.current.start();
        console.log('[Voice] Started listening');
      } catch (e: any) {
        // Already started, ignore
        if (e.message !== 'Failed to execute \'start\' on \'SpeechRecognition\': recognition has already started.') {
          console.error('[Voice] Start error:', e);
        }
      }
    }
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    shouldRestartRef.current = true;

    if (!hasFreeLLMConfigured()) {
      setError('Please configure an LLM API key (Groq recommended) in your environment variables.');
      return;
    }

    // Check for browser speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();

      // KEY FIX: Enable continuous mode so it doesn't stop after one phrase
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let silenceTimer: NodeJS.Timeout | null = null;

      recognition.onstart = () => {
        console.log('[Voice] Recognition started');
        setIsListening(true);
        setTranscript('');
        finalTranscript = '';
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Show what they're saying in real-time
        setTranscript(finalTranscript + interimTranscript);

        // Reset silence timer on any speech
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }

        // Wait for 2 seconds of silence after final result before processing
        if (finalTranscript.trim()) {
          silenceTimer = setTimeout(() => {
            if (finalTranscript.trim() && shouldRestartRef.current) {
              console.log('[Voice] Processing after silence:', finalTranscript.trim());
              // Stop listening while we process
              try {
                recognition.stop();
              } catch (e) { }
              handleUserInput(finalTranscript.trim());
              finalTranscript = '';
            }
          }, 2000); // 2 seconds of silence = user is done speaking
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[Voice] Recognition error:', event.error);

        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone permissions.');
          shouldRestartRef.current = false;
        } else if (event.error === 'no-speech') {
          // No speech detected - this is normal, just restart
          console.log('[Voice] No speech detected, will restart');
        } else if (event.error === 'aborted') {
          // Manually aborted, don't restart
          console.log('[Voice] Recognition aborted');
        }

        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('[Voice] Recognition ended');
        setIsListening(false);

        // Auto-restart if we should
        if (shouldRestartRef.current && isConnectedRef.current && !isMutedRef.current && !isThinkingRef.current && !isSpeakingRef.current) {
          console.log('[Voice] Auto-restarting...');
          setTimeout(() => {
            if (shouldRestartRef.current) {
              startListening();
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      setIsConnected(true);
      isConnectedRef.current = true;

      // Start listening
      recognition.start();

    } catch (err) {
      console.error('Failed to start:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  }, [startListening]);

  const handleUserInput = async (userText: string) => {
    if (!userText.trim() || isMutedRef.current) return;

    console.log('[Voice] Processing input:', userText);

    setIsListening(false);
    setIsThinking(true);
    isThinkingRef.current = true;
    setResponse('');

    try {
      // Check if we need real-time research
      let researchContext = '';
      const needsResearch = /latest|current|trending|news|today|right now|2024|2025|recent/i.test(userText);

      if (needsResearch && isWebResearchConfigured()) {
        const topic = userText.replace(/what|how|tell me about|give me|the|latest|current|trending/gi, '').trim();
        if (topic) {
          const [searchResults, news] = await Promise.all([
            searchWeb(topic, 2),
            getLatestNews(topic, 2)
          ]);

          if (searchResults.length > 0 || news.length > 0) {
            researchContext = `
[Current Data from Web Research]
${news.map(n => `• ${n.title}`).join('\n')}
${searchResults.map(r => `• ${r.title}`).join('\n')}
`;
          }
        }
      }

      // Build context from recent conversation
      const recentHistory = conversationHistory.slice(-4).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`
      ).join('\n');

      const prompt = `
${recentHistory}
${researchContext}
User: ${userText}

Respond as a helpful voice assistant. Keep responses concise (2-3 sentences max) but valuable. Be conversational and energetic.`;

      const llmResponse = await callLLM(prompt, {
        type: 'fast',
        systemPrompt: `You are SocialAI Voice Assistant - a brilliant, enthusiastic marketing consultant speaking to the user.

VOICE RESPONSE RULES:
- Keep responses SHORT (2-3 sentences max) - this will be spoken aloud
- Be conversational and energetic
- Give specific, actionable advice
- Sound natural, not robotic
- If you have research data, mention key insights briefly

Your expertise: social media, content marketing, email outreach, SEO, lead generation, brand strategy.`,
        temperature: 0.85
      });

      const assistantText = llmResponse.text;
      setResponse(assistantText);

      // Update history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userText },
        { role: 'assistant', text: assistantText }
      ].slice(-10));

      // Speak the response
      setIsThinking(false);
      isThinkingRef.current = false;
      await speakResponse(assistantText);

    } catch (e) {
      console.error('Processing error:', e);
      const errorMsg = 'Sorry, I encountered an error. Please try again.';
      setResponse(errorMsg);
      setIsThinking(false);
      isThinkingRef.current = false;
      await speakResponse(errorMsg);
    }
  };

  const speakResponse = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        // No speech synthesis, just restart listening
        setTimeout(() => {
          if (shouldRestartRef.current) {
            startListening();
          }
        }, 500);
        resolve();
        return;
      }

      setIsSpeaking(true);
      isSpeakingRef.current = true;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to get a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Google US English Female') ||
        v.name.includes('Microsoft Zira') ||
        v.name.includes('Google UK English Female') ||
        (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
      ) || voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en')) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        console.log('[Voice] Speech ended, restarting listening');
        setIsSpeaking(false);
        isSpeakingRef.current = false;

        // Restart listening after speaking
        if (shouldRestartRef.current && !isMutedRef.current) {
          setTimeout(() => {
            startListening();
          }, 500);
        }
        resolve();
      };

      utterance.onerror = (e) => {
        console.error('[Voice] Speech error:', e);
        setIsSpeaking(false);
        isSpeakingRef.current = false;

        // Restart listening even on error
        if (shouldRestartRef.current && !isMutedRef.current) {
          setTimeout(() => {
            startListening();
          }, 500);
        }
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;

    if (newMuted) {
      // Muting - stop listening and speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsListening(false);
      setIsSpeaking(false);
    } else {
      // Unmuting - restart listening
      setTimeout(() => {
        startListening();
      }, 300);
    }
  };

  const handleManualStop = () => {
    // User manually wants to stop and process what they said
    if (transcript.trim() && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
      handleUserInput(transcript.trim());
    }
  };

  useEffect(() => {
    if (isOpen && !isConnected) {
      startSession();
    }
  }, [isOpen, isConnected, startSession]);

  // Load voices when component mounts
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  if (!isOpen) return null;

  const getStatusMessage = () => {
    if (error) return <span className="text-red-400">{error}</span>;
    if (!isConnected) return 'Connecting...';
    if (isThinking) return 'Thinking...';
    if (isSpeaking) return 'Speaking...';
    if (isListening) return 'Listening... speak now!';
    if (isMuted) return 'Muted - tap mic to unmute';
    return 'Ready';
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-500';
    if (isThinking) return 'bg-amber-500';
    if (isSpeaking) return 'bg-brand-500';
    if (isListening) return 'bg-green-500';
    return 'bg-slate-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-indigo-50 opacity-50"></div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="relative z-10">
          {/* Voice visualization */}
          <div className="mb-6 flex justify-center">
            <div className={`relative p-8 rounded-full transition-all duration-500 ${isListening ? 'bg-green-100 ring-4 ring-green-200 scale-110' :
                isSpeaking ? 'bg-brand-100 ring-4 ring-brand-200 animate-pulse' :
                  isThinking ? 'bg-amber-100 ring-4 ring-amber-200' :
                    'bg-slate-100'
              }`}>
              {isThinking ? (
                <Loader size={48} className="text-amber-600 animate-spin" />
              ) : isSpeaking ? (
                <Volume2 size={48} className="text-brand-600" />
              ) : (
                <Mic size={48} className={isListening ? 'text-green-600' : 'text-slate-400'} />
              )}

              {/* Pulse rings when listening */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25"></span>
                  <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25" style={{ animationDelay: '0.5s' }}></span>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-800 mb-1 flex items-center justify-center gap-2">
            <Sparkles size={20} className="text-brand-500" />
            Voice Marketing Consultant
          </h2>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className={`w-2 h-2 rounded-full ${getStatusColor()} ${(isListening || isSpeaking) ? 'animate-pulse' : ''}`}></span>
            <p className="text-slate-500 text-sm">{getStatusMessage()}</p>
            {isWebResearchConfigured() && (
              <span className="flex items-center gap-1 text-xs text-brand-500">
                <Globe size={10} /> Live
              </span>
            )}
          </div>

          {/* Transcript / Response display */}
          <div className="min-h-[100px] mb-6 p-4 bg-white/80 rounded-xl border border-slate-200">
            {transcript && (
              <div className="text-left mb-3">
                <p className="text-xs text-slate-400 mb-1">You said:</p>
                <p className="text-sm text-slate-700">{transcript}</p>
              </div>
            )}
            {response && !isListening && (
              <div className="text-left">
                <p className="text-xs text-brand-500 mb-1 flex items-center gap-1">
                  <MessageCircle size={10} /> Assistant:
                </p>
                <p className="text-sm text-slate-700">{response}</p>
              </div>
            )}
            {!transcript && !response && isConnected && !error && (
              <p className="text-slate-400 text-sm italic">
                {isListening ? 'Listening... start speaking!' : 'Ask me anything about marketing!'}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all shadow-sm ${isMuted ? 'bg-red-100 text-red-600 ring-2 ring-red-200' : 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {isListening && transcript && (
              <button
                onClick={handleManualStop}
                className="p-4 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-all shadow-sm"
                title="Done speaking - process now"
              >
                <StopCircle size={24} />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
            >
              End Session
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-xs text-slate-400">
            <p>💡 Tip: Pause for 2 seconds when done speaking, or tap the stop button</p>
          </div>

          {/* Footer */}
          <div className="mt-4 text-xs text-slate-400">
            Powered by Free AI + Browser Speech API
          </div>
        </div>
      </div>
    </div>
  );
};
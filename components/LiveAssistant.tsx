import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, Globe, Loader, MessageCircle } from 'lucide-react';
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

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
    return () => stopSession();
  }, [isOpen]);

  const stopSession = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
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
  };

  const startSession = async () => {
    setError(null);

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
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        setTranscript(transcriptText);

        if (result.isFinal) {
          handleUserInput(transcriptText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone permissions.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto-restart if still connected and not processing
        if (isConnected && !isThinking && !isSpeaking && !isMuted) {
          setTimeout(() => {
            if (recognitionRef.current && isConnected) {
              try {
                recognitionRef.current.start();
              } catch (e) { }
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      setIsConnected(true);
      recognition.start();

    } catch (err) {
      console.error('Failed to start:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const handleUserInput = async (userText: string) => {
    if (!userText.trim() || isMuted) return;

    setIsListening(false);
    setIsThinking(true);
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
      await speakResponse(assistantText);

    } catch (e) {
      console.error('Processing error:', e);
      const errorMsg = 'Sorry, I encountered an error. Please try again.';
      setResponse(errorMsg);
      await speakResponse(errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const speakResponse = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to get a female voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Google US English Female') ||
        v.name.includes('Microsoft Zira') ||
        (v.lang === 'en-US' && v.name.toLowerCase().includes('female'))
      ) || voices.find(v => v.lang === 'en-US') || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        // Restart listening after speaking
        if (recognitionRef.current && isConnected && !isMuted) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (e) { }
          }, 300);
        }
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      // Muting - stop listening
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      // Unmuting - restart listening
      if (recognitionRef.current && isConnected) {
        setTimeout(() => {
          try { recognitionRef.current.start(); } catch (e) { }
        }, 300);
      }
    }
  };

  useEffect(() => {
    if (isOpen && !isConnected) {
      startSession();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusMessage = () => {
    if (error) return <span className="text-red-400">{error}</span>;
    if (!isConnected) return 'Connecting...';
    if (isThinking) return 'Thinking...';
    if (isSpeaking) return 'Speaking...';
    if (isListening) return 'Listening... speak now!';
    if (isMuted) return 'Muted';
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
          <div className="min-h-[80px] mb-6 p-4 bg-white/80 rounded-xl border border-slate-200">
            {transcript && isListening && (
              <div className="text-left">
                <p className="text-xs text-slate-400 mb-1">You:</p>
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
            {!transcript && !response && isConnected && (
              <p className="text-slate-400 text-sm italic">
                {isListening ? 'Listening for your question...' : 'Ask me anything about marketing!'}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all shadow-sm ${isMuted ? 'bg-red-100 text-red-600 ring-2 ring-red-200' : 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                }`}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
            >
              End Session
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-xs text-slate-400">
            Powered by Free AI + Browser Speech API
          </div>
        </div>
      </div>
    </div>
  );
};
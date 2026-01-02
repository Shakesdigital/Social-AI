import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, ChevronDown, Sparkles, Globe, TrendingUp, Users, Mail, FileText, Search, Zap, Lightbulb, Mic, MicOff, Square, Trash2 } from 'lucide-react';
import { callLLM, hasFreeLLMConfigured, AllProvidersFailedError } from '../services/freeLLMService';
import { searchWeb, searchWebValidated, searchForOutreach, getLatestNews, isWebResearchConfigured } from '../services/webResearchService';
import { getBusinessContext, addToConversation, getRecentConversationContext, getStoredProfile } from '../services/contextMemoryService';
import { speak as ttsSpeak, stopSpeaking as ttsStopSpeaking, unlockMobileAudio } from '../services/enhancedTTSService';

interface Message {
  role: 'user' | 'model';
  text: string;
  isResearching?: boolean;
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

const CHAT_STORAGE_KEY = 'marketmi_chat_history';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Load chat history from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('[ChatBot] Failed to load chat history');
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(() => {
    return localStorage.getItem('marketmi_voice_mode') === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Toggle voice mode - stops speaking when disabled
  const toggleVoiceMode = () => {
    const newState = !voiceModeEnabled;
    setVoiceModeEnabled(newState);
    localStorage.setItem('marketmi_voice_mode', String(newState));

    if (!newState) {
      // Turning OFF - stop any speaking
      ttsStopSpeaking();
      setIsSpeaking(false);
    } else {
      // Turning ON - unlock mobile audio
      unlockMobileAudio();
    }
  };

  // Start/stop voice recording
  const toggleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    // Start recording
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsRecording(true);
      setInput('🎤 Listening...');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setInput(finalTranscript || interim || '🎤 Listening...');
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
        // Auto-send if voice mode is enabled
        if (voiceModeEnabled) {
          setTimeout(() => handleSend(finalTranscript.trim()), 100);
        }
      } else {
        setInput('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Error:', event.error);
      setIsRecording(false);
      setInput('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Stop AI from speaking
  const stopSpeaking = () => {
    ttsStopSpeaking();
    setIsSpeaking(false);
  };

  // Speak AI response when voice mode is on
  const speakResponse = async (text: string) => {
    // Check both state and localStorage for consistency
    const isVoiceOn = voiceModeEnabled || localStorage.getItem('marketmi_voice_mode') === 'true';

    if (isVoiceOn) {
      setIsSpeaking(true);
      try {
        await ttsSpeak(text, 'female', {
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
      } catch (e) {
        console.error('[ChatBot] TTS error:', e);
        setIsSpeaking(false);
      }
    }
  };

  const quickActions: QuickAction[] = [
    { icon: <TrendingUp size={14} />, label: 'Trending Topics', prompt: 'What are the top marketing trends right now?' },
    { icon: <Lightbulb size={14} />, label: 'Content Ideas', prompt: 'Give me 5 viral social media post ideas for my business' },
    { icon: <Mail size={14} />, label: 'Email Tips', prompt: 'What makes a cold email stand out and get responses?' },
    { icon: <Search size={14} />, label: 'SEO Strategy', prompt: 'How can I improve my website SEO quickly?' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.warn('[ChatBot] Failed to save chat history');
      }
    }
  }, [messages]);

  // Clear all chat history
  const clearChatHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    ttsStopSpeaking();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSend = async (customPrompt?: string) => {
    const messageText = customPrompt || input;
    if (!messageText.trim() || isLoading) return;

    if (!customPrompt) {
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    setMessages(prev => [...prev, { role: 'user', text: messageText }]);
    setIsLoading(true);

    try {
      // Get business context from memory
      const businessContext = getBusinessContext();
      const memoryContext = getRecentConversationContext();
      const profile = getStoredProfile();

      // Detect if user is asking about current/real-time data
      const needsResearch = /latest|current|trending|news|today|right now|2024|2025|recent/i.test(messageText);
      // Detect if user is asking about leads, contacts, outreach
      const needsOutreach = /leads|contact|outreach|email|partner|collaborate|competitor|agencies|companies|businesses/i.test(messageText);
      let researchContext = '';

      if ((needsResearch || needsOutreach) && isWebResearchConfigured()) {
        setIsResearching(true);

        // Extract topic for research
        const topic = messageText.replace(/what|how|tell me about|give me|the|latest|current|trending|find|search/gi, '').trim();

        if (topic) {
          try {
            if (needsOutreach) {
              // Use outreach search to get leads with contact info
              const [leads, news] = await Promise.all([
                searchForOutreach(topic, 5),
                getLatestNews(topic, 2)
              ]);

              if (leads.length > 0) {
                researchContext = `
[OUTREACH LEADS WITH VERIFIED CONTACT INFO]
${leads.map(l => `
• ${l.name}
  Website: ${l.website} (Active ✓)
  ${l.contactInfo.emails?.length ? `Emails: ${l.contactInfo.emails.join(', ')}` : ''}
  ${l.contactInfo.phones?.length ? `Phones: ${l.contactInfo.phones.join(', ')}` : ''}
  ${Object.keys(l.contactInfo.socialLinks || {}).length ? `Social: ${Object.entries(l.contactInfo.socialLinks).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}` : ''}
  Confidence: ${l.confidence}
`).join('')}
${news.length > 0 ? `\nLatest News:\n${news.map(n => `• ${n.title} (${n.source})`).join('\n')}` : ''}
`;
              }
            } else {
              // Use validated search for general research
              const [searchResults, news] = await Promise.all([
                searchWebValidated(topic, 5, { validateUrls: true, extractContacts: true }),
                getLatestNews(topic, 2)
              ]);

              if (searchResults.length > 0 || news.length > 0) {
                researchContext = `
[REAL-TIME RESEARCH DATA - Verified Active Sources]
${news.length > 0 ? `Latest News:\n${news.map(n => `• ${n.title} (${n.source})`).join('\n')}` : ''}
${searchResults.length > 0 ? `Web Sources:\n${searchResults.map(r =>
                  `• ${r.title}: ${r.snippet}${r.contacts?.emails?.length ? ` [Contact: ${r.contacts.emails[0]}]` : ''}`
                ).join('\n')}` : ''}
`;
              }
            }
          } catch (e) {
            console.error('[ChatBot] Research failed:', e);
          }
        }
        setIsResearching(false);
      }

      // Build conversation context
      const conversationHistory = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`
      ).join('\n');

      const prompt = `
${businessContext}

${memoryContext}

${conversationHistory}
${researchContext}
User: ${messageText}

Provide expert-level marketing advice. Be strategic, data-driven, and actionable. Reference proven frameworks when relevant.`;

      const response = await callLLM(prompt, {
        type: 'fast',
        systemPrompt: `You are a Senior Digital Marketing Strategist with over 10 years of experience working with Fortune 500 companies and high-growth startups.

${profile ? `You are advising "${profile.name}" in the ${profile.industry} industry.
Target Audience: ${profile.targetAudience}
Business Goals: ${profile.goals}
Brand Voice: ${profile.brandVoice}` : ''}

YOUR EXPERTISE:
• Market Research & Competitive Analysis - Identifying opportunities, analyzing competitors, understanding customer psychology
• Strategic Marketing Planning - Data-driven strategies that deliver measurable ROI
• Content Marketing & SEO - Compelling content that ranks, converts, and builds authority
• Lead Generation & Nurturing - Building pipelines through targeted outreach and conversion optimization
• Email Marketing - High-converting sequences using proven copywriting frameworks (AIDA, PAS, BAB)
• Marketing Analytics - Measuring what matters and optimizing for results

YOUR APPROACH:
1. Goal-Focused - Every recommendation ties back to their business objectives
2. Data-Driven - Back insights with research, trends, and proven frameworks
3. Practical - Provide actionable steps, not just theory
4. Strategic - Think long-term while delivering quick wins
5. Results-Oriented - Focus on metrics that matter: leads, conversions, revenue

COMMUNICATION STYLE:
- Speak to them as their trusted marketing advisor (never "we" as if you're their business)
- Be confident and knowledgeable, but conversational and approachable
- Give SPECIFIC advice tailored to their business, not generic tips
- Reference industry benchmarks, best practices, or case studies when relevant
- If you have research data, cite it naturally and explain its implications
- Challenge assumptions politely when you see potential issues
- End responses with clear next steps when appropriate
- Do not use decorative stars (✨) or markdown asterisks (like **text**) for bolding. Keep text clean and plain.`,
        temperature: 0.75
      });

      // Start speaking IMMEDIATELY (don't wait for state updates)
      speakResponse(response.text);

      // Store in memory for future context
      addToConversation('user', messageText);
      addToConversation('assistant', response.text);

      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (e: any) {
      console.error('Chat error:', e);

      // Handle graceful degradation for all providers failing
      if (e instanceof AllProvidersFailedError) {
        // Show friendly retry message
        setMessages(prev => [...prev, {
          role: 'model',
          text: "Taking a quick breather — trying again..."
        }]);

        // Auto-retry after 3 seconds
        setTimeout(async () => {
          try {
            const retryResponse = await callLLM(prompt, {
              type: 'fast',
              systemPrompt: `You are Market MI Assistant - a brilliant, friendly marketing consultant who gives practical advice.
${profile ? `You are helping ${profile.name} in the ${profile.industry} industry.` : ''}
Give specific, actionable advice. Be concise but comprehensive. Do not use asterisks or decorative formatting.`,
              temperature: 0.8
            });

            // Add speech to retry success path too
            speakResponse(retryResponse.text);

            addToConversation('assistant', retryResponse.text);
            // Remove the "breather" message and add the actual response
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: 'model', text: retryResponse.text }
            ]);
          } catch (retryError) {
            console.error('Retry also failed:', retryError);
            // Replace "breather" message with apologetic message
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: 'model', text: "I'm having a bit of trouble connecting right now. Please try again in a moment! 🙏" }
            ]);
          }
        }, 3000);
      } else if (!hasFreeLLMConfigured()) {
        setMessages(prev => [...prev, {
          role: 'model',
          text: "Please configure an LLM API key (Groq recommended) to enable the chat assistant."
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'model',
          text: "I encountered a hiccup processing your request. Let me try that again..."
        }]);
      }
    } finally {
      setIsLoading(false);
      setIsResearching(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 z-40 transform flex items-center gap-2 ${isOpen ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'
          }`}
        aria-label="Open Chat"
      >
        <MessageSquare size={22} />
        <span className="font-semibold text-sm">Chat With Me</span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed z-50 bg-white shadow-2xl flex flex-col border border-slate-200 transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1) overflow-hidden origin-bottom-right
        ${isOpen
            ? 'opacity-100 scale-100 bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[650px] sm:rounded-2xl'
            : 'opacity-0 scale-0 bottom-6 right-6 w-12 h-12 rounded-full pointer-events-none'
          }`}
      >
        {/* Header */}
        <div
          className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-4 flex justify-between items-center shrink-0 cursor-pointer sm:rounded-t-2xl"
          onClick={() => setIsOpen(false)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5">
              <img src="/market-mi-logo.png" alt="Market MI" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">Market MI Assistant</span>
              <span className="text-xs text-brand-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                {hasFreeLLMConfigured() ? 'Ready to help' : 'API key needed'}
                {isWebResearchConfigured() && <Globe size={10} className="ml-1" />}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Clear Chat Button - only show when there are messages */}
            {messages.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearChatHistory(); }}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Clear Chat"
                title="Clear all chat history"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              aria-label="Minimize Chat"
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center animate-in fade-in duration-500 pt-4">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <Zap size={32} />
              </div>
              <p className="font-bold text-slate-800 text-lg">Hi! I'm your marketing agent</p>
              <p className="text-sm text-slate-500 text-center mt-1 mb-4">Ask me anything about marketing, content, leads, or strategy</p>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(action.prompt)}
                    className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50 transition-all text-left"
                  >
                    <span className="text-brand-500">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user'
                ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-br-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}

          {(isLoading || isResearching) && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl rounded-bl-sm shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                  {isResearching ? (
                    <>
                      <Globe size={14} className="text-brand-500 animate-pulse" />
                      <span className="text-xs text-slate-500">Researching the web...</span>
                    </>
                  ) : (
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                      <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 sm:rounded-b-2xl">
          {/* Voice Mode Toggle */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={toggleVoiceMode}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors ${voiceModeEnabled
                ? 'bg-brand-100 text-brand-700 font-medium'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {voiceModeEnabled ? <Mic size={12} /> : <MicOff size={12} />}
              <span>{voiceModeEnabled ? 'Voice Mode ON' : 'Voice Mode OFF'}</span>
            </button>

            {/* Stop Speaking button - appears when AI is speaking */}
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors animate-pulse"
              >
                <Square size={10} className="fill-current" />
                <span>Stop Speaking</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-100 focus-within:border-brand-400 transition-all">
            {/* Mic Button */}
            <button
              onClick={toggleVoiceInput}
              disabled={isLoading}
              className={`p-2.5 rounded-lg transition-all mb-0.5 ${isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-200 text-slate-600 hover:bg-brand-100 hover:text-brand-600'
                } disabled:opacity-50`}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isRecording ? '🎤 Listening...' : 'Ask me anything about marketing...'}
              className="flex-1 bg-transparent border-none text-sm focus:ring-0 resize-none max-h-32 py-2 px-1 outline-none"
              rows={1}
              style={{ minHeight: '24px' }}
              disabled={isRecording}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-0.5 shadow-sm"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-center mt-2 flex items-center justify-center gap-2">
            <p className="text-[10px] text-slate-400">
              Powered by <a href="https://www.shakesdigital.com" target="_blank" rel="noopener noreferrer" className="font-bold text-brand-500 hover:underline">Shakes Digital</a>
              {isWebResearchConfigured() && (
                <span className="inline-flex items-center gap-1 ml-1 text-brand-500">
                  <Globe size={8} /> + Web Research
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
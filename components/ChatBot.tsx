import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, ChevronDown, Sparkles, Globe, TrendingUp, Users, Mail, FileText, Search, Zap, Lightbulb } from 'lucide-react';
import { callLLM, hasFreeLLMConfigured, AllProvidersFailedError } from '../services/freeLLMService';
import { searchWeb, searchWebValidated, searchForOutreach, getLatestNews, isWebResearchConfigured } from '../services/webResearchService';
import { getBusinessContext, addToConversation, getRecentConversationContext, getStoredProfile } from '../services/contextMemoryService';

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

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

Provide a helpful, specific, and actionable response based on the business profile. Be conversational but substantive.`;

      const response = await callLLM(prompt, {
        type: 'fast',
        systemPrompt: `You are Market MI Assistant - a brilliant, friendly marketing consultant who gives practical advice.

${profile ? `You are helping ${profile.name} in the ${profile.industry} industry. Their target audience is ${profile.targetAudience}.` : ''}

Your personality:
- Enthusiastic but professional
- Give specific, actionable advice (not generic tips)
- Reference the user's business when giving recommendations
- Use examples when helpful
- Be concise but comprehensive
- If you have research data, cite it naturally

Your expertise:
- Social media marketing & content strategy
- Email marketing & lead generation
- SEO & content writing
- Brand building & audience growth
- Marketing trends & tools

Always aim to HELP the user take action, not just inform them. Be specific to their business.`,
        temperature: 0.8
      });

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
Give specific, actionable advice. Be concise but comprehensive.`,
              temperature: 0.8
            });

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
        className={`fixed bottom-6 right-6 p-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 z-40 transform ${isOpen ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'
          }`}
        aria-label="Open Chat"
      >
        <MessageSquare size={24} />
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
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Minimize Chat"
          >
            <ChevronDown size={20} />
          </button>
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
          <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-100 focus-within:border-brand-400 transition-all">
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
              placeholder="Ask me anything about marketing..."
              className="flex-1 bg-transparent border-none text-sm focus:ring-0 resize-none max-h-32 py-2 px-1 outline-none"
              rows={1}
              style={{ minHeight: '24px' }}
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
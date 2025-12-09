import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, ChevronDown } from 'lucide-react';
import { sendChatMessage } from '../services/openaiService';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Format history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await sendChatMessage(history, userMsg);
      if (response) {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-all duration-300 z-40 transform ${
          isOpen ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'
        }`}
        aria-label="Open Chat"
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed z-50 bg-white shadow-2xl flex flex-col border border-slate-200 transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1) overflow-hidden origin-bottom-right
        ${isOpen 
          ? 'opacity-100 scale-100 bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] sm:rounded-xl' 
          : 'opacity-0 scale-0 bottom-6 right-6 w-12 h-12 rounded-full pointer-events-none'
        }`}
      >
          {/* Header */}
          <div 
            className="bg-brand-600 text-white p-4 flex justify-between items-center shrink-0 cursor-pointer sm:rounded-t-xl" 
            onClick={() => setIsOpen(false)}
          >
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <div className="flex flex-col">
                  <span className="font-semibold text-sm">SocialAI Assistant</span>
                  <span className="text-xs text-brand-100 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online
                  </span>
              </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                className="hover:bg-brand-700 p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
                aria-label="Minimize Chat"
            >
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 mt-20 flex flex-col items-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-brand-100 text-brand-500 rounded-full flex items-center justify-center mb-4">
                    <Bot size={32} />
                </div>
                <p className="font-medium text-slate-600">How can I help you?</p>
                <p className="text-sm mt-1">Ask about strategies, captions, or trends.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-200">
                    <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                    </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200 sm:rounded-b-xl">
            <div className="flex gap-2 items-end bg-slate-50 border border-slate-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-100 focus-within:border-brand-400 transition-all">
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
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none text-sm focus:ring-0 resize-none max-h-32 py-2 px-1"
                rows={1}
                style={{minHeight: '24px'}} 
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5 shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="text-center mt-2">
                 <p className="text-[10px] text-slate-400">Powered by Gemini 3 Pro</p>
            </div>
          </div>
      </div>
    </>
  );
};
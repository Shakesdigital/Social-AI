import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, ChevronDown, ChevronUp, Loader, Sparkles, Volume2, Square } from 'lucide-react';
import { callLLM } from '../services/freeLLMService';
import { getStoredProfile } from '../services/contextMemoryService';
import { speak as ttsSpeak } from '../services/enhancedTTSService';
import ReactMarkdown from 'react-markdown';

interface InlineChatProps {
    context: string;
    contextType: 'research' | 'strategy' | 'blog' | 'general';
    placeholder?: string;
}

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

export const InlineChat: React.FC<InlineChatProps> = ({
    context,
    contextType,
    placeholder = "Ask a question about these results..."
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

    const handleReadAloud = async (text: string, index: number) => {
        if (speakingIndex === index) {
            window.speechSynthesis?.cancel();
            setSpeakingIndex(null);
            return;
        }
        window.speechSynthesis?.cancel();
        setSpeakingIndex(index);
        try {
            await ttsSpeak(text, 'female', {
                onEnd: () => setSpeakingIndex(null),
                onError: () => setSpeakingIndex(null)
            });
        } catch (e) {
            setSpeakingIndex(null);
        }
    };

    const profile = getStoredProfile();

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    const getSystemPrompt = () => {
        const basePersona = `You are a Senior Digital Marketing Strategist with 10+ years of experience. You're having a follow-up conversation about the ${contextType} results the user just generated.`;

        const contextInstructions: Record<string, string> = {
            research: `The user is asking about MARKET RESEARCH findings. Help them:
• Understand the implications of the research
• Identify actionable opportunities
• Dive deeper into specific findings
• Connect insights to their business strategy`,

            strategy: `The user is asking about their MARKETING STRATEGY. Help them:
• Clarify strategic recommendations
• Prioritize action items
• Discuss implementation details
• Refine or adjust the strategy based on their feedback`,

            blog: `The user is asking about BLOG CONTENT. Help them:
• Refine headlines and angles
• Improve SEO optimization
• Enhance content structure
• Generate additional ideas or variations`,

            general: `Help the user understand and build upon the generated content.`
        };

        return `${basePersona}

${contextInstructions[contextType] || contextInstructions.general}

COMMUNICATION STYLE:
• Be conversational and helpful
• Give specific, actionable answers
• Reference the generated content when relevant
• Keep responses concise but comprehensive
• Use bullet points for clarity when appropriate

${profile ? `Business Context: ${profile.name} in ${profile.industry}. Target: ${profile.targetAudience}` : ''}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            // Build conversation history
            const chatHistory = messages.slice(-4).map(m =>
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`
            ).join('\n');

            const prompt = `
CONTEXT (Generated ${contextType.toUpperCase()} Content):
${context.slice(0, 3000)}

${chatHistory ? `CONVERSATION HISTORY:\n${chatHistory}\n` : ''}
User's Question: ${userMessage}

Provide a helpful, specific response that addresses their question about the ${contextType} content above.`;

            const response = await callLLM(prompt, {
                type: 'fast',
                systemPrompt: getSystemPrompt(),
                temperature: 0.75
            });

            setMessages(prev => [...prev, { role: 'assistant', text: response.text }]);
        } catch (error) {
            console.error('[InlineChat] Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "I'm having trouble processing your request. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const suggestedQuestions: Record<string, string[]> = {
        research: [
            "What's the biggest opportunity here?",
            "How do I beat my competitors?",
            "What should I prioritize first?"
        ],
        strategy: [
            "What's the quick win I should start with?",
            "How do I measure success?",
            "What's the budget I need?"
        ],
        blog: [
            "Can you improve this headline?",
            "What keywords should I target?",
            "How can I make this more engaging?"
        ],
        general: [
            "Tell me more about this",
            "How do I implement this?",
            "What are the next steps?"
        ]
    };

    return (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Header - click to expand/collapse */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-brand-50 to-purple-50 hover:from-brand-100 hover:to-purple-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <MessageCircle size={18} className="text-brand-600" />
                    <span className="font-medium text-slate-700">Ask Follow-up Questions</span>
                    {messages.length > 0 && (
                        <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs rounded-full">
                            {messages.length} messages
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {/* Expanded chat area */}
            {isExpanded && (
                <div className="border-t border-slate-200">
                    {/* Messages */}
                    <div className="max-h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {messages.length === 0 ? (
                            <div className="text-center py-4">
                                <Sparkles className="mx-auto text-brand-400 mb-2" size={24} />
                                <p className="text-sm text-slate-500 mb-3">
                                    Ask questions about the results above
                                </p>
                                {/* Suggested questions */}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {(suggestedQuestions[contextType] || suggestedQuestions.general).map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(q)}
                                            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full hover:border-brand-300 hover:bg-brand-50 transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-brand-600 text-white rounded-br-md'
                                            : 'bg-white border border-slate-200 rounded-bl-md'
                                            }`}
                                    >
                                        {msg.role === 'assistant' ? (
                                            <>
                                                <div className="prose prose-sm prose-slate max-w-none">
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>
                                                <button
                                                    onClick={() => handleReadAloud(msg.text, i)}
                                                    className={`mt-2 flex items-center gap-1.5 text-xs ${speakingIndex === i ? 'text-brand-600 font-medium' : 'text-slate-400 hover:text-brand-500'}`}
                                                >
                                                    {speakingIndex === i ? (
                                                        <><Square size={12} className="fill-current" /><span>Stop</span></>
                                                    ) : (
                                                        <><Volume2 size={12} /><span>Read aloud</span></>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <p className="text-sm">{msg.text}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-bl-md">
                                    <Loader size={16} className="animate-spin text-brand-600" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={placeholder}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-slate-50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="px-4 py-2.5 bg-brand-600 text-white rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default InlineChat;

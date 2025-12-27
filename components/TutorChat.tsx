
import React, { useState, useRef, useEffect } from 'react';
import { Tutor } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Send, User, Bot, Crown, X } from 'lucide-react';

interface TutorChatProps {
    tutor: Tutor;
    onClose: () => void;
    isPro: boolean;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const TutorChat: React.FC<TutorChatProps> = ({ tutor, onClose, isPro }) => {
    const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
        { role: 'model', text: `Hello! I'm ${tutor.name}. I specialize in ${tutor.specialty.join(', ')}. How can I help you improve today?` }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const isRateLimited = !isPro && messages.filter(m => m.role === 'user').length >= 3;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading || isRateLimited) return;
        
        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const systemInstruction = `
                You are ${tutor.name}, a world-class music tutor specializing in ${tutor.specialty.join(', ')}.
                Your teaching style is ${tutor.rate === '$$$' ? 'sophisticated and strict' : 'casual and encouraging'}.
                Location: ${tutor.location}.
                Keep responses concise (under 50 words) and actionable.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })).concat([{ role: 'user', parts: [{ text: userMsg }] }]) as any, // Simple chat history construction
                config: { systemInstruction }
            });
            
            setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm listening..." }]);
        } catch (e: any) {
            if (e.message?.includes('429') || e.message?.includes('quota')) {
                 setMessages(prev => [...prev, { role: 'model', text: "⚠️ System Overload: Global API Quota Exceeded. Please try again later." }]);
            } else {
                 setMessages(prev => [...prev, { role: 'model', text: "Connection with the studio was lost. Try again." }]);
            }
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
                
                {/* Header */}
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                             {tutor.name.charAt(0)}
                         </div>
                         <div>
                             <h3 className="font-bold text-white text-sm">{tutor.name}</h3>
                             <p className="text-xs text-cyan-400">{tutor.specialty[0]} Expert</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#050508]">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-700' : 'bg-cyan-900/30 text-cyan-400'}`}>
                                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-cyan-900/10 border border-cyan-500/20 text-slate-200 rounded-tl-none'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-cyan-900/30 text-cyan-400 flex items-center justify-center shrink-0"><Bot className="w-4 h-4" /></div>
                             <div className="bg-cyan-900/10 border border-cyan-500/20 px-4 py-3 rounded-2xl rounded-tl-none">
                                 <div className="flex gap-1">
                                     <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                                     <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"></div>
                                     <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150"></div>
                                 </div>
                             </div>
                        </div>
                    )}
                    <div ref={bottomRef}></div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-800 border-t border-slate-700">
                    {isRateLimited && (
                        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-center animate-in fade-in">
                            <p className="text-xs text-yellow-200 mb-1">Free Session Limit Reached</p>
                            <button className="text-xs font-bold bg-yellow-500 text-black px-3 py-1 rounded hover:scale-105 transition-transform flex items-center justify-center gap-1 w-full">
                                <Crown className="w-3 h-3" /> UNLOCK UNLIMITED
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isRateLimited ? "Limit reached..." : "Ask for advice..."}
                            disabled={isRateLimited || loading}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button 
                             onClick={handleSend}
                             disabled={isRateLimited || loading}
                             className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

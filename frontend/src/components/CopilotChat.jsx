import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export default function CopilotChat({ onAskCopilot, chatHistory = [], loading }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'Can I spend ₹2,00,000 on inventory tomorrow?',
    'What happens if sales fall 15%?',
    'Which upcoming bill is most dangerous?',
    'What is causing my current cash-flow risk?',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onAskCopilot(input);
    setInput('');
  };

  const handleChipClick = (promptText) => {
    if (loading) return;
    onAskCopilot(promptText);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  return (
    <div className="fintech-card p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">Merchant AI Finance Assistant</h3>
              <p className="text-[10px] text-slate-400 font-medium">Grounded in actual ledger calculations • Zero hallucination</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-full">
            Ready
          </span>
        </div>

        {/* Quick-Prompt Suggestions */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[11px] text-slate-400 font-semibold block">Suggested Merchant Questions:</span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(p)}
                disabled={loading}
                className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-300 border border-white/10 hover:border-blue-400/50 transition-all font-medium disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1 text-xs">
          {chatHistory.length === 0 ? (
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 text-slate-400 text-center leading-relaxed">
              <Zap className="w-6 h-6 text-purple-400 mx-auto mb-2 opacity-80" />
              Ask any operational financial question. The AI instantly evaluates your real-time bank ledger, upcoming supplier invoices, and dynamic buffer constraints.
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-purple-400">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line text-xs shadow-md ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-br-none ring-1 ring-white/20'
                      : 'bg-slate-950/90 border border-white/10 text-slate-200 font-medium rounded-bl-none'
                  }`}
                >
                  {msg.text}

                  {/* Grounded Evidence Badges */}
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5">
                      {msg.evidence.slice(0, 3).map((ev, ei) => (
                        <span key={ei} className="px-2 py-0.5 text-[10px] bg-slate-900 border border-white/10 rounded-md font-mono text-slate-300 font-bold">
                          {ev.metric}: <span className="text-blue-400">{ev.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-2 items-center text-xs text-purple-400 p-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Simulating financial scenario in real-time...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="mt-3 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question e.g. 'Can I spend ₹2,00,000 on inventory tomorrow?'"
          disabled={loading}
          className="w-full pl-4 pr-12 py-3 bg-slate-950 text-white text-xs rounded-xl border border-white/15 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500 font-medium"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-2 top-2 p-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-40 transition shadow"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}

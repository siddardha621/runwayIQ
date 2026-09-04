import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Zap } from 'lucide-react';

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
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Merchant AI Finance Assistant</h3>
              <p className="text-xs text-slate-500 font-medium">Grounded in actual bank ledger calculations • Zero hallucination</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Online
          </span>
        </div>

        {/* Quick-Prompt Suggestions */}
        <div className="space-y-2 mb-5">
          <span className="text-xs sm:text-sm text-slate-600 font-bold block">Suggested Questions:</span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(p)}
                disabled={loading}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition font-semibold disabled:opacity-50 text-left cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1 text-sm">
          {chatHistory.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-center leading-relaxed text-sm font-medium">
              <Zap className="w-6 h-6 text-blue-600 mx-auto mb-2 opacity-80" />
              Ask any operational financial question. The AI evaluates your bank ledger, upcoming supplier invoices, and dynamic buffer constraints in real-time.
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-600">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-4 rounded-2xl leading-relaxed whitespace-pre-line text-sm sm:text-base shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-br-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-bl-none'
                  }`}
                >
                  {msg.text}

                  {/* Grounded Evidence Badges */}
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                      {msg.evidence.slice(0, 3).map((ev, ei) => (
                        <span key={ei} className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-800 font-bold">
                          {ev.metric}: <span className="text-blue-600">{ev.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-700">
                    <User className="w-4.5 h-4.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-2 items-center text-sm text-blue-600 p-2 font-medium">
              <Sparkles className="w-4.5 h-4.5 animate-spin" />
              <span>Simulating financial scenario...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="mt-4 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question e.g. 'Can I spend ₹2,00,000 on inventory tomorrow?'"
          disabled={loading}
          className="w-full pl-4 pr-12 py-3 bg-white text-slate-900 text-sm sm:text-base rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400 font-medium shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-2 top-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition shadow-sm cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

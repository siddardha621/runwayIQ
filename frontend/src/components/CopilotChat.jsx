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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Merchant AI Finance Assistant</h3>
              <p className="text-[10px] text-slate-500 font-medium">Grounded in actual bank ledger calculations • Zero hallucination</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Online
          </span>
        </div>

        {/* Quick-Prompt Suggestions */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[11px] text-slate-500 font-semibold block">Suggested Questions:</span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(p)}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition font-medium disabled:opacity-50 text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1 text-xs">
          {chatHistory.length === 0 ? (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-center leading-relaxed">
              <Zap className="w-5 h-5 text-blue-600 mx-auto mb-2 opacity-80" />
              Ask any operational financial question. The AI evaluates your bank ledger, upcoming supplier invoices, and dynamic buffer constraints in real-time.
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-600">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3.5 rounded-xl leading-relaxed whitespace-pre-line text-xs shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-br-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-bl-none'
                  }`}
                >
                  {msg.text}

                  {/* Grounded Evidence Badges */}
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap gap-1.5">
                      {msg.evidence.slice(0, 3).map((ev, ei) => (
                        <span key={ei} className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded font-mono text-slate-700 font-semibold">
                          {ev.metric}: <span className="text-blue-600">{ev.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-700">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-2 items-center text-xs text-blue-600 p-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Simulating financial scenario...</span>
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
          className="w-full pl-3.5 pr-10 py-2.5 bg-white text-slate-900 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400 font-medium shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}

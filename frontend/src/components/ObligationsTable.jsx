import React from 'react';
import { CalendarClock, ArrowUpRight } from 'lucide-react';

export default function ObligationsTable({ obligations = [] }) {
  const formatINR = (val) => {
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const getDueBadge = (dueDateStr) => {
    const today = new Date('2026-09-02');
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 5) {
      return { text: `Due in ${diffDays} days!`, urgent: true };
    }
    return { text: `Due in ${diffDays} days`, urgent: false };
  };

  const totalSum = obligations.reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Scheduled Bills & Upcoming Payables</h3>
          </div>
          <span className="text-xs font-bold font-mono text-rose-600">
            Total: {formatINR(totalSum)}
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {obligations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No bills or supplier payables scheduled in the next 30 days.
            </div>
          ) : (
            obligations.map((ob) => {
              const dueInfo = getDueBadge(ob.due_date);
              return (
                <div 
                  key={ob.obligation_id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs text-slate-800">{ob.category}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        dueInfo.urgent 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {dueInfo.text}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">Date: {ob.due_date}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-slate-900 block">
                      {formatINR(ob.amount)}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600">
                      {ob.priority}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
        <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span>These bills are automatically factored into your Safety Reserve to prevent bounced payments.</span>
      </div>
    </div>
  );
}

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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Scheduled Bills & Upcoming Payables</h3>
          </div>
          <span className="text-sm font-bold font-mono text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
            Total: {formatINR(totalSum)}
          </span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {obligations.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 font-medium">
              No bills or supplier payables scheduled in the next 30 days.
            </div>
          ) : (
            obligations.map((ob) => {
              const dueInfo = getDueBadge(ob.due_date);
              return (
                <div 
                  key={ob.obligation_id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-900">{ob.category}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                        dueInfo.urgent 
                          ? 'bg-rose-50 text-rose-800 border border-rose-300'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {dueInfo.text}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 font-medium font-mono">Date: {ob.due_date}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-extrabold text-base text-slate-900 block">
                      {formatINR(ob.amount)}
                    </span>
                    <span className="text-xs font-bold text-blue-600 uppercase">
                      {ob.priority}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs sm:text-sm text-slate-600 flex items-center gap-2 font-medium">
        <ArrowUpRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>These bills are automatically factored into your Safety Reserve to prevent bounced payments.</span>
      </div>
    </div>
  );
}

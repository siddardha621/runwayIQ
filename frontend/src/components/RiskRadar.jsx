import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export default function RiskRadar({ anomaliesData }) {
  if (!anomaliesData) return null;

  const radar = anomaliesData.risk_radar || {
    revenue_drop: 10,
    refund_spike: 10,
    settlement_delay: 10,
    expense_surge: 10,
    obligation_risk: 15,
  };

  const anomalies = anomaliesData.anomalies || [];

  const getStatusBadge = (score) => {
    if (score >= 65) {
      return { text: 'Needs Attention', bg: 'bg-rose-50 text-rose-800 border-rose-300' };
    }
    if (score >= 35) {
      return { text: 'Elevated Risk', bg: 'bg-amber-50 text-amber-900 border-amber-300' };
    }
    return { text: 'Normal', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
  };

  const signals = [
    { label: 'Sales & Collections', score: radar.revenue_drop, desc: 'Tracks recent daily revenue trends' },
    { label: 'Customer Returns & Refunds', score: radar.refund_spike, desc: 'Monitors return rate fluctuations' },
    { label: 'Settlement Payout Timing', score: radar.settlement_delay, desc: 'Monitors bank credit settlement lags' },
    { label: 'Upcoming Bills Concentration', score: radar.obligation_risk, desc: 'Proportion of cash claimed by bills' },
  ];

  return (
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            <h3 className="text-lg font-bold text-slate-900">Store Health Signals & Risk Factors</h3>
          </div>
          <span className="text-xs sm:text-sm text-slate-500 font-semibold">Live Monitor</span>
        </div>

        {/* Health Signals */}
        <div className="space-y-3.5 mb-7">
          {signals.map((sig) => {
            const status = getStatusBadge(sig.score);
            return (
              <div key={sig.label} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-base text-slate-900 block">{sig.label}</span>
                  <span className="text-sm text-slate-600 font-medium">{sig.desc}</span>
                </div>
                <span className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg border shadow-2xs whitespace-nowrap ${status.bg}`}>
                  {status.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detected Anomalies List */}
      <div>
        <h4 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          Active Financial Alerts ({anomalies.length})
        </h4>

        {anomalies.length === 0 ? (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 text-center font-medium">
            All recent revenue and settlement patterns are operating within normal limits.
          </div>
        ) : (
          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {anomalies.map((anom, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-base text-slate-900">
                    {anom.type.replace('_', ' ')}
                  </span>
                  <span className="px-3 py-1 text-xs sm:text-sm font-bold rounded-md bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                    {anom.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{anom.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

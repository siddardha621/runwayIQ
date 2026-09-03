import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, TrendingDown, Clock, ShieldAlert } from 'lucide-react';

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

  const getStatusBadge = (score, highIsBad = true) => {
    if (score >= 65) {
      return { text: 'Needs Attention', bg: 'bg-rose-950/80 text-rose-400 border-rose-800' };
    }
    if (score >= 35) {
      return { text: 'Elevated Risk', bg: 'bg-amber-950/80 text-amber-400 border-amber-800' };
    }
    return { text: 'Healthy', bg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800' };
  };

  const signals = [
    { label: 'Sales & Collections', score: radar.revenue_drop, desc: 'Tracks recent daily revenue changes' },
    { label: 'Customer Returns & Refunds', score: radar.refund_spike, desc: 'Tracks return rate spikes' },
    { label: 'Payment Payout Timing', score: radar.settlement_delay, desc: 'Monitors bank credit settlement lags' },
    { label: 'Upcoming Bills Concentration', score: radar.obligation_risk, desc: 'Proportion of cash claimed by bills' },
  ];

  return (
    <div className="fintech-card p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Store Health Signals & Risk Factors</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Automatic Monitoring</span>
        </div>

        {/* Friendly Health Signals */}
        <div className="space-y-3 mb-5">
          {signals.map((sig) => {
            const status = getStatusBadge(sig.score);
            return (
              <div key={sig.label} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-200 block">{sig.label}</span>
                  <span className="text-[11px] text-slate-400">{sig.desc}</span>
                </div>
                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${status.bg}`}>
                  {status.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detected Anomalies List */}
      <div>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
          Active Financial Alerts ({anomalies.length})
        </h4>

        {anomalies.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
            All recent revenue and settlement patterns are operating within normal limits.
          </div>
        ) : (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {anomalies.map((anom, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">
                    {anom.type.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-800">
                    {anom.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{anom.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

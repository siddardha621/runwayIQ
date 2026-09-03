import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Database } from 'lucide-react';

export default function DataQualityModal({ isOpen, onClose, dataQuality }) {
  if (!isOpen || !dataQuality) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="fintech-card max-w-lg w-full p-6 relative border-indigo-500/40 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <Database className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-slate-100">Data Quality & Observability Audit</h3>
        </div>

        {/* Score Header */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800 mb-5">
          <div>
            <span className="text-xs text-slate-400 block">Overall Integrity Score</span>
            <span className="text-2xl font-bold text-indigo-400 font-mono">
              {dataQuality.overall_score}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Audit Grade</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              {dataQuality.grade}
            </span>
          </div>
        </div>

        {/* Factors Breakdown */}
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Component Factor Weights & Reconciliation
        </h4>
        <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1">
          {dataQuality.factors.map((f, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">{f.name}</span>
                <span className="font-mono font-bold text-indigo-300">
                  {f.score}% (Weight: {Math.round(f.weight * 100)}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{f.message}</p>
            </div>
          ))}
        </div>

        {/* Gaps / Warnings */}
        {dataQuality.data_gap_warnings && dataQuality.data_gap_warnings.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Identified Data Gaps:
            </div>
            {dataQuality.data_gap_warnings.map((w, idx) => (
              <div key={idx} className="text-[11px] text-amber-300/90 pl-5">
                • {w}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}

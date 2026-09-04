import React from 'react';
import { X, AlertTriangle, Database } from 'lucide-react';

export default function DataQualityModal({ isOpen, onClose, dataQuality }) {
  if (!isOpen || !dataQuality) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 max-w-lg w-full p-6 relative rounded-2xl shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Data Quality & Observability Audit</h3>
        </div>

        {/* Score Header */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Overall Integrity Score</span>
            <span className="text-2xl font-bold text-blue-600 font-mono">
              {dataQuality.overall_score}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block font-medium">Audit Grade</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              {dataQuality.grade}
            </span>
          </div>
        </div>

        {/* Factors Breakdown */}
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Component Factor Weights & Reconciliation
        </h4>
        <div className="space-y-2.5 mb-5 max-h-60 overflow-y-auto pr-1">
          {dataQuality.factors.map((f, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-800">{f.name}</span>
                <span className="font-mono font-bold text-blue-600">
                  {f.score}% (Weight: {Math.round(f.weight * 100)}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">{f.message}</p>
            </div>
          ))}
        </div>

        {/* Gaps / Warnings */}
        {dataQuality.data_gap_warnings && dataQuality.data_gap_warnings.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Identified Data Gaps:
            </div>
            {dataQuality.data_gap_warnings.map((w, idx) => (
              <div key={idx} className="text-[11px] text-amber-800 pl-5">
                • {w}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}

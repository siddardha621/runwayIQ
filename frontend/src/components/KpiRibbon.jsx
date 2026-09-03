import React from 'react';
import { 
  Wallet, 
  ShieldCheck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Building2
} from 'lucide-react';

export default function KpiRibbon({ summary, onOpenDataQuality }) {
  if (!summary) return null;

  const formatINR = (val) => {
    if (val === undefined || val === null) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const getHealthBadge = (level) => {
    switch (level) {
      case 'LOW':
        return { 
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', 
          dot: 'bg-emerald-400',
          label: 'Healthy Cash Runway',
          sub: 'Safe to execute planned growth investments'
        };
      case 'MODERATE':
        return { 
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', 
          dot: 'bg-amber-400',
          label: 'Moderate Liquidity Squeeze',
          sub: 'Heavy upcoming obligations or reduced collections'
        };
      case 'HIGH':
        return { 
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', 
          dot: 'bg-rose-400',
          label: 'High Overdraft Risk',
          sub: 'Large outlays will breach mandatory safety buffer'
        };
      case 'CRITICAL':
        return { 
          bg: 'bg-red-500/20 text-red-400 border-red-500/40', 
          dot: 'bg-red-400',
          label: 'Critical Liquidity Deficit',
          sub: 'Imminent danger of payment dishonour'
        };
      default:
        return { bg: 'bg-slate-800 text-slate-300 border-slate-700', dot: 'bg-slate-400', label: level, sub: '' };
    }
  };

  const health = getHealthBadge(summary.risk_level);

  return (
    <div className="space-y-3.5 mb-6">
      
      {/* Top Quick Status Pill Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">{summary.business_name}</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/10 text-[10px] text-slate-300 font-medium">
                {summary.business_type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Settlement Cycle: <span className="text-slate-200 font-semibold">T+2 Days</span> • Currency: <span className="text-slate-200 font-semibold">INR (₹)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className={`px-3 py-1 text-xs font-bold rounded-xl border flex items-center gap-2 shadow-sm ${health.bg}`}>
            <span className={`w-2 h-2 rounded-full ${health.dot} animate-pulse`}></span>
            {health.label}
          </span>

          <button
            onClick={onOpenDataQuality}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Data Health: {summary.data_quality_score}%</span>
          </button>
        </div>
      </div>

      {/* 4 Premium Metric Cards with Colored Glass Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Cash in Bank Today (Classic Emerald) */}
        <div className="card-emerald p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-2 tracking-wide">
            <span>AVAILABLE CASH TODAY</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition shadow">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight my-1">
            {formatINR(summary.current_cash)}
          </div>
          <p className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5 mt-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Realized & cleared in bank account
          </p>
        </div>

        {/* 2. Safety Reserve / Buffer (Classic Amber Gold) */}
        <div className="card-amber p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-amber-300 text-xs font-bold mb-2 tracking-wide">
            <span>SAFETY RESERVE (BUFFER)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-200 tracking-tight my-1">
            {formatINR(summary.minimum_operating_cash)}
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1.5 font-medium">
            Locked for payroll, taxes & vendor dues
          </p>
        </div>

        {/* 3. Expected In (Classic Cyan Sapphire) */}
        <div className="card-cyan p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-sky-300 text-xs font-bold mb-2 tracking-wide">
            <span>EXPECTED IN (NEXT 30D)</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 group-hover:scale-110 transition shadow">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-100 tracking-tight my-1">
            {formatINR(summary.expected_inflows_30d)}
          </div>
          <p className="text-[11px] text-sky-300/80 mt-1.5 font-medium">
            From projected customer settlements
          </p>
        </div>

        {/* 4. Upcoming Bills (Classic Ruby Crimson) */}
        <div className="card-rose p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-rose-300 text-xs font-bold mb-2 tracking-wide">
            <span>UPCOMING BILLS & PAYABLES</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 group-hover:scale-110 transition shadow">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-200 tracking-tight my-1">
            {formatINR(summary.pending_obligations_total || summary.expected_outflows_30d)}
          </div>
          <p className="text-[11px] text-rose-300/80 mt-1.5 font-medium">
            Supplier payables & operational dues
          </p>
        </div>

      </div>
    </div>
  );
}

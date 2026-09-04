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
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
          dot: 'bg-emerald-500',
          label: 'Healthy Working Capital',
          sub: 'Safe to execute planned growth commitments'
        };
      case 'MODERATE':
        return { 
          bg: 'bg-amber-50 text-amber-700 border-amber-200', 
          dot: 'bg-amber-500',
          label: 'Moderate Liquidity Warning',
          sub: 'Upcoming scheduled obligations require caution'
        };
      case 'HIGH':
        return { 
          bg: 'bg-rose-50 text-rose-700 border-rose-200', 
          dot: 'bg-rose-500',
          label: 'High Overdraft Risk',
          sub: 'Large outlays will breach minimum operating cash buffer'
        };
      case 'CRITICAL':
        return { 
          bg: 'bg-red-50 text-red-700 border-red-200', 
          dot: 'bg-red-500',
          label: 'Critical Liquidity Deficit',
          sub: 'Immediate danger of payment dishonour or bounced payroll'
        };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: level, sub: '' };
    }
  };

  const health = getHealthBadge(summary.risk_level);

  return (
    <div className="space-y-3.5 mb-6">
      
      {/* Top Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{summary.business_name}</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-semibold uppercase">
                {summary.business_type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Settlement Schedule: <strong className="text-slate-700">T+2 Days</strong> • Base Currency: <strong className="text-slate-700">INR (₹)</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center gap-2 ${health.bg}`}>
            <span className={`w-2 h-2 rounded-full ${health.dot} animate-pulse`}></span>
            {health.label}
          </span>

          <button
            onClick={onOpenDataQuality}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Data Health: {summary.data_quality_score}%</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Metric Cards with Tasteful Classic Soft Pastel Tints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Cash in Bank Today (Soft Classic Mint) */}
        <div className="card-emerald p-5 rounded-2xl flex flex-col justify-between transition group">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-2 tracking-wide">
            <span>AVAILABLE CASH TODAY</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.current_cash)}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Realized & cleared in bank account
          </p>
        </div>

        {/* 2. Safety Reserve / Buffer (Soft Classic Warm Amber) */}
        <div className="card-amber p-5 rounded-2xl flex flex-col justify-between transition group">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-2 tracking-wide">
            <span>SAFETY RESERVE (BUFFER)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.minimum_operating_cash)}
          </div>
          <p className="text-[11px] text-amber-800/90 font-medium mt-1">
            Locked for payroll, taxes & fixed bills
          </p>
        </div>

        {/* 3. Expected Money In (Soft Classic Sky Blue) */}
        <div className="card-cyan p-5 rounded-2xl flex flex-col justify-between transition group">
          <div className="flex items-center justify-between text-sky-800 text-xs font-bold mb-2 tracking-wide">
            <span>EXPECTED IN (NEXT 30D)</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shadow-2xs">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.expected_inflows_30d)}
          </div>
          <p className="text-[11px] text-sky-800/90 font-medium mt-1">
            From projected customer settlements
          </p>
        </div>

        {/* 4. Upcoming Bills & Expenses (Soft Classic Rose Coral) */}
        <div className="card-rose p-5 rounded-2xl flex flex-col justify-between transition group">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold mb-2 tracking-wide">
            <span>UPCOMING BILLS & PAYABLES</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shadow-2xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.pending_obligations_total || summary.expected_outflows_30d)}
          </div>
          <p className="text-[11px] text-rose-800/90 font-medium mt-1">
            Mandatory supplier & tax payables
          </p>
        </div>

      </div>
    </div>
  );
}

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

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Cash in Bank Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>AVAILABLE CASH TODAY</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.current_cash)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Realized & cleared in bank account
          </p>
        </div>

        {/* 2. Safety Reserve (Buffer) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>SAFETY RESERVE (BUFFER)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.minimum_operating_cash)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Locked for payroll, taxes & fixed bills
          </p>
        </div>

        {/* 3. Expected Money In */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>EXPECTED IN (NEXT 30D)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.expected_inflows_30d)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            From projected customer settlements
          </p>
        </div>

        {/* 4. Upcoming Bills & Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>UPCOMING BILLS & PAYABLES</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight my-1">
            {formatINR(summary.pending_obligations_total || summary.expected_outflows_30d)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Mandatory supplier & tax payables
          </p>
        </div>

      </div>
    </div>
  );
}

import React from 'react';
import { 
  Zap, 
  Store, 
  ChevronDown, 
  RefreshCw, 
  CheckCircle2, 
  LineChart, 
  Sparkles,
  ShieldCheck,
  UploadCloud
} from 'lucide-react';

export default function Header({ 
  merchants, 
  selectedMerchantId, 
  onSelectMerchant, 
  onRefresh, 
  loading,
  activeTab,
  onSelectTab,
  onOpenUpload
}) {
  const tabs = [
    { id: 'decision', label: 'Safety Decision Check', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'overview', label: 'Cash Runway & Bills', icon: <LineChart className="w-4 h-4" /> },
    { id: 'simulator', label: 'What-If & AI Copilot', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <header className="fintech-glass sticky top-0 z-40 px-4 sm:px-6 py-3 border-b border-white/10 mb-6 shadow-2xl rounded-2xl mt-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-100 tracking-tight flex items-center gap-1.5">
                  Razorpay <span className="text-gradient-blue font-black">CashFlow Intelligence</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Decision Engine Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Autonomous financial decision-support: Evaluate commitments before moving money
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="md:hidden p-2 bg-slate-800/90 text-slate-300 rounded-xl border border-white/10"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <nav className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/10 w-full md:w-auto justify-center shadow-inner">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Merchant Switcher Dropdown */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Store className="w-4 h-4 text-blue-400" />
            </div>
            <select
              value={selectedMerchantId}
              onChange={(e) => onSelectMerchant(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-900/90 text-slate-100 text-xs rounded-xl border border-white/15 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer font-semibold shadow-sm"
            >
              {merchants.map((m) => (
                <option key={m.merchant_id} value={m.merchant_id}>
                  {m.business_name} {m.merchant_id === 'merch_urbancart' ? '★ (Demo Store)' : ''}
                  {m.merchant_id === 'merch_newonboard' ? '⚠️ (9-Day Abstention)' : ''}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          <button
            onClick={onOpenUpload}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/40 hover:border-blue-500/60 transition shadow-sm"
            title="Import Bank or Settlement CSV Statement"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Upload Statement</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold border border-white/10 hover:border-white/20 transition disabled:opacity-50 shadow-sm"
            title="Refresh Ledger & Forecasts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
}

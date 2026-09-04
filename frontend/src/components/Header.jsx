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
    { id: 'decision', label: 'Safety Decision Check', icon: <CheckCircle2 className="w-4.5 h-4.5" /> },
    { id: 'overview', label: 'Cash Runway & Bills', icon: <LineChart className="w-4.5 h-4.5" /> },
    { id: 'simulator', label: 'What-If & AI Copilot', icon: <Sparkles className="w-4.5 h-4.5" /> },
  ];

  return (
    <header className="bg-white border border-slate-200 px-4 sm:px-6 py-4 mb-6 shadow-sm rounded-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 text-white">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  Razorpay <span className="text-blue-600 font-extrabold">CashFlow Intelligence</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Decision Engine Live
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block font-medium mt-0.5">
                Enterprise capital decision-support: Evaluate spending safely before moving money
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="md:hidden p-2.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <nav className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full md:w-auto justify-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Merchant Switcher Dropdown & Upload Action */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-68">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Store className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <select
              value={selectedMerchantId}
              onChange={(e) => onSelectMerchant(e.target.value)}
              className="w-full pl-9.5 pr-8 py-2.5 bg-white text-slate-800 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer font-medium shadow-sm hover:border-slate-400 transition"
            >
              {merchants.map((m) => (
                <option key={m.merchant_id} value={m.merchant_id}>
                  {m.business_name} {m.merchant_id === 'merch_urbancart' ? '★ (Demo Store)' : ''}
                  {m.merchant_id === 'merch_newonboard' ? '⚠️ (9-Day Abstention)' : ''}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4.5 h-4.5" />
            </div>
          </div>

          <button
            onClick={onOpenUpload}
            className="hidden md:flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-bold border border-blue-200 transition shadow-sm"
            title="Import Bank or Settlement CSV Statement"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            <span>Upload Statement</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="hidden md:flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold border border-slate-200 transition disabled:opacity-50 shadow-sm"
            title="Refresh Ledger & Forecasts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
}

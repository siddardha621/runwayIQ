import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  Split, 
  ChevronDown, 
  ChevronUp,
  Info,
  Clock,
  Layers,
  ArrowDownRight,
  TrendingDown,
  Percent
} from 'lucide-react';

export default function DecisionCenter({ onEvaluate, decisionResult, loading }) {
  const [amount, setAmount] = useState(200000);
  const [category, setCategory] = useState('INVENTORY');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onEvaluate({
      amount: Number(amount),
      category: category,
    });
  };

  const formatINR = (val) => {
    if (val === undefined || val === null) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const getVerdictCard = (verdict) => {
    switch (verdict) {
      case 'SAFE':
        return {
          title: 'YES, SAFE TO PAY',
          badge: 'Safe Commitment',
          bg: 'bg-emerald-50 border border-emerald-200 text-emerald-900',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />,
          summaryText: `You have plenty of cash runway. Even after spending ${formatINR(amount)}, your cash remains safely above your emergency reserve.`
        };
      case 'CAUTION':
        return {
          title: 'CAUTION: RISKY EXPENSE',
          badge: 'Caution Recommended',
          bg: 'bg-amber-50 border border-amber-200 text-amber-950',
          icon: <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />,
          summaryText: `Paying this full amount right now will dip into your emergency reserve. We recommend delaying or splitting this bill into 2 parts.`
        };
      case 'HIGH_RISK':
        return {
          title: 'DO NOT PAY: HIGH DANGER',
          badge: 'High Overdraft Risk',
          bg: 'bg-rose-50 border border-rose-200 text-rose-950',
          icon: <XCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />,
          summaryText: `This payment will cause an outright cash shortage. You will not have enough money left to cover mandatory upcoming bills.`
        };
      case 'INSUFFICIENT_CONFIDENCE':
        return {
          title: 'NOT ENOUGH DATA YET (ABSTENTION)',
          badge: 'Safety Guardrail Active',
          bg: 'bg-purple-50 border border-purple-200 text-purple-950',
          icon: <HelpCircle className="w-8 h-8 text-purple-600 flex-shrink-0" />,
          summaryText: `Your store has only been active for 9 days (minimum 14 days required). The system refuses to gamble with your money until more transactions settle.`
        };
      default:
        return {
          title: verdict,
          badge: verdict,
          bg: 'bg-slate-50 border border-slate-200 text-slate-800',
          icon: null,
          summaryText: ''
        };
    }
  };

  return (
    <div className="card-hero p-6 sm:p-7 mb-6 rounded-2xl">
      
      {/* Header with Title & Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-sm font-bold">
              🎯
            </span>
            <span>Can I Safely Spend Money Today?</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Test any planned business expense before paying. The engine checks upcoming supplier bills and protects working capital.
          </p>
        </div>

        {/* Amount Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-semibold mr-1">Quick Picks:</span>
          {[50000, 100000, 200000, 350000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                onEvaluate({ amount: preset, category });
              }}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition border ${
                amount === preset
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {preset === 200000 ? '₹2 Lakh (Demo)' : `₹${preset / 1000}k`}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form with Professional Styling */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Proposed Spend Amount
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-base">
              ₹
            </span>
            <input
              type="number"
              min="1000"
              step="5000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full pl-8 pr-4 py-2.5 bg-white text-slate-900 text-base rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold tracking-tight shadow-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            What is this expense for?
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white text-slate-800 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium shadow-sm"
          >
            <option value="INVENTORY">Inventory / Product Stock Restock</option>
            <option value="SUPPLIER">Supplier Payable / Raw Materials</option>
            <option value="MARKETING">Growth / Ad Campaign Budget</option>
            <option value="EQUIPMENT">Equipment & Tech Machinery</option>
            <option value="OTHER">Other Discretionary Business Outlay</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Run Safety Check</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Decision Output Card */}
      {decisionResult && (
        <div className="space-y-5">
          {(() => {
            const card = getVerdictCard(decisionResult.decision);
            const isBreach = decisionResult.buffer_breach_amount > 0;
            const cashLeft = decisionResult.projected_min_cash_with;
            const buffer = decisionResult.minimum_operating_cash;
            
            return (
              <div className="space-y-5">
                
                {/* 1. Big Hero Verdict Card */}
                <div className={`p-6 rounded-xl ${card.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all shadow-sm`}>
                  <div className="flex items-start sm:items-center gap-4">
                    {card.icon}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/80 border border-slate-200 shadow-2xs">
                          {card.badge}
                        </span>
                        <span className="text-xs font-semibold opacity-80">
                          • {Math.round(decisionResult.confidence * 100)}% Model Confidence
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed font-medium">
                        {card.summaryText}
                      </p>
                    </div>
                  </div>

                  {decisionResult.decision !== 'INSUFFICIENT_CONFIDENCE' && isBreach && (
                    <div className="p-3.5 bg-white/90 rounded-lg border border-amber-300 text-right w-full md:w-auto flex-shrink-0 shadow-2xs">
                      <span className="text-[11px] text-slate-600 block font-semibold uppercase">Buffer Shortfall</span>
                      <span className="text-2xl font-bold text-rose-600 font-mono">
                        {formatINR(decisionResult.buffer_breach_amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Visual Money Runway Progress Bar */}
                {decisionResult.decision !== 'INSUFFICIENT_CONFIDENCE' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-blue-600" />
                        Cash Runway Gauge: Where Does Your Money Go?
                      </span>
                      <span className={`font-bold ${isBreach ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {isBreach ? `⚠️ Breaches Safety Reserve by ${formatINR(decisionResult.buffer_breach_amount)}` : `✅ Safe Runway Surplus: ${formatINR(cashLeft - buffer)}`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-700 ${isBreach ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.max(10, Math.min(80, (Math.max(0, cashLeft) / (buffer * 2)) * 100))}%` }}
                      ></div>
                      <div className="w-1 bg-slate-700 h-full"></div>
                      <div className="h-full bg-slate-300 flex-1"></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>Remaining Cash: <strong className="text-slate-900">{formatINR(cashLeft)}</strong></span>
                      <span>Required Buffer Floor: <strong className="text-slate-900">{formatINR(buffer)}</strong></span>
                    </div>
                  </div>
                )}

                {/* 3. 4 Clean Impact Metric Pills */}
                {decisionResult.decision !== 'INSUFFICIENT_CONFIDENCE' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px] font-semibold">Spend Amount</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">
                        {formatINR(amount)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px] font-semibold">Projected Cash (Without)</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">
                        {formatINR(decisionResult.projected_min_cash_without)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px] font-semibold">Projected Cash (With Spend)</span>
                      <span className={`text-base font-bold mt-1 block ${
                        isBreach ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        {formatINR(cashLeft)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px] font-semibold">Max Safe Outlay Today</span>
                      <span className="text-base font-bold text-blue-600 mt-1 block">
                        {formatINR(Math.max(0, decisionResult.projected_min_cash_without - buffer))}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Plain-English Reasons */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <h4 className="font-bold text-slate-800 mb-2.5 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Key Reasons Behind This Recommendation</span>
                  </h4>
                  <ul className="space-y-2">
                    {decisionResult.primary_reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 5. Actionable Safer Choices */}
                {decisionResult.safer_alternatives && decisionResult.safer_alternatives.length > 0 && (
                  <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-100">
                    <h4 className="font-bold text-slate-900 text-xs mb-3.5 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Smart Alternatives: How You Can Still Make This Purchase Safely</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {decisionResult.safer_alternatives.map((alt, idx) => (
                        <div key={idx} className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                              Option {idx + 1}
                            </span>
                            <h5 className="font-bold text-slate-900 text-xs mb-1">
                              {alt.title}
                            </h5>
                            <p className="text-[11px] text-slate-600 leading-relaxed mb-3 font-medium">
                              {alt.description}
                            </p>
                          </div>
                          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between items-center font-medium">
                            <span>Cash Left:</span>
                            <span className="font-bold text-emerald-700 text-xs">{formatINR(alt.resulting_min_cash)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Collapsible Technical / Examiner View */}
                <div className="border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 py-1.5 transition font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      {showTechnicalDetails ? 'Hide Technical ML & Calculation Evidence' : 'Show Technical ML & Calculation Evidence (For Interview / Evaluation)'}
                    </span>
                    {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showTechnicalDetails && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 font-mono">
                      <div className="text-[11px] text-slate-600 pb-2 border-b border-slate-200 flex flex-wrap gap-4 font-sans">
                        <span>Model: <strong className="text-slate-900">{decisionResult.model_version}</strong></span>
                        <span>Confidence: <strong className="text-slate-900">{Math.round(decisionResult.confidence * 100)}%</strong></span>
                        <span>Data Quality: <strong className="text-slate-900">{decisionResult.data_quality_score}%</strong></span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-800 text-xs font-sans">Structured Numerical Audit Items:</div>
                        {decisionResult.evidence.map((ev, i) => (
                          <div key={i} className="flex justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-[11px]">
                            <span className="text-slate-600 font-sans">{ev.metric}: {ev.detail}</span>
                            <span className="font-bold text-slate-900 ml-2 whitespace-nowrap">{ev.value}</span>
                          </div>
                        ))}
                      </div>

                      {decisionResult.assumptions && (
                        <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200 font-sans">
                          <span className="font-bold text-slate-800 block mb-1">Underlying Numerical Assumptions:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                            {decisionResult.assumptions.map((asm, i) => (
                              <li key={i}>{asm}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}

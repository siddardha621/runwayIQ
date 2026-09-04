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
          bg: 'bg-emerald-50 border border-emerald-300 text-emerald-950',
          icon: <CheckCircle2 className="w-10 h-10 text-emerald-600 flex-shrink-0" />,
          summaryText: `You have plenty of cash runway. Even after spending ${formatINR(amount)}, your cash remains safely above your emergency reserve.`
        };
      case 'CAUTION':
        return {
          title: 'CAUTION: RISKY EXPENSE',
          badge: 'Caution Recommended',
          bg: 'bg-amber-50 border border-amber-300 text-amber-950',
          icon: <AlertTriangle className="w-10 h-10 text-amber-600 flex-shrink-0" />,
          summaryText: `Paying this full amount right now will dip into your emergency reserve. We recommend delaying or splitting this bill into 2 parts.`
        };
      case 'HIGH_RISK':
        return {
          title: 'DO NOT PAY: HIGH DANGER',
          badge: 'High Overdraft Risk',
          bg: 'bg-rose-50 border border-rose-300 text-rose-950',
          icon: <XCircle className="w-10 h-10 text-rose-600 flex-shrink-0" />,
          summaryText: `This payment will cause an outright cash shortage. You will not have enough money left to cover mandatory upcoming bills.`
        };
      case 'INSUFFICIENT_CONFIDENCE':
        return {
          title: 'NOT ENOUGH DATA YET (ABSTENTION)',
          badge: 'Safety Guardrail Active',
          bg: 'bg-purple-50 border border-purple-300 text-purple-950',
          icon: <HelpCircle className="w-10 h-10 text-purple-600 flex-shrink-0" />,
          summaryText: `Your store has only been active for 9 days (minimum 14 days required). The system refuses to gamble with your money until more transactions settle.`
        };
      default:
        return {
          title: verdict,
          badge: verdict,
          bg: 'bg-slate-50 border border-slate-200 text-slate-900',
          icon: null,
          summaryText: ''
        };
    }
  };

  return (
    <div className="card-hero p-6 sm:p-8 mb-6 rounded-2xl">
      
      {/* Header with Title & Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-base font-bold shadow-2xs">
              🎯
            </span>
            <span>Can I Safely Spend Money Today?</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Test any planned business expense before paying. The engine checks upcoming supplier bills and protects working capital.
          </p>
        </div>

        {/* Amount Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm text-slate-600 font-semibold mr-1">Quick Picks:</span>
          {[50000, 100000, 200000, 350000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                onEvaluate({ amount: preset, category });
              }}
              className={`px-3.5 py-2 text-xs sm:text-sm rounded-xl font-semibold transition border ${
                amount === preset
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {preset === 200000 ? '₹2 Lakh (Demo)' : `₹${preset / 1000}k`}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form with Larger Inputs */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-7">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">
            Proposed Spend Amount
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-bold text-lg">
              ₹
            </span>
            <input
              type="number"
              min="1000"
              step="5000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full pl-9 pr-4 py-3 bg-white text-slate-900 text-lg rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-extrabold tracking-tight shadow-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">
            What is this expense for?
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-white text-slate-800 text-sm sm:text-base rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-semibold shadow-sm cursor-pointer"
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
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-bold rounded-xl shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Run Safety Check</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Decision Output Card */}
      {decisionResult && (
        <div className="space-y-6">
          {(() => {
            const card = getVerdictCard(decisionResult.decision);
            const isBreach = decisionResult.buffer_breach_amount > 0;
            const cashLeft = decisionResult.projected_min_cash_with;
            const buffer = decisionResult.minimum_operating_cash;
            
            return (
              <div className="space-y-6">
                
                {/* 1. Big Hero Verdict Card */}
                <div className={`p-6 sm:p-7 rounded-2xl ${card.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all shadow-sm`}>
                  <div className="flex items-start sm:items-center gap-4.5">
                    {card.icon}
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-2xs">
                          {card.badge}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold opacity-90">
                          • {Math.round(decisionResult.confidence * 100)}% Model Confidence
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-sm sm:text-base mt-1.5 max-w-3xl leading-relaxed font-medium">
                        {card.summaryText}
                      </p>
                    </div>
                  </div>

                  {decisionResult.decision !== 'INSUFFICIENT_CONFIDENCE' && isBreach && (
                    <div className="p-4 bg-white rounded-xl border border-amber-300 text-right w-full md:w-auto flex-shrink-0 shadow-sm">
                      <span className="text-xs text-slate-600 block font-bold uppercase tracking-wider">Buffer Shortfall</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono">
                        {formatINR(decisionResult.buffer_breach_amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Visual Money Runway Progress Bar */}
                {decisionResult.decision !== 'INSUFFICIENT_CONFIDENCE' && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-sm sm:text-base">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-blue-600" />
                        Cash Runway Gauge: Where Does Your Money Go?
                      </span>
                      <span className={`font-bold ${isBreach ? 'text-rose-600' : 'text-emerald-800'}`}>
                        {isBreach ? `⚠️ Breaches Safety Reserve by ${formatINR(decisionResult.buffer_breach_amount)}` : `✅ Safe Runway Surplus: ${formatINR(cashLeft - buffer)}`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-700 ${isBreach ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.max(10, Math.min(80, (Math.max(0, cashLeft) / (buffer * 2)) * 100))}%` }}
                      ></div>
                      <div className="w-1.5 bg-slate-800 h-full"></div>
                      <div className="h-full bg-slate-300 flex-1"></div>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-700 font-medium">
                      <span>Remaining Cash: <strong className="text-slate-900 font-bold text-sm sm:text-base">{formatINR(cashLeft)}</strong></span>
                      <span>Required Buffer Floor: <strong className="text-slate-900 font-bold text-sm sm:text-base">{formatINR(buffer)}</strong></span>
                    </div>
                  </div>
                )}

                {/* 3. 4 Clean Impact Metric Pills */}
                {decisionResult.decision !== 'INSUFFICIENT_CONFIDENCE' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-600 block text-xs font-semibold">Spend Amount</span>
                      <span className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 block">
                        {formatINR(amount)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-600 block text-xs font-semibold">Projected Cash (Without)</span>
                      <span className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 block">
                        {formatINR(decisionResult.projected_min_cash_without)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-600 block text-xs font-semibold">Projected Cash (With Spend)</span>
                      <span className={`text-lg sm:text-xl font-extrabold mt-1 block ${
                        isBreach ? 'text-rose-600' : 'text-emerald-800'
                      }`}>
                        {formatINR(cashLeft)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-slate-600 block text-xs font-semibold">Max Safe Outlay Today</span>
                      <span className="text-lg sm:text-xl font-extrabold text-blue-600 mt-1 block">
                        {formatINR(Math.max(0, decisionResult.projected_min_cash_without - buffer))}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Plain-English Reasons */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    <span>Key Reasons Behind This Recommendation</span>
                  </h4>
                  <ul className="space-y-2.5">
                    {decisionResult.primary_reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-slate-700 leading-relaxed font-medium">
                        <span className="text-blue-600 font-bold text-base">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 5. Actionable Safer Choices */}
                {decisionResult.safer_alternatives && decisionResult.safer_alternatives.length > 0 && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/60 border border-blue-200">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <span>Smart Alternatives: How You Can Still Make This Purchase Safely</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {decisionResult.safer_alternatives.map((alt, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                              Option {idx + 1}
                            </span>
                            <h5 className="font-bold text-slate-900 text-sm sm:text-base mb-1.5">
                              {alt.title}
                            </h5>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 font-medium">
                              {alt.description}
                            </p>
                          </div>
                          <div className="pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 flex justify-between items-center font-medium">
                            <span>Cash Left:</span>
                            <span className="font-bold text-emerald-800 text-sm sm:text-base">{formatINR(alt.resulting_min_cash)}</span>
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
                    className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-600 hover:text-slate-900 py-2 transition font-semibold cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      {showTechnicalDetails ? 'Hide Technical ML & Calculation Evidence' : 'Show Technical ML & Calculation Evidence (For Interview / Evaluation)'}
                    </span>
                    {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showTechnicalDetails && (
                    <div className="mt-3 p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-3 font-mono">
                      <div className="text-xs sm:text-sm text-slate-600 pb-2.5 border-b border-slate-200 flex flex-wrap gap-5 font-sans">
                        <span>Model: <strong className="text-slate-900">{decisionResult.model_version}</strong></span>
                        <span>Confidence: <strong className="text-slate-900">{Math.round(decisionResult.confidence * 100)}%</strong></span>
                        <span>Data Quality: <strong className="text-slate-900">{decisionResult.data_quality_score}%</strong></span>
                      </div>

                      <div className="space-y-2">
                        <div className="font-bold text-slate-800 text-sm font-sans">Structured Numerical Audit Items:</div>
                        {decisionResult.evidence.map((ev, i) => (
                          <div key={i} className="flex justify-between p-3 bg-white rounded-lg border border-slate-200 text-xs sm:text-sm">
                            <span className="text-slate-600 font-sans">{ev.metric}: {ev.detail}</span>
                            <span className="font-bold text-slate-900 ml-2 whitespace-nowrap">{ev.value}</span>
                          </div>
                        ))}
                      </div>

                      {decisionResult.assumptions && (
                        <div className="text-xs sm:text-sm text-slate-600 pt-3 border-t border-slate-200 font-sans">
                          <span className="font-bold text-slate-800 block mb-1">Underlying Numerical Assumptions:</span>
                          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-600">
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

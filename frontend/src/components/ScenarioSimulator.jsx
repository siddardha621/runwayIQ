import React, { useState } from 'react';
import { Sliders, RotateCcw, Play } from 'lucide-react';

export default function ScenarioSimulator({ onRunScenario, onResetScenario, scenarioResult, loading }) {
  const [revenueChange, setRevenueChange] = useState(0);
  const [refundChange, setRefundChange] = useState(0);
  const [settlementDelay, setSettlementDelay] = useState(0);
  const [additionalExpense, setAdditionalExpense] = useState(0);

  const handleSimulate = (e) => {
    e.preventDefault();
    onRunScenario({
      revenue_change_pct: Number(revenueChange),
      refund_change_pct: Number(refundChange),
      settlement_delay_days: Number(settlementDelay),
      additional_expense: Number(additionalExpense),
    });
  };

  const handleReset = () => {
    setRevenueChange(0);
    setRefundChange(0);
    setSettlementDelay(0);
    setAdditionalExpense(0);
    onResetScenario();
  };

  const applyPreset = (rev, ref, del) => {
    setRevenueChange(rev);
    setRefundChange(ref);
    setSettlementDelay(del);
    onRunScenario({
      revenue_change_pct: rev,
      refund_change_pct: ref,
      settlement_delay_days: del,
      additional_expense: additionalExpense,
    });
  };

  const formatINR = (val) => {
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">What-If Stress Simulator</h3>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Quick Stress Presets */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <span className="text-xs sm:text-sm text-slate-600 font-semibold mr-1">Quick Scenarios:</span>
          <button
            type="button"
            onClick={() => applyPreset(-15, 0, 0)}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold transition cursor-pointer"
          >
            Sales Fall 15%
          </button>
          <button
            type="button"
            onClick={() => applyPreset(0, 0, 2)}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold transition cursor-pointer"
          >
            Settlement Delayed 2 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset(-20, 20, 2)}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold transition cursor-pointer"
          >
            Compound Shock
          </button>
        </div>

        <form onSubmit={handleSimulate} className="space-y-4 text-sm">
          {/* 1. Revenue Shock Slider */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-800 font-bold text-sm sm:text-base">Revenue Shock</span>
              <span className={`font-mono font-extrabold text-base sm:text-lg ${revenueChange < 0 ? 'text-rose-600' : (revenueChange > 0 ? 'text-emerald-700' : 'text-slate-900')}`}>
                {revenueChange > 0 ? `+${revenueChange}%` : `${revenueChange}%`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={revenueChange}
              onChange={(e) => setRevenueChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-medium">
              <span>-30% Drop</span>
              <span>Baseline</span>
              <span>+30% Boom</span>
            </div>
          </div>

          {/* 2. Refund Surge Slider */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-800 font-bold text-sm sm:text-base">Refund Surge</span>
              <span className="font-mono font-extrabold text-base sm:text-lg text-amber-700">
                +{refundChange}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="10"
              value={refundChange}
              onChange={(e) => setRefundChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-medium">
              <span>0% Normal</span>
              <span>+25% Surge</span>
              <span>+50% Extreme</span>
            </div>
          </div>

          {/* 3. Settlement Delay Slider */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-800 font-bold text-sm sm:text-base">Settlement Payout Lag</span>
              <span className="font-mono font-extrabold text-base sm:text-lg text-blue-700">
                +{settlementDelay} Days
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={settlementDelay}
              onChange={(e) => setSettlementDelay(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-medium">
              <span>0 Days (On Time)</span>
              <span>+2 Days</span>
              <span>+4 Days (Bank Holiday)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate Future Trajectory</span>
          </button>
        </form>
      </div>

      {/* Stressed Outcome Card */}
      {scenarioResult && (
        <div className="mt-5 p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-base text-slate-900">Simulation Outcome:</span>
            <span className={`px-3 py-1 text-xs sm:text-sm font-bold rounded-lg border shadow-2xs ${
              scenarioResult.risk_level === 'CRITICAL' || scenarioResult.risk_level === 'HIGH'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              {scenarioResult.risk_level}
            </span>
          </div>
          <div className="space-y-1.5 text-slate-800 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 font-sans">Lowest Projected Cash:</span>
              <span className="font-bold text-base text-slate-900">{formatINR(scenarioResult.scenario_min_cash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-sans">Safety Buffer Shortfall:</span>
              <span className={scenarioResult.buffer_breached ? 'text-rose-600 font-bold text-base' : 'text-emerald-700 font-bold text-base'}>
                {formatINR(scenarioResult.breach_amount)}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700 border-t border-slate-200 pt-3 leading-relaxed font-medium">
            {scenarioResult.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

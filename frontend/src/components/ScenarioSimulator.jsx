import React, { useState } from 'react';
import { Sliders, RotateCcw, AlertTriangle, Play, Sparkles, TrendingDown } from 'lucide-react';

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
    <div className="fintech-card p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-black text-slate-100">What-If Stress Simulator</h3>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Quick Stress Presets */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">One-Tap Scenarios:</span>
          <button
            type="button"
            onClick={() => applyPreset(-15, 0, 0)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-white/10 hover:border-blue-400 text-slate-300 font-semibold transition"
          >
            Sales Fall 15%
          </button>
          <button
            type="button"
            onClick={() => applyPreset(0, 0, 2)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-white/10 hover:border-amber-400 text-slate-300 font-semibold transition"
          >
            Settlement Delayed 2 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset(-20, 20, 2)}
            className="px-2.5 py-1 text-xs rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 font-semibold transition"
          >
            Compound Stress Test
          </button>
        </div>

        <form onSubmit={handleSimulate} className="space-y-4 text-xs">
          {/* 1. Revenue Shock Slider */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-200 font-bold">Revenue Shock</span>
              <span className={`font-mono font-black text-sm ${revenueChange < 0 ? 'text-rose-400' : (revenueChange > 0 ? 'text-emerald-400' : 'text-slate-300')}`}>
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
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-semibold">
              <span>-30% Crash</span>
              <span>Normal Run-Rate</span>
              <span>+30% Boom</span>
            </div>
          </div>

          {/* 2. Refund Surge Slider */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-200 font-bold">Refund Surge</span>
              <span className="font-mono font-black text-sm text-amber-400">
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
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-semibold">
              <span>0% Baseline</span>
              <span>+25% Surge</span>
              <span>+50% Extreme Returns</span>
            </div>
          </div>

          {/* 3. Settlement Delay Slider */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-200 font-bold">Bank Settlement Payout Lag</span>
              <span className="font-mono font-black text-sm text-orange-400">
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
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-semibold">
              <span>0 Days (On Time)</span>
              <span>+2 Days</span>
              <span>+4 Days (Bank Holiday)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ring-1 ring-white/20"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate Future Cash Trajectory</span>
          </button>
        </form>
      </div>

      {/* Stressed Outcome Card */}
      {scenarioResult && (
        <div className="mt-5 p-4 rounded-xl bg-slate-950/90 border border-white/10 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-200">Simulation Outcome:</span>
            <span className={`px-2.5 py-0.5 text-[11px] font-black rounded-lg border ${
              scenarioResult.risk_level === 'CRITICAL' || scenarioResult.risk_level === 'HIGH'
                ? 'bg-rose-950 text-rose-300 border-rose-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              {scenarioResult.risk_level}
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Lowest Projected Cash:</span>
              <span className="font-bold text-white">{formatINR(scenarioResult.scenario_min_cash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Safety Buffer Shortfall:</span>
              <span className={scenarioResult.buffer_breached ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {formatINR(scenarioResult.breach_amount)}
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-300 border-t border-white/10 pt-2 leading-relaxed">
            {scenarioResult.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

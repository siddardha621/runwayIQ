import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingUp, Layers, Sliders, ShieldAlert } from 'lucide-react';

export default function ForecastChart({ historicalEntries = [], forecastPoints = [], scenarioTrajectory = [] }) {
  const [showInterval, setShowInterval] = useState(true);
  const [showBuffer, setShowBuffer] = useState(true);

  // Combine historical and forecast series
  const chartData = [];

  // 1. Historical Data (last 21 days for clarity)
  const recentHistory = historicalEntries.slice(-21);
  recentHistory.forEach((item) => {
    chartData.push({
      date: item.date,
      historicalCash: item.ending_cash,
      forecastCash: null,
      lowerBound: null,
      upperBound: null,
      operatingBuffer: null,
      scenarioCash: null,
      type: 'HISTORICAL',
    });
  });

  // Stitch bridge point between history and forecast
  if (recentHistory.length > 0 && forecastPoints.length > 0) {
    const lastHist = recentHistory[recentHistory.length - 1];
    chartData[chartData.length - 1].forecastCash = lastHist.ending_cash;
    chartData[chartData.length - 1].scenarioCash = lastHist.ending_cash;
  }

  // 2. Forecast Data (Next 30 days)
  const bufferVal = forecastPoints[0]?.operatingBuffer || 0;

  forecastPoints.forEach((pt, idx) => {
    const scenPt = scenarioTrajectory[idx];
    chartData.push({
      date: pt.date,
      historicalCash: null,
      forecastCash: pt.predicted_balance,
      lowerBound: pt.lower_bound,
      upperBound: pt.upper_bound,
      operatingBuffer: pt.operatingBuffer,
      scenarioCash: scenPt ? scenPt.scenario_cash : null,
      type: 'FORECAST',
    });
  });

  const formatINR = (val) => {
    if (val === null || val === undefined) return '';
    return '₹' + (Number(val) / 100000).toFixed(1) + 'L';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-slate-950/95 border border-white/20 p-3.5 rounded-xl shadow-2xl text-xs backdrop-blur-xl ring-1 ring-white/10">
        <div className="font-bold text-slate-200 border-b border-white/10 pb-1.5 mb-2">
          Date: {label}
        </div>
        {payload.map((entry, index) => {
          if (entry.value === null || entry.value === undefined) return null;
          return (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="w-2.5 h-2.5 rounded-full shadow" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white text-xs">
                ₹{Number(entry.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fintech-card p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-slate-100">30-Day Cash Trajectory & Safety Runway</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full uppercase tracking-wider">
              ML Multi-Step Forecast
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Solid blue line shows realized cash in your bank account; dashed indigo line projects your 30-day runway against your Safety Buffer.
          </p>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowInterval(!showInterval)}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
              showInterval
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-sm'
                : 'bg-slate-900 border-white/10 text-slate-500'
            }`}
          >
            Uncertainty Band (85%)
          </button>
          <button
            onClick={() => setShowBuffer(!showBuffer)}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
              showBuffer
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-slate-900 border-white/10 text-slate-500'
            }`}
          >
            Safety Buffer Line
          </button>
        </div>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="intervalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(str) => {
                const d = new Date(str);
                return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
              }}
              minTickGap={24}
            />
            <YAxis stroke="#64748b" fontSize={11} tickFormatter={formatINR} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />

            {/* Uncertainty Interval Band */}
            {showInterval && (
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="transparent"
                fill="url(#intervalGrad)"
                name="85% Prediction Interval"
              />
            )}

            {/* Historical Realized Cash (Vibrant Cyan Line) */}
            <Line
              type="monotone"
              dataKey="historicalCash"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={false}
              name="Realized Cash in Bank"
            />

            {/* Baseline Forecast Cash (Dashed Electric Indigo Line) */}
            <Line
              type="monotone"
              dataKey="forecastCash"
              stroke="#818cf8"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              name="Projected Runway"
            />

            {/* Simulated Scenario Cash (Rose/Red Line when simulated) */}
            {scenarioTrajectory.length > 0 && (
              <Line
                type="monotone"
                dataKey="scenarioCash"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={false}
                name="Stressed Scenario Curve"
              />
            )}

            {/* Dynamic Minimum Operating Buffer Line */}
            {showBuffer && bufferVal > 0 && (
              <ReferenceLine
                y={bufferVal}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Safety Reserve: ₹${(bufferVal / 100000).toFixed(1)}L`,
                  fill: '#fbbf24',
                  fontSize: 11,
                  position: 'insideBottomRight',
                  fontWeight: 'bold',
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

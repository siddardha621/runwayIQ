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
import { TrendingUp } from 'lucide-react';

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
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xl text-xs sm:text-sm">
        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5">
          Date: {label}
        </div>
        {payload.map((entry, index) => {
          if (entry.value === null || entry.value === undefined) return null;
          return (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-2 font-semibold text-slate-600">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                ₹{Number(entry.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 sm:p-7 mb-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">30-Day Working Capital & Cash Runway</h2>
            <span className="px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full uppercase tracking-wider">
              ML Multi-Step Forecast
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Solid blue line shows historical bank balance; dashed indigo line projects runway against your Safety Buffer.
          </p>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <button
            onClick={() => setShowInterval(!showInterval)}
            className={`px-3.5 py-2 rounded-xl font-bold border transition ${
              showInterval
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Uncertainty Band (85%)
          </button>
          <button
            onClick={() => setShowBuffer(!showBuffer)}
            className={`px-3.5 py-2 rounded-xl font-bold border transition ${
              showBuffer
                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Safety Buffer Line
          </button>
        </div>
      </div>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="intervalGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickFormatter={(str) => {
                const d = new Date(str);
                return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
              }}
              minTickGap={24}
            />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={formatINR} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
              iconType="circle"
            />

            {/* Uncertainty Interval Band */}
            {showInterval && (
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="transparent"
                fill="url(#intervalGradLight)"
                name="85% Prediction Interval"
              />
            )}

            {/* Historical Realized Cash */}
            <Line
              type="monotone"
              dataKey="historicalCash"
              stroke="#0284c7"
              strokeWidth={3}
              dot={false}
              name="Realized Cash in Bank"
            />

            {/* Baseline Forecast Cash */}
            <Line
              type="monotone"
              dataKey="forecastCash"
              stroke="#6366f1"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              name="Projected Runway"
            />

            {/* Simulated Scenario Cash */}
            {scenarioTrajectory.length > 0 && (
              <Line
                type="monotone"
                dataKey="scenarioCash"
                stroke="#e11d48"
                strokeWidth={3}
                dot={false}
                name="Stressed Scenario Curve"
              />
            )}

            {/* Dynamic Minimum Operating Buffer Line */}
            {showBuffer && bufferVal > 0 && (
              <ReferenceLine
                y={bufferVal}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Safety Reserve: ₹${(bufferVal / 100000).toFixed(1)}L`,
                  fill: '#b45309',
                  fontSize: 12,
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

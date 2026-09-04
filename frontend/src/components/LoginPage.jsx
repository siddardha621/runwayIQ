import React, { useState } from 'react';
import { Zap, ShieldCheck, ArrowRight, Lock, Mail, Store, Building2, CheckCircle2, ChevronRight } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, merchants = [] }) {
  const [email, setEmail] = useState('admin@urbancart.in');
  const [password, setPassword] = useState('••••••••');
  const [selectedPreset, setSelectedPreset] = useState('merch_urbancart');
  const [loading, setLoading] = useState(false);

  // Preset merchant accounts
  const demoAccounts = [
    {
      merchant_id: 'merch_urbancart',
      business_name: 'UrbanCart Direct',
      business_type: 'D2C Retail & Electronics',
      balance_str: '₹8.8 Lakh',
      tag: 'Main Evaluation Demo',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Established D2C merchant with ₹1.8L supplier invoice due. Demonstrates caution decision & payment split recommendations.',
      email: 'admin@urbancart.in',
    },
    {
      merchant_id: 'merch_kiteaura',
      business_name: 'KiteAura Boutique',
      business_type: 'Apparel & Lifestyle',
      balance_str: '₹4.5 Lakh',
      tag: 'Healthy Capital',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Mid-sized fashion merchant with strong daily collections and low refund rates. Demonstrates safe spending clearances.',
      email: 'finance@kiteaura.com',
    },
    {
      merchant_id: 'merch_freshdrop',
      business_name: 'FreshDrop Hyperlocal',
      business_type: 'Quick-Commerce Grocery',
      balance_str: '₹3.2 Lakh',
      tag: 'High Velocity',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Rapid-turnover merchant with tight operational margins and high daily supplier restock deliveries.',
      email: 'ops@freshdrop.co',
    },
    {
      merchant_id: 'merch_newonboard',
      business_name: 'Apex Logistics (New Account)',
      business_type: 'Courier & Freight',
      balance_str: '₹1.5 Lakh',
      tag: 'Safety Guardrail Demo',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description: '9-day old account without enough transaction history. Demonstrates automated decision abstention to protect merchants.',
      email: 'accounts@apexlogistics.in',
    },
  ];

  const handlePresetSelect = (acc) => {
    setSelectedPreset(acc.merchant_id);
    setEmail(acc.email);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const activeAcc = demoAccounts.find((a) => a.merchant_id === selectedPreset) || demoAccounts[0];
      onLoginSuccess({
        merchant_id: activeAcc.merchant_id,
        business_name: activeAcc.business_name,
        email: email,
        role: 'Merchant Administrator',
      });
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/40 text-slate-900 flex flex-col justify-between p-4 sm:p-8">
      
      {/* Top Brand Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Razorpay <span className="text-blue-600 font-extrabold">CashFlow Intelligence</span>
            </span>
            <span className="text-xs text-slate-500 block font-medium">
              RunwayIQ Enterprise Decision Engine
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-semibold bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>256-Bit Bank-Grade Encryption</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-4xl mx-auto w-full my-8">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Quick 1-Click Demo Merchant Accounts */}
          <div className="lg:col-span-7 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="mb-5">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  1-Click Sign In
                </span>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Select a Merchant Profile to Launch
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  Click any demo business below to log straight into its live cash runway dashboard:
                </p>
              </div>

              <div className="space-y-3">
                {demoAccounts.map((acc) => {
                  const isSelected = selectedPreset === acc.merchant_id;
                  return (
                    <div
                      key={acc.merchant_id}
                      onClick={() => handlePresetSelect(acc)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <Store className={`w-4.5 h-4.5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                          <span className="font-bold text-sm text-slate-900">{acc.business_name}</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${acc.tagColor}`}>
                          {acc.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug font-medium mb-2">
                        {acc.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1.5 border-t border-slate-100">
                        <span>Starting Bank Balance: <strong className="text-slate-900">{acc.balance_str}</strong></span>
                        <span className="text-blue-600 font-bold flex items-center gap-0.5">
                          {isSelected ? 'Selected' : 'Select'} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Includes live bank statements, multi-step ML forecasts & decision audits.</span>
            </div>
          </div>

          {/* Right Column: Sign In Form */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
            <div>
              <div className="mb-6">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Workspace Authentication
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Sign In to RunwayIQ
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  Enter your credentials or use the selected profile.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Merchant Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span>Remember my store</span>
                  </label>
                  <span className="text-blue-600 font-semibold hover:underline cursor-pointer">
                    Forgot key?
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Launch Decision Dashboard'}</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-500 font-medium block">
                Razorpay Merchant Decision Intelligence
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                Bangalore Working Capital & Risk Engineering
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-xs text-slate-500 font-medium">
        <span>© 2026 Razorpay Software Private Limited • Autonomous Cash-Flow Copilot</span>
      </div>

    </div>
  );
}

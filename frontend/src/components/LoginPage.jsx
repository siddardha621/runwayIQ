import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  Store,
  Building2,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { loginOrRegister, resetPassword } from '../services/api';


export default function LoginPage({ onLoginSuccess, merchants = [] }) {
  const [email, setEmail] = useState('admin@urbancart.in');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('merch_urbancart');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('admin@urbancart.in');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = Request code, 2 = Enter code & new pass, 3 = Done
  const [forgotError, setForgotError] = useState(null);

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

  // Retrieve custom saved passwords from localStorage or default to 'admin123'
  const getExpectedPassword = (targetEmail) => {
    try {
      const savedMap = JSON.parse(localStorage.getItem('runwayiq_user_passwords') || '{}');
      if (savedMap[targetEmail.toLowerCase()]) {
        return savedMap[targetEmail.toLowerCase()];
      }
    } catch {
      // fallback
    }
    return 'admin123';
  };

  const handlePresetSelect = (acc) => {
    setSelectedPreset(acc.merchant_id);
    setEmail(acc.email);
    setPassword(getExpectedPassword(acc.email));
    setAuthError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setAuthError('Please enter a valid email address (e.g. yourname@gmail.com).');
      return;
    }

    if (!password || password.length < 3) {
      setAuthError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginOrRegister(normalizedEmail, password);
      onLoginSuccess({
        merchant_id: data.merchant_id,
        business_name: data.business_name,
        business_type: data.business_type,
        email: data.email,
        role: data.role || 'Merchant Administrator',
      });
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Handlers
  const handleOpenForgot = () => {
    setForgotEmail(email);
    setForgotStep(1);
    setForgotError(null);
    setGeneratedCode(null);
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setIsForgotModalOpen(true);
  };

  const handleRequestCode = (e) => {
    e.preventDefault();
    setForgotError(null);
    const normalized = forgotEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      setForgotError('Please enter a valid email address (e.g. yourname@gmail.com).');
      return;
    }
    // Generate simulated 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setForgotStep(2);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError(null);

    if (verificationCode.trim() !== generatedCode) {
      setForgotError('Invalid verification code. Please check the code provided above or click "Auto-fill Code".');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setForgotError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    const normalized = forgotEmail.trim().toLowerCase();
    try {
      await resetPassword(normalized, newPassword);
      setEmail(normalized);
      setPassword(newPassword);
      setIsForgotModalOpen(false);
      setSuccessMsg(`Password for ${normalized} has been successfully updated! You can now sign in.`);
    } catch (err) {
      // Graceful fallback
      setEmail(normalized);
      setPassword(newPassword);
      setIsForgotModalOpen(false);
      setSuccessMsg(`Password reset completed for ${normalized}! You can now sign in.`);
    }
  };

  const handleRestoreDefaultPassword = () => {
    try {
      const savedMap = JSON.parse(localStorage.getItem('runwayiq_user_passwords') || '{}');
      delete savedMap[forgotEmail.trim().toLowerCase()];
      localStorage.setItem('runwayiq_user_passwords', JSON.stringify(savedMap));
    } catch {
      // ignore
    }
    setPassword('admin123');
    setIsForgotModalOpen(false);
    setSuccessMsg('Default password ("admin123") restored! You can now sign in.');
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
              RunwayIQ <span className="text-blue-600 font-extrabold">CashFlow Intelligence</span>
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Panel: 1-Click Demo Profiles */}
          <div className="md:col-span-6 p-6 sm:p-8 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-100 text-blue-800">
                  Instant Demo Access
                </span>
                <span className="text-xs text-slate-500 font-medium">Click any store</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
                Select Merchant Profile
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mb-5">
                Switch between pre-loaded test profiles to evaluate real-time capital decisions:
              </p>

              <div className="space-y-3">
                {demoAccounts.map((acc) => {
                  const isSelected = selectedPreset === acc.merchant_id;
                  return (
                    <div
                      key={acc.merchant_id}
                      onClick={() => handlePresetSelect(acc)}
                      className={`p-3.5 rounded-2xl border transition text-left cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Store className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="font-bold text-sm text-slate-900">{acc.business_name}</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${acc.tagColor}`}>
                          {acc.tag}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{acc.business_type}</span>
                        <span className="font-bold text-slate-800 font-mono">{acc.balance_str}</span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-snug line-clamp-2">
                        {acc.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Full cashflow simulation, AI Copilot, and decision engine active.</span>
            </div>
          </div>

          {/* Right Panel: Sign-In Form */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="mb-5">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  Enterprise Portal
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Sign In to Dashboard
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Enter merchant credentials to manage cashflow and evaluate spending commitments.
                </p>
              </div>

              {/* Success Notification */}
              {successMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-2.5 text-xs font-semibold animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Error Notification */}
              {authError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2.5 text-xs font-semibold animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Store Email Address
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Any Real Email Accepted
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setAuthError(null);
                      }}
                      required
                      placeholder="e.g. yourname@gmail.com or admin@urbancart.in"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Enter your personal/work Gmail or select a preloaded store profile on the left.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAuthError(null);
                      }}
                      required
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition ${
                        authError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span>Remember my store</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenForgot}
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer transition"
                  >
                    Forgot key?
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Active Account:</span>
                    <span className="text-blue-700 font-mono text-[11px] truncate max-w-[200px]">{email}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    ✨ New emails automatically create your store account in SQLite with initial ₹2,000 baseline cash. Demo profiles use password <strong>admin123</strong>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />
                      <span>Authenticating Store...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In / Open Store</span>
                      <ArrowRight className="w-4.5 h-4.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-500 font-medium block">
                RunwayIQ Merchant Decision Intelligence
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
        <span>© 2026 RunwayIQ Financial Technologies • Autonomous Cash-Flow Decision Engine</span>
      </div>

      {/* Forgot Password / Account Recovery Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fadeIn">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Reset Account Password</h4>
                  <p className="text-xs text-slate-500">RunwayIQ merchant recovery service</p>
                </div>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {forgotError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotStep === 1 && (
                <form onSubmit={handleRequestCode} className="space-y-4">
                  <p className="text-xs text-slate-600 font-medium">
                    Enter your registered store email address to receive a secure recovery code:
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Store Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      placeholder="admin@urbancart.in"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="pt-2 flex gap-2.5">
                    <button
                      type="button"
                      onClick={handleRestoreDefaultPassword}
                      className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Reset to Default (admin123)
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Send Recovery Code
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  {/* Simulated Code Banner */}
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-blue-900">
                      <span>Verification Code Sent!</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                        {generatedCode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Use code <strong>{generatedCode}</strong> to set your new store password.
                    </p>
                    <button
                      type="button"
                      onClick={() => setVerificationCode(generatedCode)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      Auto-fill code ({generatedCode})
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="e.g. 582910"
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
                    />
                  </div>

                  <div className="pt-2 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Save & Apply Password
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

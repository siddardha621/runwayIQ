import React, { useState } from 'react';
import {
  CalendarClock,
  ArrowUpRight,
  Plus,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';

export default function ObligationsTable({
  obligations = [],
  onAddObligation,
  onDeleteObligation,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('PAYROLL');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('2026-09-10');
  const [priority, setPriority] = useState('MANDATORY');
  const [recurring, setRecurring] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const formatINR = (val) => {
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const getDueBadge = (dueDateStr) => {
    const today = new Date('2026-09-02');
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, urgent: true };
    }
    if (diffDays <= 5) {
      return { text: `Due in ${diffDays} days!`, urgent: true };
    }
    return { text: `Due in ${diffDays} days`, urgent: false };
  };

  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'PAYROLL':
        return { label: 'Staff Salaries & Wages', icon: '💼' };
      case 'TAX':
        return { label: 'GST & Advance Tax', icon: '🏛️' };
      case 'RENT':
        return { label: 'Shop & Warehouse Rent', icon: '🏢' };
      case 'SUPPLIER':
        return { label: 'Supplier / Vendor Invoice', icon: '📦' };
      case 'LOAN':
        return { label: 'Bank Loan / Machinery EMI', icon: '🏦' };
      case 'UTILITIES':
        return { label: 'Electricity & Utilities', icon: '⚡' };
      default:
        return { label: cat || 'Operating Expense', icon: '📄' };
    }
  };

  const applyTemplate = (cat, defaultAmt, defaultPrio, defaultDays) => {
    setCategory(cat);
    setAmount(defaultAmt);
    setPriority(defaultPrio);
    const d = new Date('2026-09-02');
    d.setDate(d.getDate() + defaultDays);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) return;
    if (!onAddObligation) return;

    try {
      setSubmitting(true);
      await onAddObligation({
        category,
        amount: numAmt,
        due_date: dueDate,
        priority,
        recurring,
      });
      setIsModalOpen(false);
      setAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSum = obligations.reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between relative">
      <div>
        {/* Header with Title, Total, and Add Button */}
        <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Scheduled Bills & Upcoming Payables</h3>
              <p className="text-xs text-slate-500 font-medium">Salaries, GST taxes, rent, and vendor invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
              Total: {formatINR(totalSum)}
            </span>
            {onAddObligation && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bill</span>
              </button>
            )}
          </div>
        </div>

        {/* Obligations List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {obligations.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="mb-2">No upcoming bills scheduled yet.</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Employee Salaries, GST, or Rent
              </button>
            </div>
          ) : (
            obligations.map((ob) => {
              const dueInfo = getDueBadge(ob.due_date);
              const meta = getCategoryMeta(ob.category);

              return (
                <div
                  key={ob.obligation_id}
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-between gap-3 shadow-2xs group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{meta.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm sm:text-base text-slate-900">{meta.label}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                            dueInfo.urgent
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {dueInfo.text}
                        </span>
                        {ob.recurring && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            Monthly
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 font-medium font-mono">Due: {ob.due_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="font-mono font-extrabold text-base sm:text-lg text-slate-900 block">
                        {formatINR(ob.amount)}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase">
                        {ob.priority}
                      </span>
                    </div>
                    {onDeleteObligation && (
                      <button
                        type="button"
                        onClick={() => onDeleteObligation(ob.obligation_id)}
                        title="Mark Paid / Remove Bill"
                        className="opacity-40 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 flex items-center gap-2 font-medium">
        <ArrowUpRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>These obligations are locked into your Safety Reserve to prevent any bounced checks or payroll shortfalls.</span>
      </div>

      {/* ADD BILL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                  🗓️
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Schedule Upcoming Bill / Payable</h3>
                  <p className="text-xs text-slate-500 font-medium">Factor future salaries, taxes, or rent into decision checks</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">
                1-Click Bill Presets:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyTemplate('PAYROLL', '3000', 'MANDATORY', 5)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
                >
                  💼 Staff Salaries (₹3k)
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('TAX', '800', 'MANDATORY', 15)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                >
                  🏛️ GST Due 20th (₹800)
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('RENT', '1500', 'MANDATORY', 8)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                >
                  🏢 Shop Rent (₹1.5k)
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('SUPPLIER', '2500', 'HIGH', 10)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                >
                  📦 Supplier Due (₹2.5k)
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                  Bill Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="PAYROLL">💼 Employee Salaries & Staff Payroll</option>
                  <option value="TAX">🏛️ GST, Advance Tax & Compliance</option>
                  <option value="RENT">🏢 Office / Shop / Warehouse Rent</option>
                  <option value="SUPPLIER">📦 Supplier / Raw Material Invoices</option>
                  <option value="LOAN">🏦 Bank Loan / Machinery EMI Lease</option>
                  <option value="UTILITIES">⚡ Electricity, Internet & Utilities</option>
                  <option value="OTHER">📄 Other Discretionary Business Outlay</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="MANDATORY">Mandatory (Must Pay)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="DISCRETIONARY">Discretionary</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Recurs Monthly</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Save & Protect Runway'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

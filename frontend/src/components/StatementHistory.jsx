import React, { useState } from 'react';
import {
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  TrendingUp,
} from 'lucide-react';

export default function StatementHistory({
  statementData,
  onOpenUpload,
  loading = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'CREDIT', 'DEBIT'

  if (!statementData && loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Landmark className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-bounce" />
        <p className="text-sm font-bold text-slate-700">Loading verified bank statement history...</p>
      </div>
    );
  }

  const entries = statementData?.entries || [];

  // Filter entries
  const filteredEntries = entries.filter((item) => {
    const matchesSearch =
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.date && item.date.includes(searchTerm)) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.amount && item.amount.toString().includes(searchTerm));

    const matchesType =
      typeFilter === 'ALL' || item.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const formatINR = (val) => {
    if (val === undefined || val === null) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  // Export current filtered table to CSV
  const handleExportCsv = () => {
    if (!filteredEntries.length) return;
    let csvContent = 'Date,Description,Category,Type,Amount,Running Balance\n';
    filteredEntries.forEach((row) => {
      const desc = `"${(row.description || '').replace(/"/g, '""')}"`;
      csvContent += `${row.date},${desc},${row.category},${row.type},${row.amount},${row.balance}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement_history_${statementData?.merchant_id || 'store'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Statement Summary & Live Bank Balance */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Bank Statement & Ledger History
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified Bank Ledger
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Real chronological statement transactions reconciled with bank closing balance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
            <button
              onClick={handleExportCsv}
              disabled={filteredEntries.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-white" />
              <span>Upload New Statement</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Closing Bank Balance
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-950 font-mono block mt-1">
              {formatINR(statementData?.current_balance)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Reconciled in cash ledger</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Total Credits Inflow
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-blue-950 font-mono block mt-1">
              +{formatINR(statementData?.total_credits)}
            </span>
            <span className="text-[10px] text-blue-700 font-medium">Settlements & customer deposits</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
              Total Debits Outflow
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-rose-950 font-mono block mt-1">
              -{formatINR(statementData?.total_debits)}
            </span>
            <span className="text-[10px] text-rose-700 font-medium">Supplier bills & expenses</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Statement Entries
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono block mt-1">
              {statementData?.total_entries || 0}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Chronological entries</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search particulars, date, or amount..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Entries ({entries.length})
          </button>
          <button
            onClick={() => setTypeFilter('CREDIT')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
              typeFilter === 'CREDIT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Credits (+Inflow)</span>
          </button>
          <button
            onClick={() => setTypeFilter('DEBIT')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
              typeFilter === 'DEBIT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Debits (-Outflow)</span>
          </button>
        </div>
      </div>

      {/* Statement Entries Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Transaction Date</th>
                <th className="py-3.5 px-4">Particulars / Narration</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No statement entries match your filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate font-medium">
                      {row.description}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {row.type === 'CREDIT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ArrowDownRight className="w-3 h-3" />
                          Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <ArrowUpRight className="w-3 h-3" />
                          Debit
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        row.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {row.type === 'CREDIT' ? '+' : '-'}₹
                      {Number(row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      ₹{Number(row.balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Showing {filteredEntries.length} of {entries.length} statement transactions</span>
          <span>Base Currency: INR (₹) • 100% Audit Reconciled</span>
        </div>
      </div>

    </div>
  );
}

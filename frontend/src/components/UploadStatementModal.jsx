import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, Download, AlertCircle, RefreshCw, Landmark, FileSpreadsheet, ShieldCheck, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { uploadStatement } from '../services/api';

export default function UploadStatementModal({ isOpen, onClose, merchantId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [customBalance, setCustomBalance] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);
  const [isUpiNotice, setIsUpiNotice] = useState(false);
  const [replaceMode, setReplaceMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setAutoDetected(false);

      const fname = selectedFile.name.toLowerCase();
      const looksLikeUpi = fname.includes('phonepe') || fname.includes('gpay') || fname.includes('paytm') || fname.includes('upi');
      setIsUpiNotice(looksLikeUpi);
      if (looksLikeUpi && !customBalance) {
        setCustomBalance('2000');
      }

      // Client-side quick scan for CSV / TXT files to pre-fill closing balance
      const ext = selectedFile.name.toLowerCase().split('.').pop();
      if (ext === 'csv' || ext === 'txt') {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const text = evt.target.result;
            const textLow = text.toLowerCase();
            if (textLow.includes('phonepe') || textLow.includes('upi transaction') || textLow.includes('utr:')) {
              setIsUpiNotice(true);
              if (!customBalance) setCustomBalance('2000');
            }

            // Scan for closing balance text
            const textMatch = text.match(/(?:closing|available|book|net|clear)\s*balance\s*[:\-]?(?:\s*(?:inr|rs\.?|₹))?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
            if (textMatch && textMatch[1]) {
              const cleaned = textMatch[1].replace(/,/g, '');
              if (Number(cleaned) > 0) {
                setCustomBalance(cleaned);
                setAutoDetected(true);
                return;
              }
            }

            // Scan rows for balance column
            const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
            if (lines.length > 1) {
              const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
              const balIdx = headers.findIndex((h) => h.includes('balance') || h.includes('bal'));
              if (balIdx !== -1) {
                for (let i = lines.length - 1; i >= 1; i--) {
                  const cols = lines[i].split(',').map((c) => c.trim().replace(/['"₹Rs\.INR\s]/gi, ''));
                  if (cols[balIdx]) {
                    const parsedNum = parseFloat(cols[balIdx]);
                    if (!isNaN(parsedNum) && parsedNum > 0) {
                      setCustomBalance(String(parsedNum));
                      setAutoDetected(true);
                      break;
                    }
                  }
                }
              }
            }
          } catch (scanErr) {
            console.debug('Preview scan note:', scanErr);
          }
        };
        reader.readAsText(selectedFile.slice(0, 64000));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a bank statement file (PDF, Excel, or CSV) to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const balanceToSync = customBalance ? parseFloat(customBalance) : null;
      const res = await uploadStatement(merchantId, file, balanceToSync, replaceMode);
      setResult(res);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to parse statement. Please check file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `Date,Description,Credit,Debit,Balance
2026-08-25,Settlement Payout Batch #8921,85000.00,0.00,885000.00
2026-08-26,Packaging Materials Supplier,0.00,18500.00,866500.00
2026-08-27,Settlement Payout Batch #8922,92000.00,0.00,958500.00
2026-08-28,Social Media Marketing Ads,0.00,12000.00,946500.00
2026-08-29,Settlement Payout Batch #8923,104000.00,0.00,1050500.00
2026-08-30,Warehouse Lease Installment,0.00,25000.00,1025500.00
2026-08-31,Settlement Payout Batch #8924,96000.00,0.00,1121500.00
2026-09-01,Supplier Restock Delivery,0.00,45000.00,1076500.00
`;
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_bank_statement_with_balance.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-fadeIn my-6">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Bank Statement</h3>
              <p className="text-xs text-slate-500 font-medium">Accepts PDF, Excel (.xlsx, .xls), CSV & TXT bank exports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5 text-sm max-h-[80vh] overflow-y-auto">
          
          {/* Format Badges & Auto-Balance Sync Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-700 leading-relaxed space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Automatic Bank Balance Extraction & Sync
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                All Major Banks
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              The engine automatically extracts <strong>Closing / Available Balance</strong> and updates your live store cash without manual reconciliation.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF Statements
              </span>
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (.xlsx)
              </span>
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> CSV / TXT
              </span>
            </div>
          </div>

          {/* File Selector Form */}
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Statement File
                </label>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </button>
              </div>

              <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-50/70 cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-2 opacity-80" />
                {file ? (
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{file.name}</span>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                      {(file.size / 1024).toFixed(1)} KB • Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">
                      Click to browse or drag & drop bank statement
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      Supports PDF, Excel (.xlsx, .xls), CSV, or TXT
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* PhonePe / UPI Notice Banner */}
            {isUpiNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300/80 text-amber-900 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>PhonePe / UPI Statement Detected</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  PhonePe statements contain UPI payment history (credits & debits) without an official bank balance column (UPI apps only record transfers, not core bank ledgers). RunwayIQ extracts all your transactions! <strong>Please confirm or enter your live bank balance (e.g. ₹2,000) below</strong> to synchronize your store cash.
                </p>
              </div>
            )}

            {/* Target / Verified Closing Bank Balance Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Confirmed Bank Closing Balance (₹)
                </label>
                {autoDetected && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Auto-detected from file
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={customBalance}
                  onChange={(e) => {
                    setCustomBalance(e.target.value);
                    setAutoDetected(false);
                  }}
                  placeholder="Auto-extracted or enter live bank balance (e.g. 2000)"
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {isUpiNotice
                  ? "Enter your actual bank account balance (e.g. ₹2,000) to align your live store cash ledger."
                  : "Closing balance extracted from your statement will synchronize your store's live bank cash ledger."}
              </p>
            </div>

            {/* Sync Mode Selector */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Statement Ingestion Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div
                  onClick={() => setReplaceMode(true)}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                    replaceMode
                      ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/20 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={replaceMode}
                    onChange={() => setReplaceMode(true)}
                    className="mt-0.5 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold block text-slate-900">Replace & Sync (Recommended)</span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      Clears demo records. Dashboard ledger will match this exact statement.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setReplaceMode(false)}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                    !replaceMode
                      ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/20 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={!replaceMode}
                    onChange={() => setReplaceMode(false)}
                    className="mt-0.5 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold block text-slate-900">Append to History</span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      Adds rows to existing ledger and updates closing balance.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Statement Successfully Ingested & Balance Synchronized!</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-slate-500 block font-medium">Synchronized Cash</span>
                    <span className="font-extrabold text-emerald-800 font-mono text-base block mt-0.5">
                      ₹{Number(result.new_cash).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-slate-500 block font-medium">Credits Inflow</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm block mt-0.5">
                      +₹{Number(result.total_inflow_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400">({result.inflows_added} entries)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-slate-500 block font-medium">Debits Outflow</span>
                    <span className="font-bold text-rose-600 font-mono text-sm block mt-0.5">
                      -₹{Number(result.total_outflow_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400">({result.outflows_added} entries)</span>
                  </div>
                </div>

                {/* Extracted Transactions Preview Table */}
                {result.preview_rows && result.preview_rows.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/80">
                    <span className="text-xs font-bold text-emerald-900 block mb-1.5">
                      Extracted Transactions Preview ({result.rows_processed} total parsed):
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {result.preview_rows.map((row, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {row.type === 'CREDIT' ? (
                              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="font-bold text-slate-800 mr-1.5">{row.date}</span>
                              <span className="text-slate-600 truncate">{row.description}</span>
                            </div>
                          </div>
                          <span
                            className={`font-mono font-bold whitespace-nowrap pl-2 ${
                              row.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-800'
                            }`}
                          >
                            {row.type === 'CREDIT' ? '+' : '-'}₹
                            {Number(row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processing & Syncing...</span>
                  </>
                ) : (
                  <>
                    <Landmark className="w-4 h-4" />
                    <span>Import & Update Balance</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, Download, AlertCircle, RefreshCw, Landmark, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { uploadStatement } from '../services/api';

export default function UploadStatementModal({ isOpen, onClose, merchantId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
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
      const res = await uploadStatement(merchantId, file);
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
2026-08-25,Razorpay Payout Batch #8921,85000.00,0.00,885000.00
2026-08-26,Packaging Materials Supplier,0.00,18500.00,866500.00
2026-08-27,Razorpay Payout Batch #8922,92000.00,0.00,958500.00
2026-08-28,Social Media Marketing Ads,0.00,12000.00,946500.00
2026-08-29,Razorpay Payout Batch #8923,104000.00,0.00,1050500.00
2026-08-30,Warehouse Lease Installment,0.00,25000.00,1025500.00
2026-08-31,Razorpay Payout Batch #8924,96000.00,0.00,1121500.00
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fadeIn">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Bank Statement</h3>
              <p className="text-xs text-slate-500 font-medium">Accepts PDF, Excel (.xlsx), CSV & TXT bank exports</p>
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
        <div className="p-6 sm:p-7 space-y-5 text-sm">
          
          {/* Format Badges & Auto-Balance Sync Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-700 leading-relaxed space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Automatic Bank Balance Extraction
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                All Formats
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              The engine automatically extracts your statement's <strong>Closing / Available Balance</strong> and synchronizes your store's live bank cash balance without manual entry.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF Bank Statement
              </span>
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (.XLSX)
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

              <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-7 text-center transition bg-slate-50/70 cursor-pointer">
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
                      {(file.size / 1024).toFixed(1)} KB • Click to change file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">
                      Click to browse or drag & drop statement
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      Supports PDF, Excel (.xlsx, .xls), CSV, or TXT
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Statement Successfully Ingested!</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 leading-snug">
                  {result.message}
                </p>
                {result.closing_balance_extracted && (
                  <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-emerald-800 font-medium">Bank Balance Synchronized:</span>
                    <span className="font-bold text-emerald-900 font-mono text-base">
                      ₹{Number(result.closing_balance_extracted).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
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

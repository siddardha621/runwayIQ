import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, Download, AlertCircle, RefreshCw } from 'lucide-react';
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
      setError('Please choose a CSV statement file to upload.');
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

  const handleDownloadSample = () => {
    const sampleCsv = `Date,Description,Amount,Type
2026-08-25,Razorpay Payout Batch #8921,85000.00,INFLOW
2026-08-26,Packaging Materials Supplier,18500.00,OUTFLOW
2026-08-27,Razorpay Payout Batch #8922,92000.00,INFLOW
2026-08-28,Social Media Marketing Ads,12000.00,OUTFLOW
2026-08-29,Razorpay Payout Batch #8923,104000.00,INFLOW
2026-08-30,Warehouse Lease Installment,25000.00,OUTFLOW
2026-08-31,Razorpay Payout Batch #8924,96000.00,INFLOW
2026-09-01,Supplier Restock Delivery,45000.00,OUTFLOW
`;
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_merchant_statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">Upload Merchant Statement</h3>
              <p className="text-[11px] text-slate-400">Import bank settlements or expense CSVs in one click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Format Explanation */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 leading-relaxed">
            <span className="font-bold text-slate-100 block mb-1">Supported Statement Formats:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 font-medium">
              <li>Razorpay Settlement CSV reports (`Date, Amount, Type, Description`)</li>
              <li>Bank statements with `Credit` and `Debit` columns</li>
            </ul>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Need a sample file to test?</span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition underline"
              >
                <Download className="w-3 h-3" />
                Download Sample CSV
              </button>
            </div>
          </div>

          {/* File Selector Form */}
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-2">
                Choose CSV Statement File
              </label>
              <div className="relative border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-2xl p-5 text-center transition bg-slate-950/40">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileText className="w-7 h-7 text-blue-400 mx-auto mb-2 opacity-80" />
                {file ? (
                  <div>
                    <span className="font-bold text-white text-xs block">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • Click to change file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">
                      Click to browse or drag & drop your statement
                    </span>
                    <span className="text-[10px] text-slate-500">Only .csv files supported</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Statement Successfully Ingested!</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-snug">
                  {result.message}
                </p>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition shadow-lg shadow-blue-600/30 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Import & Update Ledger</span>
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

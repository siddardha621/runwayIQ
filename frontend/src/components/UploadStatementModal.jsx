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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Merchant Statement</h3>
              <p className="text-[11px] text-slate-500">Import bank settlements or expense CSVs in one click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Format Explanation */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1">Supported Statement Formats:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
              <li>Razorpay Settlement CSV reports (`Date, Amount, Type, Description`)</li>
              <li>Bank statements with `Credit` and `Debit` columns</li>
            </ul>
            <div className="mt-2.5 pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Need a sample file to test?</span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition underline"
              >
                <Download className="w-3 h-3" />
                Download Sample CSV
              </button>
            </div>
          </div>

          {/* File Selector Form */}
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Choose CSV Statement File
              </label>
              <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center transition bg-slate-50/60">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-80" />
                {file ? (
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{file.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • Click to change file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">
                      Click to browse or drag & drop your statement
                    </span>
                    <span className="text-[10px] text-slate-400">Only .csv files supported</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Statement Successfully Ingested!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-snug">
                  {result.message}
                </p>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
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

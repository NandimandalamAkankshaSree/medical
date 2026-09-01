import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { api } from '../../services/api';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onUploadSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  patientId,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Blood Report');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const documentTypes = [
    'Blood Report',
    'Comprehensive Health Panel',
    'Diabetes & Glycemic Report',
    'Lipid Profile',
    'Thyroid Function Test',
    'Kidney / Renal Panel',
    'Liver Function Test (LFT)',
    'Doctor Prescription',
    'Discharge Summary',
    'Radiology / Scan Report'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF or image medical report to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadDocument(
        file,
        patientId,
        docType,
        reportDate
      );
      setSuccessResult(res);
      setTimeout(() => {
        onUploadSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to process and upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setSuccessResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Upload Medical Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extracts lab biomarkers, indexes for AI chat, and updates your health trends
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 shadow-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-rose-800 dark:text-rose-200">Validation Notice</p>
                <p className="text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {successResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Report Processed & Indexed Successfully!</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Extracted {successResult.parameters_extracted} biomarkers and linked to your personal health records.
              </p>
            </div>
          )}

          {/* Document Type & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Report Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                {documentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Report Date</span>
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
              file
                ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 bg-slate-50 dark:bg-slate-800/50'
            }`}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs mx-auto">
                  {file.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Remove & Choose Another
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-9 h-9 mx-auto text-slate-400 hover:text-teal-500 transition-colors" />
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click or drag & drop medical report file here
                </div>
                <p className="text-[11px] text-slate-400">
                  Supports PDF, Scanned Reports, JPG, PNG (Max 25MB)
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing & Indexing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Analyze & Index Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  ArrowRight,
  Filter,
  Search,
  Upload,
  Trash2,
  GitCompare,
  Download,
  Building2,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { MedicalDocumentSummary, PatientProfile } from '../types';
import { api } from '../services/api';

interface MyReportsViewProps {
  documents: MedicalDocumentSummary[];
  patient: PatientProfile;
  onOpenReportWorkspace: (docId: number) => void;
  onOpenUploadModal: () => void;
  onRefreshDocuments?: () => void;
  onNavigateToVisualizer?: () => void;
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({
  documents,
  patient,
  onOpenReportWorkspace,
  onOpenUploadModal,
  onRefreshDocuments,
  onNavigateToVisualizer
}) => {
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const types = ['All', 'Blood Report', 'Comprehensive', 'Diabetes', 'Lipid', 'Thyroid', 'Kidney', 'Prescription'];

  const filtered = documents.filter((doc) => {
    const matchesType = filterType === 'All' || doc.document_type.toLowerCase().includes(filterType.toLowerCase());
    const matchesQuery = doc.document_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  const handleDelete = async (docId: number, docName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}"?`)) return;
    setDeletingId(docId);
    try {
      await api.deleteDocument(docId);
      if (onRefreshDocuments) onRefreshDocuments();
    } catch (err) {
      console.error(err);
      alert('Failed to delete report.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                My Medical Reports
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your personal diagnostic medical checkups, lab panels, and health reports
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {documents.length} Files
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToVisualizer && (
            <button
              onClick={onNavigateToVisualizer}
              className="px-3.5 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Past vs Present</span>
            </button>
          )}

          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-xs rounded-xl font-medium transition-all ${
                filterType === t
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Reports Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p>No reports matched your search. Upload a new report to get started.</p>
          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Report</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((doc) => {
            return (
              <div
                key={doc.id}
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border ${
                  doc.is_name_mismatch
                    ? 'border-amber-300 dark:border-amber-800/80 shadow-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500'
                } transition-all shadow-sm group flex flex-col justify-between`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    {doc.is_name_mismatch ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>External: {doc.patient_name_extracted || 'Other'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {doc.document_type}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {doc.report_date}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                    {doc.document_name}
                  </h3>

                  {doc.is_name_mismatch && (
                    <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                      ⚠️ <strong>Disclaimer:</strong> This report was issued for <strong>{doc.patient_name_extracted}</strong>. These are not your personal reports.
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {doc.quick_summary || 'Standard laboratory results parsed and verified.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{doc.is_name_mismatch ? `Issued to ${doc.patient_name_extracted}` : 'Personal Document'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(doc.id, doc.document_name)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenReportWorkspace(doc.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white font-semibold transition-all flex items-center gap-1 text-xs"
                    >
                      <span>View & Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};


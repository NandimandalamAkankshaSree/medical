import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  Pill,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { PatientProfile } from '../../types';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
  currentPatientId?: string;
}

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
  currentPatientId
}) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string>('All');

  const conditionsList = ['All', 'Diabetes', 'Lipid', 'Thyroid', 'Kidney', 'Anemia'];

  const loadPatients = async (searchTerm = query, currentPage = page, condition = selectedCondition) => {
    setLoading(true);
    try {
      let q = searchTerm;
      if (condition !== 'All') {
        q = q ? `${q} ${condition}` : condition;
      }
      const data = await api.getPatients(q, currentPage, 12);
      setPatients(data.patients || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPatients(query, page, selectedCondition);
    }
  }, [isOpen, page, selectedCondition]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPatients(query, 1, selectedCondition);
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await api.reindexPatients(100);
      await loadPatients(query, page, selectedCondition);
    } catch (e) {
      console.error(e);
    } finally {
      setReindexing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Select Patient Folder</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {totalCount} Indexed Records
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse through all 500 patient directories or search by name, ID, hospital, or clinical condition.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Patient ID (e.g. patient_001), Name (Priya Menon), or Hospital..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReindex}
              disabled={reindexing}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5 transition-all"
              title="Scan and index any new patient folders placed into data/patients/"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">Sync Folders</span>
            </button>
          </form>

          {/* Condition Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filters:
            </span>
            {conditionsList.map((cond) => (
              <button
                key={cond}
                onClick={() => {
                  setSelectedCondition(cond);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCondition === cond
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-500'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12 space-y-3 text-slate-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium">No patient records matched your search query.</p>
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedCondition('All');
                  loadPatients('', 1, 'All');
                }}
                className="text-xs text-teal-600 dark:text-teal-400 font-semibold underline"
              >
                Clear search filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {patients.map((p) => {
                const isSelected = p.patient_id === currentPatientId;
                return (
                  <div
                    key={p.patient_id}
                    onClick={() => {
                      onSelectPatient(p.patient_id);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group text-left ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-sm ring-1 ring-teal-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-400 bg-white dark:bg-slate-800/80 hover:shadow-md'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 text-teal-600 dark:text-teal-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800/60">
                        {p.patient_id}
                      </span>
                      <span className="text-xs text-slate-400">
                        {p.age ? `${p.age}y` : ''} {p.gender ? `• ${p.gender}` : ''}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {p.full_name}
                    </h3>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {p.hospital_name || 'Medical Center'}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        {p.document_count || 0} Reports
                      </span>
                      <span className="flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-emerald-600" />
                        {p.prescription_count || 0} Rx
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages} ({totalCount} total patients)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

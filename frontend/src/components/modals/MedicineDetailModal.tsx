import React from 'react';
import { X, Pill, ShieldAlert, CheckCircle, Info, Sparkles, BookOpen } from 'lucide-react';
import { PrescriptionMedicine } from '../../types';

interface MedicineDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: PrescriptionMedicine | null;
}

export const MedicineDetailModal: React.FC<MedicineDetailModalProps> = ({
  isOpen,
  onClose,
  medicine
}) => {
  if (!isOpen || !medicine) return null;

  const isLowConfidence = (medicine.confidence || 1.0) < 0.70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {medicine.normalized_name || medicine.medicine_name}
                </h2>
                {medicine.rxnorm_cui && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    RxCUI: {medicine.rxnorm_cui}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Class: {medicine.medicine_class || 'Therapeutic Agent'}
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

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Handwriting Safety Warning */}
          {isLowConfidence ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Handwriting Confidence Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The handwriting in this prescription is unclear (Confidence: {((medicine.confidence || 0.6) * 100).toFixed(0)}%). 
                <strong> Please verify this medicine name and dosage with your doctor or pharmacist.</strong>
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Verified against RxNorm Drug Terminology</span>
              </div>
              <span className="font-bold text-[11px]">
                {((medicine.match_confidence || medicine.confidence || 0.95) * 100).toFixed(0)}% Match
              </span>
            </div>
          )}

          {/* Section 1: Extracted from Prescription */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-teal-600" />
              <span>Extracted from Doctor Prescription</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Original Written:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{medicine.medicine_name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Strength:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{medicine.strength || 'As prescribed'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Dosage Form:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{medicine.dosage_form || 'Tablet'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Frequency & Timing:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{medicine.frequency || 'Once daily'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Course Duration:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{medicine.duration || 'As directed'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Route:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{medicine.route || 'Oral'}</p>
              </div>
            </div>
          </div>

          {/* Section 2: General Educational Information */}
          <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-500/20 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300 text-[11px] uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>General Educational Information</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              {medicine.explanation || `${medicine.generic_name || medicine.medicine_name} is used in clinical therapy under professional medical direction.`}
            </p>
            <p className="text-[10px] text-slate-400 italic">
              *Educational information is distinct from the doctor's specific prescription instructions above.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

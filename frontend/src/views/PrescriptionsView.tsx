import React, { useState } from 'react';
import {
  Pill,
  ShieldAlert,
  Calendar,
  Search
} from 'lucide-react';
import { PrescriptionRecord, PatientProfile, PrescriptionMedicine } from '../types';
import { MedicineDetailModal } from '../components/modals/MedicineDetailModal';

interface PrescriptionsViewProps {
  prescriptions: PrescriptionRecord[];
  patient: PatientProfile;
}

export const PrescriptionsView: React.FC<PrescriptionsViewProps> = ({
  prescriptions,
  patient
}) => {
  const [selectedMed, setSelectedMed] = useState<PrescriptionMedicine | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchesDoc = rx.doctor_name.toLowerCase().includes(q) || rx.hospital_name.toLowerCase().includes(q);
    const matchesMed = rx.medicines?.some(
      (m) => m.medicine_name.toLowerCase().includes(q) || (m.normalized_name && m.normalized_name.toLowerCase().includes(q))
    );
    return matchesDoc || matchesMed;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Prescription Assistant & Medicine Understanding
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              RxNorm Grounded
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Showing all prescribed medications for <strong>{patient.full_name}</strong> with handwriting confidence checks.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine or doctor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 leading-relaxed">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <strong>Handwriting Safety Protocol:</strong> If prescription handwriting or OCR is ambiguous, MediAssist AI does not guess. Medicines with low confidence are clearly flagged for pharmacist/physician verification.
        </div>
      </div>

      {/* Prescriptions List */}
      {filteredPrescriptions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-2">
          <Pill className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p>No prescriptions found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPrescriptions.map((rx) => {
            const isLowConf = rx.ocr_confidence < 0.70;
            return (
              <div
                key={rx.prescription_id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
              >
                {/* Header Information */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Prescription #{rx.prescription_id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isLowConf ? 'badge-low' : 'badge-normal'
                        }`}
                      >
                        Confidence: {(rx.ocr_confidence * 100).toFixed(0)}% ({isLowConf ? 'Low' : 'High'})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Doctor: <strong>Dr. {rx.doctor_name}</strong></span>
                      <span>•</span>
                      <span>Hospital: <strong>{rx.hospital_name}</strong></span>
                    </p>
                  </div>

                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {rx.prescription_date}
                  </span>
                </div>

                {/* Low confidence warning banner */}
                {isLowConf && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>The prescription handwriting is unclear. Please verify this medicine name with your doctor or pharmacist.</span>
                  </div>
                )}

                {/* Structured Medicines Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3">Medicine</th>
                        <th className="pb-3">Strength</th>
                        <th className="pb-3">Dosage Form</th>
                        <th className="pb-3">Frequency</th>
                        <th className="pb-3">Duration</th>
                        <th className="pb-3">Route</th>
                        <th className="pb-3">Verification</th>
                        <th className="pb-3">Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rx.medicines.map((m, mIdx) => (
                        <tr key={mIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                            <div>{m.normalized_name || m.medicine_name}</div>
                            {m.normalized_name !== m.medicine_name && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                (Written: {m.medicine_name})
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                            {m.strength || 'As prescribed'}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            {m.dosage_form || 'Tablet'}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            {m.frequency}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            {m.duration}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            {m.route || 'Oral'}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                (m.confidence || rx.ocr_confidence) >= 0.70
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {((m.confidence || rx.ocr_confidence) * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => setSelectedMed(m)}
                              className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 hover:bg-teal-600 hover:text-white font-semibold transition-all text-[11px]"
                            >
                              Learn More
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal for RxNorm Medicine Detail */}
      <MedicineDetailModal
        isOpen={!!selectedMed}
        onClose={() => setSelectedMed(null)}
        medicine={selectedMed}
      />

    </div>
  );
};

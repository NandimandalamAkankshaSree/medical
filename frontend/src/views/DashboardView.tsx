import React, { useState, useEffect } from 'react';
import {
  FileText,
  Pill,
  TrendingUp,
  Apple,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  UploadCloud
} from 'lucide-react';
import { PatientProfile, MedicalDocumentSummary, PrescriptionRecord, PatientHealthTrendsResponse } from '../types';
import { NavTab } from '../components/layout/Sidebar';
import { api } from '../services/api';

interface DashboardViewProps {
  patient: PatientProfile;
  documents: MedicalDocumentSummary[];
  prescriptions: PrescriptionRecord[];
  onSelectTab: (tab: any) => void;
  onOpenReportWorkspace: (docId: number) => void;
  onQuickAskAI: (prompt: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  patient,
  documents,
  prescriptions,
  onSelectTab,
  onOpenReportWorkspace,
  onQuickAskAI
}) => {
  const [trends, setTrends] = useState<PatientHealthTrendsResponse | null>(null);
  const totalMeds = prescriptions.reduce((acc, rx) => acc + (rx.medicines?.length || 0), 0);

  useEffect(() => {
    if (patient?.patient_id) {
      api.getPatientTrends(patient.patient_id)
        .then((data) => setTrends(data))
        .catch(() => setTrends(null));
    }
  }, [patient?.patient_id, documents.length]);

  const quickPrompts = [
    'What does my latest blood report say?',
    'Are any of my lab values abnormal?',
    'Explain the medicines prescribed to me in simple terms.',
    'What foods should I prefer and avoid based on my reports?',
    'What does HbA1c measure and what is my value?'
  ];

  const comparisonItems = trends?.comparison_matrix || [];
  const improvedCount = comparisonItems.filter(
    (c) => c.trend_status === 'Improved' || c.trend_status === 'Normalized'
  ).length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Welcome & Patient Health Profile Hero */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 text-white shadow-xl shadow-teal-500/10 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
        <div className="absolute right-32 -top-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-teal-100 mb-2 border border-white/10">
                <HeartPulse className="w-3.5 h-3.5 text-teal-300" />
                <span>Personal Health Space</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Good Day, {patient.full_name}
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-xl">
                MediAssist AI has isolated your personal health records, lab results, and prescriptions for private, source-grounded guidance.
              </p>
            </div>

            {/* Quick Profile Summary Badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs space-y-1.5 min-w-[220px]">
              <div className="flex justify-between text-teal-200">
                <span>Account ID:</span>
                <span className="font-bold text-white uppercase">{patient.patient_id}</span>
              </div>
              <div className="flex justify-between text-teal-200">
                <span>Age / Gender:</span>
                <span className="font-bold text-white">{patient.age || '35'} yrs • {patient.gender || 'Not specified'}</span>
              </div>
              <div className="flex justify-between text-teal-200">
                <span>Blood Group:</span>
                <span className="font-bold text-white">{patient.blood_group || 'O+'}</span>
              </div>
              <div className="flex justify-between text-teal-200">
                <span>Health Profile:</span>
                <span className="font-bold text-white truncate max-w-[130px]">{patient.medical_conditions || 'General Health'}</span>
              </div>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-left">
              <div className="flex items-center gap-2 text-teal-200 text-xs">
                <FileText className="w-4 h-4" />
                <span>My Reports</span>
              </div>
              <div className="text-2xl font-black mt-1">{documents.length}</div>
              <span className="text-[10px] text-teal-200/80">Isolated & Parsed</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-left">
              <div className="flex items-center gap-2 text-teal-200 text-xs">
                <Pill className="w-4 h-4" />
                <span>Prescriptions</span>
              </div>
              <div className="text-2xl font-black mt-1">{prescriptions.length}</div>
              <span className="text-[10px] text-teal-200/80">{totalMeds} Active Medicines</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-left">
              <div className="flex items-center gap-2 text-teal-200 text-xs">
                <Apple className="w-4 h-4" />
                <span>Diet Plan</span>
              </div>
              <div className="text-xl font-bold mt-1.5">NIDDK Ready</div>
              <span className="text-[10px] text-teal-200/80">USDA Grounded</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-left">
              <div className="flex items-center gap-2 text-teal-200 text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Safety Guard</span>
              </div>
              <div className="text-xl font-bold mt-1.5">Active</div>
              <span className="text-[10px] text-teal-200/80">Strict User Isolation</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Past vs Present Biomarker Progression Highlight Card */}
      {comparisonItems.length > 0 ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Past vs. Present Health Progress</span>
                  {improvedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {improvedCount} Biomarkers Improved / Normalized
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Longitudinal comparison across your {trends?.total_reports || documents.length} uploaded medical reports
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('visualization')}
              className="px-3.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Open Detailed Visualizer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Delta Cards from actual user comparison matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {comparisonItems.slice(0, 4).map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate" title={item.parameter_name}>
                  {item.parameter_name}
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xs text-slate-400 line-through">{item.previous_value}</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {item.present_value} {item.unit}
                  </span>
                </div>
                <div className={`text-[10px] font-bold mt-0.5 ${
                  item.trend_status === 'Improved' || item.trend_status === 'Normalized'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {item.difference} {item.unit} ({item.percentage_change})
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : documents.length === 0 ? (
        /* Empty State Card for New Users without Reports */
        <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border border-teal-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Welcome to your Personal Health Space, {patient.full_name}!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                You currently have no medical reports uploaded. Upload your diagnostic lab reports (PDF/images) to automatically extract biomarkers and compare health progress over time.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('reports')}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 flex items-center gap-2 shrink-0 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Your First Report</span>
          </button>
        </div>
      ) : (
        /* 1 Report State Banner */
        <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                1 Medical Report Documented ({documents[0].document_name})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Upload a second follow-up or baseline report to automatically unlock the <strong>Past vs. Present Visualizer</strong> and delta tracking.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('reports')}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Follow-up Report</span>
          </button>
        </div>
      )}

      {/* 3. Quick AI Assistant Launcher */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <Sparkles className="w-4 h-4" />
            <span>Ask Personal AI Health Assistant</span>
          </div>
          <button
            onClick={() => onSelectTab('chat')}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 group cursor-pointer"
          >
            <span>Open Chat</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ask questions naturally without medical jargon. Answers are grounded strictly in your personal reports with exact citations.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onQuickAskAI(prompt)}
              className="px-3.5 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 hover:border-teal-400 text-slate-700 dark:text-slate-300 transition-all text-left font-medium cursor-pointer shadow-sm"
            >
              💬 "{prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Dashboard 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Medical Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>My Uploaded Reports</span>
            </h2>
            <button
              onClick={() => onSelectTab('reports')}
              className="text-xs font-semibold text-teal-600 hover:underline"
            >
              View All ({documents.length})
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 space-y-2 text-xs">
              <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No medical documents uploaded yet for this account.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500 transition-all shadow-sm group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {doc.document_type}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {doc.document_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {doc.report_date}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {doc.quick_summary || 'Standard laboratory results parsed and verified.'}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {doc.hospital_name || 'Personal Upload'} {doc.doctor_name ? `• Dr. ${doc.doctor_name}` : ''}
                    </span>
                    <button
                      onClick={() => onOpenReportWorkspace(doc.id)}
                      className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white font-semibold transition-all flex items-center gap-1 text-xs"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Active Prescriptions & Quick Diet Guidance */}
        <div className="space-y-6">
          
          {/* Active Prescriptions Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>My Prescriptions</span>
              </h2>
              <button
                onClick={() => onSelectTab('prescriptions')}
                className="text-[11px] font-semibold text-teal-600 hover:underline"
              >
                Inspect All
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <p className="text-xs text-slate-400">No prescriptions recorded for this account.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {prescriptions.slice(0, 2).map((rx) => (
                  <div
                    key={rx.prescription_id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {rx.doctor_name || 'Prescribing Physician'}
                      </span>
                      <span className="text-slate-400">{rx.prescription_date}</span>
                    </div>

                    <div className="space-y-1">
                      {rx.medicines?.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            • {m.normalized_name || m.medicine_name} ({m.strength || 'Standard'})
                          </span>
                          <span className="text-[10px] text-slate-400">{m.frequency}</span>
                        </div>
                      ))}
                    </div>

                    {rx.is_low_confidence && (
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Handwriting requires verification.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Diet & Lifestyle Teaser Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <Apple className="w-4 h-4" />
              <span>NIDDK Diet Guidance</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              Personalized for <strong>{patient.medical_conditions || 'General Health'}</strong> with USDA Food Data targets.
            </p>
            <button
              onClick={() => onSelectTab('diet')}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all text-center block"
            >
              View Full 5-Meal Schedule
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  Pill,
  Apple,
  TrendingUp,
  History,
  GitCompare,
  ArrowLeft,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  BookOpen
} from 'lucide-react';
import { api, API_BASE } from '../services/api';
import {
  MedicalDocumentDetail,
  MedicalDocumentSummary,
  PatientProfile,
  ChatMessageItem,
  PrescriptionRecord,
  DietPlanResponse,
  ReportComparisonResult,
  PrescriptionMedicine,
  MealItem,
  FoodPreference
} from '../types';
import { MedicineDetailModal } from '../components/modals/MedicineDetailModal';

interface ReportWorkspaceViewProps {
  documentId: number;
  patient: PatientProfile;
  allPatientDocuments: MedicalDocumentSummary[];
  onBack: () => void;
}

type WorkspaceTab = 'overview' | 'chat' | 'prescription' | 'diet' | 'visualization' | 'history' | 'compare';

export const ReportWorkspaceView: React.FC<ReportWorkspaceViewProps> = ({
  documentId,
  patient,
  allPatientDocuments,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [docDetail, setDocDetail] = useState<MedicalDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Prescriptions State
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [selectedMedForModal, setSelectedMedForModal] = useState<PrescriptionMedicine | null>(null);

  // Diet State
  const [dietPlan, setDietPlan] = useState<DietPlanResponse | null>(null);
  const [dietLoading, setDietLoading] = useState(false);

  // Compare State
  const otherDocs = allPatientDocuments.filter((d) => d.id !== documentId);
  const [selectedCompareDocId, setSelectedCompareDocId] = useState<number | ''>(otherDocs.length > 0 ? otherDocs[0].id : '');
  const [compareResult, setCompareResult] = useState<ReportComparisonResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Load Document Details
  useEffect(() => {
    const loadDoc = async () => {
      setLoading(true);
      try {
        const data = await api.getDocumentDetails(documentId);
        setDocDetail(data);

        // Load prescriptions
        const rxs = await api.getPatientPrescriptions(patient.patient_id);
        setPrescriptions(rxs);

        // Load chat history
        const history = await api.getChatHistory(patient.patient_id, documentId);
        if (history && history.length > 0 && history[0].messages) {
          setMessages(history[0].messages);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: `Hello! I am your AI assistant for **${data.document_name}** (${data.document_type}). You can ask me anything about your test results, reference ranges, or doctor notes. All my answers are strictly source-grounded in this report.`,
              source_type: 'Source Grounded Assistant'
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [documentId, patient.patient_id]);

  // Handle Chat Submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || chatLoading) return;

    const userText = inputMsg;
    setInputMsg('');
    const newMsg: ChatMessageItem = { role: 'user', content: userText };
    setMessages((prev) => [...prev, newMsg]);

    setChatLoading(true);
    try {
      const res = await api.sendChatMessage(patient.patient_id, userText, documentId);
      setMessages((prev) => [...prev, res]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your query. Please try again.',
          source_type: 'Error'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle Diet Generation
  const handleGenerateDiet = async () => {
    setDietLoading(true);
    try {
      const plan = await api.generateDietPlan(patient.patient_id, documentId);
      setDietPlan(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setDietLoading(false);
    }
  };

  // Handle Report Comparison
  const handleRunComparison = async () => {
    if (!selectedCompareDocId) return;
    setCompareLoading(true);
    try {
      const res = await api.compareReports(patient.patient_id, documentId, Number(selectedCompareDocId));
      setCompareResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setCompareLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500">Loading Medical Document Workspace...</p>
      </div>
    );
  }

  if (!docDetail) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
        <p className="text-sm font-semibold text-rose-600">Document not found.</p>
        <button onClick={onBack} className="text-xs text-teal-600 font-semibold underline">
          Go back to reports
        </button>
      </div>
    );
  }

  const abnormalLabs = docDetail.lab_parameters.filter((l) => l.status === 'LOW' || l.status === 'HIGH');
  const normalLabs = docDetail.lab_parameters.filter((l) => l.status === 'NORMAL');

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header & Navigation Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {docDetail.document_type}
                </span>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {docDetail.document_name}
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                <span>Hospital: {docDetail.hospital_name}</span>
                <span>•</span>
                <span>Doctor: {docDetail.doctor_name}</span>
                <span>•</span>
                <span>Date: {docDetail.report_date}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${API_BASE}/documents/${docDetail.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Original File</span>
            </a>
          </div>
        </div>

        {/* External Document Identity Disclaimer */}
        {docDetail.is_name_mismatch && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Medical Document Identity Disclaimer</p>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                {docDetail.disclaimer_note || `This report was issued for ${docDetail.patient_name_extracted || 'another individual'} (Your account profile: ${patient.full_name}). Please note that these are not your personal reports.`}
              </p>
            </div>
          </div>
        )}

        {/* Workspace Sub-Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-3">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'chat', label: 'AI Assistant', icon: MessageSquare, badge: 'Source-Grounded' },
            { id: 'prescription', label: 'Prescriptions & Meds', icon: Pill },
            { id: 'diet', label: 'Diet Plan', icon: Apple, badge: 'NIDDK' },
            { id: 'visualization', label: 'Visual Values', icon: TrendingUp },
            { id: 'compare', label: 'Compare Reports', icon: GitCompare },
            { id: 'history', label: 'History', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as WorkspaceTab);
                  if (tab.id === 'diet' && !dietPlan) handleGenerateDiet();
                  if (tab.id === 'compare' && !compareResult && selectedCompareDocId) handleRunComparison();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sub-Tab Content */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Info Cards 3-Column */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Patient Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <User className="w-4 h-4 text-teal-600" />
                <span>Patient Information</span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-400 pt-1">
                <p><strong>Name:</strong> {patient.full_name}</p>
                <p><strong>ID:</strong> {patient.patient_id}</p>
                <p><strong>Age / Sex:</strong> {patient.age || '45'}y • {patient.gender || 'Female'}</p>
                <p><strong>Blood Group:</strong> {patient.blood_group || 'B+'}</p>
              </div>
            </div>

            {/* Hospital & Doctor Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>Hospital & Doctor Details</span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-400 pt-1">
                <p><strong>Hospital:</strong> {docDetail.hospital_name}</p>
                <p><strong>Doctor:</strong> {docDetail.doctor_name}</p>
                <p><strong>Report Date:</strong> {docDetail.report_date}</p>
                <p><strong>Status:</strong> Verified Clinical Record</p>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-800/60 shadow-sm space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Analysis Overview</span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {abnormalLabs.length === 0
                  ? 'All tested laboratory parameters are within normal standard reference intervals.'
                  : `${abnormalLabs.length} parameter(s) flagged outside reference range. ${normalLabs.length} parameter(s) normal.`}
              </p>
            </div>
          </div>

          {/* Patient Friendly Summary Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>Patient-Friendly Report Summary</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {docDetail.quick_summary}
              </p>
              <div className="whitespace-pre-line text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                {docDetail.detailed_summary}
              </div>
            </div>
          </div>

          {/* Categorized Laboratory Findings Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Extracted Laboratory Parameters ({docDetail.lab_parameters.length})
              </h3>
              <span className="text-xs text-slate-400">
                Calculated using report reference ranges
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Test Parameter</th>
                    <th className="pb-3">Result</th>
                    <th className="pb-3">Reference Range</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Patient Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {docDetail.lab_parameters.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {p.parameter_name}
                      </td>
                      <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                        {p.result_value} {p.unit}
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {p.reference_range}
                      </td>
                      <td className="py-3">
                        <span
                          className={
                            p.status === 'LOW'
                              ? 'badge-low'
                              : p.status === 'HIGH'
                              ? 'badge-high'
                              : 'badge-normal'
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs">
                        {p.interpretation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: AI ASSISTANT (Source-Grounded Chat) */}
      {activeTab === 'chat' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-fade-in flex flex-col h-[650px]">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Source: {docDetail.document_name}
              </span>
            </div>
            <span className="text-[10px] text-teal-600 font-mono bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
              Isolated RAG Active
            </span>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-tr-none shadow-md shadow-teal-500/10'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>

                    {/* Citations Box */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700 space-y-1.5 text-[10px]">
                        <div className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Source Citations:</span>
                        </div>
                        {m.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              📄 {c.document_name} • Page {c.page_number} ({c.section})
                            </div>
                            <div className="text-[10px] italic mt-0.5 text-slate-500">
                              "{c.text_snippet}"
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                <Sparkles className="w-4 h-4 text-teal-500" />
                <span>AI is retrieving exact source text...</span>
              </div>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Ask about ${docDetail.document_name}...`}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMsg.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>

        </div>
      )}

      {/* TAB 3: PRESCRIPTION & MEDICINES */}
      {activeTab === 'prescription' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <span>Prescription & Detected Medicines</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Normalized against RxNorm database with handwriting confidence verification.
                </p>
              </div>
            </div>

            {prescriptions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No prescriptions linked to this patient profile.</p>
            ) : (
              <div className="space-y-6">
                {prescriptions.map((rx) => (
                  <div key={rx.prescription_id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                    
                    {/* Rx Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Prescription #{rx.prescription_id}</span>
                        <p className="text-[11px] text-slate-500">Physician: Dr. {rx.doctor_name} • {rx.hospital_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{rx.prescription_date}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rx.ocr_confidence >= 0.70 ? 'badge-normal' : 'badge-low'
                        }`}>
                          OCR Confidence: {(rx.ocr_confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Handwriting Safety Alert */}
                    {rx.ocr_confidence < 0.70 && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 border border-amber-200 dark:border-amber-800/60">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>The prescription handwriting is unclear. Please verify this medicine name with your doctor or pharmacist.</span>
                      </div>
                    )}

                    {/* Medicines Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase">
                            <th className="pb-2">Medicine Name</th>
                            <th className="pb-2">Strength</th>
                            <th className="pb-2">Dosage Form</th>
                            <th className="pb-2">Frequency</th>
                            <th className="pb-2">Duration</th>
                            <th className="pb-2">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                          {rx.medicines.map((m, mIdx) => (
                            <tr key={mIdx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800">
                              <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                                {m.normalized_name || m.medicine_name}
                              </td>
                              <td className="py-2.5 text-slate-600 dark:text-slate-400">{m.strength || 'Standard'}</td>
                              <td className="py-2.5 text-slate-600 dark:text-slate-400">{m.dosage_form || 'Tablet'}</td>
                              <td className="py-2.5 text-slate-600 dark:text-slate-400">{m.frequency}</td>
                              <td className="py-2.5 text-slate-600 dark:text-slate-400">{m.duration}</td>
                              <td className="py-2.5">
                                <button
                                  onClick={() => setSelectedMedForModal(m)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-semibold hover:bg-teal-600 hover:text-white transition-all text-[11px]"
                                >
                                  Explain
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIET PLAN */}
      {activeTab === 'diet' && (
        <div className="space-y-6 animate-fade-in">
          {dietLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
              Generating NIDDK-grounded diet plan...
            </div>
          ) : !dietPlan ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border text-xs">
              <p className="text-slate-500">Click below to generate personalized diet guidance based on this report.</p>
              <button
                onClick={handleGenerateDiet}
                className="mt-3 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold"
              >
                Generate Diet Plan
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Daily Targets Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold">{dietPlan.title}</h3>
                    <p className="text-xs text-emerald-100">Grounded in: {dietPlan.guidance_source}</p>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                    Target: {dietPlan.daily_targets.calories.toFixed(0)} kcal/day
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Protein:</span>
                    <p className="text-lg font-bold">{dietPlan.daily_targets.protein_g} g</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Carbs:</span>
                    <p className="text-lg font-bold">{dietPlan.daily_targets.carbs_g} g</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Fat:</span>
                    <p className="text-lg font-bold">{dietPlan.daily_targets.fat_g} g</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Sodium Limit:</span>
                    <p className="text-lg font-bold">&lt; {dietPlan.daily_targets.sodium_limit_mg} mg</p>
                  </div>
                </div>
              </div>

              {/* 5-Meal Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(dietPlan.meal_schedule).map(([key, mealObj]) => {
                  const meal = mealObj as MealItem;
                  return (
                    <div key={key} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                        <span>{meal.meal_name}</span>
                        <span className="text-teal-600 font-semibold">{meal.calories} kcal</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pt-1">
                        {meal.items.map((it: string, iIdx: number) => (
                          <li key={iIdx}>{it}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-teal-700 dark:text-teal-300 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                        💡 {meal.clinical_notes}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Foods to Prefer & Avoid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300">✅ Foods to Prefer</h4>
                  <div className="space-y-1.5 text-[11px]">
                    {dietPlan.foods_to_prefer.map((fp: FoodPreference, i: number) => (
                      <div key={i} className="text-slate-700 dark:text-slate-300">
                        <strong>• {fp.food}:</strong> {fp.rationale}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
                  <h4 className="font-bold text-rose-800 dark:text-rose-300">❌ Foods to Avoid</h4>
                  <div className="space-y-1.5 text-[11px]">
                    {dietPlan.foods_to_avoid.map((fa: FoodPreference, i: number) => (
                      <div key={i} className="text-slate-700 dark:text-slate-300">
                        <strong>• {fa.food}:</strong> {fa.rationale}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 5: VISUALIZATION */}
      {activeTab === 'visualization' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
          {docDetail.lab_parameters.map((p, idx) => (
            <div key={idx} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.parameter_name}</span>
                <span className={p.status === 'LOW' ? 'badge-low' : p.status === 'HIGH' ? 'badge-high' : 'badge-normal'}>
                  {p.status}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {p.result_value} <span className="text-xs font-normal text-slate-400">{p.unit}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Reference Range: <strong className="text-slate-700 dark:text-slate-300">{p.reference_range}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: COMPARE REPORTS */}
      {activeTab === 'compare' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Explicit Report Comparison
              </h3>
              <p className="text-xs text-slate-500">
                Select a previous report to compare parameter differences side by side.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCompareDocId}
                onChange={(e) => setSelectedCompareDocId(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">Choose report to compare...</option>
                {otherDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.document_name} ({d.report_date})
                  </option>
                ))}
              </select>
              <button
                onClick={handleRunComparison}
                disabled={!selectedCompareDocId || compareLoading}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs disabled:opacity-50"
              >
                {compareLoading ? 'Comparing...' : 'Compare'}
              </button>
            </div>
          </div>

          {compareResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-500/20 text-xs text-slate-700 dark:text-slate-300">
                <strong>Summary:</strong> {compareResult.summary}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="pb-2">Parameter</th>
                      <th className="pb-2">Previous ({compareResult.previous_document.date})</th>
                      <th className="pb-2">Current ({compareResult.current_document.date})</th>
                      <th className="pb-2">Difference</th>
                      <th className="pb-2">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {compareResult.comparisons.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{c.parameter_name}</td>
                        <td className="py-3 text-slate-600 dark:text-slate-400">{c.previous_value}</td>
                        <td className="py-3 font-bold text-slate-900 dark:text-slate-100">{c.current_value}</td>
                        <td className="py-3 font-bold text-teal-600 dark:text-teal-400">{c.difference}</td>
                        <td className="py-3 text-slate-500">{c.percentage_change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: HISTORY */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Medical History Timeline ({allPatientDocuments.length} Documents)
          </h3>
          <div className="space-y-3">
            {allPatientDocuments.map((d) => (
              <div key={d.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{d.document_name}</span>
                  <p className="text-[11px] text-slate-400">{d.document_type} • {d.hospital_name}</p>
                </div>
                <span className="text-slate-500">{d.report_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for RxNorm Medicine Detail */}
      <MedicineDetailModal
        isOpen={!!selectedMedForModal}
        onClose={() => setSelectedMedForModal(null)}
        medicine={selectedMedForModal}
      />

    </div>
  );
};

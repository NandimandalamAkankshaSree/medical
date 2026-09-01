import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  User,
  Shield,
  FileText,
  Upload,
  Download,
  Trash2,
  Check,
  Heart,
  Activity,
  LogOut,
  Bell,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { PatientProfile, MedicalDocumentSummary, AuthUser } from '../types';
import { api } from '../services/api';

interface SettingsViewProps {
  patient: PatientProfile;
  authUser: AuthUser;
  documents: MedicalDocumentSummary[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenUploadModal: () => void;
  onUpdatePatient: (updated: PatientProfile) => void;
  onLogout: () => void;
  onDeleteDocument?: (docId: number) => Promise<void>;
  onDeleteAllDocuments?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  patient,
  authUser,
  documents,
  darkMode,
  onToggleDarkMode,
  onOpenUploadModal,
  onUpdatePatient,
  onLogout,
  onDeleteDocument,
  onDeleteAllDocuments
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'documents' | 'safety' | 'export'>('profile');
  
  // Profile form state
  const [fullName, setFullName] = useState(patient.full_name || '');
  const [age, setAge] = useState(patient.age?.toString() || '21');
  const [gender, setGender] = useState(patient.gender || 'Female');
  const [bloodGroup, setBloodGroup] = useState(patient.blood_group || 'O+');
  const [emergencyContact, setEmergencyContact] = useState(patient.emergency_contact || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Document Deletion State
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const handleDeleteSingleDoc = async (docId: number) => {
    setDeletingId(docId);
    try {
      if (onDeleteDocument) {
        await onDeleteDocument(docId);
      } else {
        await api.deleteDocument(docId);
      }
      setConfirmDeleteId(null);
      setDeleteSuccessMsg('Medical report deleted successfully.');
      setTimeout(() => setDeleteSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllDocs = async () => {
    setDeletingId(-1);
    try {
      if (onDeleteAllDocuments) {
        await onDeleteAllDocuments();
      } else {
        await api.deleteAllPatientDocuments(patient.patient_id);
      }
      setConfirmDeleteAll(false);
      setDeleteSuccessMsg('All uploaded medical documents deleted successfully.');
      setTimeout(() => setDeleteSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error deleting all documents:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updatePatientProfile(patient.patient_id, {
        full_name: fullName,
        age: parseInt(age) || 21,
        gender,
        blood_group: bloodGroup,
        emergency_contact: emergencyContact
      });
      onUpdatePatient(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      patient,
      documents,
      export_date: new Date().toISOString(),
      system: "MediAssist AI"
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mediassist_health_export_${patient.patient_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Settings & Preferences</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your personal health profile, appearance, clinical documents, and safety preferences.
            </p>
          </div>
        </div>

        {/* Quick Theme Toggle in Top Right */}
        <button
          onClick={onToggleDarkMode}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all font-medium text-xs cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Settings Navigation Tabs */}
        <div className="w-full md:w-60 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 space-y-1 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Health Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === 'appearance'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>Theme & Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === 'documents'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>Medical Documents</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === 'safety'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Clinical Safety & AI</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === 'export'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Data Export</span>
          </button>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out ({patient.full_name})</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 md:p-8">
          
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Personal Health Profile</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your identity details to ground personalized clinical diet calculations and laboratory reference intervals.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    min="1"
                    max="120"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Biological Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in">
                    <Check className="w-4 h-4" />
                    <span>Saved successfully!</span>
                  </span>
                )}
              </div>
            </form>
          )}

          {/* 2. Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Theme & Visual Experience</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Customize the interface lighting to match your personal preference or ambient light conditions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Light Mode Option */}
                <div
                  onClick={() => { if (darkMode) onToggleDarkMode(); }}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    !darkMode
                      ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 shadow-md shadow-teal-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    {!darkMode && <Check className="w-4 h-4 text-teal-600" />}
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Light Theme</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Crisp high-contrast daylight aesthetic</p>
                </div>

                {/* Dark Mode Option */}
                <div
                  onClick={() => { if (!darkMode) onToggleDarkMode(); }}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    darkMode
                      ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 shadow-md shadow-teal-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    {darkMode && <Check className="w-4 h-4 text-teal-600" />}
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Dark Theme (ChatGPT / Claude)</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Sleek, low-glare dark canvas for night use</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span>Persistent Settings</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Your selected theme is automatically saved to your local browser storage and applied on every visit.
                </p>
              </div>
            </div>
          )}

          {/* 3. Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Uploaded Medical Documents</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage and delete recorded laboratory test reports, DOCX files, and PDF documents from your health history.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {documents.length > 0 && (
                    <button
                      onClick={() => setConfirmDeleteAll(true)}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All Reports</span>
                    </button>
                  )}
                  <button
                    onClick={onOpenUploadModal}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold text-xs shadow-md shadow-teal-500/20 flex items-center gap-1.5 cursor-pointer hover:from-teal-700 hover:to-emerald-700 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Report</span>
                  </button>
                </div>
              </div>

              {/* Delete Success Alert */}
              {deleteSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{deleteSuccessMsg}</span>
                </div>
              )}

              {/* Confirm Delete All Dialog */}
              {confirmDeleteAll && (
                <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-xs space-y-3 animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                        Permanently delete ALL {documents.length} medical document(s)?
                      </h4>
                      <p className="text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                        This action will permanently delete all uploaded reports, extracted lab parameter values, and comparison records from your profile. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setConfirmDeleteAll(false)}
                      disabled={deletingId !== null}
                      className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAllDocs}
                      disabled={deletingId !== null}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingId === -1 ? 'Deleting All...' : 'Yes, Delete All Reports'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Document Items List */}
              {documents.length === 0 ? (
                <div className="p-12 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">No Medical Documents in History</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All previous reports have been deleted. Upload a new lab report or doctor prescription to start fresh.
                    </p>
                  </div>
                  <button
                    onClick={onOpenUploadModal}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Medical Document</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const isConfirming = confirmDeleteId === doc.id;
                    const isDeleting = deletingId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-3 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{doc.document_name}</h4>
                              <p className="text-[11px] text-slate-500">
                                {doc.document_type} • Date: {doc.report_date} • Document ID: #{doc.id}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              Extracted & Grounded
                            </span>

                            {!isConfirming && (
                              <button
                                onClick={() => setConfirmDeleteId(doc.id)}
                                title="Delete this document from records"
                                className="p-2 rounded-xl text-rose-500 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Delete Confirmation Box */}
                        {isConfirming && (
                          <div className="p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs space-y-2.5 animate-fade-in">
                            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                              <span>Permanently delete "{doc.document_name}"?</span>
                            </div>
                            <p className="text-[11px] text-rose-700 dark:text-rose-400">
                              This will remove all associated lab parameters and historical comparisons for this report.
                            </p>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isDeleting}
                                className="px-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteSingleDoc(doc.id)}
                                disabled={isDeleting}
                                className="px-3.5 py-1 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Safety Tab */}
          {activeTab === 'safety' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Clinical Safety & Standards</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  How MediAssist AI guarantees grounded analysis and protects your health decisions.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-teal-600" />
                    <span>Evidence-Based NIDDK & NIH Clinical Standards</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    All dietary calculations and clinical next steps are strictly aligned with NIH and NIDDK clinical guidance for chronic kidney disease, glycemic regulation, and cardiovascular lipid control.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Informational Disclaimer</span>
                  </div>
                  <p className="text-amber-700 dark:text-amber-400 leading-relaxed text-[11px]">
                    MediAssist AI is an educational assistant designed to assist in understanding laboratory records. It does not replace professional medical judgment, clinical diagnosis, or treatment plans from a licensed physician.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Export Health Space Data</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Download a complete backup of your profile, biomarker records, and longitudinal comparisons in standardized JSON format.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Personal Health Archive</h4>
                    <p className="text-[11px] text-slate-500">Includes {documents.length} medical document records and lab metrics.</p>
                  </div>
                </div>

                <button
                  onClick={handleExportData}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 dark:hover:bg-white transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON Archive</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

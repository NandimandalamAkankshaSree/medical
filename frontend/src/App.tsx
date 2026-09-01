import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { ProfileEditModal } from './components/modals/ProfileEditModal';
import { UploadDocumentModal } from './components/modals/UploadDocumentModal';
import { LoginView } from './views/LoginView';

import { GlobalChatView } from './views/GlobalChatView';
import { HealthVisualizationView } from './views/HealthVisualizationView';
import { DietNutritionView } from './views/DietNutritionView';
import { FindHospitalsView } from './views/FindHospitalsView';
import { SettingsView } from './views/SettingsView';
import { ReportWorkspaceView } from './views/ReportWorkspaceView';

import { api } from './services/api';
import { PatientProfile, MedicalDocumentSummary, PrescriptionRecord, AuthUser } from './types';
import {
  Menu,
  Moon,
  Sun,
  Upload,
  Settings,
  User,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Apple,
  Building2
} from 'lucide-react';

export function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('mediassist_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Default to chat tab (ChatGPT / Claude style)
  const [currentTab, setCurrentTab] = useState<NavTab>('chat');
  const [currentPatientId, setCurrentPatientId] = useState<string>(
    authUser?.patient_id || 'my_health_profile'
  );
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [documents, setDocuments] = useState<MedicalDocumentSummary[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [selectedWorkspaceDocId, setSelectedWorkspaceDocId] = useState<number | null>(null);

  // Modals & Chat state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [initialChatPrompt, setInitialChatPrompt] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme Management (Dark Mode / Light Mode with localStorage persistence)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('mediassist_theme');
    if (savedTheme !== null) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mediassist_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mediassist_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Load Personal Health Profile Data
  const loadPersonalData = async (targetPatientId?: string) => {
    const pid = targetPatientId || authUser?.patient_id || currentPatientId;
    if (!pid) return;
    try {
      const pData = await api.getMyProfile(pid);
      setPatient(pData);
      setCurrentPatientId(pData.patient_id);

      const docs = await api.getPatientDocuments(pData.patient_id);
      setDocuments(docs);

      const rxs = await api.getPatientPrescriptions(pData.patient_id);
      setPrescriptions(rxs);
    } catch (err) {
      console.error('Error loading personal health profile:', err);
    }
  };

  useEffect(() => {
    if (authUser && authUser.patient_id) {
      loadPersonalData(authUser.patient_id);
    }
  }, [authUser]);

  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setCurrentPatientId(user.patient_id);
    setCurrentTab('chat');
    loadPersonalData(user.patient_id);
  };

  const handleLogout = () => {
    api.logout();
    setAuthUser(null);
    setPatient(null);
    setDocuments([]);
    setPrescriptions([]);
    setSelectedWorkspaceDocId(null);
    setCurrentPatientId('');
  };

  const handleNewChat = () => {
    setSelectedWorkspaceDocId(null);
    setInitialChatPrompt('');
    setCurrentTab('chat');
  };

  const handleQuickAskAI = (prompt: string) => {
    setInitialChatPrompt(prompt);
    setSelectedWorkspaceDocId(null);
    setCurrentTab('chat');
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await api.deleteDocument(docId);
      if (selectedWorkspaceDocId === docId) {
        setSelectedWorkspaceDocId(null);
      }
      await loadPersonalData(currentPatientId);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleDeleteAllDocuments = async () => {
    try {
      await api.deleteAllPatientDocuments(currentPatientId);
      setSelectedWorkspaceDocId(null);
      await loadPersonalData(currentPatientId);
    } catch (err) {
      console.error('Failed to delete all documents:', err);
    }
  };

  // If user is not logged in, render the Login/Registration portal
  if (!authUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'chat': return 'Personal AI Chatbot';
      case 'visualization': return 'Health Trends & Past vs Present Visualizer';
      case 'diet': return 'Personalized Clinical Diet & Nutrition';
      case 'hospitals': return 'Find Hospitals & Specialists';
      case 'settings': return 'Settings & Account Preferences';
      default: return 'MediAssist AI';
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors flex font-sans">
      
      {/* 1. Left ChatGPT / Claude Style Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedWorkspaceDocId(null);
          setMobileMenuOpen(false);
        }}
        patient={patient}
        authUser={authUser}
        documents={documents}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onNewChat={handleNewChat}
        onOpenUploadModal={() => setUploadModalOpen(true)}
        onLogout={handleLogout}
        onDeleteDocument={handleDeleteDocument}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Main ChatGPT / Claude Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Minimal Utility Header */}
        <header className="h-14 px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 select-none z-20">
          
          {/* Left Title & Mobile Menu */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                {selectedWorkspaceDocId ? 'Medical Document Inspection' : getTabTitle(currentTab)}
              </span>
            </div>
          </div>

          {/* Right Action Tools: Upload Report, Theme Switch, Patient Pill */}
          <div className="flex items-center gap-2.5">
            
            {/* Upload Document Button */}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-sm cursor-pointer transition-all active:scale-98"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Report</span>
            </button>

            {/* Quick Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Patient Profile Pill */}
            <div
              onClick={() => setCurrentTab('settings')}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500 cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">
                {patient?.full_name?.charAt(0) || 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:inline truncate max-w-[120px]">
                {patient?.full_name || 'Patient'}
              </span>
            </div>

          </div>
        </header>

        {/* Main Central Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
          
          {selectedWorkspaceDocId ? (
            <ReportWorkspaceView
              documentId={selectedWorkspaceDocId}
              patient={patient || ({ patient_id: currentPatientId, full_name: authUser.full_name } as any)}
              allPatientDocuments={documents}
              onBack={() => setSelectedWorkspaceDocId(null)}
            />
          ) : (
            <>
              {/* 1. Chatbot View (Primary ChatGPT / Claude Interface) */}
              {currentTab === 'chat' && patient && (
                <GlobalChatView
                  patient={patient}
                  documents={documents}
                  initialPrompt={initialChatPrompt}
                  onOpenUploadModal={() => setUploadModalOpen(true)}
                  onSelectTab={(tab) => setCurrentTab(tab)}
                />
              )}

              {/* 2. Trends & Past vs Present Visualizer */}
              {currentTab === 'visualization' && patient && (
                <HealthVisualizationView
                  patient={patient}
                  onAskAI={handleQuickAskAI}
                />
              )}

              {/* 3. Diet Plan (NIDDK & USDA) */}
              {currentTab === 'diet' && patient && (
                <DietNutritionView
                  patient={patient}
                />
              )}

              {/* 4. Hospitals & Doctors */}
              {currentTab === 'hospitals' && (
                <FindHospitalsView />
              )}

              {/* 5. Settings View */}
              {currentTab === 'settings' && patient && (
                <SettingsView
                  patient={patient}
                  authUser={authUser}
                  documents={documents}
                  darkMode={darkMode}
                  onToggleDarkMode={toggleDarkMode}
                  onOpenUploadModal={() => setUploadModalOpen(true)}
                  onUpdatePatient={(updated) => setPatient(updated)}
                  onLogout={handleLogout}
                  onDeleteDocument={handleDeleteDocument}
                  onDeleteAllDocuments={handleDeleteAllDocuments}
                />
              )}
            </>
          )}

        </main>
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={uploadModalOpen}
        patientId={currentPatientId}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={() => {
          loadPersonalData(currentPatientId);
          setUploadModalOpen(false);
        }}
      />

      {/* Profile Edit Modal */}
      {profileModalOpen && patient && (
        <ProfileEditModal
          isOpen={profileModalOpen}
          patient={patient}
          onClose={() => setProfileModalOpen(false)}
          onProfileUpdated={(updated) => {
            setPatient(updated);
            setProfileModalOpen(false);
          }}
        />
      )}

    </div>
  );
}

export default App;

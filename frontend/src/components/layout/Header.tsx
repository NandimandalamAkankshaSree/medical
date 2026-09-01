import React from 'react';
import {
  Activity,
  User,
  Upload,
  Moon,
  Sun,
  ShieldCheck,
  Edit3,
  Sparkles,
  LogOut
} from 'lucide-react';
import { PatientProfile, AuthUser } from '../../types';

interface HeaderProps {
  currentPatient: PatientProfile | null;
  authUser?: AuthUser | null;
  onOpenProfileModal: () => void;
  onOpenUploadModal: () => void;
  onLogout?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPatient,
  authUser,
  onOpenProfileModal,
  onOpenUploadModal,
  onLogout,
  darkMode,
  onToggleDarkMode
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                MediAssist AI
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Personal AI Assistant
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Your Personal Health Reports, Multi-Report Trends & AI Medical Chatbot
            </p>
          </div>
        </div>

        {/* Center: My Health Profile Quick Action */}
        <div className="flex items-center">
          <button
            onClick={onOpenProfileModal}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 hover:border-teal-400 transition-all text-left group shadow-sm cursor-pointer"
            title="Click to view and edit your personal health profile"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider flex items-center gap-1">
                <span>My Health Profile</span>
                <Edit3 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>{currentPatient ? currentPatient.full_name : authUser?.full_name || 'My Profile'}</span>
                {currentPatient?.blood_group && (
                  <span className="px-1.5 py-0.2 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                    {currentPatient.blood_group}
                  </span>
                )}
                {currentPatient?.age && (
                  <span className="text-slate-400 text-[10px] font-normal">
                    {currentPatient.age} yrs
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Right: Upload, Theme & Logout */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Report</span>
          </button>

          <button
            onClick={onToggleDarkMode}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center justify-center transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};



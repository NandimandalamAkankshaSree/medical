import React from 'react';
import {
  MessageSquare,
  TrendingUp,
  Apple,
  Building2,
  Settings,
  Plus,
  Moon,
  Sun,
  LogOut,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  UserCheck,
  Trash2
} from 'lucide-react';
import { PatientProfile, MedicalDocumentSummary, AuthUser } from '../../types';

export type NavTab = 'chat' | 'visualization' | 'diet' | 'hospitals' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  patient: PatientProfile | null;
  authUser: AuthUser | null;
  documents: MedicalDocumentSummary[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNewChat: () => void;
  onOpenUploadModal: () => void;
  onLogout: () => void;
  onDeleteDocument?: (docId: number) => Promise<void>;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  patient,
  authUser,
  documents,
  darkMode,
  onToggleDarkMode,
  onNewChat,
  onOpenUploadModal,
  onLogout,
  onDeleteDocument,
  collapsed = false,
  onToggleCollapse
}) => {
  const navItems = [
    {
      id: 'chat' as NavTab,
      label: 'AI Chatbot',
      icon: MessageSquare,
      badge: null,
      description: 'Personalized Medical Document Assistant'
    },
    {
      id: 'visualization' as NavTab,
      label: 'Health Trends',
      icon: TrendingUp,
      badge: 'Past vs Present',
      description: 'Longitudinal Lab Trends & Delta Matrix'
    },
    {
      id: 'diet' as NavTab,
      label: 'Diet Plan',
      icon: Apple,
      badge: 'NIDDK / USDA',
      description: 'Clinical Nutrition & Meal Schedules'
    },
    {
      id: 'hospitals' as NavTab,
      label: 'Find Hospitals',
      icon: Building2,
      badge: '5000+',
      description: 'Search Nearby Centers & Specialists'
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
      description: 'Account, Vitals, Theme & Data'
    }
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-68'
      } shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800/80 flex flex-col h-screen transition-all duration-300 select-none z-30`}
    >
      {/* Top Header: Brand & New Chat */}
      <div className="p-4 space-y-3 border-b border-slate-800/80">
        
        {/* Brand Bar */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => onSelectTab('chat')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>MediAssist AI</span>
                </h1>
                <p className="text-[10px] text-teal-400 font-mono uppercase tracking-wider font-semibold">
                  Personal Health AI
                </p>
              </div>
            )}
          </div>

          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* ChatGPT / Claude Style "+ New Chat" Button */}
        <button
          onClick={() => {
            onNewChat();
            onSelectTab('chat');
          }}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer hover:shadow-teal-500/30 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-none">
        
        {!collapsed && (
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Main Navigation
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-teal-400 font-semibold shadow-inner border border-teal-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && <span>{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Uploaded Documents Quick Access */}
        {!collapsed && documents.length > 0 && (
          <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-2">
            <div className="px-3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Your Reports ({documents.length})</span>
              <button
                onClick={onOpenUploadModal}
                className="text-teal-400 hover:underline cursor-pointer lowercase text-[10px]"
              >
                + upload
              </button>
            </div>
            <div className="space-y-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="px-3 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <div
                    onClick={() => onSelectTab('chat')}
                    className="flex items-center gap-2 truncate flex-1 min-w-0"
                  >
                    <FileText className="w-3 h-3 text-teal-500 shrink-0" />
                    <span className="truncate">{doc.document_name}</span>
                  </div>

                  {onDeleteDocument && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Permanently delete "${doc.document_name}" from your health profile?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      title="Delete Report"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom User Card & Theme Switcher (ChatGPT / Claude bottom panel) */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/70 space-y-2">
        
        {/* User Pill */}
        <div
          onClick={() => onSelectTab('settings')}
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } p-2 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer group`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {patient?.full_name?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-semibold text-xs text-white truncate flex items-center gap-1">
                  <span>{patient?.full_name || 'Patient'}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {patient?.blood_group || 'O+'} • {patient?.age || '21'} yrs
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-teal-400 transition-colors" />
          )}
        </div>

        {/* Action Buttons: Theme Toggle & Sign Out */}
        {!collapsed && (
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer border border-slate-700/50"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dark</span>
                </>
              )}
            </button>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer border border-slate-700/50"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

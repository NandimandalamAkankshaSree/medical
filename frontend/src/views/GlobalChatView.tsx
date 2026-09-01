import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  CheckCircle2,
  FileText,
  Shield,
  Layers,
  Paperclip,
  Copy,
  Check,
  Volume2,
  Trash2,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  TrendingUp,
  Activity,
  Apple
} from 'lucide-react';
import { api } from '../services/api';
import { PatientProfile, MedicalDocumentSummary, ChatMessageItem } from '../types';

interface GlobalChatViewProps {
  patient: PatientProfile;
  documents: MedicalDocumentSummary[];
  initialPrompt?: string;
  onOpenUploadModal: () => void;
  onSelectTab: (tab: any) => void;
}

interface ConversationSession {
  conversation_id: number;
  title: string;
  document_id?: number;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string;
  messages: ChatMessageItem[];
}

export const GlobalChatView: React.FC<GlobalChatViewProps> = ({
  patient,
  documents,
  initialPrompt,
  onOpenUploadModal,
  onSelectTab
}) => {
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<number | ''>('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMsg, setInputMsg] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(true);
  const [historySearch, setHistorySearch] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const samplePrompts = [
    {
      title: 'Compare Reports & Delta',
      prompt: 'Compare my previous and present reports and explain what changed.',
      icon: TrendingUp,
      desc: 'Biomarker differences, % shifts & trajectory'
    },
    {
      title: 'Clinical Action Steps',
      prompt: 'What clinical steps should be taken for my reports?',
      icon: Shield,
      desc: 'Nephrology follow-up, medications & precautions'
    },
    {
      title: 'Kidney Function Status',
      prompt: 'How is my kidney function and creatinine level?',
      icon: Activity,
      desc: 'eGFR filtration, BUN, electrolytes & urine'
    },
    {
      title: 'Clinical Diet Guidance',
      prompt: 'What diet plan and foods should I eat based on my current test results?',
      icon: Apple,
      desc: 'NIDDK / USDA customized 5-meal schedule'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load all conversation history from backend
  const loadConversations = async (selectLatest = false) => {
    try {
      const history: ConversationSession[] = await api.getChatHistory(
        patient.patient_id,
        selectedDocId ? Number(selectedDocId) : undefined
      );
      setConversations(history || []);

      if (selectLatest && history && history.length > 0) {
        setActiveConvId(history[0].conversation_id);
        setMessages(history[0].messages || []);
      } else if (activeConvId) {
        const current = history.find((c) => c.conversation_id === activeConvId);
        if (current) {
          setMessages(current.messages || []);
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, [patient.patient_id, selectedDocId, documents.length]);

  useEffect(() => {
    if (initialPrompt) {
      sendQuery(initialPrompt);
    }
  }, [initialPrompt]);

  // Select a past conversation
  const handleSelectConversation = (conv: ConversationSession) => {
    setActiveConvId(conv.conversation_id);
    setSelectedDocId(conv.document_id || '');
    setMessages(conv.messages || []);
  };

  // Start a fresh new chat session
  const handleStartNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInputMsg('');
  };

  // Delete a single conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.conversation_id !== convId));
      if (activeConvId === convId) {
        handleStartNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Clear all chat history
  const handleClearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all chat conversations?')) return;
    try {
      await api.clearChatHistory(patient.patient_id);
      setConversations([]);
      setMessages([]);
      setActiveConvId(null);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const sendQuery = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userText = textToSend.trim();
    setInputMsg('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const newMsg: ChatMessageItem = { role: 'user', content: userText };
    setMessages((prev) => [...prev, newMsg]);

    setLoading(true);
    try {
      const res: any = await api.sendChatMessage(
        patient.patient_id,
        userText,
        selectedDocId ? Number(selectedDocId) : undefined,
        activeConvId ? Number(activeConvId) : undefined
      );

      setMessages((prev) => [...prev, res]);

      // If this was a new conversation, set activeConvId from the response
      if (res.conversation_id) {
        setActiveConvId(res.conversation_id);
      }

      // Reload conversations list to reflect the updated title and messages
      loadConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an issue analyzing your medical records. Please check your connection and try again.',
          source_type: 'System Alert'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery(inputMsg);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[#*`_~]/g, '').slice(0, 350);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Filter conversations by search term
  const filteredConversations = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (c.last_message || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-2rem)] max-w-7xl mx-auto gap-4 pb-2 animate-fade-in relative">
      
      {/* 1. Left Chat History Sidebar / Drawer (ChatGPT / Claude Style) */}
      <div
        className={`${
          showHistorySidebar ? 'w-72 lg:w-80 flex' : 'hidden'
        } flex-col shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden transition-all duration-300`}
      >
        {/* History Header & + New Chat Button */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Chat History</span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500">
                {conversations.length}
              </span>
            </div>
            <button
              onClick={() => setShowHistorySidebar(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Close history drawer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-sm shadow-teal-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation Chat</span>
          </button>

          {/* Search Box */}
          {conversations.length > 2 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search past conversations..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}
        </div>

        {/* Conversation List Stream */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {conversations.length === 0 ? 'No past conversations yet.' : 'No matching chat found.'}
              </p>
              <p className="text-[10px] text-slate-400">
                {conversations.length === 0 ? 'Start asking a question to create your first session.' : 'Try a different keyword.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = activeConvId === conv.conversation_id;
              const dateStr = conv.updated_at ? new Date(conv.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';

              return (
                <div
                  key={conv.conversation_id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`group relative flex items-start gap-2.5 p-3 rounded-2xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 shadow-xs'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 ${
                      isActive
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-teal-600'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          isActive
                            ? 'text-teal-900 dark:text-teal-200'
                            : 'text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                        }`}
                      >
                        {conv.title || 'Medical Consultation'}
                      </p>
                    </div>

                    {conv.last_message && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {conv.last_message}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{conv.message_count || conv.messages?.length || 0} msgs</span>
                      {conv.document_id && (
                        <>
                          <span>•</span>
                          <span className="text-teal-600 dark:text-teal-400 font-medium">Report #{conv.document_id}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Hover Delete Button */}
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.conversation_id)}
                    title="Delete conversation"
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Clear All Footer */}
        {conversations.length > 0 && (
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={handleClearAllHistory}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Chat Conversation Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Controls Sub-Header */}
        <div className="py-2.5 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Toggle History Sidebar Button */}
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors"
              title={showHistorySidebar ? 'Hide chat history' : 'Show chat history'}
            >
              {showHistorySidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Personal AI Assistant</span>
                {activeConvId && (
                  <span className="text-[10px] font-mono bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded">
                    Session #{activeConvId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Grounded in <strong>{documents.length} recorded report(s)</strong> for {patient.full_name}
              </p>
            </div>
          </div>

          {/* Scope Dropdown & New Chat */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value ? Number(e.target.value) : '')}
                className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="">🌟 All Reports (Multi-Report Longitudinal Scope)</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    📄 {d.document_name} ({d.report_date})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartNewChat}
              title="Start a new chat conversation"
              className="p-2 rounded-xl text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer border border-teal-200 dark:border-teal-800 flex items-center gap-1 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Main Chat Stream Container */}
        <div className="flex-1 overflow-y-auto px-2 space-y-6 scroll-smooth pr-1">
          
          {/* If New Chat / No Messages: Render Hero Welcome & Prompt Cards */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-6 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-xl shadow-teal-500/20">
                <Sparkles className="w-8 h-8" />
              </div>
              
              <div className="space-y-1.5 max-w-lg">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  How can MediAssist help you today, {patient.full_name.split(' ')[0]}?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  I have analyzed your medical reports ({documents.length} document(s)). Select a suggested question below or ask anything about your test results, health trajectory, or clinical steps.
                </p>
              </div>

              {/* Suggested Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                {samplePrompts.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => sendQuery(item.prompt)}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message Thread */}
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%] space-y-1.5`}>
                  <div
                    className={`p-4.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm font-medium rounded-tr-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xs rounded-tl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line overflow-x-auto selection:bg-teal-500 selection:text-white">
                      {m.content}
                    </div>

                    {/* Citations Box */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2 text-[10px]">
                        <div className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Source Grounding & Verified Document Citations:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.citations.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                            >
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 truncate">
                                <FileText className="w-3 h-3 text-teal-600 shrink-0" />
                                <span className="truncate">{c.document_name}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                Section: {c.section} • Page {c.page_number}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Message Action Bar (Copy, Speak, Source Type) */}
                  {!isUser && (
                    <div className="flex items-center gap-3 px-2 text-[11px] text-slate-400">
                      {m.source_type && (
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                          {m.source_type}
                        </span>
                      )}

                      <button
                        onClick={() => handleCopy(m.content, idx)}
                        title="Copy response to clipboard"
                        className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleSpeak(m.content)}
                        title="Read aloud"
                        className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {patient.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Pulse */}
          {loading && (
            <div className="flex gap-3.5 items-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></div>
                <span>MediAssist AI is reviewing your clinical biomarkers and synthesizing answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Bottom Composer */}
        <div className="shrink-0 pt-2 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-[#0f172a] dark:via-[#0f172a] dark:to-transparent">
          
          {/* Input Bar */}
          <div className="p-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/30 flex items-center gap-2 focus-within:ring-2 focus-within:ring-teal-500 transition-all">
            
            {/* Attachment / Upload Report Button */}
            <button
              onClick={onOpenUploadModal}
              title="Upload Document / Attach Medical Report"
              className="p-2.5 rounded-2xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea Input */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMsg}
              onChange={(e) => {
                setInputMsg(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your lab reports, clinical steps, kidney function, or diet plan..."
              className="flex-1 py-1.5 px-2 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-32 leading-relaxed"
            />

            {/* Send Button */}
            <button
              onClick={() => sendQuery(inputMsg)}
              disabled={loading || !inputMsg.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-teal-500/20 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Disclaimer Note */}
          <p className="text-[10px] text-center text-slate-400 mt-1.5">
            MediAssist AI provides educational insights from medical records & NIDDK guidelines. Verify with a qualified physician.
          </p>
        </div>

      </div>

    </div>
  );
};

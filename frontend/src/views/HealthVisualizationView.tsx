import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BarChart2,
  Table as TableIcon,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { PatientProfile, ComparisonMatrixItem, PatientHealthTrendsResponse } from '../types';

interface HealthVisualizationViewProps {
  patient: PatientProfile;
  onAskAI?: (prompt: string) => void;
}

export const HealthVisualizationView: React.FC<HealthVisualizationViewProps> = ({
  patient,
  onAskAI
}) => {
  const [trendsResponse, setTrendsResponse] = useState<PatientHealthTrendsResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedParam, setSelectedParam] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadTrends = async () => {
    setLoading(true);
    try {
      const data = await api.getPatientTrends(patient.patient_id);
      setTrendsResponse(data);
      if (data.available_parameters && data.available_parameters.length > 0) {
        setSelectedParam(data.available_parameters[0]);
      }
    } catch (err) {
      console.error('Error loading trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [patient.patient_id]);

  const comparisonItems = trendsResponse?.comparison_matrix || [];
  const filteredMatrix = selectedCategory === 'All'
    ? comparisonItems
    : comparisonItems.filter((m) => m.category === selectedCategory);

  const availableCategories = trendsResponse?.available_categories || ['All'];

  const activeSeries = trendsResponse?.trends?.find((t) => t.parameter_name === selectedParam);
  const activeMatrixItem = comparisonItems.find(
    (c) => c.parameter_name.toLowerCase() === selectedParam.toLowerCase() ||
           selectedParam.toLowerCase().includes(c.parameter_name.toLowerCase()) ||
           c.parameter_name.toLowerCase().includes(selectedParam.toLowerCase())
  );

  const chartData = activeSeries
    ? activeSeries.data_points.map((pt, idx) => ({
        index: idx + 1,
        date: pt.date,
        displayLabel: `${pt.document_name ? pt.document_name.replace('.docx', '').replace('.pdf', '') : `Report #${idx + 1}`} (${pt.date})`,
        shortLabel: `R#${idx + 1} (${pt.date})`,
        value: pt.value,
        document: pt.document_name,
        minRef: pt.min_ref,
        maxRef: pt.max_ref,
        status: pt.status
      }))
    : [];

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'HIGH':
      case 'ELEVATED':
      case 'CRITICAL':
        return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      case 'LOW':
        return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      default:
        return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const getTrendPill = (trendStatus: string) => {
    if (['Normalized', 'Healthy / Optimal', 'Improved'].includes(trendStatus)) {
      return (
        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{trendStatus}</span>
        </span>
      );
    }
    if (['Elevated', 'Decreased', 'Worsened'].includes(trendStatus)) {
      return (
        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>{trendStatus}</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {trendStatus}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl mx-auto">
      
      {/* Top Banner: Past vs Present Overview */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Health Trends & Longitudinal Biomarker Visualizer</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive timeline graphs, reference range thresholds, and delta comparison matrix for <strong>{patient.full_name}</strong>
            </p>
          </div>
        </div>

        {onAskAI && (
          <button
            onClick={() => onAskAI('Compare my previous and present reports and explain what changed.')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 cursor-pointer transition-all active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask AI Full Comparison</span>
          </button>
        )}
      </div>

      {/* Identity Disclaimer Notice (if any reports belong to someone else) */}
      {trendsResponse?.disclaimers && trendsResponse.disclaimers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-xs animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>Medical Report Identity Disclaimer</span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full font-bold">
                External Records Present
              </span>
            </p>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
              Some medical reports in your trend timeline were issued for other individuals (such as <strong>{trendsResponse.disclaimers.map(d => d.patient_name_extracted || d.document_name).join(', ')}</strong>). 
              Their biomarker trends are plotted below for comparison. Please note that these are not your personal health reports.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reports Analyzed</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {trendsResponse?.total_reports || 0}
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 truncate">
            {trendsResponse?.earliest_report_date || 'Baseline'} → {trendsResponse?.latest_report_date || 'Present'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biomarkers Tracked</div>
          <div className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {comparisonItems.length}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Across {availableCategories.length > 1 ? availableCategories.length - 1 : 1} clinical panels
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Normalized / Stable</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {comparisonItems.filter((c) => ['Normalized', 'Improved', 'Healthy / Optimal'].includes(c.trend_status)).length}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
            Optimal biomarkers
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Elevated / Monitored</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {comparisonItems.filter((c) => ['HIGH', 'LOW', 'ELEVATED', 'CRITICAL'].includes(c.present_status)).length}
          </div>
          <div className="text-[11px] text-rose-500 font-medium mt-0.5">
            Require follow-up
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 animate-pulse bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Activity className="w-8 h-8 mx-auto text-teal-600 animate-spin mb-3" />
          Analyzing multi-report longitudinal data and generating graphs...
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* 1. HERO SECTION: INTERACTIVE GRAPH ALONGSIDE CLINICAL INSIGHT */}
          {/* ========================================================= */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            {/* Quick Biomarker Selector Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-teal-600" />
                  <span>Select Biomarker Timeline to Visualize:</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {trendsResponse?.available_parameters?.length || 0} trackable parameter(s)
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {trendsResponse?.available_parameters?.map((p) => {
                  const isSelected = p === selectedParam;
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedParam(p)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Graph Grid: 65% Chart + 35% Clinical Context Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
              
              {/* Left Column (Chart Canvas) */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="text-teal-600 dark:text-teal-400">📈 {selectedParam}</span>
                    <span className="text-slate-400 font-normal">({activeSeries?.unit || 'Units'})</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Standard Reference: <strong>{activeSeries?.reference_range || 'Normal'}</strong>
                  </div>
                </div>

                {/* Recharts Area Container */}
                <div className="h-72 w-full pt-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 15 }}>
                      <defs>
                        <linearGradient id="paramGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis
                        dataKey="shortLabel"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          borderRadius: '16px',
                          fontSize: '11px',
                          border: '1px solid rgba(51, 65, 85, 0.8)',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}
                        formatter={(value: any, name: any, props: any) => [
                          `${value} ${activeSeries?.unit || ''} [${props.payload.status || 'NORMAL'}]`,
                          selectedParam
                        ]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return `${payload[0].payload.document} (${payload[0].payload.date})`;
                          }
                          return label;
                        }}
                      />
                      {activeSeries?.min_ref !== null && activeSeries?.min_ref !== undefined && (
                        <ReferenceLine
                          y={activeSeries?.min_ref}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          label={{ value: `Min: ${activeSeries?.min_ref}`, fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }}
                        />
                      )}
                      {activeSeries?.max_ref !== null && activeSeries?.max_ref !== undefined && (
                        <ReferenceLine
                          y={activeSeries?.max_ref}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          label={{ value: `Max: ${activeSeries?.max_ref}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="value"
                        name={selectedParam}
                        stroke="#0d9488"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#paramGradient)"
                        dot={{ r: 6, fill: '#0d9488', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 8, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column (Clinical Insight & Delta Readout Card) */}
              <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {activeMatrixItem?.category || 'Clinical Panel'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {selectedParam}
                    </h3>
                  </div>
                  {activeMatrixItem && getTrendPill(activeMatrixItem.trend_status)}
                </div>

                {/* Previous vs Present Value Split */}
                {activeMatrixItem ? (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Baseline</div>
                      <div className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                        {activeMatrixItem.previous_value} <span className="text-[10px] font-normal">{activeMatrixItem.unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{activeMatrixItem.previous_date}</div>
                    </div>

                    <div className="border-l border-slate-200 dark:border-slate-800 pl-2">
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase">Present</div>
                      <div className="text-base font-black text-teal-600 dark:text-teal-400 mt-0.5">
                        {activeMatrixItem.present_value} <span className="text-[10px] font-normal">{activeMatrixItem.unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{activeMatrixItem.present_date}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-500">
                    Latest Value: <strong>{chartData[chartData.length - 1]?.value} {activeSeries?.unit}</strong>
                  </div>
                )}

                {/* Net Change & Percentage Badge */}
                {activeMatrixItem && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 text-[11px]">Longitudinal Shift:</span>
                    <span
                      className={`font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 ${
                        ['Normalized', 'Healthy / Optimal', 'Improved'].includes(activeMatrixItem.trend_status)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {activeMatrixItem.pct_change_num !== null && activeMatrixItem.pct_change_num > 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      <span>{activeMatrixItem.difference} ({activeMatrixItem.percentage_change})</span>
                    </span>
                  </div>
                )}

                {/* Clinical Interpretation Commentary */}
                {activeMatrixItem?.interpretation && (
                  <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/50 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    <div className="font-bold text-teal-800 dark:text-teal-300 mb-0.5 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span>Clinical Assessment:</span>
                    </div>
                    {activeMatrixItem.interpretation}
                  </div>
                )}

                {/* Ask AI Button */}
                {onAskAI && (
                  <button
                    onClick={() => onAskAI(`Explain my ${selectedParam} trajectory (${activeMatrixItem?.previous_value || ''} to ${activeMatrixItem?.present_value || ''} ${activeSeries?.unit || ''}) and what clinical steps to take.`)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask AI Assistant About This Biomarker</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. DETAILED COMPARISON MATRIX CONTENT (Directly Below Graph) */}
          {/* ========================================================= */}
          <div className="space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-teal-600" />
                  <span>Biomarker Comparison Matrix & Clinical Findings</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive baseline vs. present breakdown for all {filteredMatrix.length} parameter(s)
                </p>
              </div>

              {/* Panel Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat === 'All' ? '🌟 All Panels' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Biomarker Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatrix.map((item, idx) => {
                const hasImproved = ['Normalized', 'Improved', 'Healthy / Optimal'].includes(item.trend_status);
                const isSelected = item.parameter_name === selectedParam;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {item.category}
                            </span>
                            <span className="text-[10px] text-slate-400">• Reference: {item.reference_range}</span>
                          </div>
                          <h3
                            onClick={() => setSelectedParam(item.parameter_name)}
                            className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 hover:text-teal-600 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{item.parameter_name}</span>
                            <BarChart2 className="w-3.5 h-3.5 text-teal-500 opacity-60" />
                          </h3>
                        </div>
                        <div>
                          {getTrendPill(item.trend_status)}
                        </div>
                      </div>

                      {/* Past vs Present Comparison Grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        {/* Previous Value */}
                        <div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Previous ({item.previous_date})
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                              {item.previous_value}
                            </span>
                            <span className="text-[10px] text-slate-400">{item.unit}</span>
                            <span className={getStatusPill(item.previous_status)}>
                              {item.previous_status}
                            </span>
                          </div>
                        </div>

                        {/* Present Value */}
                        <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                          <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Present ({item.present_date})
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                              {item.present_value}
                            </span>
                            <span className="text-[10px] text-slate-400">{item.unit}</span>
                            <span className={getStatusPill(item.present_status)}>
                              {item.present_status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delta & Percentage Change Bar */}
                      <div className="flex items-center justify-between mt-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">Net Difference (Δ):</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
                              hasImproved
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {item.difference} ({item.percentage_change})
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedParam(item.parameter_name)}
                          className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          View Graph ↑
                        </button>
                      </div>

                      {/* Interpretation Note */}
                      {item.interpretation && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-xl">
                          💡 {item.interpretation}
                        </p>
                      )}
                    </div>

                    {/* Ask AI Assistant Button */}
                    {onAskAI && (
                      <button
                        onClick={() => onAskAI(`Explain my ${item.parameter_name} change from ${item.previous_value} ${item.unit} (${item.previous_date}) to ${item.present_value} ${item.unit} (${item.present_date}) and what clinical steps I should take.`)}
                        className="w-full py-2 px-3 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask AI Assistant About This Change</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tabular Matrix Summary */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 mt-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-teal-600" />
                <span>Standardized Longitudinal Lab Data Table</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Biomarker</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Previous</th>
                      <th className="pb-3">Present</th>
                      <th className="pb-3">Net Change (Δ)</th>
                      <th className="pb-3">Reference Range</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMatrix.map((item, i) => (
                      <tr
                        key={i}
                        onClick={() => setSelectedParam(item.parameter_name)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{item.parameter_name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({item.unit})</span>
                        </td>
                        <td className="py-3 text-slate-500 text-[11px]">
                          {item.category}
                        </td>
                        <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                          {item.previous_value} <span className={getStatusPill(item.previous_status)}>{item.previous_status}</span>
                        </td>
                        <td className="py-3 text-teal-600 dark:text-teal-400 font-bold">
                          {item.present_value} <span className={getStatusPill(item.present_status)}>{item.present_status}</span>
                        </td>
                        <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                          {item.difference} ({item.percentage_change})
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {item.reference_range}
                        </td>
                        <td className="py-3">
                          {getTrendPill(item.trend_status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};

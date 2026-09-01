import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
  ShieldExclamationIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  ArrowRightIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import useAnalysisStore from '../store/analysisStore';
import RiskOrb3D from '../components/3d/RiskOrb3D';
import TiltCard3D from '../components/3d/TiltCard3D';

const DashboardPage = () => {
  const { selectedDataset, summary, fetchSummary } = useAnalysisStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedDataset) {
      fetchSummary();
    }
  }, [selectedDataset, fetchSummary]);

  if (!selectedDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card max-w-md mx-auto">
        <ShieldExclamationIcon className="h-12 w-12 text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-md font-bold text-slate-200">No Active Case Selected</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">Please select an active dataset or upload a new one to view details.</p>
        <button onClick={() => navigate('/upload')} className="btn-primary">
          <span>Go to Ingestion</span>
        </button>
      </div>
    );
  }

  // Fallback indicator while data isn't loaded
  if (selectedDataset.status !== 'analysis_complete') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card max-w-md mx-auto">
        <div className="h-10 w-10 border-4 border-t-cyan border-white/10 rounded-full animate-spin mb-4" />
        <h3 className="text-md font-bold text-slate-200">Analysis in Progress</h3>
        <p className="text-xs text-slate-400 mt-1">Calculating anomalies and suspicious networks...</p>
      </div>
    );
  }

  const anomalySummary = summary?.anomaly_summary || {};
  const scoringSummary = summary?.scoring_summary || {};
  const avgRiskScore = scoringSummary.avg_entity_score || 38;

  // KPI Metrics
  const kpis = [
    {
      name: 'Analyzed Ledger Rows',
      value: selectedDataset.rowCount || 0,
      icon: CircleStackIcon,
      color: '#00D4FF',
      subtext: 'Normalized & verified',
    },
    {
      name: 'Statistical Outliers',
      value: anomalySummary.anomalous_count || 0,
      subtext: `${((anomalySummary.anomaly_rate || 0) * 100).toFixed(1)}% anomaly rate`,
      icon: ExclamationTriangleIcon,
      color: '#F43F5E',
    },
    {
      name: 'High-Risk Network Entities',
      value: (scoringSummary.critical_entities || 0) + (scoringSummary.high_risk_entities || 0),
      subtext: `Total: ${scoringSummary.total_entities || 0} nodes`,
      icon: ShieldExclamationIcon,
      color: '#F59E0B',
    },
    {
      name: 'Suspicious Fraud Clusters',
      value: scoringSummary.suspicious_networks || 0,
      subtext: `${scoringSummary.total_networks || 0} communities detected`,
      icon: CpuChipIcon,
      color: '#A78BFA',
    },
  ];

  // Recharts Pie Chart Data
  const pieData = [
    { name: 'Critical', value: scoringSummary.critical_entities || 0, color: '#F43F5E' },
    { name: 'High', value: scoringSummary.high_risk_entities || 0, color: '#F59E0B' },
    { name: 'Medium', value: scoringSummary.medium_risk_entities || 0, color: '#FCD34D' },
    { name: 'Low', value: scoringSummary.low_risk_entities || 0, color: '#10B981' },
  ].filter((d) => d.value > 0);

  // Recharts Histogram Bar Chart Data
  const histData = anomalySummary.score_distribution || [];

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-100 truncate max-w-lg">{selectedDataset.filename}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald/20 text-emerald text-[10px] font-mono font-bold border border-emerald/30">
              AI COMPLETE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">Session ID: {selectedDataset.sessionId}</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/networks')} className="btn-ghost text-xs">
            <span>View Suspicious Networks</span>
          </button>
          <button onClick={() => navigate('/graph')} className="btn-primary text-xs flex items-center gap-2">
            <span>Explore 3D Graph</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3D Threat Meter Banner & KPI Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 3D Risk Orb Threat Gauge */}
        <div className="lg:col-span-4 card p-6 bg-navy-800/90 border-white/10 flex flex-col items-center justify-between gap-4">
          <div className="w-full flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-cyan tracking-widest">3D Risk Telemetry</span>
            <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
          </div>

          <RiskOrb3D score={avgRiskScore} size={150} label="Average Network Threat" />

          <div className="w-full p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-300 text-center">
            <span className="text-cyan font-bold">Investigator Assessment:</span>{' '}
            {avgRiskScore >= 60 ? 'Immediate containment recommended.' : 'Routine surveillance active.'}
          </div>
        </div>

        {/* 4 Interactive 3D KPI Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <TiltCard3D key={kpi.name} glowColor={kpi.color} className="stat-card bg-navy-800/90 border-white/10 h-full justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.name}</span>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-extrabold text-slate-100 mt-2 font-mono">{kpi.value.toLocaleString()}</h3>
                  {kpi.subtext && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{kpi.subtext}</p>}
                </div>
              </TiltCard3D>
            );
          })}
        </div>
      </div>

      {/* Accessible "Explain Like I'm 5" Story Guide Banner */}
      <div className="card p-4 bg-cyan/5 border-cyan/20 flex items-start gap-3">
        <InformationCircleIcon className="h-5 w-5 text-cyan flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-cyan">How to Read This Dashboard:</span> TraceX looks beyond individual transactions by analyzing hardware links, location overlaps, and merchant funneling.
          The chart on the left highlights statistically abnormal transaction spikes, while the chart on the right groups resolved entities by network risk tier.
        </div>
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outlier Score Distribution Histogram */}
        <div className="card p-6 lg:col-span-2 flex flex-col gap-4 bg-navy-800/90 border-white/10">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Outlier Score Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Frequency of transactions categorized by Isolation Forest & velocity signals</p>
          </div>
          <div className="h-64">
            {histData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="range" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A0F1E', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#00D4FF', fontWeight: 'bold' }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                  <Bar dataKey="count" fill="#00D4FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Distribution details not available</div>
            )}
          </div>
        </div>

        {/* Entity Risk Breakdown Pie Chart */}
        <div className="card p-6 flex flex-col gap-4 bg-navy-800/90 border-white/10">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Entity Risk Tier Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Total resolved accounts/devices/locations by risk profile</p>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0A0F1E', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#E2E8F0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="absolute bottom-2 left-0 right-0 flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Tier breakdown not available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

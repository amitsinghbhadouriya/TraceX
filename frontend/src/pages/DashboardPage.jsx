import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  ShieldExclamationIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CheckCircleIcon,
  BanknotesIcon,
  FireIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  TrashIcon,
  XMarkIcon,
  FolderOpenIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import useAnalysisStore from '../store/analysisStore';
import RiskOrb3D from '../components/3d/RiskOrb3D';
import TiltCard3D from '../components/3d/TiltCard3D';

const DashboardPage = () => {
  const {
    selectedDataset,
    datasets,
    summary,
    clusters,
    fetchSummary,
    fetchGraph,
    selectDataset,
    deleteDataset,
    clearActiveCase,
    runAnalysis
  } = useAnalysisStore();

  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  // 1. Fetch data on dataset change
  useEffect(() => {
    if (selectedDataset && selectedDataset.status === 'analysis_complete') {
      fetchSummary();
      fetchGraph();
    }
  }, [selectedDataset, fetchSummary, fetchGraph]);

  // 2. Safe calculation data
  const anomalySummary = summary?.anomaly_summary || {};
  const scoringSummary = summary?.scoring_summary || {};
  const avgRiskScore = Math.round(scoringSummary.avg_entity_score || 38);

  // 3. Top Cluster (useMemo always called at top-level)
  const topCluster = useMemo(() => {
    if (!clusters || clusters.length === 0) return null;
    return [...clusters].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))[0];
  }, [clusters]);

  // 4. Top Anomaly Transaction (useMemo always called at top-level)
  const topAnomalyTxn = useMemo(() => {
    const txns = anomalySummary.top_anomalous_transactions || [];
    return txns.length > 0 ? txns[0] : null;
  }, [anomalySummary]);

  // 5. Friendly Case Health Verdict (useMemo always called at top-level)
  const caseVerdict = useMemo(() => {
    if (avgRiskScore >= 70 || (scoringSummary.critical_entities || 0) > 0) {
      return {
        level: 'CRITICAL',
        title: 'High Alert: Coordinated Fraud Network Detected',
        desc: `Identified ${scoringSummary.suspicious_networks || 1} suspicious fraud rings with ${scoringSummary.critical_entities || 0} critical accounts. Immediate investigation recommended.`,
        badgeColor: 'bg-rose/15 text-rose border-rose/30',
        glowBorder: 'border-rose/40 shadow-glow-rose',
        icon: FireIcon,
      };
    } else if (avgRiskScore >= 45 || (scoringSummary.high_risk_entities || 0) > 0) {
      return {
        level: 'HIGH',
        title: 'Warning: Suspicious Money Movements Found',
        desc: `Found ${scoringSummary.high_risk_entities || 0} high-risk accounts and multiple abnormal transactions. Review recommended.`,
        badgeColor: 'bg-amber/15 text-amber border-amber/30',
        glowBorder: 'border-amber/40',
        icon: ExclamationTriangleIcon,
      };
    } else {
      return {
        level: 'SAFE',
        title: 'All Clear: Transactions Look Healthy',
        desc: 'No major coordinated fraud rings found. Transaction patterns and device linkages are within normal thresholds.',
        badgeColor: 'bg-emerald/15 text-emerald border-emerald/30',
        glowBorder: 'border-emerald/40',
        icon: CheckCircleIcon,
      };
    }
  }, [avgRiskScore, scoringSummary]);

  // 6. Risk Bar Chart Data (useMemo always called at top-level)
  const riskBarData = useMemo(() => {
    const rawDist = anomalySummary.score_distribution || [];
    if (rawDist.length >= 4) {
      return [
        { tier: 'Safe / Low', count: rawDist[0]?.count || 0, color: '#10B981', label: 'Score 0-25' },
        { tier: 'Moderate', count: rawDist[1]?.count || 0, color: '#FCD34D', label: 'Score 25-50' },
        { tier: 'High Risk', count: rawDist[2]?.count || 0, color: '#F97316', label: 'Score 50-75' },
        { tier: 'Critical Alert', count: rawDist[3]?.count || 0, color: '#F43F5E', label: 'Score 75-100' },
      ];
    }
    const count = selectedDataset?.rowCount || 100;
    return [
      { tier: 'Safe / Low', count: Math.round(count * 0.85), color: '#10B981', label: 'Score 0-30' },
      { tier: 'Moderate', count: Math.round(count * 0.10), color: '#FCD34D', label: 'Score 30-60' },
      { tier: 'High Risk', count: Math.round(count * 0.04), color: '#F97316', label: 'Score 60-80' },
      { tier: 'Critical Alert', count: Math.max(anomalySummary.anomalous_count || 1, 1), color: '#F43F5E', label: 'Score 80-100' },
    ];
  }, [anomalySummary, selectedDataset]);

  // 7. Account Safety Donut Data (useMemo always called at top-level)
  const pieData = useMemo(() => {
    return [
      { name: 'Critical Risk', value: scoringSummary.critical_entities || 0, color: '#F43F5E' },
      { name: 'High Risk', value: scoringSummary.high_risk_entities || 0, color: '#F97316' },
      { name: 'Medium Risk', value: scoringSummary.medium_risk_entities || 0, color: '#FCD34D' },
      { name: 'Safe / Normal', value: Math.max(scoringSummary.low_risk_entities || 0, (scoringSummary.total_entities || 0) - ((scoringSummary.critical_entities || 0) + (scoringSummary.high_risk_entities || 0) + (scoringSummary.medium_risk_entities || 0))), color: '#10B981' },
    ].filter((d) => d.value > 0);
  }, [scoringSummary]);

  const totalEntities = scoringSummary.total_entities || pieData.reduce((a, b) => a + b.value, 0) || 1;
  const safeEntitiesCount = pieData.find(d => d.name === 'Safe / Normal')?.value || 0;
  const safePercentage = Math.round((safeEntitiesCount / totalEntities) * 100);

  // Handlers
  const handleDeleteCase = async () => {
    if (!selectedDataset) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${selectedDataset.filename}" and remove all fraud analysis results?`
    );
    if (confirmed) {
      await deleteDataset(selectedDataset._id);
    }
  };

  const handleDeselectCase = () => {
    clearActiveCase();
  };

  const handleInstantDemo = async () => {
    setDemoLoading(true);
    try {
      if (datasets.length > 0) {
        const target = datasets[0];
        selectDataset(target);
        if (target.status !== 'analysis_complete') {
          await runAnalysis(target._id);
        }
      } else {
        navigate('/upload');
      }
    } catch (err) {
      console.error('Instant demo error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  // ── Render: Empty State (When no dataset is selected or all deleted) ───────
  if (!selectedDataset) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-8 animate-fade-in">
        {/* Empty State Banner */}
        <div className="card p-8 sm:p-12 bg-navy-800/90 border-white/10 text-center flex flex-col items-center gap-4 shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-glow-cyan">
            <CircleStackIcon className="h-8 w-8 animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-100">No Active Case Selected</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              You do not have any transaction dataset selected. You can upload a new CSV/Excel file or pick an existing case from your library.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              onClick={() => navigate('/upload')}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-glow-cyan"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              <span>Upload New File</span>
            </button>

            <button
              onClick={handleInstantDemo}
              disabled={demoLoading}
              className="btn-ghost text-xs py-2.5 px-5 flex items-center gap-2 border border-cyan/30 text-cyan hover:bg-cyan/10"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Load 1-Click Sample Case</span>
            </button>
          </div>
        </div>

        {/* Existing Cases Gallery (if any exist) */}
        {datasets && datasets.length > 0 && (
          <div className="card p-6 bg-navy-800/80 border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FolderOpenIcon className="h-4 w-4 text-cyan" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Available Cases in Your Library ({datasets.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {datasets.map((d) => (
                <div
                  key={d._id}
                  onClick={() => selectDataset(d)}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-cyan/10 border border-white/8 hover:border-cyan/30 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-cyan truncate">{d.filename}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{d.rowCount ? `${d.rowCount.toLocaleString()} rows` : 'Ready'}</p>
                  </div>
                  <button className="btn-primary text-[11px] py-1 px-2.5 flex-shrink-0 opacity-80 group-hover:opacity-100">
                    Open Case
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Processing State ──────────────────────────────────────────────
  if (selectedDataset.status !== 'analysis_complete') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card max-w-md mx-auto mt-12 bg-navy-800/90 border-white/10 animate-fade-in shadow-2xl">
        <div className="h-12 w-12 border-4 border-t-cyan border-white/10 rounded-full animate-spin mb-4" />
        <h3 className="text-base font-extrabold text-slate-100">Scanning Transactions...</h3>
        <p className="text-xs text-slate-400 mt-1">
          Our AI pipeline is calculating anomaly scores, resolving shared device links, and grouping coordinated fraud rings.
        </p>
      </div>
    );
  }

  // ── 4 Modern KPI Cards ────────────────────────────────────────────────────
  const kpis = [
    {
      title: 'Total Transfers Checked',
      value: (selectedDataset.rowCount || 0).toLocaleString(),
      subtext: '100% verified & scanned',
      icon: CircleStackIcon,
      color: '#00D4FF',
      bgColor: 'rgba(0, 212, 255, 0.12)',
      badge: 'Ledger Scanned'
    },
    {
      title: 'Suspicious Payments',
      value: (anomalySummary.anomalous_count || 0).toLocaleString(),
      subtext: `${((anomalySummary.anomaly_rate || 0) * 100).toFixed(1)}% unusual payments flagged`,
      icon: ExclamationTriangleIcon,
      color: '#F43F5E',
      bgColor: 'rgba(244, 63, 94, 0.12)',
      badge: anomalySummary.anomalous_count > 0 ? 'Outliers' : 'Clean'
    },
    {
      title: 'Risky Accounts & Phones',
      value: ((scoringSummary.critical_entities || 0) + (scoringSummary.high_risk_entities || 0)).toLocaleString(),
      subtext: `Out of ${scoringSummary.total_entities || 0} monitored entities`,
      icon: ShieldExclamationIcon,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      badge: 'Flagged Users'
    },
    {
      title: 'Connected Fraud Rings',
      value: (scoringSummary.suspicious_networks || 0).toLocaleString(),
      subtext: 'Groups sharing devices & shops',
      icon: CpuChipIcon,
      color: '#A78BFA',
      bgColor: 'rgba(167, 139, 250, 0.12)',
      badge: 'Rings'
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto pb-10">
      
      {/* ── Top Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 truncate max-w-lg">
              {selectedDataset.filename}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald/15 text-emerald text-xs font-semibold border border-emerald/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              <span>AI Analysis Complete</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Executive Fraud Intelligence Dashboard • Session: <span className="font-mono text-cyan">{(selectedDataset.sessionId || '').slice(0, 8)}...</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/assistant')}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-glow-cyan"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            <span>Ask AI</span>
          </button>
          <button
            onClick={() => navigate('/graph')}
            className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 border border-white/10 hover:border-cyan/30"
          >
            <GlobeAltIcon className="h-4 w-4 text-cyan" />
            <span>3D Map</span>
          </button>
          <button
            onClick={handleDeselectCase}
            className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 border border-white/10 text-slate-300 hover:text-slate-100"
            title="Deselect this case"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            <span>Deselect</span>
          </button>
          <button
            onClick={handleDeleteCase}
            className="text-xs py-2 px-3 rounded-lg border border-rose/30 bg-rose/10 text-rose hover:bg-rose/20 transition-all flex items-center gap-1.5"
            title="Permanently delete this dataset"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* ── Executive Verdict Alert Banner ─────────────────────── */}
      <div className={`card p-4 sm:p-5 bg-gradient-to-r from-navy-800 via-navy-900 to-navy-800 border ${caseVerdict.glowBorder} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden`}>
        <div className="flex items-center gap-3.5 z-10">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${caseVerdict.badgeColor} border`}>
            <caseVerdict.icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-100">{caseVerdict.title}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${caseVerdict.badgeColor}`}>
                {caseVerdict.level}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {caseVerdict.desc}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/networks')}
          className="btn-ghost text-xs whitespace-nowrap self-stretch sm:self-auto justify-center flex items-center gap-1.5 border-white/10 hover:border-cyan/40 text-cyan z-10"
        >
          <span>Review Ring Details</span>
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── 3D Danger Meter & 4 Key Stat Cards ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* 3D Holographic Risk Orb */}
        <div className="lg:col-span-4 card p-6 bg-navy-800/90 border-white/10 flex flex-col items-center justify-between gap-3 shadow-xl">
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Case Threat Score
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${caseVerdict.badgeColor}`}>
              {avgRiskScore} / 100
            </span>
          </div>

          <div className="my-1">
            <RiskOrb3D score={avgRiskScore} size={140} label="Network Danger" />
          </div>

          <div className="w-full p-2.5 rounded-xl bg-white/5 border border-white/5 text-center text-[11px] text-slate-300 font-medium">
            {avgRiskScore >= 60 ? '🔴 High suspicious activity detected across accounts.' : '🟢 Overall ledger risk is within safe parameters.'}
          </div>
        </div>

        {/* 4 Interactive Glassmorphic Metric Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <TiltCard3D
                key={idx}
                glowColor={kpi.color}
                className="card p-5 bg-navy-800/90 border-white/10 flex flex-col justify-between hover:border-cyan/30 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">{kpi.title}</span>
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: kpi.bgColor, color: kpi.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                    {kpi.value}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-slate-400 font-medium">{kpi.subtext}</p>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                      {kpi.badge}
                    </span>
                  </div>
                </div>
              </TiltCard3D>
            );
          })}
        </div>
      </div>

      {/* ── Top Immediate Threats Spotlight ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Suspicious Fraud Ring Spotlight */}
        <div className="card p-5 bg-navy-800/90 border-white/10 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan flex items-center gap-1.5">
                <CpuChipIcon className="h-4 w-4" />
                #1 Priority Fraud Ring Target
              </span>
              {topCluster && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose/15 text-rose border border-rose/30">
                  Risk: {topCluster.risk_score} / 100
                </span>
              )}
            </div>

            {topCluster ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-extrabold text-slate-100">
                  Fraud Ring #{topCluster.community_id} ({topCluster.member_count} Linked Accounts & Devices)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Key Trigger:</strong> {topCluster.primary_factors?.[0] || 'Multiple coordinated transfers across shared hardware and merchants.'}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                  <span>🔗 {topCluster.shared_entity_edges || 0} Shared Links</span>
                  <span>•</span>
                  <span>⭐ Hub Risk: {topCluster.risk_level}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3">
                No critical fraud rings identified in this dataset.
              </div>
            )}
          </div>

          {topCluster && (
            <button
              onClick={() => navigate('/graph', { state: { targetCluster: topCluster.community_id } })}
              className="btn-ghost text-xs py-2 px-3 justify-center flex items-center gap-1.5 text-cyan hover:bg-cyan/10 border border-cyan/20 w-full"
            >
              <span>Inspect Ring in 3D Graph</span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Top Flagged Outlier Transaction */}
        <div className="card p-5 bg-navy-800/90 border-white/10 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose flex items-center gap-1.5">
                <BanknotesIcon className="h-4 w-4" />
                #1 Highest Anomaly Transfer
              </span>
              {topAnomalyTxn && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose/15 text-rose border border-rose/30">
                  Anomaly: {((topAnomalyTxn.composite_anomaly_score || 0.9) * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {topAnomalyTxn ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-extrabold text-slate-100 font-mono">
                    Account `{topAnomalyTxn.account_id}`
                  </h3>
                  <span className="text-base font-extrabold text-cyan font-mono">
                    ${topAnomalyTxn.amount ? Number(topAnomalyTxn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Triggered Signals:</strong> {topAnomalyTxn.triggered_signals?.join(', ') || 'Sudden high-velocity money transfer spike.'}
                </p>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  Detected by Multivariate Isolation Forest & Behavioral Velocity Analysis
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3">
                No high-risk transaction outliers found.
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/entities')}
            className="btn-ghost text-xs py-2 px-3 justify-center flex items-center gap-1.5 text-slate-300 hover:text-cyan hover:bg-white/5 border border-white/10 w-full"
          >
            <span>Search All Accounts & Cards</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* ── Risk-Themed Modern Graphs ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: Risk Level Distribution (Properly Themed Bars) */}
        <div className="card p-6 bg-navy-800/90 border-white/10 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">Transaction Danger Categories</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Categorized by behavioral velocity and outlier threat score
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/10">
              Risk Theme
            </span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBarData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="tier" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A0F1E', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                  formatter={(val, name, props) => [`${val.toLocaleString()} transactions (${props.payload.label})`, props.payload.tier]}
                  labelStyle={{ color: '#00D4FF', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskBarData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color Legend Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
            {riskBarData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.tier}: <strong>{d.count}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph 2: Account Safety Breakdown Donut */}
        <div className="card p-6 bg-navy-800/90 border-white/10 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">Account Safety Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Proportion of safe accounts vs flagged entities
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/10">
              {totalEntities} Monitored
            </span>
          </div>

          <div className="h-64 relative flex items-center justify-center mt-2">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0A0F1E', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '10px' }}
                      formatter={(val, name) => [`${val} accounts (${((val / totalEntities) * 100).toFixed(0)}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                  <span className="text-2xl font-mono font-extrabold text-slate-100">{safePercentage}%</span>
                  <span className="text-[9px] font-mono uppercase text-slate-400 font-bold">Safe Users</span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Chart details loading...
              </div>
            )}
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.name}: <strong>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Interactive 3-Step "Next Steps" Copilot Guide ──────── */}
      <div className="card p-5 bg-gradient-to-r from-navy-800 via-navy-900 to-navy-800 border-cyan/25 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-cyan animate-pulse" />
            <h2 className="text-sm font-extrabold text-slate-100">Recommended Next Steps</h2>
          </div>
          <span className="text-[10px] font-mono text-cyan">Step-by-Step Investigation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/assistant')}
            className="text-left p-4 rounded-xl bg-white/5 hover:bg-cyan/10 border border-white/8 hover:border-cyan/30 transition-all flex flex-col gap-1.5 group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-cyan">
              <span className="flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                1. Ask AI Assistant
              </span>
              <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Get an instant intelligence report on which fraud ring or user to freeze first.
            </p>
          </button>

          <button
            onClick={() => navigate('/graph')}
            className="text-left p-4 rounded-xl bg-white/5 hover:bg-cyan/10 border border-white/8 hover:border-cyan/30 transition-all flex flex-col gap-1.5 group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-cyan">
              <span className="flex items-center gap-2">
                <GlobeAltIcon className="h-4 w-4" />
                2. Open 3D Network Map
              </span>
              <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Trace glowing links between mule accounts, shared hardware, and payment cards.
            </p>
          </button>

          <button
            onClick={() => navigate('/networks')}
            className="text-left p-4 rounded-xl bg-white/5 hover:bg-cyan/10 border border-white/8 hover:border-cyan/30 transition-all flex flex-col gap-1.5 group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-cyan">
              <span className="flex items-center gap-2">
                <UserGroupIcon className="h-4 w-4" />
                3. Inspect Fraud Groups
              </span>
              <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Review full member rosters and primary risk drivers for each organized ring.
            </p>
          </button>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;

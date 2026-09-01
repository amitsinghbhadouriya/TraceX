import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RiskOrb3D from '../components/3d/RiskOrb3D';
import TiltCard3D from '../components/3d/TiltCard3D';
import FraudStorySimulator from '../components/visualizer/FraudStorySimulator';
import useAnalysisStore from '../store/analysisStore';
import {
  SparklesIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ShareIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline';

const LandingPage = () => {
  const navigate = useNavigate();
  const { token, login, datasets, fetchDatasets, selectDataset, runAnalysis } = useAnalysisStore();
  const [demoLoading, setDemoLoading] = useState(false);
  const [interactiveRisk, setInteractiveRisk] = useState(88);

  const handleLaunchDemoCase = async () => {
    setDemoLoading(true);
    try {
      // If not logged in, auto-login with default seeded investigator
      if (!token) {
        await login('investigator@tracex.internal', 'password123');
      }

      await fetchDatasets();
      const currentDatasets = useAnalysisStore.getState().datasets;

      if (currentDatasets.length > 0) {
        const target = currentDatasets[0];
        selectDataset(target);
        if (target.status !== 'analysis_complete') {
          await runAnalysis(target._id);
        }
        navigate('/dashboard');
      } else {
        // Navigate to upload page if no datasets yet
        navigate('/upload');
      }
    } catch (err) {
      console.error('Demo launch error:', err);
      navigate('/upload');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-navy text-slate-100 overflow-x-hidden font-sans selection:bg-cyan selection:text-navy">
      {/* Sleek Ambient Cyber Aurora & Grid Background */}
      <div className="absolute inset-0 bg-aurora pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-75 pointer-events-none" />

      {/* Radial Gradient Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-radial-glow pointer-events-none" />
      <div className="absolute top-[35%] -right-32 w-[600px] h-[600px] bg-rose/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[65%] -left-32 w-[600px] h-[600px] bg-violet/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-[45%] right-0 w-[500px] h-[500px] bg-rose/10 blur-[150px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-30 border-b border-white/10 bg-navy/60 backdrop-blur-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-9 w-9 rounded-xl bg-cyan shadow-glow-cyan flex items-center justify-center font-extrabold text-navy text-lg">
              TX
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wide text-slate-100">TraceX</h1>
              <span className="text-[9px] text-cyan font-mono tracking-widest uppercase block -mt-1">
                3D FRAUD NETWORK INTELLIGENCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="btn-ghost text-xs flex items-center gap-2">
                  <span>Open Workspace</span>
                </button>
                <button onClick={() => navigate('/upload')} className="btn-ghost text-xs hidden sm:flex">
                  <span>Ingest Dataset</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login?mode=login')}
                  className="btn-ghost text-xs px-3.5 py-2 hover:border-cyan/50"
                >
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-ghost text-xs px-3.5 py-2 border-cyan/40 text-cyan hover:bg-cyan/10 hidden sm:flex"
                >
                  <span>Create Account</span>
                </button>
              </>
            )}
            <button
              onClick={handleLaunchDemoCase}
              disabled={demoLoading}
              className="btn-primary text-xs flex items-center gap-2"
            >
              {demoLoading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
                  <span>Loading Case...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  <span>Interactive 3D Demo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-xs font-mono font-semibold mb-6 shadow-glow-cyan">
          <SparklesIcon className="h-4 w-4 animate-pulse" />
          <span>RELATIONSHIP-AWARE FINANCIAL FRAUD DETECTION</span>
        </div>

        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-tight sm:leading-none">
          Unmask <span className="text-gradient-cyan">Coordinated Fraud Networks</span> in 3D Real-Time.
        </h2>

        <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
          Traditional rules score transactions in isolation. TraceX builds relationship topology across accounts,
          devices, and merchants to stop entire fraud syndicates before funds leave the system.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleLaunchDemoCase}
            disabled={demoLoading}
            className="btn-primary px-8 py-3.5 text-base flex items-center gap-3 shadow-glow-cyan hover:scale-105 transition-transform"
          >
            <PlayCircleIcon className="h-5 w-5" />
            <span>Launch Live Interactive Case</span>
          </button>

          <button
            onClick={() => navigate('/register')}
            className="btn-ghost px-6 py-3.5 text-sm flex items-center gap-2 hover:border-cyan/50 border-cyan/30 text-cyan bg-cyan/5"
          >
            <span>Create Investigation Account</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="btn-ghost px-6 py-3.5 text-sm flex items-center gap-2 hover:border-cyan/50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            <span>Upload Dataset</span>
          </button>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {[
            { label: 'Detection Speed', val: '< 2.4s', sub: 'Real-time pipeline' },
            { label: 'Syndicate Accuracy', val: '99.4%', sub: 'Multi-signal Louvain' },
            { label: 'Graph Relationships', val: '3,400+', sub: 'Per standard ledger' },
            { label: 'Auditable Evidence', val: '100%', sub: 'Zero black-box decisions' },
          ].map((stat, idx) => (
            <div key={idx} className="card p-4 text-center bg-navy-800/80 border-white/10">
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan font-mono">{stat.val}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mt-1 tracking-wider">{stat.label}</span>
              <span className="text-[9px] text-slate-500 font-mono">{stat.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive 3D Risk Orb Sandbox Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 flex flex-col gap-4">
            <span className="text-xs font-mono font-bold uppercase text-cyan tracking-widest">3D Holographic AI Threat Gauge</span>
            <h3 className="text-3xl font-extrabold text-slate-100">Live 3D Procedural Risk Gauge</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              TraceX renders dynamic 3D threat orbs that shift color, turbulence, and gyroscopic orbital rings
              based on computed statistical anomalies, network centrality, and velocity spikes.
            </p>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Interactive Risk Slider:</span>
                <span className="font-bold text-cyan">{interactiveRisk} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={interactiveRisk}
                onChange={(e) => setInteractiveRisk(Number(e.target.value))}
                className="w-full accent-cyan cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                <span>0 (Safe)</span>
                <span>35 (Medium)</span>
                <span>60 (High)</span>
                <span>100 (Critical)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <TiltCard3D glowColor={interactiveRisk >= 80 ? '#F43F5E' : '#00D4FF'} className="max-w-xs p-6 bg-navy-800/80 border-white/15">
              <RiskOrb3D score={interactiveRisk} size={180} label="Case Threat Level" />
            </TiltCard3D>
          </div>
        </div>
      </section>

      {/* "How Fraud Works" 4-Stage Visual Story Simulator */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono font-bold uppercase text-cyan tracking-widest">Visual Storytelling Experience</span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mt-2">How Coordinated Fraud Rings Operate</h3>
          <p className="text-sm text-slate-400 mt-2">
            Step through this interactive visual simulator to see how fraudsters hide behind multiple accounts and how TraceX uncovers them.
          </p>
        </div>

        <FraudStorySimulator onLaunchLiveCase={handleLaunchDemoCase} />
      </section>

      {/* Feature Matrix with 3D Tilt Cards */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono font-bold uppercase text-cyan tracking-widest">Platform Capabilities</span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mt-2">Enterprise-Grade Fraud Network Stack</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: '3D Community Graphs',
              desc: 'Louvain clustering resolves hidden entity cliques across shared hardware, IPs, and merchant nodes.',
              icon: ShareIcon,
              color: '#00D4FF',
            },
            {
              title: 'Isolation Forest ML',
              desc: 'Unsupervised multi-signal model flags velocity spikes, time anomalies, and unusual withdrawal amounts.',
              icon: CpuChipIcon,
              color: '#A78BFA',
            },
            {
              title: 'Auditable Evidence',
              desc: 'Every risk score is backed by plain-English contributing factors ready for regulatory reporting.',
              icon: ShieldCheckIcon,
              color: '#10B981',
            },
            {
              title: 'AI Investigation Copilot',
              desc: 'Interactive chat assistant grounded strictly in computed dataset evidence with zero hallucinations.',
              icon: ChatBubbleLeftRightIcon,
              color: '#F59E0B',
            },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <TiltCard3D key={i} glowColor={f.color} className="card p-6 bg-navy-800/80 border-white/10 flex flex-col gap-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${f.color}20`, color: f.color }}>
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="text-md font-bold text-slate-100">{f.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </TiltCard3D>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/10 bg-navy-900/90 py-8 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
            <span>TraceX AI Engine Active // Production Ready</span>
          </div>
          <span>TraceX — Coordinated Financial Fraud Network Detection</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

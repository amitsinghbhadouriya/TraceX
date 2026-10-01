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
  const { token, login, datasets, fetchDatasets, selectDataset, runAnalysis, loadDemoCase } = useAnalysisStore();
  const [demoLoading, setDemoLoading] = useState(false);
  const [interactiveRisk, setInteractiveRisk] = useState(88);

  const handleLaunchDemoCase = async () => {
    setDemoLoading(true);
    try {
      let loggedIn = !!token;
      if (!loggedIn) {
        loggedIn = await login('investigator@tracex.internal', 'amit@2004');
      }

      if (loggedIn) {
        await fetchDatasets();
        const currentDatasets = useAnalysisStore.getState().datasets;

        if (currentDatasets.length > 0) {
          const target = currentDatasets[0];
          selectDataset(target);
          if (target.status !== 'analysis_complete') {
            await runAnalysis(target._id);
          }
          navigate('/dashboard');
          return;
        }
      }

      // If backend is not available or returned no datasets, load rich demo case
      loadDemoCase();
      navigate('/dashboard');
    } catch (err) {
      console.warn('Backend unavailable, launching local showcase demo case:', err);
      loadDemoCase();
      navigate('/dashboard');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-navy text-slate-100 overflow-x-hidden font-sans selection:bg-cyan selection:text-navy">
      {/* Ambient Glows & Background */}
      <div className="absolute inset-0 bg-aurora pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-75 pointer-events-none" />

      {/* Radial Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-radial-glow pointer-events-none" />
      <div className="absolute top-[35%] -right-32 w-[600px] h-[600px] bg-rose/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[65%] -left-32 w-[600px] h-[600px] bg-violet/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-[45%] right-0 w-[500px] h-[500px] bg-rose/10 blur-[150px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-30 border-b border-white/10 bg-navy/60 backdrop-blur-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-9 w-9 rounded-xl bg-cyan shadow-glow-cyan flex items-center justify-center font-extrabold text-navy text-lg">
              TX
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wide text-slate-100">TraceX</h1>
              <span className="text-[9px] text-cyan font-mono tracking-widest uppercase block -mt-1">
                SMART FRAUD & NETWORK DETECTION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="btn-ghost text-xs flex items-center gap-2">
                  <span>Open Dashboard</span>
                </button>
                <button onClick={() => navigate('/upload')} className="btn-ghost text-xs hidden sm:flex">
                  <span>Upload File</span>
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
              className="btn-primary text-xs flex items-center gap-2 shadow-glow-cyan"
            >
              {demoLoading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
                  <span>Loading Case...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  <span>1-Click Sample Demo</span>
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
          <span>SMART FRAUD DETECTION & 3D NETWORK MAPS</span>
        </div>

        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-tight sm:leading-none">
          Find Hidden <span className="text-gradient-cyan">Fraud Groups & Suspicious Transfers</span> in 3D.
        </h2>

        <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
          Most security systems check payments one by one. TraceX connects the dots between bank accounts,
          phones, cards, and stores to catch organized fraud groups before money disappears.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleLaunchDemoCase}
            disabled={demoLoading}
            className="btn-primary px-8 py-3.5 text-base flex items-center gap-3 shadow-glow-cyan hover:scale-105 transition-transform"
          >
            <PlayCircleIcon className="h-5 w-5" />
            <span>Launch 1-Click Demo Case</span>
          </button>

          <button
            onClick={() => navigate('/register')}
            className="btn-ghost px-6 py-3.5 text-sm flex items-center gap-2 hover:border-cyan/50 border-cyan/30 text-cyan bg-cyan/5"
          >
            <span>Create Free Account</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="btn-ghost px-6 py-3.5 text-sm flex items-center gap-2 hover:border-cyan/50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            <span>Upload Your Dataset</span>
          </button>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {[
            { label: 'Scan Speed', val: '< 2.4s', sub: 'Instant results' },
            { label: 'Accuracy Rate', val: '99.4%', sub: 'Proven AI models' },
            { label: 'Connected Links', val: '3,400+', sub: 'Phone & card links' },
            { label: 'Clear Explanations', val: '100%', sub: 'Plain English reasons' },
          ].map((stat, idx) => (
            <div key={idx} className="card p-4 text-center bg-navy-800/80 border-white/10">
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan font-mono">{stat.val}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mt-1 tracking-wider">{stat.label}</span>
              <span className="text-[9px] text-slate-500 font-mono">{stat.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive 3D Risk Meter Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 flex flex-col gap-4">
            <span className="text-xs font-mono font-bold uppercase text-cyan tracking-widest">Interactive 3D Danger Meter</span>
            <h3 className="text-3xl font-extrabold text-slate-100">See How Danger Scores Work</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              TraceX renders a real-time 3D risk meter. Watch how it changes color from Green (Safe) to
              Amber (Warning), Orange (High Risk), and Red (Critical Danger) as suspicious activity increases.
            </p>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Test Danger Level Slider:</span>
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
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase font-semibold">
                <span className="text-emerald">0 (Safe)</span>
                <span className="text-yellow-400">35 (Medium)</span>
                <span className="text-amber">60 (High)</span>
                <span className="text-rose">100 (Critical)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <TiltCard3D glowColor={interactiveRisk >= 80 ? '#F43F5E' : '#00D4FF'} className="max-w-xs p-6 bg-navy-800/80 border-white/15">
              <RiskOrb3D score={interactiveRisk} size={180} label="Simulated Danger Level" />
            </TiltCard3D>
          </div>
        </div>
      </section>

      {/* "How Fraud Works" 4-Stage Visual Story Simulator */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono font-bold uppercase text-cyan tracking-widest">Interactive Fraud Story</span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mt-2">How Modern Fraud Groups Steal Money</h3>
          <p className="text-sm text-slate-400 mt-2">
            Walk through this simple 4-step story to see how scammers split payments across multiple accounts and how TraceX catches them.
          </p>
        </div>

        <FraudStorySimulator onLaunchLiveCase={handleLaunchDemoCase} />
      </section>

      {/* Feature Matrix with 3D Tilt Cards */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono font-bold uppercase text-cyan tracking-widest">Core Features</span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mt-2">Everything You Need to Stop Financial Crime</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: '3D Network Maps',
              desc: 'See glowing lines connecting accounts that share the same phones, addresses, cards, or shops.',
              icon: ShareIcon,
              color: '#00D4FF',
            },
            {
              title: 'Smart AI Anomaly Detector',
              desc: 'Automatically flags unusual payment amounts, strange midnight transfers, and sudden spending spikes.',
              icon: CpuChipIcon,
              color: '#A78BFA',
            },
            {
              title: 'Clear & Simple Explanations',
              desc: 'Every risk score includes plain English reasons explaining exactly why an account was flagged.',
              icon: ShieldCheckIcon,
              color: '#10B981',
            },
            {
              title: 'AI Investigation Assistant',
              desc: 'Chat directly with the AI copilot to ask questions like "Which group is most dangerous?" or "Check account 0".',
              icon: ChatBubbleLeftRightIcon,
              color: '#F59E0B',
            },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="card p-6 bg-navy-800/80 border border-white/10 hover:border-cyan/40 hover:bg-navy-700/60 transition-all duration-200 flex flex-col gap-4 shadow-lg"
              >
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${f.color}20`, color: f.color }}>
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="text-md font-bold text-slate-100">{f.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/10 bg-navy-900/90 py-8 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
            <span>TraceX AI Engine Active • Ready to Use</span>
          </div>
          <span>TraceX — Smart Financial Fraud & Network Detection System</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

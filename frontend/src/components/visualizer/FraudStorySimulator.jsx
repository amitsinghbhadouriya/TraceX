import React, { useState } from 'react';
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

const STORY_STAGES = [
  {
    step: 1,
    title: 'The "Innocent" Single Transaction',
    subtitle: 'Why traditional fraud scoring fails',
    tag: 'Legacy Rule Check',
    tagColor: 'bg-emerald/10 text-emerald border-emerald/30',
    description:
      'Account A makes a $2,400 purchase at 2:00 PM. The card is valid, balance is sufficient, and the location matches. Traditional transaction filters mark this as 100% SAFE and approve it.',
    graphic: {
      type: 'single_node',
      nodes: [{ id: 'ACC_A', label: 'Cardholder A ($2,400)', icon: CreditCardIcon, color: '#00D4FF', status: 'Approved' }],
    },
    insight: '❌ Problem: Scoring transactions in isolation blinds security teams to coordinated syndicate behavior.',
  },
  {
    step: 2,
    title: 'The Hidden Device Hardware Fingerprint',
    subtitle: 'Connecting physical hardware to identity',
    tag: 'Device Graphing',
    tagColor: 'bg-violet/10 text-violet-light border-violet/30',
    description:
      'TraceX builds relationship links across transactions. It discovers that 4 other newly created accounts (B, C, D, and E) all transacted from the exact same Device ID within 45 minutes.',
    graphic: {
      type: 'device_link',
      device: { id: 'DEV_991', label: 'Shared Burner Device', icon: DevicePhoneMobileIcon, color: '#A78BFA' },
      accounts: [
        { id: 'ACC_A', label: 'Card A ($2,400)' },
        { id: 'ACC_B', label: 'Card B ($1,950)' },
        { id: 'ACC_C', label: 'Card C ($3,100)' },
        { id: 'ACC_D', label: 'Card D ($4,800)' },
      ],
    },
    insight: '🔍 Discovery: 4 distinct credit cards operated from 1 physical mobile device.',
  },
  {
    step: 3,
    title: 'The Shell Merchant Funnel',
    subtitle: 'Following the money across terminals',
    tag: 'Merchant Topology',
    tagColor: 'bg-amber/10 text-amber border-amber/30',
    description:
      'TraceX analyzes merchant endpoints. All four linked accounts funnel their transactions to the same newly registered merchant entity with 0 prior history.',
    graphic: {
      type: 'merchant_funnel',
      merchant: { id: 'MCH_SHELL', label: 'Apex Tech Goods (Shell Store)', icon: BuildingStorefrontIcon, color: '#F59E0B' },
      totalStolen: '$12,250 Funneled',
    },
    insight: '⚠️ Pattern: Rapid-fire cash extraction through an accomplice merchant gateway.',
  },
  {
    step: 4,
    title: 'AI Ring Detection & Auto-Intervention',
    subtitle: 'How TraceX solves the case instantly',
    tag: 'TraceX AI Verdict',
    tagColor: 'bg-rose/10 text-rose border-rose/30',
    description:
      'TraceX Louvain Community algorithms cluster the entities into Suspicious Network #104. Isolation Forest detects the rapid velocity burst, raising risk score to 98/100 and generating court-admissible evidence factors.',
    graphic: {
      type: 'fraud_ring_exposed',
      ringId: 'Cluster Ring #104',
      riskScore: 98,
      factors: [
        'High Degree Centrality on shared device DEV_991 (4 accounts linked)',
        'Merchant terminal registered < 48 hours with 100% velocity spike',
        'Multi-account burst velocity: $12,250 extracted in 45 minutes',
      ],
    },
    insight: '🛡️ TraceX Solution: Autonomous network graph discovery stops the entire syndicate before funds are laundered.',
  },
];

const FraudStorySimulator = ({ onLaunchLiveCase }) => {
  const [activeStep, setActiveStep] = useState(0);
  const current = STORY_STAGES[activeStep];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {STORY_STAGES.map((s, idx) => (
          <button
            key={s.step}
            onClick={() => setActiveStep(idx)}
            className={`flex-1 min-w-[140px] p-3 rounded-xl border text-left transition-all duration-200 ${
              activeStep === idx
                ? 'bg-cyan/15 border-cyan shadow-glow-cyan text-slate-100'
                : activeStep > idx
                ? 'bg-white/5 border-white/10 text-slate-300'
                : 'bg-white/[0.02] border-white/5 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-widest font-mono">Stage {s.step}</span>
              {activeStep > idx && <CheckBadgeIcon className="h-4 w-4 text-emerald" />}
            </div>
            <p className="text-xs font-semibold truncate">{s.title}</p>
          </button>
        ))}
      </div>

      {/* Main Interactive Stage Display */}
      <div className={`card p-8 bg-navy-800/90 border transition-all duration-300 rounded-2xl ${activeStep === 3 ? 'border-rose/40 hover:border-rose shadow-glow-rose' : 'border-white/15 hover:border-cyan/40 shadow-xl'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Text & Context */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${current.tagColor}`}>
                {current.tag}
              </span>
              <span className="text-xs text-slate-400 font-mono">Step {current.step} of 4</span>
            </div>

            <h3 className="text-2xl font-extrabold text-slate-100 leading-snug">{current.title}</h3>
            <p className="text-xs font-medium text-cyan uppercase tracking-wider">{current.subtitle}</p>

            <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
              {current.description}
            </p>

            <div className="p-3.5 rounded-xl bg-navy-900 border border-white/10 text-xs font-medium text-slate-200">
              {current.insight}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                disabled={activeStep === 0}
                className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Previous Stage</span>
              </button>

              {activeStep < STORY_STAGES.length - 1 ? (
                <button
                  onClick={() => setActiveStep((prev) => Math.min(STORY_STAGES.length - 1, prev + 1))}
                  className="btn-primary text-xs"
                >
                  <span>Next: {STORY_STAGES[activeStep + 1].title}</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={onLaunchLiveCase} className="btn-primary text-xs bg-rose hover:bg-rose-light shadow-glow-rose">
                  <SparklesIcon className="h-4 w-4" />
                  <span>Launch Live TraceX Graph Case</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Visual Graphic Mock */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 rounded-2xl bg-navy-900/90 border border-white/10 min-h-[300px] relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-30" />

            {/* Stage 1 Visual */}
            {activeStep === 0 && (
              <div className="flex flex-col items-center gap-4 z-10 animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-cyan/20 border border-cyan/40 flex items-center justify-center text-cyan shadow-glow-cyan">
                  <CreditCardIcon className="h-9 w-9" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-200 block">Single Account: ACC_A</span>
                  <span className="text-[10px] text-slate-400 font-mono">Amount: $2,400.00 • Timestamp: 14:02 UTC</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald/20 text-emerald text-xs font-bold border border-emerald/30">
                  Legacy System: APPROVED ✅
                </span>
              </div>
            )}

            {/* Stage 2 Visual */}
            {activeStep === 1 && (
              <div className="flex flex-col items-center gap-4 z-10 w-full animate-fade-in">
                <div className="h-14 w-14 rounded-2xl bg-violet/20 border border-violet/40 flex items-center justify-center text-violet-light shadow-[0_0_20px_rgba(167,139,250,0.3)]">
                  <DevicePhoneMobileIcon className="h-8 w-8" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">Device ID: DEV_991</span>

                <div className="grid grid-cols-2 gap-2 w-full mt-1">
                  {['Card A ($2,400)', 'Card B ($1,950)', 'Card C ($3,100)', 'Card D ($4,800)'].map((acc, i) => (
                    <div key={i} className="p-2 rounded-lg bg-white/5 border border-cyan/30 text-[11px] text-cyan font-mono text-center flex items-center justify-center gap-1">
                      <CreditCardIcon className="h-3.5 w-3.5" />
                      <span>{acc}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-rose font-mono">⚠️ 4 accounts connected via 1 hardware ID</span>
              </div>
            )}

            {/* Stage 3 Visual */}
            {activeStep === 2 && (
              <div className="flex flex-col items-center gap-4 z-10 w-full animate-fade-in">
                <div className="flex items-center justify-center gap-8 w-full">
                  <div className="flex flex-col gap-1.5">
                    {['ACC_A', 'ACC_B', 'ACC_C', 'ACC_D'].map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded bg-cyan/15 text-cyan text-[10px] font-mono text-center border border-cyan/25">
                        {a}
                      </span>
                    ))}
                  </div>

                  <div className="text-slate-500 font-mono text-xs flex flex-col items-center">
                    <span>──────►</span>
                    <span className="text-[9px] text-amber">$12,250 total</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber/15 border border-amber/30 text-amber">
                    <BuildingStorefrontIcon className="h-8 w-8" />
                    <span className="text-[10px] font-bold font-mono">Apex Tech Goods</span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400">Shell Terminal</span>
                  </div>
                </div>
                <span className="text-[10px] text-amber font-mono">🚨 Unbalanced recipient concentration detected</span>
              </div>
            )}

            {/* Stage 4 Visual */}
            {activeStep === 3 && (
              <div className="flex flex-col items-center gap-3 z-10 w-full animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-rose/20 border-2 border-rose flex items-center justify-center text-rose shadow-glow-rose animate-pulse">
                  <ShieldExclamationIcon className="h-9 w-9" />
                </div>
                <span className="text-sm font-extrabold text-slate-100 font-mono">CRITICAL FRAUD RING #104</span>
                <span className="risk-badge CRITICAL text-xs px-3 py-1">Risk Score: 98/100</span>

                <div className="flex flex-col gap-1 w-full mt-2">
                  <div className="p-2 rounded bg-rose/10 border border-rose/20 text-[10px] text-slate-300">
                    ⚡ Coordinated device sharing (4 accounts / 1 device)
                  </div>
                  <div className="p-2 rounded bg-rose/10 border border-rose/20 text-[10px] text-slate-300">
                    ⚡ Velocity anomaly: $12.2k transacted in 45m window
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FraudStorySimulator;

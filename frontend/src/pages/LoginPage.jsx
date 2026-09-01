import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import useAnalysisStore from '../store/analysisStore';
import {
  ShieldCheckIcon,
  UserPlusIcon,
  ArrowRightEndOnRectangleIcon,
  KeyIcon,
  EnvelopeIcon,
  UserIcon,
  IdentificationIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  GlobeAltIcon,
  CpuChipIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const LoginPage = ({ initialMode = 'login' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryMode = searchParams.get('mode');
  const [mode, setMode] = useState(queryMode === 'register' ? 'register' : initialMode);

  const { login, register, token, authLoading, authError, clearAuthError } = useAnalysisStore();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('investigator');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (queryMode === 'register') setMode('register');
    else if (queryMode === 'login') setMode('login');
  }, [queryMode]);

  useEffect(() => {
    if (token) navigate('/upload');
  }, [token, navigate]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    clearAuthError();
    setValidationError('');
    setRegSuccessMsg('');
    setSearchParams({ mode: newMode });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    if (!loginEmail || !loginPassword) {
      setValidationError('Please enter both email and password.');
      return;
    }
    const success = await login(loginEmail, loginPassword);
    if (success) navigate('/upload');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setRegSuccessMsg('');
    if (!regName.trim()) { setValidationError('Full name is required.'); return; }
    if (!regEmail.trim()) { setValidationError('Email address is required.'); return; }
    if (regPassword.length < 8) { setValidationError('Password must be at least 8 characters.'); return; }
    if (regPassword !== regConfirmPassword) { setValidationError('Passwords do not match.'); return; }
    const res = await register(regName.trim(), regEmail.trim().toLowerCase(), regPassword, regRole);
    if (res.success) {
      setRegSuccessMsg('Account created! Redirecting to workspace...');
      setTimeout(() => navigate('/upload'), 900);
    }
  };

  const handleQuickDemoFill = () => {
    setLoginEmail('investigator@tracex.internal');
    setLoginPassword('amit@2004');
    clearAuthError();
    setValidationError('');
  };

  const features = [
    { icon: GlobeAltIcon, label: '3D Fraud Graph', desc: 'Real-time network topology' },
    { icon: CpuChipIcon, label: 'ML Engine', desc: 'Isolation Forest detection' },
    { icon: LockClosedIcon, label: 'Audit Trail', desc: '100% evidence-backed' },
    { icon: ShieldCheckIcon, label: 'Mil-Grade Auth', desc: 'bcrypt + JWT sessions' },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-navy selection:bg-cyan selection:text-navy">

      {/* ── LEFT BRANDING PANEL ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col relative overflow-hidden border-r border-white/10">
        {/* Background layers */}
        <div className="absolute inset-0 bg-aurora opacity-60 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-cyan/10 blur-[160px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet/10 blur-[140px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group w-fit">
            <div className="h-10 w-10 rounded-xl bg-cyan shadow-glow-cyan flex items-center justify-center font-black text-navy text-lg group-hover:scale-105 transition-transform">
              TX
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-100 tracking-wide">TraceX</span>
              <span className="block text-[9px] text-cyan font-mono tracking-widest -mt-0.5">3D FRAUD INTELLIGENCE</span>
            </div>
          </Link>

          {/* Hero Text */}
          <div className="mt-auto mb-auto pt-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan/10 border border-cyan/25 text-cyan text-[10px] font-mono font-semibold mb-5 shadow-glow-cyan">
              <SparklesIcon className="h-3.5 w-3.5 animate-pulse" />
              <span>FINANCIAL CRIME NETWORK ANALYSIS</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold text-slate-100 leading-tight">
              Unmask{' '}
              <span className="text-gradient-cyan">Coordinated</span>
              <br />Fraud Networks
              <br />in Real-Time.
            </h1>

            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              TraceX builds relationship topology across accounts, devices, and merchants —
              exposing syndicate structures invisible to rule-based systems.
            </p>

            {/* Feature grid */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                    <div className="mt-0.5 h-7 w-7 rounded-lg bg-cyan/15 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-cyan" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{f.label}</p>
                      <p className="text-[10px] text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex items-center gap-6 pt-8 border-t border-white/8">
            {[
              { v: '99.4%', l: 'Accuracy' },
              { v: '<2.4s', l: 'Detection' },
              { v: '3,400+', l: 'Relationships' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-lg font-extrabold text-cyan font-mono">{s.v}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-navy-800 relative">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan/5 blur-[130px] pointer-events-none" />

        <div className="relative z-10 flex flex-col min-h-full px-6 sm:px-10 lg:px-14 xl:px-20 py-8">

          {/* Mobile logo (hidden on lg+) */}
          <div className="flex lg:hidden items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-cyan shadow-glow-cyan flex items-center justify-center font-black text-navy text-base group-hover:scale-105 transition-transform">
                TX
              </div>
              <span className="text-base font-extrabold text-slate-100">TraceX</span>
            </Link>
          </div>

          {/* Form Container — centered vertically */}
          <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-2xl xl:text-3xl font-extrabold text-slate-100 tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Enter your credentials to access the investigation platform.'
                  : 'Register a new investigator profile to get started.'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'login' ? 'bg-cyan text-navy shadow-glow-cyan' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowRightEndOnRectangleIcon className="h-4 w-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'register' ? 'bg-cyan text-navy shadow-glow-cyan' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlusIcon className="h-4 w-4" />
                New Account
              </button>
            </div>

            {/* Error Banner */}
            {(authError || validationError) && (
              <div className="mb-4 p-3 rounded-xl bg-rose/12 border border-rose/25 text-rose text-xs font-medium flex items-start gap-2.5">
                <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{validationError || authError}</span>
              </div>
            )}

            {/* Success Banner */}
            {regSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald/12 border border-emerald/25 text-emerald text-xs font-medium flex items-start gap-2.5">
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{regSuccessMsg}</span>
              </div>
            )}

            {/* ── SIGN IN FORM ── */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="section-label mb-1.5 flex items-center gap-1.5">
                    <EnvelopeIcon className="h-3.5 w-3.5" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="input"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="section-label mb-1.5 flex items-center gap-1.5">
                    <KeyIcon className="h-3.5 w-3.5" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="input pr-10"
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-primary w-full justify-center py-3 mt-1"
                >
                  {authLoading ? (
                    <div className="h-5 w-5 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheckIcon className="h-4 w-4" />
                      Sign In to TraceX
                    </span>
                  )}
                </button>

                {/* Demo fill */}
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  className="w-full py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/10 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center justify-center gap-2 transition-colors"
                >
                  <SparklesIcon className="h-3.5 w-3.5 text-cyan" />
                  Use Demo Investigator Account
                </button>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="section-label mb-1.5 flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      maxLength={100}
                      className="input"
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="section-label mb-1.5 flex items-center gap-1.5">
                      <EnvelopeIcon className="h-3.5 w-3.5" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="input"
                      placeholder="you@gmail.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="section-label mb-1.5 flex items-center gap-1.5">
                      <IdentificationIcon className="h-3.5 w-3.5" />
                      Role / Clearance
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-navy-900 text-slate-200 text-sm px-3 py-2.5 focus:outline-none focus:border-cyan/50 transition-all cursor-pointer"
                    >
                      <option value="investigator">🛡️ Lead Investigator</option>
                      <option value="analyst">🔍 Fraud Analyst</option>
                      <option value="admin">⚡ Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="section-label mb-1.5 flex items-center gap-1.5">
                      <KeyIcon className="h-3.5 w-3.5" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={8}
                      className="input"
                      placeholder="Min. 8 chars"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label className="section-label mb-1.5 flex items-center gap-1.5">
                      <KeyIcon className="h-3.5 w-3.5" />
                      Confirm
                    </label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="input"
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan flex-shrink-0" />
                  Password stored as 12-round bcrypt salted hash
                </p>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-primary w-full justify-center py-3 mt-1"
                >
                  {authLoading ? (
                    <div className="h-5 w-5 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlusIcon className="h-4 w-4" />
                      Create Account & Enter TraceX
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-md w-full mx-auto">
            <p className="text-[10px] text-slate-600 font-mono">
              SECURITY LEVEL: CONFIDENTIAL
            </p>
            <Link to="/" className="text-xs text-cyan/70 hover:text-cyan transition-colors font-mono">
              ← Back to Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

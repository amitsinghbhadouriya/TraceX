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
  SparklesIcon
} from '@heroicons/react/24/outline';

const LoginPage = ({ initialMode = 'login' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryMode = searchParams.get('mode');
  
  const [mode, setMode] = useState(queryMode === 'register' ? 'register' : initialMode);
  
  const { login, register, token, authLoading, authError, clearAuthError } = useAnalysisStore();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('investigator');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (queryMode === 'register') {
      setMode('register');
    } else if (queryMode === 'login') {
      setMode('login');
    }
  }, [queryMode]);

  useEffect(() => {
    if (token) {
      navigate('/upload');
    }
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
    if (success) {
      navigate('/upload');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setRegSuccessMsg('');

    if (!regName.trim()) {
      setValidationError('Please provide your investigator / analyst full name.');
      return;
    }
    if (!regEmail.trim()) {
      setValidationError('Please provide your official email address.');
      return;
    }
    if (regPassword.length < 8) {
      setValidationError('Password must contain at least 8 characters for security compliance.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setValidationError('Password confirmation does not match.');
      return;
    }

    const res = await register(regName.trim(), regEmail.trim().toLowerCase(), regPassword, regRole);
    if (res.success) {
      setRegSuccessMsg('Investigation account successfully created & authorized!');
      setTimeout(() => {
        navigate('/upload');
      }, 800);
    }
  };

  const handleQuickDemoFill = () => {
    setLoginEmail('investigator@tracex.internal');
    setLoginPassword('amit@2004');
    clearAuthError();
    setValidationError('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-navy bg-grid bg-radial-glow py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan selection:text-navy">
      {/* Sleek Aurora & Radial Glow */}
      <div className="absolute inset-0 bg-aurora pointer-events-none opacity-60" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan/10 blur-[130px] pointer-events-none" />

      <div className="relative max-w-lg w-full flex flex-col gap-6 card p-8 sm:p-10 z-10 border-white/15 bg-navy-800/90 shadow-2xl backdrop-blur-xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="group flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-cyan shadow-glow-cyan flex items-center justify-center font-black text-navy text-2xl group-hover:scale-105 transition-transform">
              TX
            </div>
          </Link>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-wide">
              {mode === 'login' ? 'Investigator Access Portal' : 'Create Investigation Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login'
                ? 'Authenticate to access active financial crime graph ledgers'
                : 'Register a credentialed profile with TraceX fraud intelligence network'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => handleModeChange('login')}
            className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'login'
                ? 'bg-cyan text-navy shadow-glow-cyan font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightEndOnRectangleIcon className="h-4 w-4" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('register')}
            className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'register'
                ? 'bg-cyan text-navy shadow-glow-cyan font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>New Account</span>
          </button>
        </div>

        {/* Error / Validation Banner */}
        {(authError || validationError) && (
          <div className="p-3.5 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{validationError || authError}</span>
          </div>
        )}

        {/* Success Banner */}
        {regSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald/15 border border-emerald/30 text-emerald text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{regSuccessMsg}</span>
          </div>
        )}

        {/* MODE: SIGN IN FORM */}
        {mode === 'login' && (
          <form className="flex flex-col gap-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="section-label mb-1.5 flex items-center gap-1.5">
                <EnvelopeIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Official Email Address</span>
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="input text-sm"
                placeholder="investigator@tracex.internal"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="section-label mb-1.5 flex items-center gap-1.5">
                <KeyIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Access Password</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="input text-sm"
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="btn-primary w-full justify-center mt-2 py-3"
            >
              {authLoading ? (
                <div className="h-5 w-5 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>Authorize & Sign In</span>
                </span>
              )}
            </button>

            {/* Quick Demo Pre-fill */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-mono flex items-center justify-center gap-2 transition-colors"
              >
                <SparklesIcon className="h-3.5 w-3.5 text-cyan" />
                <span>Auto-fill Seed Investigator Credentials</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE: CREATE INVESTIGATION ACCOUNT FORM */}
        {mode === 'register' && (
          <form className="flex flex-col gap-4" onSubmit={handleRegisterSubmit}>
            <div>
              <label className="section-label mb-1.5 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Investigator Full Name</span>
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                maxLength={100}
                className="input text-sm"
                placeholder="Special Agent Sarah Connor"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="section-label mb-1.5 flex items-center gap-1.5">
                <EnvelopeIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Official Email Address</span>
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                className="input text-sm"
                placeholder="s.connor@fincrime.gov"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="section-label mb-1.5 flex items-center gap-1.5">
                <IdentificationIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Assigned Clearance / Role</span>
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-900/90 text-slate-200 text-sm px-4 py-2.5 focus:outline-none focus:border-cyan/50 transition-all cursor-pointer"
              >
                <option value="investigator">🛡️ Lead Investigator (Full Investigation & ML Compute)</option>
                <option value="analyst">🔍 Fraud Intelligence Analyst (Read & Query Access)</option>
                <option value="admin">⚡ System Administrator (Governance & Audit Access)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="section-label mb-1.5 flex items-center gap-1.5">
                  <KeyIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Master Password</span>
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input text-sm"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="section-label mb-1.5 flex items-center gap-1.5">
                  <KeyIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Confirm Password</span>
                </label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input text-sm"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
              <span>Password encrypted with 12-round bcrypt salted hash before storage</span>
            </p>

            <button
              type="submit"
              disabled={authLoading}
              className="btn-primary w-full justify-center mt-2 py-3"
            >
              {authLoading ? (
                <div className="h-5 w-5 border-2 border-t-navy border-white/20 rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlusIcon className="h-4 w-4" />
                  <span>Create Account & Initialize Workspace</span>
                </span>
              )}
            </button>
          </form>
        )}

        {/* Footer Security Notice */}
        <div className="border-t border-white/10 pt-4 flex flex-col items-center gap-2 text-center">
          <p className="text-[10px] text-slate-500 font-mono tracking-wider">
            TRACE-X MIL-GRADE FORENSICS // 256-BIT ENCRYPTED SESSION
          </p>
          <Link to="/" className="text-xs text-cyan/80 hover:text-cyan hover:underline font-mono">
            ← Return to Overview & 3D Interactive Demo
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAnalysisStore from '../../store/analysisStore';
import {
  ArrowUpTrayIcon,
  CircleStackIcon,
  CpuChipIcon,
  ArrowRightStartOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  IdentificationIcon,
  SignalIcon,
  GlobeAltIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const {
    logout,
    user,
    isDemoMode,
    selectedDataset,
    datasets,
    fetchDatasets,
    selectDataset,
    deleteDataset,
    clearActiveCase
  } = useAnalysisStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleDatasetChange = (e) => {
    const datasetId = e.target.value;
    if (!datasetId) {
      clearActiveCase();
      navigate('/upload');
      return;
    }
    const dataset = datasets.find(d => d._id === datasetId);
    selectDataset(dataset || null);
    navigate('/dashboard');
  };

  const handleDeleteCurrent = async () => {
    if (!selectedDataset) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${selectedDataset.filename}" and all its analysis results?`
    );
    if (confirmDelete) {
      const success = await deleteDataset(selectedDataset._id);
      if (success) {
        navigate('/upload');
      }
    }
  };

  const navItems = [
    { name: 'Upload Transactions', path: '/upload', icon: ArrowUpTrayIcon },
    { name: 'Overview Dashboard', path: '/dashboard', icon: CircleStackIcon, disabled: !selectedDataset },
    { name: '3D Network Map', path: '/graph', icon: GlobeAltIcon, disabled: !selectedDataset || selectedDataset.status !== 'analysis_complete' },
    { name: 'Connected Fraud Rings', path: '/networks', icon: SignalIcon, disabled: !selectedDataset || selectedDataset.status !== 'analysis_complete' },
    { name: 'Search Accounts & Cards', path: '/entities', icon: IdentificationIcon, disabled: !selectedDataset || selectedDataset.status !== 'analysis_complete' },
    { name: 'AI Investigation Assistant', path: '/assistant', icon: ChatBubbleLeftRightIcon, disabled: !selectedDataset || selectedDataset.status !== 'analysis_complete' },
  ];

  return (
    <aside className="w-80 flex flex-col border-r border-white/10 bg-navy-600">
      {/* Platform Branding */}
      <div
        className="p-6 flex items-center gap-3 border-b border-white/10 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => navigate('/')}
        title="View 3D Overview & Story"
      >
        <div className="h-9 w-9 rounded-xl bg-cyan shadow-glow-cyan flex items-center justify-center font-extrabold text-navy text-lg">
          TX
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
            <span>TraceX</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan/20 text-cyan font-mono font-semibold">3D</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-mono">FINANCIAL FRAUD NETWORK GRAPH</p>
        </div>
      </div>

      {/* Mode Indicator Pill */}
      <div className="px-6 py-2 bg-navy-800/40 border-b border-white/5 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">Environment:</span>
        {isDemoMode ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan/15 text-cyan border border-cyan/30 text-[10px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
            Showcase Demo
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald/15 text-emerald border border-emerald/30 text-[10px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            Live Backend
          </span>
        )}
      </div>

      {/* Dataset Selection Bar */}
      <div className="p-4 border-b border-white/5 bg-navy-700/50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="section-label">Active Dataset Case</label>
          {selectedDataset && (
            <button
              onClick={() => {
                clearActiveCase();
                navigate('/upload');
              }}
              className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 hover:underline"
              title="Deselect active case"
            >
              <XMarkIcon className="h-3 w-3" />
              <span>Deselect</span>
            </button>
          )}
        </div>

        <select
          value={selectedDataset?._id || ''}
          onChange={handleDatasetChange}
          className="w-full rounded-lg border border-white/10 bg-navy-800 text-slate-200 text-xs px-2.5 py-2 focus:outline-none focus:border-cyan/50"
        >
          <option value="">-- Select a Dataset --</option>
          {datasets.map((d) => (
            <option key={d._id} value={d._id}>
              {d.filename} ({d.rowCount || 'Processing'} rows)
            </option>
          ))}
        </select>

        {selectedDataset && (
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[170px]">
              {selectedDataset.filename}
            </span>
            <button
              onClick={handleDeleteCurrent}
              className="text-[10px] text-rose/70 hover:text-rose hover:bg-rose/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
              title="Permanently delete this dataset"
            >
              <TrashIcon className="h-3 w-3" />
              <span>Delete Case</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Options */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.name}
              to={item.disabled ? '#' : item.path}
              onClick={(e) => item.disabled && e.preventDefault()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                item.disabled
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : isActive
                  ? 'bg-cyan/10 text-cyan border border-cyan/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Investigator profile footer */}
      <div className="p-4 border-t border-white/10 bg-navy-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center font-semibold text-cyan text-sm">
            {user?.name?.slice(0, 2).toUpperCase() || 'IN'}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">{user?.name}</h4>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">{user?.role}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-rose p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          title="Logout"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

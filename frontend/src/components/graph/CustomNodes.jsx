import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const getRiskColors = (riskLevel, riskScore) => {
  const score = Math.round(riskScore || 0);
  if (riskLevel === 'CRITICAL' || score >= 75) {
    return {
      border: 'border-rose/80 shadow-[0_0_15px_rgba(244,63,94,0.4)]',
      bg: 'bg-rose/15',
      badge: 'bg-rose text-white font-bold',
      glow: 'shadow-glow-rose',
      textColor: 'text-rose',
    };
  }
  if (riskLevel === 'HIGH' || score >= 50) {
    return {
      border: 'border-amber/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      bg: 'bg-amber/15',
      badge: 'bg-amber text-navy font-bold',
      glow: '',
      textColor: 'text-amber',
    };
  }
  return {
    border: 'border-cyan/40 hover:border-cyan',
    bg: 'bg-navy-800/90',
    badge: 'bg-cyan/20 text-cyan font-bold',
    glow: '',
    textColor: 'text-cyan',
  };
};

export const AccountNode = memo(({ data, selected }) => {
  const style = getRiskColors(data.risk_level, data.risk_score);
  const score = Math.round(data.risk_score || 0);
  const isHighRisk = score >= 50;

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-cyan !border-none opacity-0" />
      
      <div
        className={`px-3 py-1.5 rounded-xl border backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
          selected ? 'border-cyan ring-2 ring-cyan/50 scale-110 shadow-glow-cyan bg-navy-800' : `${style.border} ${style.bg}`
        }`}
        style={{ minWidth: '110px', maxWidth: '160px' }}
      >
        <div className={`h-6 w-6 rounded-lg bg-cyan/15 text-cyan flex items-center justify-center flex-shrink-0 ${isHighRisk ? 'text-rose bg-rose/20' : ''}`}>
          <CreditCardIcon className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-100 truncate font-mono" title={data.label || data.id}>
            {data.label || data.id}
          </p>
        </div>

        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold flex-shrink-0 ${style.badge}`}>
          {score}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-cyan !border-none opacity-0" />
    </div>
  );
});

export const DeviceNode = memo(({ data, selected }) => {
  const isShared = (data.degree || 0) > 1;

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-violet-400 !border-none opacity-0" />
      
      <div
        className={`px-3 py-2 rounded-2xl border-2 backdrop-blur-md flex items-center gap-2.5 cursor-pointer transition-all duration-200 select-none ${
          selected
            ? 'border-violet-400 ring-2 ring-violet-400/50 scale-110 shadow-[0_0_20px_rgba(167,139,250,0.5)] bg-navy-800'
            : isShared
            ? 'border-violet-400/80 bg-violet-950/60 shadow-[0_0_15px_rgba(167,139,250,0.3)]'
            : 'border-white/20 bg-navy-800/90'
        }`}
        style={{ minWidth: '130px', maxWidth: '180px' }}
      >
        <div className="h-7 w-7 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center flex-shrink-0 shadow-inner">
          <DevicePhoneMobileIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-violet-400 block">
            {isShared ? 'Shared Phone/IP' : 'Hardware'}
          </span>
          <p className="text-[11px] font-bold text-slate-100 truncate font-mono" title={data.label || data.id}>
            {data.label || data.id}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-violet-400 !border-none opacity-0" />
    </div>
  );
});

export const MerchantNode = memo(({ data, selected }) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-amber !border-none opacity-0" />
      
      <div
        className={`px-3 py-2 rounded-2xl border-2 backdrop-blur-md flex items-center gap-2.5 cursor-pointer transition-all duration-200 select-none ${
          selected
            ? 'border-amber ring-2 ring-amber/50 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.5)] bg-navy-800'
            : 'border-amber/60 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
        }`}
        style={{ minWidth: '130px', maxWidth: '180px' }}
      >
        <div className="h-7 w-7 rounded-xl bg-amber/20 text-amber flex items-center justify-center flex-shrink-0 shadow-inner">
          <BuildingStorefrontIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-amber block">
            Merchant / Store
          </span>
          <p className="text-[11px] font-bold text-slate-100 truncate font-mono" title={data.label || data.id}>
            {data.label || data.id}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-amber !border-none opacity-0" />
    </div>
  );
});

export const LocationNode = memo(({ data, selected }) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-emerald !border-none opacity-0" />
      
      <div
        className={`px-2.5 py-1.5 rounded-xl border backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all select-none ${
          selected ? 'border-emerald ring-2 ring-emerald/50 bg-navy-800' : 'border-emerald/40 bg-emerald-950/30'
        }`}
      >
        <MapPinIcon className="h-3.5 w-3.5 text-emerald flex-shrink-0" />
        <span className="text-[10px] font-mono font-bold text-slate-200">{data.label || data.id}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-emerald !border-none opacity-0" />
    </div>
  );
});

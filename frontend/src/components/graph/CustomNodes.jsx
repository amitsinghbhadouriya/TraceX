import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const NodeWrapper = ({ type, label, riskLevel, riskScore, icon: Icon, color, selected }) => {
  const isCritical = riskLevel === 'CRITICAL';
  const isHigh = riskLevel === 'HIGH';

  const borderStyles = selected
    ? 'border-cyan shadow-[0_0_25px_rgba(0,212,255,0.4)] scale-105'
    : isCritical
    ? 'border-rose/70 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
    : isHigh
    ? 'border-amber/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
    : 'border-white/10 hover:border-white/25 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]';

  const badgeStyles = isCritical
    ? 'bg-rose/20 text-rose border-rose/40 font-bold animate-pulse'
    : isHigh
    ? 'bg-amber/20 text-amber border-amber/40 font-bold'
    : 'bg-emerald/20 text-emerald border-emerald/40';

  return (
    <div
      style={{
        transformStyle: 'preserve-3d',
        perspective: '600px',
      }}
      className="relative group cursor-pointer"
    >
      {/* 3D Glowing Aura Halo for Critical/High Nodes */}
      {(isCritical || isHigh) && (
        <div
          className={`absolute -inset-1 rounded-2xl blur-sm opacity-60 transition-opacity duration-300 ${
            isCritical ? 'bg-rose/40 animate-pulse' : 'bg-amber/30'
          }`}
        />
      )}

      {/* Main 3D Glass Node Body */}
      <div
        className={`relative px-4 py-3 rounded-xl bg-navy-800/90 border backdrop-blur-md flex items-center gap-3 w-56 transition-all duration-200 ${borderStyles}`}
      >
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner"
          style={{ backgroundColor: `${color}25`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold font-mono">{type}</span>
            <span className={`text-[8px] font-mono border rounded px-1.5 py-0.2 ${badgeStyles}`}>
              {Math.round(riskScore)}
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-200 truncate font-mono" title={label}>
            {label}
          </div>
        </div>

        {isCritical && <ShieldExclamationIcon className="h-4 w-4 text-rose flex-shrink-0 animate-bounce" />}
      </div>
    </div>
  );
};

export const AccountNode = memo(({ data, selected }) => {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <NodeWrapper
        type="Account"
        label={data.label}
        riskLevel={data.risk_level}
        riskScore={data.risk_score || 0}
        icon={CreditCardIcon}
        color="#00D4FF"
        selected={selected}
      />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

export const DeviceNode = memo(({ data, selected }) => {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <NodeWrapper
        type="Device"
        label={data.label}
        riskLevel={data.risk_level}
        riskScore={data.risk_score || 0}
        icon={DevicePhoneMobileIcon}
        color="#A78BFA"
        selected={selected}
      />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

export const MerchantNode = memo(({ data, selected }) => {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <NodeWrapper
        type="Merchant"
        label={data.label}
        riskLevel={data.risk_level}
        riskScore={data.risk_score || 0}
        icon={BuildingStorefrontIcon}
        color="#F59E0B"
        selected={selected}
      />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

export const LocationNode = memo(({ data, selected }) => {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <NodeWrapper
        type="Location"
        label={data.label}
        riskLevel={data.risk_level}
        riskScore={data.risk_score || 0}
        icon={MapPinIcon}
        color="#34D399"
        selected={selected}
      />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

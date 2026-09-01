import React from 'react';
import { ShieldExclamationIcon, ArrowLongRightIcon } from '@heroicons/react/24/outline';

const SuspiciousNetworkCard = ({ cluster, onClick }) => {
  const badgeStyles =
    cluster.risk_level === 'CRITICAL'
      ? 'bg-rose/10 text-rose border-rose/30'
      : cluster.risk_level === 'HIGH'
      ? 'bg-amber/10 text-amber border-amber/30'
      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';

  return (
    <div className="card p-6 flex flex-col justify-between gap-6 hover:border-cyan/30 hover:shadow-glow-cyan transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-md font-bold text-slate-200">Suspicious Network #{cluster.community_id}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{cluster.member_count} connected nodes</p>
        </div>
        <span className={`risk-badge ${cluster.risk_level}`}>
          {cluster.risk_level} ({cluster.risk_score})
        </span>
      </div>

      {/* Member Node Distribution Breakdown */}
      <div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Entity breakdown</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(cluster.entity_type_counts || {}).map(([type, count]) => (
            <div key={type} className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-slate-300 flex items-center gap-1.5 font-mono">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    type === 'account' ? '#00D4FF' : type === 'device' ? '#A78BFA' : type === 'merchant' ? '#F59E0B' : '#34D399'
                }}
              />
              <span className="capitalize">{type}:</span>
              <span className="font-bold text-slate-100">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Primary risk factors list */}
      <div className="flex-1 flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Coordinated factors</span>
        <div className="flex flex-col gap-1.5">
          {cluster.primary_factors?.map((fact, idx) => (
            <div key={idx} className="text-xs text-slate-300 flex gap-2">
              <span className="text-rose mt-0.5">•</span>
              <span>{fact}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action CTA */}
      <button
        onClick={onClick}
        className="w-full btn-ghost justify-center flex items-center gap-2 hover:bg-cyan hover:text-navy hover:shadow-glow-cyan transition-all"
      >
        <span>Inspect Network Ring</span>
        <ArrowLongRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default SuspiciousNetworkCard;

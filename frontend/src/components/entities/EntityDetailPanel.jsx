import React from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  GlobeAltIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const getFactorIcon = (factorText = '', entityType = '') => {
  const lower = factorText.toLowerCase();
  if (lower.includes('shared') || lower.includes('device') || entityType === 'device') {
    return <DevicePhoneMobileIcon className="h-4 w-4 text-violet-400 min-w-[16px] min-h-[16px] flex-shrink-0 mt-0.5" />;
  }
  if (lower.includes('merchant') || lower.includes('store') || entityType === 'merchant') {
    return <BuildingStorefrontIcon className="h-4 w-4 text-amber min-w-[16px] min-h-[16px] flex-shrink-0 mt-0.5" />;
  }
  if (lower.includes('centrality') || lower.includes('hub') || lower.includes('network') || lower.includes('cluster')) {
    return <GlobeAltIcon className="h-4 w-4 text-cyan min-w-[16px] min-h-[16px] flex-shrink-0 mt-0.5" />;
  }
  if (lower.includes('abnormal') || lower.includes('anomaly') || lower.includes('fraud') || lower.includes('spike')) {
    return <ShieldExclamationIcon className="h-4 w-4 text-rose min-w-[16px] min-h-[16px] flex-shrink-0 mt-0.5" />;
  }
  return <ExclamationTriangleIcon className="h-4 w-4 text-amber min-w-[16px] min-h-[16px] flex-shrink-0 mt-0.5" />;
};

const EntityDetailPanel = ({ entity, loading, onClose }) => {
  if (!entity && !loading) return null;

  const riskScore = Math.round(entity?.risk_score || 0);
  const isCritical = riskScore >= 75;
  const isHigh = riskScore >= 50 && riskScore < 75;

  // Generate fallback evidence factors if empty
  const factors = (entity?.contributing_factors && entity.contributing_factors.length > 0)
    ? entity.contributing_factors
    : entity?.entity_type === 'device'
    ? [
        `Hardware device connected to ${entity.connection_count || 1} distinct account(s).`,
        `Network cluster community #${entity.community_id ?? 0} identifier.`
      ]
    : entity?.entity_type === 'merchant'
    ? [
        `Commercial terminal facilitating transaction settlement for ${entity.connection_count || 1} client account(s).`,
        `Operating within community cluster #${entity.community_id ?? 0}.`
      ]
    : [
        `Baseline account activity within normal operational parameters.`,
        `Connected to ${entity?.connection_count || 1} counterparty node(s).`
      ];

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 max-w-full border-l border-white/10 bg-navy-900/98 backdrop-blur-xl z-30 p-6 flex flex-col gap-5 shadow-2xl overflow-y-auto animate-slide-in">
      
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shadow-inner ${
            entity?.entity_type === 'device'
              ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
              : entity?.entity_type === 'merchant'
              ? 'bg-amber/20 text-amber border-amber/30'
              : 'bg-cyan/20 text-cyan border-cyan/30'
          }`}>
            {entity?.entity_type === 'device' ? (
              <DevicePhoneMobileIcon className="h-5 w-5" />
            ) : entity?.entity_type === 'merchant' ? (
              <BuildingStorefrontIcon className="h-5 w-5" />
            ) : (
              <CreditCardIcon className="h-5 w-5" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-100 truncate w-56 font-mono" title={entity?.label || entity?.id}>
              {entity?.label || entity?.id || 'Entity Details'}
            </h3>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              {entity?.entity_type || 'Unknown'} Profile
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-3 border-t-cyan border-white/10 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Querying resolved attributes...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-5">
          
          {/* ── Threat Score & Network Centrality ─────────────────── */}
          <div className={`card p-4 flex items-center justify-between border ${
            isCritical ? 'border-rose/40 bg-rose/10' : isHigh ? 'border-amber/40 bg-amber/10' : 'border-white/10 bg-white/5'
          }`}>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Entity Risk Score
              </span>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isCritical
                  ? 'bg-rose/20 text-rose border-rose/30'
                  : isHigh
                  ? 'bg-amber/20 text-amber border-amber/30'
                  : 'bg-emerald/20 text-emerald border-emerald/30'
              }`}>
                {entity.risk_level || (isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'LOW')} ({riskScore} / 100)
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Degree Centrality
              </span>
              <span className="text-sm font-mono text-cyan font-bold">
                {typeof entity.centrality === 'number' && !isNaN(entity.centrality) ? entity.centrality.toFixed(3) : '0.000'}
              </span>
            </div>
          </div>

          {/* ── Evidence Factors ─────────────────────────────────── */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <SparklesIcon className="h-4 w-4 text-cyan" />
                <span>Evidence Factors</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {factors.length} Signal{factors.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {factors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 leading-relaxed shadow-sm hover:border-white/20 transition-colors"
                >
                  {getFactorIcon(factor, entity?.entity_type)}
                  <span className="flex-1 font-medium">{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Associated Transactions ──────────────────────────── */}
          {entity.transactions && entity.transactions.length > 0 && (
            <div className="flex flex-col gap-2.5 flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4 text-cyan" />
                  <span>Recent Ledger Transactions</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {entity.transactions.length} Records
                </span>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 max-h-64">
                {entity.transactions.map((txn, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-navy-800/80 border border-white/10 flex flex-col gap-1.5 hover:border-cyan/30 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                        {txn.timestamp ? new Date(txn.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </span>
                      <span className="text-slate-100 font-bold font-mono">
                        ${typeof txn.amount === 'number' && !isNaN(txn.amount) ? txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>

                    {txn.merchant_id && (
                      <div className="text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
                        <BuildingStorefrontIcon className="h-3.5 w-3.5 text-amber min-w-[14px] min-h-[14px] flex-shrink-0" />
                        <span>Merchant: {txn.merchant_id}</span>
                      </div>
                    )}

                    {txn.triggered_signals && txn.triggered_signals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {txn.triggered_signals.map((sig, sIdx) => (
                          <span
                            key={sIdx}
                            className="bg-rose/15 text-rose text-[9px] font-mono font-semibold rounded px-1.5 py-0.5 border border-rose/30 truncate max-w-full"
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntityDetailPanel;

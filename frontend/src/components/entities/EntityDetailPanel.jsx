import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon, CalendarDaysIcon, CurrencyDollarIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

const EntityDetailPanel = ({ entity, loading, onClose }) => {
  if (!entity && !loading) return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 border-l border-white/10 bg-navy-600/95 backdrop-blur-md z-30 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-md font-bold text-slate-100 truncate w-64">{entity?.label || 'Loading...'}</h3>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            {entity?.entity_type} Profile
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-3 border-t-cyan border-white/10 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Querying resolved attributes...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          {/* Risk Level Widget */}
          <div className="card p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Entity Risk Score</span>
              <span className={`risk-badge ${entity.risk_level || 'LOW'}`}>
                {entity.risk_level || 'UNKNOWN'} ({typeof entity.risk_score === 'number' && !isNaN(entity.risk_score) ? entity.risk_score.toFixed(0) : '—'})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Degree centrality</span>
              <span className="text-sm font-mono text-slate-200 font-bold">
                {typeof entity.centrality === 'number' && !isNaN(entity.centrality) ? entity.centrality.toFixed(3) : '0.000'}
              </span>
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="flex flex-col gap-3">
            <h4 className="section-label">Evidence factors</h4>
            <div className="flex flex-col gap-2">
              {entity.contributing_factors?.map((factor, i) => (
                <div key={i} className="flex gap-2.5 p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300">
                  <ExclamationTriangleIcon className="h-4.5 w-4.5 text-amber flex-shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supporting Transaction History */}
          {entity.transactions && entity.transactions.length > 0 && (
            <div className="flex flex-col gap-3 flex-1 overflow-hidden">
              <h4 className="section-label">Recent Transactions</h4>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                {entity.transactions.map((txn, index) => (
                  <div key={index} className="p-3 rounded-lg bg-navy-800 border border-white/5 flex flex-col gap-1.5 hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-mono">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        {txn.timestamp ? new Date(txn.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </span>
                      <span className="text-slate-100 font-bold font-mono">
                        ${typeof txn.amount === 'number' && !isNaN(txn.amount) ? txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>
                    {txn.merchant_id && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <BuildingStorefrontIcon className="h-3 w-3 text-amber" />
                        <span>Merchant: {txn.merchant_id}</span>
                      </div>
                    )}
                    {txn.triggered_signals && txn.triggered_signals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {txn.triggered_signals.map((sig, sIdx) => (
                          <span key={sIdx} className="bg-rose/10 text-rose text-[8px] font-semibold rounded px-1 py-0.5 border border-rose/15 truncate max-w-full">
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

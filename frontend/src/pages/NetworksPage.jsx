import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuspiciousNetworkCard from '../components/networks/SuspiciousNetworkCard';
import useAnalysisStore from '../store/analysisStore';
import { CpuChipIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

const NetworksPage = () => {
  const { selectedDataset, clusters, fetchGraph } = useAnalysisStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedDataset) {
      fetchGraph();
    }
  }, [selectedDataset, fetchGraph]);

  if (!selectedDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card max-w-md mx-auto">
        <ShieldExclamationIcon className="h-12 w-12 text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-md font-bold text-slate-200">No Active Case Selected</h3>
        <p className="text-xs text-slate-400 mt-1">Please upload a dataset or select an active case.</p>
      </div>
    );
  }

  // Filter clusters with risk scores > 40 (MEDIUM, HIGH, CRITICAL)
  const suspiciousClusters = clusters.filter(c => c.risk_score >= 40);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <CpuChipIcon className="h-6 w-6 text-cyan" />
          <span>Connected Fraud Rings</span>
        </h2>
        <p className="text-xs text-slate-400">
          Groups of accounts that share the same phones, addresses, cards, or stores to move suspicious money.
        </p>
      </div>

      {suspiciousClusters.length === 0 ? (
        <div className="card p-12 text-center max-w-md mx-auto flex flex-col items-center gap-3">
          <ShieldExclamationIcon className="h-10 w-10 text-emerald animate-pulse" />
          <h3 className="text-md font-bold text-slate-200">No Suspicious Groups Found</h3>
          <p className="text-xs text-slate-400">All accounts in this file look normal and safe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suspiciousClusters.map((cluster) => (
            <SuspiciousNetworkCard
              key={cluster.community_id}
              cluster={cluster}
              onClick={() => navigate('/graph', { state: { targetCluster: cluster.community_id } })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NetworksPage;

import React, { useEffect, useState, useMemo } from 'react';
import useAnalysisStore from '../store/analysisStore';
import EntityDetailPanel from '../components/entities/EntityDetailPanel';
import { MagnifyingGlassIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

const EntitiesPage = () => {
  const {
    selectedDataset,
    nodes: rawNodes,
    fetchGraph,
    selectedEntity,
    selectedEntityLoading,
    fetchEntityDetails,
    clearSelectedEntity
  } = useAnalysisStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');

  useEffect(() => {
    if (selectedDataset) {
      fetchGraph();
    }
  }, [selectedDataset, fetchGraph]);

  // Filter & sort entities by descending risk_score (non-mutating copy)
  const filteredEntities = useMemo(() => {
    return (rawNodes || [])
      .filter((node) => {
        const matchesSearch =
          (node.id || '').toLowerCase().includes(search.toLowerCase()) ||
          (node.label || '').toLowerCase().includes(search.toLowerCase());
        
        const matchesType = filterType === 'all' || node.type === filterType;
        const matchesRisk = filterRisk === 'all' || node.risk_level === filterRisk;

        return matchesSearch && matchesType && matchesRisk;
      })
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  }, [rawNodes, search, filterType, filterRisk]);

  if (!selectedDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card max-w-md mx-auto animate-fade-in">
        <ShieldExclamationIcon className="h-12 w-12 text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-md font-bold text-slate-200">No Active Case Selected</h3>
        <p className="text-xs text-slate-400 mt-1">Please upload a dataset or select an active case.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in relative h-full">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <span>Search Accounts, Cards & Devices</span>
        </h2>
        <p className="text-xs text-slate-400">
          Quickly look up any user, device ID, card, or store to check their risk level and connections.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="card p-4 flex flex-wrap items-center gap-4 z-10">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Type account number, device ID, or shop name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy-800 text-slate-200 text-xs px-3 py-2.5 focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="account">Bank Accounts</option>
          <option value="device">Phones / Devices</option>
          <option value="merchant">Stores / Merchants</option>
          <option value="location">Locations / Cities</option>
        </select>

        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy-800 text-slate-200 text-xs px-3 py-2.5 focus:outline-none"
        >
          <option value="all">All Risk Levels</option>
          <option value="CRITICAL">🔴 Critical Risk</option>
          <option value="HIGH">🟠 High Risk</option>
          <option value="MEDIUM">🟡 Medium Risk</option>
          <option value="LOW">🟢 Safe / Low</option>
        </select>
      </div>

      {/* Directory Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account / Device Name</th>
                <th>Category</th>
                <th>Risk Level</th>
                <th>Assigned Fraud Ring</th>
                <th>Connection Links</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No matching accounts or devices found.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((ent) => (
                  <tr key={ent.id} onClick={() => fetchEntityDetails(ent.id)} className="cursor-pointer hover:bg-white/5 transition-colors">
                    <td className="font-semibold text-slate-200">{ent.label}</td>
                    <td className="capitalize text-slate-400">{ent.type}</td>
                    <td>
                      <span className={`risk-badge ${ent.risk_level || 'LOW'}`}>
                        {typeof ent.risk_score === 'number' && !isNaN(ent.risk_score) ? `${ent.risk_score.toFixed(0)} / 100` : '—'}
                      </span>
                    </td>
                    <td className="font-mono text-xs">
                      {ent.community_id !== undefined ? `Group #${ent.community_id}` : 'Single Account'}
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      {ent.connection_count ? `${ent.connection_count} links` : (typeof ent.centrality === 'number' && ent.centrality > 0 ? `${Math.round(ent.centrality * 100)} links` : 'Direct link')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out detail drawer */}
      <EntityDetailPanel
        entity={selectedEntity}
        loading={selectedEntityLoading}
        onClose={clearSelectedEntity}
      />
    </div>
  );
};

export default EntitiesPage;

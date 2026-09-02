import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import useAnalysisStore from '../store/analysisStore';
import { AccountNode, DeviceNode, MerchantNode, LocationNode } from '../components/graph/CustomNodes';
import EntityDetailPanel from '../components/entities/EntityDetailPanel';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CpuChipIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const nodeTypes = {
  account: AccountNode,
  device: DeviceNode,
  merchant: MerchantNode,
  location: LocationNode,
};

const GraphPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    selectedDataset,
    nodes: rawNodes,
    edges: rawEdges,
    clusters,
    fetchGraph,
    graphLoading,
    selectedEntity,
    selectedEntityLoading,
    fetchEntityDetails,
    clearSelectedEntity
  } = useAnalysisStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [minRisk, setMinRisk] = useState(0);
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [onlyHighRisk, setOnlyHighRisk] = useState(false);

  // Incoming cluster navigation from other pages
  useEffect(() => {
    if (location.state?.targetCluster !== undefined) {
      setSelectedCluster(String(location.state.targetCluster));
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedDataset) {
      fetchGraph();
    }
  }, [selectedDataset, fetchGraph]);

  // ── Intelligent Hub-and-Spoke Cluster Layout ─────────────────────────────
  const processedGraph = useMemo(() => {
    if (!rawNodes || rawNodes.length === 0) return { nodes: [], edges: [] };

    // Group nodes by community/cluster
    const clusterGroups = {};
    rawNodes.forEach((node) => {
      const cid = node.community_id !== undefined ? node.community_id : -1;
      if (!clusterGroups[cid]) clusterGroups[cid] = [];
      clusterGroups[cid].push(node);
    });

    const flowNodes = [];
    const clusterKeys = Object.keys(clusterGroups);
    const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(clusterKeys.length))));
    const clusterSpacingX = 1400;
    const clusterSpacingY = 1200;

    clusterKeys.forEach((clusterId, clusterIdx) => {
      const members = clusterGroups[clusterId];
      const col = clusterIdx % cols;
      const row = Math.floor(clusterIdx / cols);
      const clusterCenterX = col * clusterSpacingX + 600;
      const clusterCenterY = row * clusterSpacingY + 500;

      // Separate Hubs (Devices & Merchants) from Peripheral Accounts
      const hubs = members.filter((m) => m.type === 'device' || m.type === 'merchant');
      const accounts = members.filter((m) => m.type !== 'device' && m.type !== 'merchant');

      // Place Hub nodes at the center of the ring
      if (hubs.length === 1) {
        flowNodes.push({
          id: hubs[0].id,
          type: hubs[0].type,
          position: { x: clusterCenterX, y: clusterCenterY },
          data: {
            label: hubs[0].label,
            risk_score: hubs[0].risk_score,
            risk_level: hubs[0].risk_level,
            degree: hubs[0].degree,
          },
        });
      } else if (hubs.length > 1) {
        hubs.forEach((hub, hIdx) => {
          const angle = (hIdx / hubs.length) * 2 * Math.PI;
          const hRadius = 80;
          flowNodes.push({
            id: hub.id,
            type: hub.type,
            position: {
              x: clusterCenterX + hRadius * Math.cos(angle),
              y: clusterCenterY + hRadius * Math.sin(angle),
            },
            data: {
              label: hub.label,
              risk_score: hub.risk_score,
              risk_level: hub.risk_level,
              degree: hub.degree,
            },
          });
        });
      }

      // Arrange accounts in multi-layered concentric rings to prevent overlapping
      const accountsPerRing = 12;
      accounts.forEach((acc, aIdx) => {
        const ringLevel = Math.floor(aIdx / accountsPerRing);
        const indexInRing = aIdx % accountsPerRing;
        const totalInThisRing = Math.min(accountsPerRing, accounts.length - ringLevel * accountsPerRing);

        const ringRadius = 240 + ringLevel * 140;
        // Stagger alternating rings for clean spacing
        const offsetAngle = (ringLevel % 2) * (Math.PI / totalInThisRing);
        const angle = (indexInRing / totalInThisRing) * 2 * Math.PI + offsetAngle;

        flowNodes.push({
          id: acc.id,
          type: acc.type,
          position: {
            x: clusterCenterX + ringRadius * Math.cos(angle),
            y: clusterCenterY + ringRadius * Math.sin(angle),
          },
          data: {
            label: acc.label,
            risk_score: acc.risk_score,
            risk_level: acc.risk_level,
          },
        });
      });
    });

    // Format edges with curved strokes and glowing threat animations
    const flowEdges = (rawEdges || []).map((edge, index) => {
      const isShared = edge.relationship?.includes('shared');
      const isHighWeight = (edge.weight || 0) > 4;
      const isThreatLink = isShared || isHighWeight;

      return {
        id: `e-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: isThreatLink,
        style: {
          stroke: isThreatLink ? '#F43F5E' : 'rgba(0, 212, 255, 0.3)',
          strokeWidth: isThreatLink ? 2.5 : 1.2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isThreatLink ? '#F43F5E' : '#00D4FF',
          width: 14,
          height: 14,
        },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [rawNodes, rawEdges]);

  // Apply search/filters
  useEffect(() => {
    let filteredNodes = processedGraph.nodes;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        (n) => n.id.toLowerCase().includes(q) || (n.data.label || '').toLowerCase().includes(q)
      );
    }

    if (selectedType !== 'all') {
      filteredNodes = filteredNodes.filter((n) => n.type === selectedType);
    }

    if (onlyHighRisk) {
      filteredNodes = filteredNodes.filter((n) => (n.data.risk_score || 0) >= 50);
    } else if (minRisk > 0) {
      filteredNodes = filteredNodes.filter((n) => (n.data.risk_score || 0) >= minRisk);
    }

    if (selectedCluster !== 'all') {
      const cid = parseInt(selectedCluster, 10);
      const targetIds = (rawNodes || [])
        .filter((n) => n.community_id === cid)
        .map((n) => n.id);
      filteredNodes = filteredNodes.filter((n) => targetIds.includes(n.id));
    }

    setNodes(filteredNodes);

    // Filter connected edges
    const activeNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = processedGraph.edges.filter(
      (e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );
    setEdges(filteredEdges);
  }, [searchQuery, selectedType, minRisk, selectedCluster, onlyHighRisk, processedGraph, rawNodes, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (event, node) => {
      fetchEntityDetails(node.id);
    },
    [fetchEntityDetails]
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col relative animate-fade-in gap-3 pb-4">

      {/* ── Top Filter & Control Ribbon ─────────────────────────── */}
      <div className="card p-3.5 sm:p-4 bg-navy-800/95 border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl z-20">

        {/* Search Field */}
        <div className="flex-1 min-w-[220px] max-w-sm relative">
          <input
            type="text"
            placeholder="Search Account, Device, Merchant ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 py-2 text-xs w-full bg-navy-900 border-white/10"
          />
          <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Node Type Selector */}
          <div className="flex items-center gap-1.5 bg-navy-900 border border-white/15 rounded-lg px-2.5 py-1">
            <FunnelIcon className="h-3.5 w-3.5 text-cyan" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-navy-900 text-slate-100 text-xs focus:outline-none cursor-pointer border-none"
            >
              <option value="all" className="bg-navy-900 text-slate-100">All Entity Types</option>
              <option value="account" className="bg-navy-900 text-slate-100">Accounts & Cards</option>
              <option value="device" className="bg-navy-900 text-slate-100">Shared Devices / IPs</option>
              <option value="merchant" className="bg-navy-900 text-slate-100">Merchants & Stores</option>
            </select>
          </div>

          {/* Fraud Ring Selector */}
          <div className="flex items-center gap-1.5 bg-navy-900 border border-white/15 rounded-lg px-2.5 py-1">
            <CpuChipIcon className="h-3.5 w-3.5 text-rose" />
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="bg-navy-900 text-slate-100 text-xs focus:outline-none cursor-pointer border-none"
            >
              <option value="all" className="bg-navy-900 text-slate-100">All Fraud Rings ({clusters?.length || 0})</option>
              {(clusters || []).map((c) => (
                <option key={c.community_id} value={c.community_id} className="bg-navy-900 text-slate-100">
                  Ring #{c.community_id} — {c.member_count} Accounts ({c.risk_level})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Threat Filter */}
          <button
            onClick={() => setOnlyHighRisk(!onlyHighRisk)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${onlyHighRisk
                ? 'bg-rose/20 text-rose border-rose shadow-glow-rose font-bold'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
              }`}
          >
            <span>🚨 Flagged Only (Score ≥ 50)</span>
          </button>
        </div>

        {/* Active Node Count */}
        <div className="text-xs text-slate-400 font-mono hidden md:flex items-center gap-2">
          <span>Displaying: <strong className="text-cyan">{nodes.length}</strong> nodes, <strong className="text-cyan">{edges.length}</strong> links</span>
        </div>
      </div>

      {/* ── Interactive Network Canvas ──────────────────────────── */}
      <div className="flex-1 card p-0 overflow-hidden relative border-white/10 bg-navy-950 shadow-2xl rounded-2xl">
        {graphLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/90 gap-3 z-30">
            <div className="h-10 w-10 border-3 border-t-cyan border-white/10 rounded-full animate-spin" />
            <p className="text-xs text-slate-300 font-mono">Building organized relationship constellation...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.05}
            maxZoom={1.8}
            className="bg-navy-950"
          >
            <Background color="rgba(0, 212, 255, 0.08)" gap={24} size={1} />
            <Controls className="bg-navy-800 border border-white/10 rounded-xl overflow-hidden shadow-xl" />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'device') return '#A78BFA';
                if (n.type === 'merchant') return '#F59E0B';
                if ((n.data?.risk_score || 0) >= 50) return '#F43F5E';
                return '#00D4FF';
              }}
              maskColor="rgba(6, 10, 24, 0.85)"
              className="bg-navy-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl !bottom-4 !right-4"
            />
          </ReactFlow>
        )}

        {/* ── Floating Legend HUD ─────────────────────────────────── */}
        <div className="absolute bottom-4 left-4 z-20 bg-navy-900/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-md bg-cyan/20 border border-cyan" />
            <span>Normal Account</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-md bg-rose/30 border border-rose" />
            <span>High Risk Account</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-md bg-violet-500/30 border border-violet-400" />
            <span>Shared Device (Hub)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-md bg-amber/30 border border-amber" />
            <span>Merchant Terminal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-rose animate-pulse" />
            <span className="text-rose font-bold">Coordinated Link</span>
          </div>
        </div>
      </div>

      {/* ── Slide-Out Forensic Detail Drawer ─────────────────────── */}
      <EntityDetailPanel
        entity={selectedEntity}
        loading={selectedEntityLoading}
        onClose={clearSelectedEntity}
      />
    </div>
  );
};

export default GraphPage;

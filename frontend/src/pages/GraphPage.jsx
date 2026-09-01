import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useAnalysisStore from '../store/analysisStore';
import { AccountNode, DeviceNode, MerchantNode, LocationNode } from '../components/graph/CustomNodes';
import EntityDetailPanel from '../components/entities/EntityDetailPanel';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const nodeTypes = {
  account: AccountNode,
  device: DeviceNode,
  merchant: MerchantNode,
  location: LocationNode,
};

const GraphPage = () => {
  const location = useLocation();
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

  // Handle incoming cluster selection from other pages (like Networks page)
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

  // Transform and Layout graph nodes dynamically (radial layout per cluster/community)
  const processedGraph = useMemo(() => {
    if (!rawNodes || rawNodes.length === 0) return { nodes: [], edges: [] };

    // Group nodes by community/cluster to layout them in clusters
    const clusterGroups = {};
    rawNodes.forEach((node) => {
      const cid = node.community_id !== undefined ? node.community_id : -1;
      if (!clusterGroups[cid]) clusterGroups[cid] = [];
      clusterGroups[cid].push(node);
    });

    const flowNodes = [];
    const clusterKeys = Object.keys(clusterGroups);
    const clusterRadius = 300; // Radius of nodes inside a cluster
    const clusterSpacing = 900; // Spacing between clusters in grid

    clusterKeys.forEach((clusterId, clusterIdx) => {
      const cMembers = clusterGroups[clusterId];
      const cols = Math.ceil(Math.sqrt(clusterKeys.length));
      const clusterX = (clusterIdx % cols) * clusterSpacing;
      const clusterY = Math.floor(clusterIdx / cols) * clusterSpacing;

      cMembers.forEach((node, idx) => {
        // Calculate coordinate relative to cluster center in a circle
        const angle = (idx / cMembers.length) * 2 * Math.PI;
        const radius = cMembers.length > 1 ? clusterRadius : 0;
        const x = clusterX + radius * Math.cos(angle);
        const y = clusterY + radius * Math.sin(angle);

        flowNodes.push({
          id: node.id,
          type: node.type,
          position: { x, y },
          data: {
            label: node.label,
            risk_score: node.risk_score,
            risk_level: node.risk_level,
          },
        });
      });
    });

    // Format edges for React Flow
    const flowEdges = rawEdges.map((edge, index) => {
      // Color edge red if it joins critical/high nodes
      const isRisky = edge.relationship?.includes('shared') || edge.weight > 5;
      return {
        id: `e-${index}`,
        source: edge.source,
        target: edge.target,
        animated: isRisky,
        style: {
          stroke: isRisky ? '#F43F5E' : 'rgba(255,255,255,0.15)',
          strokeWidth: isRisky ? 2 : 1,
        },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [rawNodes, rawEdges]);

  // Apply search/filters on nodes & keep related edges
  useEffect(() => {
    let filteredNodes = processedGraph.nodes;

    if (searchQuery) {
      filteredNodes = filteredNodes.filter(n =>
        n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.data.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedType !== 'all') {
      filteredNodes = filteredNodes.filter(n => n.type === selectedType);
    }

    if (minRisk > 0) {
      filteredNodes = filteredNodes.filter(n => (n.data.risk_score || 0) >= minRisk);
    }

    if (selectedCluster !== 'all') {
      const cid = parseInt(selectedCluster, 10);
      const targetIds = rawNodes
        .filter(n => n.community_id === cid)
        .map(n => n.id);
      filteredNodes = filteredNodes.filter(n => targetIds.includes(n.id));
    }

    setNodes(filteredNodes);

    // Keep edges where source & target exist in current active set
    const activeNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = processedGraph.edges.filter(
      e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );
    setEdges(filteredEdges);
  }, [searchQuery, selectedType, minRisk, selectedCluster, processedGraph, rawNodes, setNodes, setEdges]);

  const onNodeClick = (event, node) => {
    fetchEntityDetails(node.id);
  };

  return (
    <div className="h-full flex flex-col relative animate-fade-in">
      {/* Graph Filter Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-4 mb-4 z-20">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Search Entity (Account, Device, Merchant ID...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-cyan" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-white/10 bg-navy-800 text-slate-200 text-xs px-3 py-2.5 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="account">Accounts</option>
            <option value="device">Devices</option>
            <option value="merchant">Merchants</option>
            <option value="location">Locations</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="rounded-lg border border-white/10 bg-navy-800 text-slate-200 text-xs px-3 py-2.5 focus:outline-none"
          >
            <option value="all">All Clusters</option>
            {clusters.map((c) => (
              <option key={c.community_id} value={c.community_id}>
                Cluster #{c.community_id} ({c.risk_level})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Min Risk:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={minRisk}
            onChange={(e) => setMinRisk(Number(e.target.value))}
            className="w-24 accent-cyan"
          />
          <span className="font-mono text-cyan font-semibold w-6">{minRisk}</span>
        </div>
      </div>

      {/* React Flow Container */}
      <div className="flex-1 card overflow-hidden relative min-h-[400px]">
        {graphLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/80 gap-3 z-10">
            <div className="h-10 w-10 border-4 border-t-cyan border-white/10 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Building network relations & clusters...</p>
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
            minZoom={0.1}
            maxZoom={1.5}
          >
            <Background color="rgba(255,255,255,0.05)" gap={16} />
            <Controls className="bg-navy border border-white/10" />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'account') return '#00D4FF';
                if (n.type === 'device') return '#A78BFA';
                if (n.type === 'merchant') return '#F59E0B';
                return '#34D399';
              }}
              maskColor="rgba(10,15,30,0.8)"
              className="bg-navy border border-white/10 rounded-lg overflow-hidden"
            />
          </ReactFlow>
        )}
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

export default GraphPage;

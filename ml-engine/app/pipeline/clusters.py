"""
Phase 4 — Cluster Detection
Community detection (Louvain), betweenness centrality,
and hub entity identification.
"""
import logging
from typing import Any

import networkx as nx

try:
    import community as community_louvain  # python-louvain
    HAS_LOUVAIN = True
except ImportError:
    HAS_LOUVAIN = False
    logging.getLogger(__name__).warning(
        "python-louvain not available; falling back to connected components."
    )

logger = logging.getLogger(__name__)


def detect_clusters(G: nx.Graph) -> dict:
    """
    Run community detection and centrality analysis on the graph.

    Returns:
        {
            "node_community_map": { node_id: community_id },
            "communities": { community_id: [node_ids] },
            "centrality": { node_id: float },
            "hub_nodes": [node_ids with top-10% centrality],
            "community_summaries": [ { id, size, entity_type_counts, node_ids } ]
        }
    """
    if G.number_of_nodes() == 0:
        return _empty_result()

    # ── Community Detection ───────────────────────────────────────────────────
    if HAS_LOUVAIN and G.number_of_nodes() > 1:
        node_community_map = community_louvain.best_partition(G, weight="weight", random_state=42)
    else:
        # Fallback: use connected components as communities
        node_community_map = {}
        for cid, component in enumerate(nx.connected_components(G)):
            for node in component:
                node_community_map[node] = cid

    communities: dict[int, list] = {}
    for node, cid in node_community_map.items():
        communities.setdefault(cid, []).append(node)

    # ── Centrality ────────────────────────────────────────────────────────────
    if G.number_of_nodes() > 2:
        centrality = nx.betweenness_centrality(G, weight="weight", normalized=True)
    else:
        centrality = {n: 0.0 for n in G.nodes()}

    # Top 10% are "hubs"
    sorted_centrality = sorted(centrality.values(), reverse=True)
    threshold_idx = max(1, int(len(sorted_centrality) * 0.10))
    hub_threshold  = sorted_centrality[threshold_idx - 1] if sorted_centrality else 0
    hub_nodes = [n for n, c in centrality.items() if c >= hub_threshold]

    # ── Community Summaries ───────────────────────────────────────────────────
    summaries = []
    for cid, members in communities.items():
        type_counts: dict[str, int] = {}
        for node in members:
            ntype = G.nodes[node].get("type", "unknown")
            type_counts[ntype] = type_counts.get(ntype, 0) + 1

        # Count shared-entity edges within community
        shared_edges = [
            (u, v, d) for u, v, d in G.edges(members, data=True)
            if "shared_via" in d and d["shared_via"]
        ]

        summaries.append({
            "community_id":    cid,
            "size":            len(members),
            "entity_type_counts": type_counts,
            "node_ids":        members,
            "shared_entity_edges": len(shared_edges),
            "max_centrality":  max((centrality.get(n, 0) for n in members), default=0),
        })

    # Sort by shared edges + size (most suspicious first)
    summaries.sort(key=lambda x: (x["shared_entity_edges"], x["size"]), reverse=True)

    logger.info(
        "Cluster detection: %d communities, %d hub nodes",
        len(communities), len(hub_nodes)
    )

    return {
        "node_community_map":  node_community_map,
        "communities":         communities,
        "centrality":          centrality,
        "hub_nodes":           hub_nodes,
        "community_summaries": summaries,
    }


def _empty_result() -> dict:
    return {
        "node_community_map":  {},
        "communities":         {},
        "centrality":          {},
        "hub_nodes":           [],
        "community_summaries": [],
    }

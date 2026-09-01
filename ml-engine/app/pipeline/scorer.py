"""
Phase 4 — Explainable Risk Scoring
Produces 0–100 risk scores for each entity and each network cluster,
with human-readable contributing factor lists.
"""
import logging
from typing import Any

import numpy as np
import pandas as pd
import networkx as nx

logger = logging.getLogger(__name__)

RISK_LEVELS = {
    "CRITICAL": 90,
    "HIGH":     70,
    "MEDIUM":   40,
    "LOW":       0,
}


def score_entities(
    df: pd.DataFrame,
    G: nx.Graph,
    cluster_data: dict,
) -> dict:
    """
    Compute risk scores for every entity node in the graph.

    Returns:
        {
            "entity_scores": { node_id: { score, risk_level, contributing_factors, ... } },
            "cluster_scores": { community_id: { score, risk_level, primary_factors, ... } },
            "summary": { high_risk_entity_count, ... }
        }
    """
    centrality     = cluster_data.get("centrality", {})
    hub_nodes      = set(cluster_data.get("hub_nodes", []))
    node_community = cluster_data.get("node_community_map", {})
    summaries      = cluster_data.get("community_summaries", [])
    communities    = cluster_data.get("communities", {})

    # ── Per-account anomaly stats from df ─────────────────────────────────────
    acct_anomaly = {}
    if "account_id" in df.columns and "composite_anomaly_score" in df.columns:
        grp = df.groupby("account_id")["composite_anomaly_score"]
        acct_anomaly = {
            str(acct): {"mean": float(row["mean"]), "max": float(row["max"])}
            for acct, row in grp.agg(["mean", "max"]).iterrows()
        }

    # ── Compute community risk averages (needs first pass) ────────────────────
    # We'll do two passes: first score individual nodes, then average per community.

    entity_scores: dict[str, dict] = {}

    for node_id in G.nodes():
        node_attrs = G.nodes[node_id]
        ntype  = node_attrs.get("type", "unknown")
        label  = node_attrs.get("label", node_id)

        score, factors = _score_node(
            node_id, ntype, label, node_attrs,
            G, centrality, hub_nodes, node_community, acct_anomaly, summaries
        )

        risk_level = _to_risk_level(score)
        entity_scores[node_id] = {
            "node_id":             node_id,
            "entity_type":         ntype,
            "label":               label,
            "risk_score":          score,
            "risk_level":          risk_level,
            "contributing_factors": factors,
            "community_id":        node_community.get(node_id),
            "centrality":          round(centrality.get(node_id, 0), 4),
            "is_hub":              node_id in hub_nodes,
            "connection_count":    G.degree(node_id),
        }

    # ── Cluster risk scores ────────────────────────────────────────────────────
    cluster_scores: dict[int, dict] = {}
    for summary in summaries:
        cid     = summary["community_id"]
        members = summary["node_ids"]
        member_scores = [entity_scores[n]["risk_score"] for n in members if n in entity_scores]

        avg_score = float(np.mean(member_scores)) if member_scores else 0.0
        max_score = float(np.max(member_scores))  if member_scores else 0.0

        # Shared entity bonus: more cross-account sharing → higher risk
        shared_bonus = min(20, summary["shared_entity_edges"] * 5)
        cluster_score = min(100, avg_score + shared_bonus * 0.3)

        primary_factors = _cluster_primary_factors(members, entity_scores, G, summary)

        cluster_scores[cid] = {
            "community_id":         cid,
            "risk_score":           round(cluster_score, 1),
            "risk_level":           _to_risk_level(cluster_score),
            "member_count":         len(members),
            "entity_type_counts":   summary["entity_type_counts"],
            "avg_member_score":     round(avg_score, 1),
            "max_member_score":     round(max_score, 1),
            "shared_entity_edges":  summary["shared_entity_edges"],
            "primary_factors":      primary_factors,
            "node_ids":             members,
        }

    summary_stats = _build_summary(entity_scores, cluster_scores)

    return {
        "entity_scores":  entity_scores,
        "cluster_scores": cluster_scores,
        "summary":        summary_stats,
    }


# ── Node Scoring ───────────────────────────────────────────────────────────────

def _score_node(
    node_id, ntype, label, attrs,
    G, centrality, hub_nodes, node_community, acct_anomaly, summaries
) -> tuple[float, list[str]]:
    score = 0.0
    factors: list[str] = []

    # — Anomaly contribution (40 pts max) — only for account nodes
    if ntype == "account":
        acct_key = label
        anomaly = acct_anomaly.get(acct_key, {})
        max_a = anomaly.get("max", attrs.get("max_anomaly_score", 0))
        avg_a = anomaly.get("mean", attrs.get("avg_anomaly_score", 0))
        anomaly_contrib = max_a * 30 + avg_a * 10
        score += anomaly_contrib
        if max_a > 0.7:
            factors.append(f"Abnormal transaction pattern (peak anomaly score {max_a:.2f})")
        elif max_a > 0.4:
            factors.append(f"Moderate anomaly signals detected (score {max_a:.2f})")

    # — Network centrality (20 pts max)
    c = centrality.get(node_id, 0)
    centrality_contrib = c * 20
    score += centrality_contrib
    if c > 0.1:
        factors.append(f"High network centrality ({c:.3f}) — key connector node")
    elif c > 0.05:
        factors.append(f"Elevated network centrality ({c:.3f})")

    # — Hub node (15 pts)
    if node_id in hub_nodes:
        score += 15
        factors.append("Acts as a hub — connects many entities in the network")

    # — Shared-device / shared-entity connections (15 pts max)
    shared_edges = [
        d for _, _, d in G.edges(node_id, data=True)
        if "shared_via" in d and d["shared_via"]
    ]
    if shared_edges:
        shared_count = sum(len(e["shared_via"]) for e in shared_edges)
        shared_contrib = min(15, shared_count * 3)
        score += shared_contrib
        shared_types = set(sv["type"] for e in shared_edges for sv in e["shared_via"])
        factors.append(
            f"Shares {', '.join(shared_types)} with {len(shared_edges)} other account(s)"
        )

    # — Community risk (10 pts max)
    cid = node_community.get(node_id)
    if cid is not None:
        comm_summary = next((s for s in summaries if s["community_id"] == cid), None)
        if comm_summary and comm_summary["shared_entity_edges"] > 0:
            community_contrib = min(10, comm_summary["shared_entity_edges"] * 2)
            score += community_contrib
            factors.append(
                f"Part of suspicious cluster {cid} "
                f"({comm_summary['size']} entities, "
                f"{comm_summary['shared_entity_edges']} shared-entity connections)"
            )

    # — High-degree non-account nodes (merchants/devices used by many accounts)
    if ntype in ("device", "merchant"):
        linked = attrs.get("linked_accounts", 0)
        if linked >= 3:
            score += min(20, linked * 3)
            factors.append(
                f"Used by {linked} different accounts — potential fraud hub {ntype}"
            )

    score = round(min(100, max(0, score)), 1)
    if not factors:
        factors.append("No significant risk signals detected")

    return score, factors


# ── Cluster Primary Factors ────────────────────────────────────────────────────

def _cluster_primary_factors(
    members: list,
    entity_scores: dict,
    G: nx.Graph,
    summary: dict,
) -> list[str]:
    factors = []

    # Find hub devices/merchants within this cluster
    hub_entities = [
        f"{entity_scores[n]['entity_type']} {entity_scores[n]['label']}"
        for n in members
        if n in entity_scores and entity_scores[n]["entity_type"] in ("device", "merchant")
        and entity_scores[n]["is_hub"]
    ]
    if hub_entities:
        factors.append(f"Hub entities: {', '.join(hub_entities[:3])}")

    if summary["shared_entity_edges"] > 0:
        factors.append(
            f"{summary['shared_entity_edges']} shared-entity connections within cluster"
        )

    # Highest-scoring member
    top_member = max(
        (n for n in members if n in entity_scores),
        key=lambda n: entity_scores[n]["risk_score"],
        default=None
    )
    if top_member:
        ts = entity_scores[top_member]
        factors.append(
            f"Highest-risk member: {ts['entity_type']} {ts['label']} "
            f"(score {ts['risk_score']})"
        )

    return factors[:5]  # max 5 primary factors


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_risk_level(score: float) -> str:
    if score >= RISK_LEVELS["CRITICAL"]:
        return "CRITICAL"
    elif score >= RISK_LEVELS["HIGH"]:
        return "HIGH"
    elif score >= RISK_LEVELS["MEDIUM"]:
        return "MEDIUM"
    else:
        return "LOW"


def _build_summary(entity_scores: dict, cluster_scores: dict) -> dict:
    scores = [e["risk_score"] for e in entity_scores.values()]
    levels = [e["risk_level"] for e in entity_scores.values()]

    return {
        "total_entities":       len(entity_scores),
        "critical_entities":    levels.count("CRITICAL"),
        "high_risk_entities":   levels.count("HIGH"),
        "medium_risk_entities": levels.count("MEDIUM"),
        "low_risk_entities":    levels.count("LOW"),
        "avg_entity_score":     round(float(np.mean(scores)), 1) if scores else 0,
        "suspicious_networks":  sum(
            1 for c in cluster_scores.values()
            if c["risk_level"] in ("HIGH", "CRITICAL")
        ),
        "total_networks":       len(cluster_scores),
    }

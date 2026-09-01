"""
Phase 3 — Graph Construction (NetworkX)
Builds a heterogeneous entity graph from validated + feature-engineered transactions.
Nodes: Account, Device, Merchant, Location, Transaction
Edges: Relationships with evidence weights.
"""
import logging
from typing import Optional

import pandas as pd
import networkx as nx

logger = logging.getLogger(__name__)

# Entity type color mapping (used by frontend)
NODE_COLORS = {
    "account":     "#00D4FF",   # cyan
    "device":      "#A78BFA",   # violet
    "merchant":    "#F59E0B",   # amber
    "location":    "#34D399",   # emerald
    "transaction": "#F43F5E",   # rose
}


def build_graph(df: pd.DataFrame) -> dict:
    """
    Build a NetworkX graph from the transaction DataFrame.

    Returns:
        {
            "graph": nx.Graph,
            "nodes": [ { id, type, label, attributes } ],
            "edges": [ { source, target, relationship, weight } ],
            "available_entity_types": [list of entity types actually present],
        }
    """
    G = nx.Graph()
    df = df.copy()

    # Determine which entity columns are present and have data
    entity_cols = {
        "device":   "device_id",
        "merchant": "merchant_id",
        "location": "location",
    }
    available_optional = {
        etype: col for etype, col in entity_cols.items()
        if col in df.columns and df[col].notna().any()
    }

    # ── Add Account nodes ────────────────────────────────────────────────────
    accounts = df["account_id"].dropna().unique()
    for acct in accounts:
        acct_txns = df[df["account_id"] == acct]
        _add_node(G, _node_id("account", acct), "account", acct, {
            "total_transactions": int(len(acct_txns)),
            "total_amount":       float(acct_txns["amount"].sum()),
            "avg_amount":         float(acct_txns["amount"].mean()),
            "max_anomaly_score":  float(acct_txns["composite_anomaly_score"].max())
                                  if "composite_anomaly_score" in acct_txns.columns else 0.0,
            "avg_anomaly_score":  float(acct_txns["composite_anomaly_score"].mean())
                                  if "composite_anomaly_score" in acct_txns.columns else 0.0,
        })

    # ── Add optional entity nodes & Account↔Entity edges ─────────────────────
    for etype, col in available_optional.items():
        entities = df[col].dropna().unique()
        for ent in entities:
            eid = _node_id(etype, ent)
            _add_node(G, eid, etype, ent, {
                "linked_accounts": int(df[df[col] == ent]["account_id"].nunique()),
                "transaction_count": int((df[col] == ent).sum()),
            })

        # Account ↔ Entity edges
        for acct in accounts:
            acct_ents = df[df["account_id"] == acct][col].dropna().unique()
            for ent in acct_ents:
                txn_count = int(((df["account_id"] == acct) & (df[col] == ent)).sum())
                _add_or_update_edge(
                    G,
                    _node_id("account", acct),
                    _node_id(etype, ent),
                    relationship=f"account_to_{etype}",
                    weight=txn_count,
                )

    # ── Shared-entity edges (Account ↔ Account via shared Device/Merchant) ──
    for etype, col in available_optional.items():
        _add_shared_entity_edges(G, df, col, etype)

    # ── Device ↔ Merchant edges ───────────────────────────────────────────────
    if "device" in available_optional and "merchant" in available_optional:
        dev_col  = available_optional["device"]
        merch_col = available_optional["merchant"]
        dev_merch = df[[dev_col, merch_col]].dropna()
        for _, row in dev_merch.groupby([dev_col, merch_col]).size().reset_index(name="cnt").iterrows():
            _add_or_update_edge(
                G,
                _node_id("device", row[dev_col]),
                _node_id("merchant", row[merch_col]),
                relationship="device_at_merchant",
                weight=int(row["cnt"]),
            )

    available_types = ["account"] + list(available_optional.keys())
    nodes_list = _serialize_nodes(G)
    edges_list = _serialize_edges(G)

    logger.info(
        "Graph built: %d nodes, %d edges, entity types=%s",
        G.number_of_nodes(), G.number_of_edges(), available_types
    )

    return {
        "graph": G,
        "nodes": nodes_list,
        "edges": edges_list,
        "available_entity_types": available_types,
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _node_id(etype: str, value: str) -> str:
    return f"{etype}::{str(value)}"


def _add_node(G: nx.Graph, node_id: str, etype: str, label: str, attrs: dict) -> None:
    G.add_node(node_id, type=etype, label=str(label), color=NODE_COLORS.get(etype, "#888"),
               **attrs)


def _add_or_update_edge(G: nx.Graph, src: str, tgt: str, relationship: str, weight: int) -> None:
    if G.has_edge(src, tgt):
        G[src][tgt]["weight"] = G[src][tgt].get("weight", 0) + weight
    else:
        G.add_edge(src, tgt, relationship=relationship, weight=weight)


# Maximum accounts sharing an entity before skipping pairwise clique edge generation
# to prevent O(N^2) supernode explosion on large merchants or locations.
MAX_SHARED_ACCOUNTS_THRESHOLD = 25


def _add_shared_entity_edges(
    G: nx.Graph,
    df: pd.DataFrame,
    col: str,
    etype: str,
    max_threshold: int = MAX_SHARED_ACCOUNTS_THRESHOLD,
) -> None:
    """Add Account↔Account edges when they share the same device/merchant/location."""
    shared = (
        df[df[col].notna()]
        .groupby(col)["account_id"]
        .apply(list)
        .reset_index()
    )
    for _, row in shared.iterrows():
        accounts = list(set(row["account_id"]))
        if len(accounts) < 2:
            continue
        # Avoid O(N^2) pairwise clique explosion for massive aggregator entities
        if len(accounts) > max_threshold:
            logger.debug(
                "Skipping pairwise clique for high-degree %s entity '%s' (%d accounts > threshold %d)",
                etype, row[col], len(accounts), max_threshold
            )
            continue
        entity_val = row[col]
        for i in range(len(accounts)):
            for j in range(i + 1, len(accounts)):
                _add_or_update_edge(
                    G,
                    _node_id("account", accounts[i]),
                    _node_id("account", accounts[j]),
                    relationship=f"shared_{etype}",
                    weight=1,
                )
                # Tag the edge with which entity is shared
                edge = G[_node_id("account", accounts[i])][_node_id("account", accounts[j])]
                shared_via = edge.get("shared_via", [])
                shared_via.append({"type": etype, "value": str(entity_val)})
                edge["shared_via"] = shared_via


def _serialize_nodes(G: nx.Graph) -> list[dict]:
    nodes = []
    for nid, attrs in G.nodes(data=True):
        nodes.append({
            "id":    nid,
            "type":  attrs.get("type", "unknown"),
            "label": attrs.get("label", nid),
            "color": attrs.get("color", "#888"),
            **{k: v for k, v in attrs.items() if k not in ("type", "label", "color")},
        })
    return nodes


def _serialize_edges(G: nx.Graph) -> list[dict]:
    edges = []
    for src, tgt, attrs in G.edges(data=True):
        edges.append({
            "source":       src,
            "target":       tgt,
            "relationship": attrs.get("relationship", "connected"),
            "weight":       attrs.get("weight", 1),
            "shared_via":   attrs.get("shared_via", []),
        })
    return edges

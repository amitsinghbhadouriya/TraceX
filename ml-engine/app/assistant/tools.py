"""
Phase 7 — Gemini Tool Definitions
Backend functions the LLM can call to retrieve computed evidence.
These are the ONLY source of facts for the AI assistant.
"""
from typing import Any, Optional
from app.core import session_store


# ── Tool function declarations for Gemini ──────────────────────────────────────

TOOL_DECLARATIONS = [
    {
        "name": "get_dataset_summary",
        "description": (
            "Returns overall statistics for the analyzed dataset: "
            "transaction count, anomaly rate, entity counts, field availability. "
            "Use this to answer questions about the overall analysis."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_entity_risk",
        "description": (
            "Returns the risk score (0–100), risk level, and contributing factors "
            "for a specific entity. The entity_id is a tokenized identifier."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "entity_id": {
                    "type": "string",
                    "description": "Tokenized entity ID (e.g. 'ACC_tok_3A2B1C' or 'account::ACC_tok_3A2B1C')",
                },
            },
            "required": ["entity_id"],
        },
    },
    {
        "name": "get_cluster_summary",
        "description": (
            "Returns risk score, entity breakdown, and primary risk factors "
            "for a specific suspicious network/cluster."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "cluster_id": {
                    "type": "integer",
                    "description": "Numeric cluster/community ID",
                },
            },
            "required": ["cluster_id"],
        },
    },
    {
        "name": "get_top_anomalous_transactions",
        "description": "Returns the top N most anomalous transactions (redacted).",
        "parameters": {
            "type": "object",
            "properties": {
                "n": {
                    "type": "integer",
                    "description": "Number of transactions to return (1–20)",
                },
                "min_score": {
                    "type": "number",
                    "description": "Minimum composite anomaly score (0.0–1.0)",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_entity_connections",
        "description": (
            "Returns the direct neighbors of an entity in the fraud network graph "
            "(tokenized entity IDs and relationship types)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "entity_id": {
                    "type": "string",
                    "description": "Tokenized entity ID",
                },
            },
            "required": ["entity_id"],
        },
    },
    {
        "name": "get_high_risk_entities",
        "description": (
            "Returns all entities with risk score above a threshold, "
            "sorted by risk score descending."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "min_score": {
                    "type": "number",
                    "description": "Minimum risk score (0–100)",
                },
                "entity_type": {
                    "type": "string",
                    "description": "Filter by type: account | device | merchant | location",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results (1–50)",
                },
            },
            "required": [],
        },
    },
]


# ── Tool Executor ──────────────────────────────────────────────────────────────

class ToolExecutor:
    """Executes tool calls using evidence stored in the session."""

    def __init__(self, session_id: str, redactor):
        self.session_id = session_id
        self.redactor   = redactor

    def execute(self, tool_name: str, args: dict) -> Any:
        session = session_store.get_session(self.session_id)
        if not session:
            return {"error": "Session not found or expired."}

        dispatch = {
            "get_dataset_summary":          self._dataset_summary,
            "get_entity_risk":              self._entity_risk,
            "get_cluster_summary":          self._cluster_summary,
            "get_top_anomalous_transactions": self._top_anomalous,
            "get_entity_connections":       self._entity_connections,
            "get_high_risk_entities":       self._high_risk_entities,
        }
        fn = dispatch.get(tool_name)
        if not fn:
            return {"error": f"Unknown tool: {tool_name}"}
        return fn(session, **args)

    # ── Individual Tool Implementations ────────────────────────────────────────

    def _dataset_summary(self, session) -> dict:
        anomaly = session.get("anomaly_summary", {})
        scoring = session.get("scoring_summary", {})
        return {
            "row_count":              session.get("row_count"),
            "filename":               session.get("original_filename"),
            "available_entity_types": session.get("available_entity_types", []),
            "detected_fields":        list(session.get("field_map", {}).keys()),
            "missing_fields":         session.get("extra_columns", []),
            "total_transactions":     anomaly.get("total_transactions"),
            "anomalous_count":        anomaly.get("anomalous_count"),
            "anomaly_rate":           anomaly.get("anomaly_rate"),
            "total_entities":         scoring.get("total_entities"),
            "high_risk_entities":     scoring.get("high_risk_entities"),
            "critical_entities":      scoring.get("critical_entities"),
            "suspicious_networks":    scoring.get("suspicious_networks"),
        }

    def _entity_risk(self, session, entity_id: str) -> dict:
        entity_scores: dict = session.get("entity_scores", {})

        # Try direct match first
        entity = entity_scores.get(entity_id)

        # Try fuzzy match by token in label
        if not entity:
            token = entity_id.split("::")[-1] if "::" in entity_id else entity_id
            for nid, ent in entity_scores.items():
                tok_label = self.redactor.tokenize(ent["label"], ent["entity_type"])
                if tok_label == token or self.redactor.tokenize(nid, ent["entity_type"]) == token:
                    entity = ent
                    break

        if not entity:
            return {"error": f"Entity '{entity_id}' not found in analysis results."}

        return {
            "entity_id":            entity_id,
            "entity_type":          entity["entity_type"],
            "risk_score":           entity["risk_score"],
            "risk_level":           entity["risk_level"],
            "contributing_factors": entity["contributing_factors"],
            "community_id":         entity.get("community_id"),
            "is_hub":               entity.get("is_hub", False),
            "connection_count":     entity.get("connection_count", 0),
        }

    def _cluster_summary(self, session, cluster_id: int) -> dict:
        cluster_scores: dict = session.get("cluster_scores", {})
        cluster = cluster_scores.get(cluster_id) or cluster_scores.get(str(cluster_id))
        if not cluster:
            return {"error": f"Cluster {cluster_id} not found."}
        return {
            "community_id":       cluster["community_id"],
            "risk_score":         cluster["risk_score"],
            "risk_level":         cluster["risk_level"],
            "member_count":       cluster["member_count"],
            "entity_type_counts": cluster["entity_type_counts"],
            "avg_member_score":   cluster["avg_member_score"],
            "primary_factors":    cluster["primary_factors"],
            "shared_entity_edges": cluster["shared_entity_edges"],
        }

    def _top_anomalous(self, session, n: int = 10, min_score: float = 0.0) -> dict:
        anomaly = session.get("anomaly_summary", {})
        top_txns = anomaly.get("top_anomalous_transactions", [])
        filtered = [t for t in top_txns if t.get("composite_anomaly_score", 0) >= min_score]
        result = []
        for txn in filtered[:min(n, 20)]:
            redacted = self.redactor.redact_transaction(txn)
            result.append(redacted)
        return {"transactions": result, "count": len(result)}

    def _entity_connections(self, session, entity_id: str) -> dict:
        nodes: list = session.get("nodes", [])
        edges: list = session.get("edges", [])
        entity_scores: dict = session.get("entity_scores", {})

        # Find connected edges
        neighbors = []
        for edge in edges:
            partner_id = None
            if edge["source"] == entity_id:
                partner_id = edge["target"]
            elif edge["target"] == entity_id:
                partner_id = edge["source"]
            if partner_id:
                partner = entity_scores.get(partner_id, {})
                neighbors.append({
                    "entity_type":  partner.get("entity_type", "unknown"),
                    "risk_level":   partner.get("risk_level", "unknown"),
                    "relationship": edge.get("relationship", "connected"),
                    "weight":       edge.get("weight", 1),
                    "shared_via":   edge.get("shared_via", []),
                })
        return {
            "entity_id":      entity_id,
            "neighbor_count": len(neighbors),
            "neighbors":      neighbors[:30],
        }

    def _high_risk_entities(
        self, session, min_score: float = 70, entity_type: Optional[str] = None, limit: int = 20
    ) -> dict:
        entity_scores: dict = session.get("entity_scores", {})
        results = [
            {
                "entity_type": e["entity_type"],
                "risk_score":  e["risk_score"],
                "risk_level":  e["risk_level"],
                "top_factor":  e["contributing_factors"][0] if e["contributing_factors"] else "",
                "community_id": e.get("community_id"),
                "is_hub":      e.get("is_hub", False),
            }
            for e in entity_scores.values()
            if e["risk_score"] >= min_score
            and (entity_type is None or e["entity_type"] == entity_type)
        ]
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return {"entities": results[:limit], "total_matching": len(results)}

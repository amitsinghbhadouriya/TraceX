"""
Graph Router — Phase 3 & 4
GET /api/ml/graph/{session_id}       — full graph + scores
GET /api/ml/clusters/{session_id}    — cluster list with risk scores
GET /api/ml/entity/{session_id}/{entity_id} — single entity detail
POST /api/ml/full-analysis/{session_id}     — run everything (graph + clusters + scoring)
"""
import logging
from fastapi import APIRouter, HTTPException
from app.core import session_store
from app.pipeline.graph import build_graph
from app.pipeline.clusters import detect_clusters
from app.pipeline.scorer import score_entities

router = APIRouter(prefix="/api/ml", tags=["graph"])
logger = logging.getLogger(__name__)


@router.post("/full-analysis/{session_id}")
async def run_full_analysis(session_id: str):
    """
    Run graph construction + cluster detection + risk scoring.
    Call this after /analyze (anomaly detection).
    """
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found or expired.")

    df = session.get("dataframe")
    if df is None:
        raise HTTPException(status_code=400, detail="No dataframe in session.")

    try:
        # Phase 3 — Graph
        graph_result  = build_graph(df)
        G             = graph_result["graph"]

        # Phase 4 — Clusters
        cluster_data  = detect_clusters(G)

        # Phase 4 — Risk Scoring
        score_result  = score_entities(df, G, cluster_data)

    except Exception as e:
        logger.exception("Full analysis failed for session %s: %s", session_id, e)
        raise HTTPException(status_code=500, detail="Analysis failed due to an internal processing error.")

    # Enrich nodes with risk scores before storing
    enriched_nodes = _enrich_nodes(graph_result["nodes"], score_result["entity_scores"])

    session_store.update_session(session_id, {
        "nodes":            enriched_nodes,
        "edges":            graph_result["edges"],
        "entity_scores":    score_result["entity_scores"],
        "cluster_scores":   score_result["cluster_scores"],
        "cluster_summaries": cluster_data["community_summaries"],
        "available_entity_types": graph_result["available_entity_types"],
        "scoring_summary":  score_result["summary"],
        "status":           "analysis_complete",
    })

    anomaly_summary = session.get("anomaly_summary", {})

    return {
        "session_id":       session_id,
        "status":           "analysis_complete",
        "scoring_summary":  score_result["summary"],
        "anomaly_summary":  anomaly_summary,
        "available_entity_types": graph_result["available_entity_types"],
        "node_count":       len(enriched_nodes),
        "edge_count":       len(graph_result["edges"]),
        "cluster_count":    len(score_result["cluster_scores"]),
    }


@router.get("/graph/{session_id}")
async def get_graph(session_id: str):
    """Return full graph nodes + edges with risk scores."""
    session = _get_or_404(session_id)
    nodes = session.get("nodes", [])
    edges = session.get("edges", [])
    if not nodes:
        raise HTTPException(status_code=400,
                            detail="Graph not built yet. Run /full-analysis first.")
    return {
        "session_id": session_id,
        "nodes": nodes,
        "edges": edges,
        "available_entity_types": session.get("available_entity_types", []),
    }


@router.get("/clusters/{session_id}")
async def get_clusters(session_id: str):
    """Return cluster list sorted by risk score."""
    session = _get_or_404(session_id)
    cluster_scores = session.get("cluster_scores")
    if cluster_scores is None:
        raise HTTPException(status_code=400,
                            detail="Clusters not computed yet. Run /full-analysis first.")
    sorted_clusters = sorted(
        cluster_scores.values(),
        key=lambda c: c["risk_score"],
        reverse=True,
    )
    return {
        "session_id": session_id,
        "clusters": sorted_clusters,
        "total": len(sorted_clusters),
    }


@router.get("/entity/{session_id}/{entity_id:path}")
async def get_entity(session_id: str, entity_id: str):
    """Return full detail for a single entity node."""
    session = _get_or_404(session_id)
    entity_scores = session.get("entity_scores", {})

    if entity_id not in entity_scores:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found.")

    entity = entity_scores[entity_id]

    # Pull transactions for this entity
    df = session.get("dataframe")
    txns = []
    if df is not None and entity["entity_type"] == "account":
        acct_df = df[df["account_id"] == entity["label"]].copy()
        txns = _serialize_transactions(acct_df)

    return {
        **entity,
        "transactions": txns[:50],  # cap at 50 for response size
    }


@router.get("/summary/{session_id}")
async def get_summary(session_id: str):
    """Return combined analysis summary."""
    session = _get_or_404(session_id)
    return {
        "session_id":      session_id,
        "status":          session.get("status"),
        "anomaly_summary": session.get("anomaly_summary", {}),
        "scoring_summary": session.get("scoring_summary", {}),
        "field_map":       session.get("field_map", {}),
        "extra_columns":   session.get("extra_columns", []),
        "available_entity_types": session.get("available_entity_types", []),
        "original_filename": session.get("original_filename"),
        "row_count":       session.get("row_count"),
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_or_404(session_id: str) -> dict:
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found or expired.")
    return session


def _enrich_nodes(nodes: list, entity_scores: dict) -> list:
    enriched = []
    for node in nodes:
        nid = node["id"]
        score_data = entity_scores.get(nid, {})
        enriched.append({
            **node,
            "risk_score":          score_data.get("risk_score", 0),
            "risk_level":          score_data.get("risk_level", "LOW"),
            "contributing_factors": score_data.get("contributing_factors", []),
            "is_hub":              score_data.get("is_hub", False),
            "community_id":        score_data.get("community_id"),
            "centrality":          score_data.get("centrality", 0),
        })
    return enriched


def _serialize_transactions(df) -> list:
    cols = ["timestamp", "amount", "merchant_id", "device_id", "location",
            "composite_anomaly_score", "triggered_signals", "transaction_id"]
    available = [c for c in cols if c in df.columns]
    df = df[available].sort_values("timestamp", ascending=False)
    records = []
    for _, row in df.iterrows():
        rec = {}
        for c in available:
            val = row[c]
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            elif hasattr(val, "item"):
                val = val.item()
            rec[c] = val
        records.append(rec)
    return records

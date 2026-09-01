"""
Anomaly Router — Phase 2
POST /api/ml/analyze/{session_id}
"""
import logging
from fastapi import APIRouter, HTTPException
from app.core import session_store
from app.pipeline.anomaly import detect_anomalies, build_anomaly_summary

router = APIRouter(prefix="/api/ml", tags=["anomaly"])
logger = logging.getLogger(__name__)


@router.post("/analyze/{session_id}")
async def run_anomaly_detection(session_id: str):
    """
    Run anomaly detection on an uploaded dataset.
    Returns anomaly summary + updates session.
    """
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found or expired.")

    df = session.get("dataframe")
    if df is None:
        raise HTTPException(status_code=400, detail="No dataframe found in session.")

    try:
        df_anomaly = detect_anomalies(df)
        anomaly_summary = build_anomaly_summary(df_anomaly)
    except Exception as e:
        logger.exception("Anomaly detection failed for session %s: %s", session_id, e)
        raise HTTPException(status_code=500, detail="Anomaly detection failed due to an internal processing error.")

    session_store.update_session(session_id, {
        "dataframe": df_anomaly,
        "anomaly_summary": anomaly_summary,
        "status": "anomaly_complete",
    })

    return {
        "session_id": session_id,
        "status": "anomaly_complete",
        **anomaly_summary,
    }

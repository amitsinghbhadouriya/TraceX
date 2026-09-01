"""
Pipeline Router — Phase 1
POST /api/ml/upload
"""
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import get_settings
from app.core import session_store
from app.pipeline.ingestor import ingest_file
from app.pipeline.validator import validate_and_normalize
from app.pipeline.features import engineer_features

router = APIRouter(prefix="/api/ml", tags=["pipeline"])
logger = logging.getLogger(__name__)
settings = get_settings()

MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".xlsm", ".txt"}


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a CSV or Excel transaction dataset.
    Returns session_id + validation report.
    """
    # ── Size & type validation ────────────────────────────────────────────────
    filename = file.filename or "upload"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_upload_size_mb} MB."
        )
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Ingest ────────────────────────────────────────────────────────────────
    try:
        ingest_result = ingest_file(raw_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # ── Validate & Normalize ──────────────────────────────────────────────────
    val_result = validate_and_normalize(
        ingest_result["dataframe"],
        ingest_result["field_map"],
        ingest_result["missing_fields"],
    )

    if not val_result["is_valid"]:
        return {
            "success": False,
            "session_id": None,
            "validation_report": val_result["report"],
            "field_map": ingest_result["field_map"],
            "missing_fields": ingest_result["missing_fields"],
            "extra_columns": ingest_result["extra_columns"],
        }

    # ── Feature Engineering ───────────────────────────────────────────────────
    df_featured = engineer_features(val_result["dataframe"])

    # ── Store session ─────────────────────────────────────────────────────────
    session_id = session_store.create_session({
        "dataframe":        df_featured,
        "field_map":        ingest_result["field_map"],
        "extra_columns":    ingest_result["extra_columns"],
        "original_filename": ingest_result["original_filename"],
        "row_count":        ingest_result["row_count"],
        "status":           "uploaded",
    })

    logger.info("Session %s created for '%s' (%d rows)", session_id, filename, len(df_featured))

    return {
        "success":    True,
        "session_id": session_id,
        "row_count":  len(df_featured),
        "validation_report": val_result["report"],
        "field_map":         ingest_result["field_map"],
        "missing_fields":    ingest_result["missing_fields"],
        "extra_columns":     ingest_result["extra_columns"],
        "detected_fields":   list(ingest_result["field_map"].keys()),
    }
